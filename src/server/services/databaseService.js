/**
 * Database Service
 * Handles database queries, transactions, and schema repair
 */

const { getAgencyPool } = require('../config/database');
const { ensureAgencySchema } = require('../utils/schemaValidator');
const { createAgencySchema } = require('../utils/schemaCreator');
const { parseDatabaseUrl } = require('../utils/poolManager');

/**
 * Execute a database query with optional user context
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @param {string} agencyDatabase - Agency database name
 * @param {string} userId - Optional user ID for audit context
 * @returns {Promise<Object>} Query result
 */
async function executeQuery(sql, params, agencyDatabase, userId, retryCount = 0) {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000; // 1 second

  // NOTE: Schema validation is NO LONGER called on every query for performance.
  // It's only called:
  // - On agency creation
  // - On application startup
  // - On manual admin trigger
  // - When a query fails with schema-related error (see error handling below)

  const targetPool = getAgencyPool(agencyDatabase);
  const trimmedSql = sql.trim();

  console.log('[API] Executing query:', trimmedSql.substring(0, 100));

  try {
    // If userId is provided, set the context in a transaction
    if (userId) {
      const client = await targetPool.connect();
      try {
        await client.query('BEGIN');

        // Set the user context for audit logs using secure method
        const { validateUUID, setSessionVariable } = require('../utils/securityUtils');
        validateUUID(userId);
        await setSessionVariable(client, 'app.current_user_id', userId);

        console.log('[API] Executing query with userId context:', trimmedSql.substring(0, 150));
        console.log('[API] Query params:', params);

        const result = await client.query(trimmedSql, params);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {}); // Ignore rollback errors
        console.error('[API] Transaction error:', error);
        throw error;
      } finally {
        client.release();
      }
    } else {
      // Execute query without transaction
      return await targetPool.query(trimmedSql, params);
    }
  } catch (error) {
    // Check if error is schema-related (table/function doesn't exist)
    // ONLY these specific PostgreSQL error codes indicate schema issues
    const isSchemaError = error.code === '42P01' || // undefined_table
                          error.code === '42883' ||  // undefined_function
                          error.code === '42704';    // undefined_object
    
    // DISABLED: Automatic schema repair consumes too much CPU
    // Schema should be created during agency setup, not on every query error
    // Only repair if explicitly enabled via environment variable
    if (false && isSchemaError && agencyDatabase && retryCount === 0 && process.env.ENABLE_SCHEMA_REPAIR === 'true') {
      // Circuit breaker: Track recent schema repair attempts per agency
      const circuitBreakerKey = `schema_repair_${agencyDatabase}`;
      const now = Date.now();
      const recentAttempts = global.schemaRepairAttempts || new Map();
      
      // Get last attempt time for this agency
      const lastAttempt = recentAttempts.get(circuitBreakerKey) || 0;
      const timeSinceLastAttempt = now - lastAttempt;
      
      // Only attempt repair if at least 30 seconds have passed since last attempt
      // This prevents schema validation loops
      const MIN_RETRY_INTERVAL = 30000; // 30 seconds
      
      if (timeSinceLastAttempt < MIN_RETRY_INTERVAL) {
        console.warn(`[API] Schema repair skipped: Too soon since last attempt (${Math.round(timeSinceLastAttempt/1000)}s ago). Circuit breaker active.`);
        // Throw original error without attempting repair
        throw error;
      }
      
      // Record this attempt
      if (!global.schemaRepairAttempts) {
        global.schemaRepairAttempts = new Map();
      }
      global.schemaRepairAttempts.set(circuitBreakerKey, now);
      
      console.log(`[API] Schema error detected (${error.code}), attempting schema repair...`);
      try {
        // Force schema validation/repair with timeout protection
        const repairPromise = ensureAgencySchema(agencyDatabase, { force: true });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Schema repair timeout')), 30000)
        );
        
        await Promise.race([repairPromise, timeoutPromise]);
        
        // Retry the query once after repair
        return executeQuery(sql, params, agencyDatabase, userId, retryCount + 1);
      } catch (schemaError) {
        // Safely extract error message
        const schemaErrorMessage = schemaError?.message || String(schemaError) || 'Unknown schema error';
        const schemaErrorCode = schemaError?.code;
        
        // Only log if it's not a timeout (timeouts are expected)
        if (!schemaErrorMessage.includes('timeout')) {
          console.warn(`[API] Schema repair failed:`, schemaErrorMessage, schemaErrorCode ? `(code: ${schemaErrorCode})` : '');
        }
        
        // If schema repair itself fails, don't retry again for this agency for a while
        // This prevents infinite loops
        // Mark as failed in circuit breaker to prevent immediate retries
        if (!global.schemaRepairAttempts) {
          global.schemaRepairAttempts = new Map();
        }
        // Set a longer cooldown for failed repairs (5 minutes)
        global.schemaRepairAttempts.set(circuitBreakerKey, now + (5 * 60 * 1000));
        
        console.warn(`[API] Schema repair failed for ${agencyDatabase}, will not retry for 5 minutes`);
        
        // Fall through to throw original error (not the schema error, to avoid masking the real issue)
      }
    }

    // Retry on connection timeout or connection errors
    const isConnectionError = 
      error.message?.includes('timeout') ||
      error.message?.includes('Connection terminated') ||
      error.message?.includes('ECONNREFUSED') ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNREFUSED';

    if (isConnectionError && retryCount < MAX_RETRIES) {
      console.log(`[API] Connection error detected, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      
      // Clear the pool from cache if it's an agency pool to force recreation
      if (agencyDatabase) {
        const { agencyPools } = require('../config/database');
        if (agencyPools.has(agencyDatabase)) {
          const badPool = agencyPools.get(agencyDatabase);
          try {
            await badPool.end();
          } catch (e) {
            // Ignore errors when ending the pool
          }
          agencyPools.delete(agencyDatabase);
          console.log(`[API] Cleared bad pool from cache: ${agencyDatabase}`);
        }
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));

      // Retry the query
      return executeQuery(sql, params, agencyDatabase, userId, retryCount + 1);
    }

    // If we've exhausted retries or it's not a connection error, throw
    throw error;
  }
}

/**
 * Execute multiple queries in a transaction
 * @param {Array} queries - Array of {sql, params} objects
 * @param {string} agencyDatabase - Agency database name
 * @param {string} userId - Optional user ID for audit context
 * @returns {Promise<Array>} Array of query results
 */
async function executeTransaction(queries, agencyDatabase, userId) {
  const targetPool = getAgencyPool(agencyDatabase);

  if (!Array.isArray(queries) || queries.length === 0) {
    throw new Error('Queries array is required');
  }

  console.log('[API] Executing transaction with', queries.length, 'queries');

  const client = await targetPool.connect();
  try {
    await client.query('BEGIN');

    // Set user context if provided using secure method
    if (userId) {
      const { validateUUID, setSessionVariable } = require('../utils/securityUtils');
      validateUUID(userId);
      await setSessionVariable(client, 'app.current_user_id', userId);
    }

    const results = [];

    for (const { sql, params = [] } of queries) {
      const trimmedSql = sql.trim();
      console.log('[API] Transaction query:', trimmedSql.substring(0, 100));
      const result = await client.query(trimmedSql, params);
      results.push({
        rows: result.rows,
        rowCount: result.rowCount,
      });
    }

    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[API] Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Repair missing column in database
 * @param {string} agencyDatabase - Agency database name
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name
 */
async function repairMissingColumn(agencyDatabase, tableName, columnName) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const { Pool } = require('pg');
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    // Add the missing column based on table and column name
    if (tableName === 'profiles' && columnName === 'agency_id') {
      await agencyClient.query('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agency_id UUID');
      await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON public.profiles(agency_id)');
      console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
    } else if (tableName === 'employee_details' && columnName === 'agency_id') {
      await agencyClient.query('ALTER TABLE public.employee_details ADD COLUMN IF NOT EXISTS agency_id UUID');
      await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_employee_details_agency_id ON public.employee_details(agency_id)');
      console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
    } else if (tableName === 'employee_salary_details' && columnName === 'agency_id') {
      await agencyClient.query('ALTER TABLE public.employee_salary_details ADD COLUMN IF NOT EXISTS agency_id UUID');
      await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_employee_salary_details_agency_id ON public.employee_salary_details(agency_id)');
      console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
    } else if (tableName === 'employee_salary_details' && (columnName === 'salary' || columnName === 'salary_frequency')) {
      if (columnName === 'salary') {
        await agencyClient.query('ALTER TABLE public.employee_salary_details ADD COLUMN IF NOT EXISTS salary NUMERIC(15, 2)');
        await agencyClient.query('UPDATE public.employee_salary_details SET salary = base_salary WHERE salary IS NULL AND base_salary IS NOT NULL');
      } else if (columnName === 'salary_frequency') {
        await agencyClient.query('ALTER TABLE public.employee_salary_details ADD COLUMN IF NOT EXISTS salary_frequency TEXT DEFAULT \'monthly\'');
        await agencyClient.query('UPDATE public.employee_salary_details SET salary_frequency = pay_frequency WHERE salary_frequency IS NULL AND pay_frequency IS NOT NULL');
      }
      console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
    } else if (tableName === 'user_roles' && columnName === 'agency_id') {
      await agencyClient.query('ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS agency_id UUID');
      await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_user_roles_agency_id ON public.user_roles(agency_id)');
      // Update UNIQUE constraint
      await agencyClient.query(`
        DO $$ 
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key') THEN
            ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_role_key;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_agency_id_key') THEN
            ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_agency_id_key UNIQUE(user_id, role, agency_id);
          END IF;
        END $$;
      `);
      console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
    } else if (tableName === 'team_assignments' && columnName === 'agency_id') {
      await agencyClient.query('ALTER TABLE public.team_assignments ADD COLUMN IF NOT EXISTS agency_id UUID');
      await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_team_assignments_agency_id ON public.team_assignments(agency_id)');
      console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
    } else if (tableName === 'jobs' && columnName === 'agency_id') {
      await agencyClient.query('ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS agency_id UUID');
      await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_jobs_agency_id ON public.jobs(agency_id)');
      console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
    } else if (tableName === 'chart_of_accounts' && columnName === 'agency_id') {
      await agencyClient.query('ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS agency_id UUID');
      await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_agency_id ON public.chart_of_accounts(agency_id)');
      console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
    } else if (tableName === 'journal_entries' && columnName === 'agency_id') {
      await agencyClient.query('ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS agency_id UUID');
      await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_journal_entries_agency_id ON public.journal_entries(agency_id)');
      console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
    } else if (tableName === 'journal_entries' && (columnName === 'total_debit' || columnName === 'total_credit')) {
      if (columnName === 'total_debit') {
        await agencyClient.query('ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS total_debit NUMERIC(15, 2) DEFAULT 0');
      } else {
        await agencyClient.query('ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS total_credit NUMERIC(15, 2) DEFAULT 0');
      }
      console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
    } else if (tableName === 'journal_entry_lines' && columnName === 'line_number') {
      await agencyClient.query('ALTER TABLE public.journal_entry_lines ADD COLUMN IF NOT EXISTS line_number INTEGER');
      // Backfill line_number for existing rows where it is NULL or zero
      await agencyClient.query(`
        WITH numbered AS (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY journal_entry_id 
                   ORDER BY created_at, id
                 ) AS rn
          FROM public.journal_entry_lines
        )
        UPDATE public.journal_entry_lines jel
        SET line_number = numbered.rn
        FROM numbered
        WHERE jel.id = numbered.id
          AND (jel.line_number IS NULL OR jel.line_number = 0)
      `);
      await agencyClient.query(`
        CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_journal_entry_id_line_number 
        ON public.journal_entry_lines(journal_entry_id, line_number)
      `);
      console.log(`[API] ✅ Added ${columnName} column to ${tableName} table and backfilled values`);
    } else if (tableName === 'reimbursement_requests' && (columnName === 'agency_id' || columnName === 'employee_id')) {
      // Handle reimbursement_requests missing columns
      if (columnName === 'agency_id') {
        await agencyClient.query('ALTER TABLE public.reimbursement_requests ADD COLUMN IF NOT EXISTS agency_id UUID');
        await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_agency_id ON public.reimbursement_requests(agency_id)');
        console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
      } else if (columnName === 'employee_id') {
        await agencyClient.query('ALTER TABLE public.reimbursement_requests ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.users(id)');
        // Populate employee_id from user_id for existing records
        await agencyClient.query('UPDATE public.reimbursement_requests SET employee_id = user_id WHERE employee_id IS NULL AND user_id IS NOT NULL');
        await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_employee_id ON public.reimbursement_requests(employee_id)');
        console.log(`[API] ✅ Added ${columnName} column to ${tableName} table and backfilled values`);
      }
    } else if (tableName === 'expense_categories' && columnName === 'agency_id') {
      // Handle expense_categories missing agency_id
      await agencyClient.query('ALTER TABLE public.expense_categories ADD COLUMN IF NOT EXISTS agency_id UUID');
      // Drop old unique constraint on name if it exists
      await agencyClient.query(`
        DO $$ 
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expense_categories_name_key') THEN
            ALTER TABLE public.expense_categories DROP CONSTRAINT expense_categories_name_key;
          END IF;
        END $$;
      `);
      // Create new unique constraint on (agency_id, name)
      await agencyClient.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expense_categories_agency_id_name_key') THEN
            ALTER TABLE public.expense_categories ADD CONSTRAINT expense_categories_agency_id_name_key UNIQUE(agency_id, name);
          END IF;
        END $$;
      `);
      await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_expense_categories_agency_id ON public.expense_categories(agency_id)');
      console.log(`[API] ✅ Added ${columnName} column to ${tableName} table and updated constraints`);
    } else if (tableName === 'departments') {
      console.log(`[API] 🔧 Adding ${columnName} to departments table...`);
      try {
        if (columnName === 'manager_id') {
          await agencyClient.query('ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL');
          await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON public.departments(manager_id)');
        } else if (columnName === 'parent_department_id') {
          await agencyClient.query('ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS parent_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL');
          await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_departments_parent_department_id ON public.departments(parent_department_id)');
        } else if (columnName === 'budget') {
          await agencyClient.query('ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS budget NUMERIC(15, 2) DEFAULT 0');
        } else if (columnName === 'agency_id') {
          // In agency-specific databases, agency_id is nullable and doesn't need foreign key
          await agencyClient.query('ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS agency_id UUID');
          await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_departments_agency_id ON public.departments(agency_id)');
        }
        console.log(`[API] ✅ Successfully added ${columnName} column to departments table`);
      } catch (addError) {
        if (addError.message.includes('already exists') || addError.message.includes('duplicate')) {
          console.log(`[API] ℹ️ Column ${columnName} already exists in departments`);
        } else {
          console.error(`[API] ❌ Failed to add ${columnName}:`, addError.message);
          throw addError;
        }
      }
    } else if (tableName === 'clients') {
      console.log(`[API] 🔧 Adding ${columnName} to clients table...`);
      try {
        if (columnName === 'agency_id') {
          await agencyClient.query('ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS agency_id UUID');
          await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_clients_agency_id ON public.clients(agency_id)');
        } else if (columnName === 'is_active') {
          await agencyClient.query('ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true');
          await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients(is_active)');
        } else if (columnName === 'billing_city' || columnName === 'billing_state' || 
                   columnName === 'billing_postal_code' || columnName === 'billing_country') {
          // Add all billing columns at once to avoid multiple repair cycles
          console.log(`[API] Adding all billing columns to clients table...`);
          await agencyClient.query('ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_city TEXT');
          await agencyClient.query('ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_state TEXT');
          await agencyClient.query('ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_postal_code TEXT');
          await agencyClient.query('ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_country TEXT');
        } else {
          // Try lightweight ALTER TABLE instead of expensive full schema repair
          console.log(`[API] Adding generic ${columnName} column to clients table (lightweight)...`);
          try {
            await agencyClient.query(`ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ${columnName} TEXT`);
            console.log(`[API] ✅ Added ${columnName} column to clients table as TEXT`);
          } catch (addError) {
            console.warn(`[API] ⚠️ Could not add ${columnName} to clients: ${addError.message}`);
          }
        }
        console.log(`[API] ✅ Successfully added ${columnName} column to clients table`);
      } catch (addError) {
        if (addError.message.includes('already exists') || addError.message.includes('duplicate')) {
          console.log(`[API] ℹ️ Column ${columnName} already exists in clients`);
        } else {
          console.error(`[API] ❌ Failed to add ${columnName}:`, addError.message);
          throw addError;
        }
      }
    } else if (tableName === 'agency_settings') {
      console.log(`[API] 🔧 Adding ${columnName} to agency_settings table...`);
      try {
        if (columnName === 'domain') {
          await agencyClient.query('ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS domain TEXT');
        } else if (columnName === 'default_currency') {
          await agencyClient.query('ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS default_currency TEXT');
        } else if (columnName === 'primary_color') {
          await agencyClient.query('ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS primary_color TEXT');
        } else if (columnName === 'secondary_color') {
          await agencyClient.query('ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS secondary_color TEXT');
        } else if (columnName === 'working_hours_start') {
          await agencyClient.query('ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS working_hours_start TEXT');
        } else if (columnName === 'working_hours_end') {
          await agencyClient.query('ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS working_hours_end TEXT');
        } else if (columnName === 'working_days') {
          await agencyClient.query('ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS working_days TEXT');
        } else {
          // Try lightweight ALTER TABLE instead of expensive full schema repair
          console.log(`[API] Adding generic ${columnName} column to agency_settings table (lightweight)...`);
          try {
            await agencyClient.query(`ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS ${columnName} TEXT`);
            console.log(`[API] ✅ Added ${columnName} column to agency_settings table as TEXT`);
          } catch (addError) {
            console.warn(`[API] ⚠️ Could not add ${columnName} to agency_settings: ${addError.message}`);
          }
        }
        console.log(`[API] ✅ Successfully added ${columnName} column to agency_settings table`);
      } catch (addError) {
        if (addError.message.includes('already exists') || addError.message.includes('duplicate')) {
          console.log(`[API] ℹ️ Column ${columnName} already exists in agency_settings`);
        } else {
          console.error(`[API] ❌ Failed to add ${columnName}:`, addError.message);
          throw addError;
        }
      }
    } else if (tableName === 'leads') {
      // Handle leads table columns
      console.log(`[API] Adding ${columnName} column to leads table...`);
      try {
        // First, make name column nullable if it has NOT NULL constraint
        try {
          await agencyClient.query('ALTER TABLE public.leads ALTER COLUMN name DROP NOT NULL');
          console.log(`[API] ✅ Made name column nullable in leads table`);
        } catch (nameError) {
          // Ignore if column doesn't exist or doesn't have NOT NULL constraint
          if (!nameError.message.includes('does not exist') && !nameError.message.includes('constraint')) {
            console.warn(`[API] Warning: Could not make name nullable:`, nameError.message);
          }
        }

        if (columnName === 'contact_name') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_name TEXT');
        } else if (columnName === 'due_date') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS due_date DATE');
        } else if (columnName === 'follow_up_date') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_date DATE');
        } else if (columnName === 'priority') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT \'medium\'');
        } else if (columnName === 'estimated_value') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(15, 2)');
        } else if (columnName === 'notes') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes TEXT');
        } else if (columnName === 'website') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website TEXT');
        } else if (columnName === 'job_title') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS job_title TEXT');
        } else if (columnName === 'industry') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS industry TEXT');
        } else if (columnName === 'location') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS location TEXT');
        } else if (columnName === 'lead_source_id') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_source_id UUID REFERENCES public.lead_sources(id)');
        } else if (columnName === 'agency_id') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS agency_id UUID');
          await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_leads_agency_id ON public.leads(agency_id)');
        } else if (columnName === 'tags') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tags TEXT[]');
        } else if (columnName === 'custom_fields') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS custom_fields JSONB');
        } else if (columnName === 'assigned_team') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_team UUID');
        } else if (columnName === 'converted_to_client_id') {
          await agencyClient.query('ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS converted_to_client_id UUID REFERENCES public.clients(id)');
        } else {
          // Try lightweight ALTER TABLE instead of expensive full schema repair
          console.log(`[API] Adding generic ${columnName} column to ${tableName} table (lightweight)...`);
          try {
            await agencyClient.query(`ALTER TABLE public.${tableName} ADD COLUMN IF NOT EXISTS ${columnName} TEXT`);
            console.log(`[API] ✅ Added ${columnName} column to ${tableName} table as TEXT`);
          } catch (addError) {
            console.warn(`[API] ⚠️ Could not add ${columnName} to ${tableName}: ${addError.message}`);
          }
        }
        console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
      } catch (addError) {
        if (addError.message.includes('already exists') || addError.message.includes('duplicate')) {
          console.log(`[API] ℹ️ Column ${columnName} already exists in ${tableName}`);
        } else {
          console.error(`[API] ❌ Failed to add ${columnName}:`, addError.message);
          throw addError;
        }
      }
    } else if (tableName === 'crm_activities') {
      // Handle crm_activities table columns
      console.log(`[API] Adding ${columnName} column to crm_activities table...`);
      try {
        if (columnName === 'due_date') {
          await agencyClient.query('ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE');
        } else if (columnName === 'status') {
          await agencyClient.query('ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS status TEXT DEFAULT \'pending\'');
        } else if (columnName === 'client_id') {
          await agencyClient.query('ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL');
        } else if (columnName === 'completed_date') {
          await agencyClient.query('ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS completed_date TIMESTAMP WITH TIME ZONE');
        } else if (columnName === 'duration') {
          await agencyClient.query('ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS duration INTEGER');
        } else if (columnName === 'outcome') {
          await agencyClient.query('ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS outcome TEXT');
        } else if (columnName === 'location') {
          await agencyClient.query('ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS location TEXT');
        } else if (columnName === 'agenda') {
          await agencyClient.query('ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS agenda TEXT');
        } else if (columnName === 'attendees') {
          await agencyClient.query('ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS attendees TEXT[]');
        } else if (columnName === 'attachments') {
          await agencyClient.query('ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS attachments JSONB');
        } else if (columnName === 'agency_id') {
          await agencyClient.query('ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS agency_id UUID');
          await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_crm_activities_agency_id ON public.crm_activities(agency_id)');
        } else if (columnName === 'type') {
          // Add 'type' column as alias for activity_type (for backward compatibility)
          await agencyClient.query('ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS type TEXT');
        } else if (columnName === 'title') {
          // Add 'title' column as alias for subject (for backward compatibility)
          await agencyClient.query('ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS title TEXT');
        } else if (columnName === 'related_entity_type') {
          await agencyClient.query('ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS related_entity_type TEXT');
        } else if (columnName === 'related_entity_id') {
          await agencyClient.query('ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS related_entity_id UUID');
        } else {
          // For any other crm_activities column, just try to add it as TEXT (lightweight)
          console.log(`[API] Adding generic ${columnName} column to ${tableName} table...`);
          await agencyClient.query(`ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS ${columnName} TEXT`);
        }
        console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
      } catch (addError) {
        if (addError.message.includes('already exists') || addError.message.includes('duplicate')) {
          console.log(`[API] ℹ️ Column ${columnName} already exists in ${tableName}`);
        } else {
          console.error(`[API] ❌ Failed to add ${columnName}:`, addError.message);
          throw addError;
        }
      }
    } else if (tableName === 'lead_sources') {
      // Handle lead_sources table columns
      if (columnName === 'agency_id') {
        console.log(`[API] Adding ${columnName} column to lead_sources table...`);
        try {
          await agencyClient.query('ALTER TABLE public.lead_sources ADD COLUMN IF NOT EXISTS agency_id UUID');
          await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_lead_sources_agency_id ON public.lead_sources(agency_id)');
          console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
        } catch (addError) {
          if (addError.message.includes('already exists') || addError.message.includes('duplicate')) {
            console.log(`[API] ℹ️ Column ${columnName} already exists in ${tableName}`);
          } else {
            console.error(`[API] ❌ Failed to add ${columnName}:`, addError.message);
            throw addError;
          }
        }
      } else {
        // Try lightweight ALTER TABLE instead of expensive full schema repair
        console.log(`[API] Adding generic ${columnName} column to ${tableName} table (lightweight)...`);
        try {
          await agencyClient.query(`ALTER TABLE public.${tableName} ADD COLUMN IF NOT EXISTS ${columnName} TEXT`);
          console.log(`[API] ✅ Added ${columnName} column to ${tableName} table as TEXT`);
        } catch (addError) {
          console.warn(`[API] ⚠️ Could not add ${columnName} to ${tableName}: ${addError.message}`);
        }
      }
    } else if (tableName === 'sales_pipeline') {
      // Handle sales_pipeline table columns
      if (columnName === 'agency_id') {
        console.log(`[API] Adding ${columnName} column to sales_pipeline table...`);
        try {
          await agencyClient.query('ALTER TABLE public.sales_pipeline ADD COLUMN IF NOT EXISTS agency_id UUID');
          await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_sales_pipeline_agency_id ON public.sales_pipeline(agency_id)');
          console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
        } catch (addError) {
          if (addError.message.includes('already exists') || addError.message.includes('duplicate')) {
            console.log(`[API] ℹ️ Column ${columnName} already exists in ${tableName}`);
          } else {
            console.error(`[API] ❌ Failed to add ${columnName}:`, addError.message);
            throw addError;
          }
        }
      } else if (columnName === 'color') {
        console.log(`[API] Adding ${columnName} column to sales_pipeline table...`);
        try {
          await agencyClient.query('ALTER TABLE public.sales_pipeline ADD COLUMN IF NOT EXISTS color TEXT');
          console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
        } catch (addError) {
          if (addError.message.includes('already exists') || addError.message.includes('duplicate')) {
            console.log(`[API] ℹ️ Column ${columnName} already exists in ${tableName}`);
          } else {
            console.error(`[API] ❌ Failed to add ${columnName}:`, addError.message);
            throw addError;
          }
        }
      } else {
        // Try lightweight ALTER TABLE instead of expensive full schema repair
        console.log(`[API] Adding generic ${columnName} column to ${tableName} table (lightweight)...`);
        try {
          await agencyClient.query(`ALTER TABLE public.${tableName} ADD COLUMN IF NOT EXISTS ${columnName} TEXT`);
          console.log(`[API] ✅ Added ${columnName} column to ${tableName} table as TEXT`);
        } catch (addError) {
          console.warn(`[API] ⚠️ Could not add ${columnName} to ${tableName}: ${addError.message}`);
        }
      }
    } else if (tableName === 'attendance') {
      // Handle attendance table columns
      console.log(`[API] Adding ${columnName} column to attendance table...`);
      try {
        if (columnName === 'location') {
          await agencyClient.query('ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS location TEXT');
        } else if (columnName === 'ip_address') {
          await agencyClient.query('ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS ip_address TEXT');
        } else if (columnName === 'agency_id') {
          await agencyClient.query('ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS agency_id UUID');
          await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_attendance_agency_id ON public.attendance(agency_id)');
        } else if (columnName === 'total_hours') {
          await agencyClient.query('ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS total_hours NUMERIC(5, 2)');
          // Sync with hours_worked if it exists
          await agencyClient.query(`
            UPDATE public.attendance 
            SET total_hours = hours_worked 
            WHERE total_hours IS NULL AND hours_worked IS NOT NULL
          `);
        } else if (columnName === 'overtime_hours') {
          await agencyClient.query('ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(5, 2)');
        } else {
          // Try lightweight ALTER TABLE instead of expensive full schema repair
          console.log(`[API] Adding generic ${columnName} column to ${tableName} table (lightweight)...`);
          try {
            await agencyClient.query(`ALTER TABLE public.${tableName} ADD COLUMN IF NOT EXISTS ${columnName} TEXT`);
            console.log(`[API] ✅ Added ${columnName} column to ${tableName} table as TEXT`);
          } catch (addError) {
            console.warn(`[API] ⚠️ Could not add ${columnName} to ${tableName}: ${addError.message}`);
          }
        }
        console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
      } catch (addError) {
        if (addError.message.includes('already exists') || addError.message.includes('duplicate')) {
          console.log(`[API] ℹ️ Column ${columnName} already exists in ${tableName}`);
        } else {
          console.error(`[API] ❌ Failed to add ${columnName}:`, addError.message);
          throw addError;
        }
      }
    } else if (tableName === 'reports') {
      // Handle reports table columns
      console.log(`[API] 🔧 Adding ${columnName} to reports table...`);
      try {
        if (columnName === 'report_type') {
          // First check if 'type' column exists and rename it
          const typeCheck = await agencyClient.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'reports' 
            AND column_name IN ('type', 'report_type')
          `);
          
          const hasType = typeCheck.rows.some(r => r.column_name === 'type');
          const hasReportType = typeCheck.rows.some(r => r.column_name === 'report_type');
          
          console.log(`[API] Reports table check - hasType: ${hasType}, hasReportType: ${hasReportType}`);
          
          if (hasType && !hasReportType) {
            await agencyClient.query('ALTER TABLE public.reports RENAME COLUMN type TO report_type');
            console.log(`[API] ✅ Renamed 'type' to 'report_type' in reports table`);
          } else if (!hasReportType) {
            // Check if table has any rows - if it does, we need to handle NOT NULL constraint
            const rowCount = await agencyClient.query('SELECT COUNT(*) as count FROM public.reports');
            const count = parseInt(rowCount.rows[0].count);
            
            if (count > 0) {
              // Table has data, add as nullable first, then set default and make NOT NULL
              await agencyClient.query('ALTER TABLE public.reports ADD COLUMN report_type TEXT');
              await agencyClient.query('UPDATE public.reports SET report_type = \'custom\' WHERE report_type IS NULL');
              await agencyClient.query('ALTER TABLE public.reports ALTER COLUMN report_type SET NOT NULL');
              await agencyClient.query('ALTER TABLE public.reports ALTER COLUMN report_type SET DEFAULT \'custom\'');
            } else {
              // Empty table, can add as NOT NULL directly
              await agencyClient.query('ALTER TABLE public.reports ADD COLUMN report_type TEXT NOT NULL DEFAULT \'custom\'');
            }
            console.log(`[API] ✅ Added report_type column to reports table`);
          } else {
            console.log(`[API] ℹ️ report_type column already exists in reports table`);
          }
        } else if (columnName === 'file_name') {
          await agencyClient.query('ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS file_name TEXT');
        } else if (columnName === 'file_size') {
          await agencyClient.query('ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS file_size BIGINT');
        } else if (columnName === 'expires_at') {
          await agencyClient.query('ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE');
        } else if (columnName === 'is_public') {
          await agencyClient.query('ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false');
        } else if (columnName === 'agency_id') {
          await agencyClient.query('ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS agency_id UUID');
          await agencyClient.query('CREATE INDEX IF NOT EXISTS idx_reports_agency_id ON public.reports(agency_id)');
        } else {
          // Try lightweight ALTER TABLE instead of expensive full schema repair
          console.log(`[API] Adding generic ${columnName} column to ${tableName} table (lightweight)...`);
          try {
            await agencyClient.query(`ALTER TABLE public.${tableName} ADD COLUMN IF NOT EXISTS ${columnName} TEXT`);
            console.log(`[API] ✅ Added ${columnName} column to ${tableName} table as TEXT`);
          } catch (addError) {
            console.warn(`[API] ⚠️ Could not add ${columnName} to ${tableName}: ${addError.message}`);
          }
        }
        console.log(`[API] ✅ Added ${columnName} column to ${tableName} table`);
      } catch (addError) {
        if (addError.message.includes('already exists') || addError.message.includes('duplicate')) {
          console.log(`[API] ℹ️ Column ${columnName} already exists in ${tableName}`);
        } else {
          console.error(`[API] ❌ Failed to add ${columnName}:`, addError.message);
          throw addError;
        }
      }
        } else {
          // For any other missing column, try lightweight ALTER TABLE first
          console.log(`[API] Adding generic ${columnName} column to ${tableName} table (lightweight)...`);
          try {
            // Try adding as TEXT first (most common type)
            await agencyClient.query(`ALTER TABLE public.${tableName} ADD COLUMN IF NOT EXISTS ${columnName} TEXT`);
            console.log(`[API] ✅ Added ${columnName} column to ${tableName} table as TEXT`);
          } catch (addError) {
            if (addError.message.includes('already exists') || addError.message.includes('duplicate')) {
              console.log(`[API] ℹ️ Column ${columnName} already exists in ${tableName}`);
            } else {
              // For any error, log but don't run expensive full repair
              console.warn(`[API] ⚠️ Could not add ${columnName} to ${tableName}: ${addError.message}`);
              console.warn(`[API] ⚠️ Skipping schema repair to avoid resource waste. Column may need manual addition via migration.`);
              // Don't throw - let the query fail naturally if column is truly needed
            }
          }
        }

    // Verify the column was added
    const verifyResult = await agencyClient.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1 
      AND column_name = $2
    `, [tableName, columnName]);

    if (verifyResult.rows.length === 0) {
      throw new Error(`Column ${columnName} was not added to ${tableName} table`);
    }

    console.log(`[API] ✅ Verified ${columnName} column exists in ${tableName}`);

    // Clear cache to force re-check
    if (global.schemaCheckCache) {
      delete global.schemaCheckCache[`schema_checked_${agencyDatabase}`];
    }
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

module.exports = {
  executeQuery,
  executeTransaction,
  repairMissingColumn,
};
