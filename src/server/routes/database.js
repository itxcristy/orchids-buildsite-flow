/**
 * Database Routes
 * Handles database queries and transactions
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { executeQuery, executeTransaction, repairMissingColumn } = require('../services/databaseService');
const { createAgencySchema } = require('../utils/schemaCreator');
const { parseDatabaseUrl } = require('../utils/poolManager');

/**
 * POST /api/database/query
 * Execute a single database query
 */
router.post('/query', asyncHandler(async (req, res) => {
  let { sql: originalSql, params: originalParams = [], userId } = req.body;
  const agencyDatabase = req.headers['x-agency-database'];

  // Validate SQL early
  if (!originalSql) {
    return res.status(400).json({ error: 'SQL query is required' });
  }

  let sql = originalSql.trim();
  let params = [...originalParams]; // Create a copy to modify

  // Safety check: Remove agency_id from agency_settings INSERT/UPDATE queries
  // agency_settings table doesn't have agency_id column - each agency has its own database
  if (sql.includes('agency_settings') && sql.includes('INSERT INTO')) {
    // Check if agency_id is present (case-insensitive)
    if (sql.match(/\bagency_id\b/i)) {
      console.log('[API] ⚠️ Detected agency_id in agency_settings INSERT, removing it...');
      
      // Match the full INSERT statement including RETURNING clause
      const fullMatch = sql.match(/INSERT\s+INTO\s+([^(]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)\s*(RETURNING\s+\*)?/is);
      
      if (fullMatch) {
        const tablePart = fullMatch[1].trim();
        const columnsStr = fullMatch[2];
        const valuesStr = fullMatch[3];
        const returningClause = fullMatch[4] || '';
        
        // Parse columns and values
        const columns = columnsStr.split(',').map(c => c.trim());
        const values = valuesStr.split(',').map(v => v.trim());
        
        // Find agency_id index
        const agencyIdIndex = columns.findIndex(c => c.toLowerCase() === 'agency_id');
        
        if (agencyIdIndex !== -1) {
          console.log('[API] Found agency_id at column index:', agencyIdIndex);
          console.log('[API] Original columns count:', columns.length);
          console.log('[API] Original params count:', params.length);
          
          // Remove agency_id from columns
          columns.splice(agencyIdIndex, 1);
          
          // Remove corresponding value placeholder
          values.splice(agencyIdIndex, 1);
          
          // Rebuild the SQL
          sql = `INSERT INTO ${tablePart} (${columns.join(',')}) VALUES (${values.join(',')})${returningClause}`;
          
          // Remove the corresponding parameter from params array
          if (params.length > agencyIdIndex) {
            params.splice(agencyIdIndex, 1);
          }
          
          console.log('[API] ✅ Removed agency_id - New columns count:', columns.length);
          console.log('[API] ✅ New params count:', params.length);
        }
      } else {
        // Fallback: aggressive regex replacement
        console.log('[API] ⚠️ Full match failed, using fallback regex');
        sql = sql.replace(/,\s*agency_id\s*(?=,|\))/gi, '');
        sql = sql.replace(/\(\s*agency_id\s*,/gi, '(');
        sql = sql.replace(/,\s*agency_id\s*\)/gi, ')');
        sql = sql.replace(/\(\s*agency_id\s*\)/gi, '()');
      }
    }
  }
  
  // Remove agency_id from UPDATE statements
  if (sql.includes('agency_settings') && sql.includes('UPDATE') && sql.includes('agency_id')) {
    sql = sql.replace(/,\s*agency_id\s*=\s*\$?\d+/gi, '');
    sql = sql.replace(/agency_id\s*=\s*\$?\d+\s*,/gi, '');
  }

  try {
    const result = await executeQuery(sql, params, agencyDatabase, userId);
    res.json({
      rows: result.rows,
      rowCount: result.rowCount,
    });
  } catch (error) {
    console.error('[API] Query error:', error);
    console.error('[API] Error code:', error.code);
    console.error('[API] Error message:', error.message);
    console.error('[API] Error detail:', error.detail);

    // Handle missing notifications table in MAIN database (not agency database)
    if (error.code === '42P01' && error.message.includes('notifications') && !agencyDatabase) {
      console.log('[API] Notifications table missing in main database, creating...');
      try {
        const { pool } = require('../config/database');
        const client = await pool.connect();
        try {
          const { ensureNotificationsTable } = require('../utils/schema/miscSchema');
          await ensureNotificationsTable(client);
          console.log('[API] ✅ Notifications table created in main database, retrying query...');
          
          // Retry the query
          const retryResult = await executeQuery(sql, params, agencyDatabase, userId);
          return res.json({
            rows: retryResult.rows,
            rowCount: retryResult.rowCount,
          });
        } finally {
          client.release();
        }
      } catch (repairError) {
        console.error('[API] Failed to repair notifications table:', repairError);
      }
    }

    // Handle missing database (3D000 = database does not exist)
    if (error.code === '3D000' && agencyDatabase) {
      console.log(`[API] Database does not exist: ${agencyDatabase}`);
      
      // Check if agency exists in main database
      try {
        const { pool } = require('../config/database');
        const agencyCheck = await pool.query(
          'SELECT id, name FROM agencies WHERE database_name = $1',
          [agencyDatabase]
        );
        
        if (agencyCheck.rows.length === 0) {
          // Agency doesn't exist - invalid reference
          return res.status(404).json({
            error: 'Agency database not found',
            message: `Agency database "${agencyDatabase}" does not exist. Please log out and log in again.`,
            code: 'AGENCY_DB_NOT_FOUND'
          });
        }
        
        // Agency exists but database is missing - try to create it
        console.log(`[API] Agency exists but database missing. Creating database: ${agencyDatabase}`);
        const { createAgencySchema } = require('../utils/schemaCreator');
        const { parseDatabaseUrl } = require('../utils/poolManager');
        const { Pool } = require('pg');
        
        const { host, port, user, password } = parseDatabaseUrl();
        const postgresUrl = `postgresql://${user}:${password}@${host}:${port}/postgres`;
        const postgresPool = new Pool({ connectionString: postgresUrl, max: 1 });
        const postgresClient = await postgresPool.connect();
        
        try {
          // Create database securely
          const { validateDatabaseName, quoteIdentifier } = require('../utils/securityUtils');
          const validatedDbName = validateDatabaseName(agencyDatabase);
          const quotedDbName = quoteIdentifier(validatedDbName);
          await postgresClient.query(`CREATE DATABASE ${quotedDbName}`);
          console.log(`[API] ✅ Database created: ${agencyDatabase}`);
          
          // Connect to new database and create schema
          const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
          const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
          const agencyClient = await agencyPool.connect();
          
          try {
            await createAgencySchema(agencyClient);
            console.log(`[API] ✅ Schema created for: ${agencyDatabase}`);
            
            // Retry the original query
            const retryResult = await executeQuery(sql, params, agencyDatabase, userId);
            return res.json({
              rows: retryResult.rows,
              rowCount: retryResult.rowCount,
            });
          } finally {
            agencyClient.release();
            await agencyPool.end();
          }
        } catch (createError) {
          console.error(`[API] Error creating database/schema:`, createError);
          return res.status(500).json({
            error: 'Failed to create agency database',
            message: createError.message,
            code: 'DB_CREATION_FAILED'
          });
        } finally {
          postgresClient.release();
          await postgresPool.end();
        }
      } catch (checkError) {
        console.error(`[API] Error checking agency:`, checkError);
        return res.status(500).json({
          error: 'Database error',
          message: checkError.message,
          code: 'DB_CHECK_FAILED'
        });
      }
    }

    // DISABLED: Automatic schema repair consumes too much CPU
    // Schema should be created during agency setup, not on every query error
    // Only repair if explicitly enabled via environment variable
    if (false && (error.code === '42P01' || error.code === '42883') && agencyDatabase && req && !req._schemaRepairAttempted && process.env.ENABLE_SCHEMA_REPAIR === 'true') {
      // 42P01 = relation does not exist (table/view)
      // 42883 = function does not exist
      req._schemaRepairAttempted = true; // Prevent infinite loops
      console.log(`[API] Missing table/function detected (${error.code}), attempting schema repair (one time only)...`);
      try {
        const { host, port, user, password } = parseDatabaseUrl();
        const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
        const { Pool } = require('pg');
        const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
        const agencyClient = await agencyPool.connect();
        try {
          // Check which table is missing and repair appropriate schema
          const tableMatch = error.message.match(/relation "public\.([^"]+)" does not exist/);
          const missingTable = tableMatch ? tableMatch[1] : null;
          
          if (missingTable) {
            console.log(`[API] Missing table detected: ${missingTable}`);
            
            // Document tables - repair misc schema
            if (['document_folders', 'documents', 'document_versions', 'document_permissions'].includes(missingTable)) {
              // Ensure shared functions first (needed for triggers)
              const { ensureSharedFunctions } = require('../utils/schema/sharedFunctions');
              try {
                await ensureSharedFunctions(agencyClient);
                console.log(`[API] ✅ Shared functions ensured`);
              } catch (funcError) {
                console.warn(`[API] ⚠️ Could not ensure shared functions:`, funcError.message);
                // Continue anyway - tables can be created without triggers
              }
              
              const { ensureMiscSchema } = require('../utils/schema/miscSchema');
              await ensureMiscSchema(agencyClient);
              console.log(`[API] ✅ Document tables schema repair completed, retrying query...`);
            }
            // Holidays and company events - repair misc schema
            else if (['holidays', 'company_events', 'calendar_settings', 'notifications'].includes(missingTable)) {
              const { ensureMiscSchema, ensureNotificationsTable } = require('../utils/schema/miscSchema');
              // Explicitly ensure notifications table first
              if (missingTable === 'notifications') {
                await ensureNotificationsTable(agencyClient);
                console.log(`[API] ✅ Notifications table explicitly created`);
              }
              await ensureMiscSchema(agencyClient);
              console.log(`[API] ✅ Miscellaneous schema repair completed for ${missingTable}, retrying query...`);
            }
            // Leave requests - repair HR schema
            else if (['leave_requests', 'leave_types', 'employee_details', 'employee_salary_details', 'employee_files', 'payroll', 'payroll_periods'].includes(missingTable)) {
              const { ensureHrSchema } = require('../utils/schema/hrSchema');
              await ensureHrSchema(agencyClient);
              console.log(`[API] ✅ HR schema repair completed for ${missingTable}, retrying query...`);
            }
            // Reimbursement - repair reimbursement schema
            else if (['reimbursement_requests', 'reimbursement_attachments', 'expense_categories'].includes(missingTable)) {
              const { ensureReimbursementSchema } = require('../utils/schema/reimbursementSchema');
              await ensureReimbursementSchema(agencyClient);
              console.log(`[API] ✅ Reimbursement schema repair completed for ${missingTable}, retrying query...`);
            }
            // Projects and tasks - repair projects schema
            else if (['projects', 'tasks', 'task_assignments', 'task_comments', 'task_time_tracking'].includes(missingTable)) {
              const { ensureProjectsTasksSchema } = require('../utils/schema/projectsTasksSchema');
              await ensureProjectsTasksSchema(agencyClient);
              console.log(`[API] ✅ Projects schema repair completed for ${missingTable}, retrying query...`);
            }
            // Invoices and clients - repair clients financial schema
            else if (['invoices', 'clients', 'quotations', 'quotation_templates', 'quotation_line_items'].includes(missingTable)) {
              const { ensureClientsFinancialSchema } = require('../utils/schema/clientsFinancialSchema');
              await ensureClientsFinancialSchema(agencyClient);
              console.log(`[API] ✅ Clients/Financial schema repair completed for ${missingTable}, retrying query...`);
            }
            // GST tables - repair GST schema
            else if (missingTable.startsWith('gst_')) {
              const { ensureGstSchema } = require('../utils/schema/gstSchema');
              await ensureGstSchema(agencyClient);
              console.log(`[API] ✅ GST schema repair completed, retrying query...`);
            }
            // For other missing tables, run full schema creation
            else {
              const { createAgencySchema } = require('../utils/schemaCreator');
              await createAgencySchema(agencyClient);
              console.log(`[API] ✅ Full schema repair completed for ${missingTable}, retrying query...`);
            }
          } else {
            // If we can't identify the table, run full schema creation
            const { createAgencySchema } = require('../utils/schemaCreator');
            await createAgencySchema(agencyClient);
            console.log(`[API] ✅ Full schema repair completed, retrying query...`);
          }
          
          // Wait a moment for schema to be fully available
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Verify table exists before retrying
          const tableCheck = await agencyClient.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = $1
            )
          `, [missingTable]);
          
          if (!tableCheck.rows[0].exists) {
            console.error(`[API] ❌ Table ${missingTable} still does not exist after schema repair`);
            // Try one more time with explicit table creation
            if (missingTable === 'document_folders') {
              const { ensureDocumentFoldersTable } = require('../utils/schema/miscSchema');
              await ensureDocumentFoldersTable(agencyClient);
              console.log(`[API] ✅ Explicitly created ${missingTable} table`);
            } else if (missingTable === 'documents') {
              const { ensureDocumentsTable } = require('../utils/schema/miscSchema');
              await ensureDocumentsTable(agencyClient);
              console.log(`[API] ✅ Explicitly created ${missingTable} table`);
            } else if (missingTable === 'notifications') {
              const { ensureNotificationsTable } = require('../utils/schema/miscSchema');
              await ensureNotificationsTable(agencyClient);
              console.log(`[API] ✅ Explicitly created ${missingTable} table`);
            } else {
              throw new Error(`Table ${missingTable} was not created`);
            }
          }
          
          console.log(`[API] ✅ Verified table ${missingTable} exists, retrying query...`);
          
          // Retry the query
          const retryResult = await executeQuery(sql, params, agencyDatabase, userId);
          console.log(`[API] ✅ Query retry successful after schema repair`);
          return res.json({
            rows: retryResult.rows,
            rowCount: retryResult.rowCount,
          });
        } finally {
          agencyClient.release();
          await agencyPool.end();
        }
      } catch (repairError) {
        console.error('[API] ❌ Schema repair failed:', repairError.message);
        console.error('[API] Repair error stack:', repairError.stack);
        // Fall through to return original error
      }
    }

    // If it's a NOT NULL constraint violation for leads.name, try to make it nullable and retry
    if (error.code === '23502' && agencyDatabase && error.message.includes('column "name" of relation "leads"')) {
      console.log(`[API] NOT NULL constraint violation detected for leads.name, attempting to make nullable...`);
      try {
        const { host, port, user, password } = parseDatabaseUrl();
        const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
        const { Pool } = require('pg');
        const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
        const agencyClient = await agencyPool.connect();
        try {
          await agencyClient.query('ALTER TABLE public.leads ALTER COLUMN name DROP NOT NULL');
          console.log(`[API] ✅ Made leads.name column nullable`);
          
          // Wait a moment for the change to be fully available
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Retry the query
          const retryResult = await executeQuery(sql, params, agencyDatabase, userId);
          console.log(`[API] ✅ Query retry successful after making leads.name nullable`);
          return res.json({
            rows: retryResult.rows,
            rowCount: retryResult.rowCount,
          });
        } finally {
          agencyClient.release();
          await agencyPool.end();
        }
      } catch (repairError) {
        console.error('[API] ❌ Failed to make leads.name nullable:', repairError.message);
        // Fall through to return original error
      }
    }

    // DISABLED: Automatic column repair consumes too much CPU
    // Columns should be added via migrations, not on every query error
    // Only repair if explicitly enabled via environment variable
    if (false && error.code === '42703' && agencyDatabase && error.message.includes('does not exist') && !req._columnRepairAttempted && process.env.ENABLE_SCHEMA_REPAIR === 'true') {
      req._columnRepairAttempted = true; // Prevent infinite loops
      const columnMatch = error.message.match(/column "([^"]+)" of relation "([^"]+)"/);
      if (columnMatch) {
        const [, columnName, tableName] = columnMatch;
        console.log(`[API] Missing column detected: ${tableName}.${columnName}, attempting to add...`);
        
        // Special handling for reimbursement tables - run full reimbursement schema repair
        if (tableName === 'reimbursement_requests' || tableName === 'expense_categories') {
          try {
            console.log(`[API] Running reimbursement schema repair for ${tableName}.${columnName}...`);
            const { host, port, user, password } = parseDatabaseUrl();
            const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
            const { Pool } = require('pg');
            const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
            const agencyClient = await agencyPool.connect();
            try {
              const { ensureReimbursementSchema } = require('../utils/schema/reimbursementSchema');
              await ensureReimbursementSchema(agencyClient);
              console.log(`[API] ✅ Reimbursement schema repair completed`);
            } finally {
              agencyClient.release();
              await agencyPool.end();
            }
            
            // Wait a moment for schema to be fully available
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Retry the query
            const retryResult = await executeQuery(sql, params, agencyDatabase, userId);
            console.log(`[API] ✅ Query retry successful after reimbursement schema repair`);
            return res.json({
              rows: retryResult.rows,
              rowCount: retryResult.rowCount,
            });
          } catch (repairError) {
            console.error('[API] ❌ Reimbursement schema repair failed:', repairError.message);
            // Fall through to return original error
          }
        }
        
        // Special handling for clients billing columns - add all at once
        const billingColumns = ['billing_city', 'billing_state', 'billing_postal_code', 'billing_country'];
        const isBillingColumn = tableName === 'clients' && billingColumns.includes(columnName);
        
        try {
          if (isBillingColumn) {
            // For billing columns, add all of them at once to prevent multiple repair cycles
            console.log(`[API] Detected missing billing column, adding all billing columns to clients table...`);
            const { host, port, user, password } = parseDatabaseUrl();
            const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
            const { Pool } = require('pg');
            const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
            const agencyClient = await agencyPool.connect();
            try {
              // Check which billing columns exist first
              const columnCheck = await agencyClient.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'clients' 
                AND column_name IN ('billing_city', 'billing_state', 'billing_postal_code', 'billing_country')
              `);
              const existingColumns = columnCheck.rows.map(r => r.column_name);
              const missingColumns = billingColumns.filter(col => !existingColumns.includes(col));
              
              if (missingColumns.length > 0) {
                console.log(`[API] Adding missing billing columns: ${missingColumns.join(', ')}`);
                for (const col of missingColumns) {
                  await agencyClient.query(`ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ${col} TEXT`);
                }
                console.log(`[API] ✅ Added all missing billing columns to clients table`);
              } else {
                console.log(`[API] ℹ️ All billing columns already exist`);
              }
            } finally {
              agencyClient.release();
              await agencyPool.end();
            }
          } else {
            await repairMissingColumn(agencyDatabase, tableName, columnName);
          }

          // Wait a moment for the column(s) to be fully available
          await new Promise(resolve => setTimeout(resolve, 300));

          // Retry the query
          const retryResult = await executeQuery(sql, params, agencyDatabase, userId);
          console.log(`[API] ✅ Query retry successful after adding ${columnName} to ${tableName}`);
          return res.json({
            rows: retryResult.rows,
            rowCount: retryResult.rowCount,
          });
        } catch (repairError) {
          console.error('[API] ❌ Column repair failed:', repairError.message);
          // Try one more time with full schema repair
          try {
            console.log('[API] Attempting full schema repair as fallback...');
            const { host, port, user, password } = parseDatabaseUrl();
            const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
            const { Pool } = require('pg');
            const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
            const agencyClient = await agencyPool.connect();
            try {
              await createAgencySchema(agencyClient);
              const retryResult = await executeQuery(sql, params, agencyDatabase, userId);
              return res.json({
                rows: retryResult.rows,
                rowCount: retryResult.rowCount,
              });
            } finally {
              agencyClient.release();
              await agencyPool.end();
            }
          } catch (fallbackError) {
            console.error('[API] ❌ Full schema repair also failed:', fallbackError.message);
            // Fall through to return original error
          }
        }
      }
    }

    // Return detailed error information for debugging
    const errorResponse = {
      error: error.message || 'Database query failed',
      detail: error.detail,
      code: error.code,
      hint: error.hint,
      position: error.position,
      internalQuery: error.internalQuery,
      internalPosition: error.internalPosition,
      where: error.where,
      schema: error.schema,
      table: error.table,
      column: error.column,
      dataType: error.dataType,
      constraint: error.constraint,
      file: error.file,
      line: error.line,
      routine: error.routine
    };
    
    // Remove undefined fields
    Object.keys(errorResponse).forEach(key => {
      if (errorResponse[key] === undefined) {
        delete errorResponse[key];
      }
    });
    
    res.status(500).json(errorResponse);
  }
}));

/**
 * POST /api/database/transaction
 * Execute multiple queries in a single transaction
 */
router.post('/transaction', asyncHandler(async (req, res) => {
  try {
    const { queries = [], userId } = req.body;
    const agencyDatabase = req.headers['x-agency-database'];

    const results = await executeTransaction(queries, agencyDatabase, userId);

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('[API] Transaction error:', error);
    res.status(500).json({
      error: error.message,
      detail: error.detail,
      code: error.code,
    });
  }
}));

module.exports = router;
