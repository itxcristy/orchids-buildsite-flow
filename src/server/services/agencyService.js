/**
 * Agency Service
 * Handles agency creation, domain checking, setup completion, and database repair
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { pool } = require('../config/database');
const { createAgencySchema } = require('../utils/schemaCreator');
const { parseDatabaseUrl } = require('../utils/poolManager');
const { DATABASE_URL } = require('../config/constants');

/**
 * Check if domain is available
 * @param {string} domain - Domain to check
 * @returns {Promise<boolean>} True if available
 */
async function checkDomainAvailability(domain) {
  const mainClient = await pool.connect();
  try {
    // Extract subdomain from input (in case full domain is passed)
    // e.g., "company-id.app" -> "company-id" or just "company-id" -> "company-id"
    const subdomain = domain.toLowerCase().trim().split('.')[0];
    
    // Check if any domain with this subdomain exists (regardless of suffix)
    // This ensures uniqueness across all domain suffixes
    const result = await mainClient.query(
      `SELECT id FROM public.agencies 
       WHERE domain LIKE $1 OR domain = $2`,
      [`${subdomain}.%`, subdomain]
    );
    return result.rows.length === 0;
  } finally {
    mainClient.release();
  }
}

/**
 * Check agency setup status
 * @param {string} agencyDatabase - Agency database name
 * @returns {Promise<boolean>} True if setup is complete
 */
async function checkSetupStatus(agencyDatabase) {
  if (!agencyDatabase) {
    return false;
  }

  // Use pool manager for existing agency databases
  const { getAgencyPool } = require('../utils/poolManager');
  const agencyPool = getAgencyPool(agencyDatabase);
  const agencyClient = await agencyPool.connect();

  try {
    const setupCheck = await agencyClient.query(`
      SELECT setup_complete FROM public.agency_settings LIMIT 1
    `);
    return setupCheck.rows[0]?.setup_complete || false;
  } finally {
    agencyClient.release();
    // Don't close pool - it's managed by pool manager
  }
}

/**
 * Get detailed agency setup progress
 * @param {string} agencyDatabase - Agency database name
 * @returns {Promise<Object>} Setup progress details
 */
async function getSetupProgress(agencyDatabase) {
  const defaultResponse = {
    setupComplete: false,
    progress: 0,
    completedSteps: [],
    totalSteps: 7,
    lastUpdated: null,
    agencyName: null,
  };

  if (!agencyDatabase) {
    return defaultResponse;
  }

  // Use pool manager for existing agency databases
  const { getAgencyPool } = require('../utils/poolManager');
  const agencyPool = getAgencyPool(agencyDatabase);
  const agencyClient = await agencyPool.connect();

  try {
    // Ensure newer optional columns exist to avoid errors when selecting them
    const optionalColumns = [
      'company_tagline',
      'industry',
      'business_type',
      'legal_name',
      'phone',
      'email',
      'website',
      'currency',
      'timezone'
    ];
    
    for (const column of optionalColumns) {
      try {
        await agencyClient.query(`
          ALTER TABLE public.agency_settings 
          ADD COLUMN IF NOT EXISTS ${column} TEXT
        `);
      } catch (e) {
        // Non-fatal - column might already exist or table might not exist
        if (!e.message.includes('already exists') && !e.message.includes('does not exist')) {
          // Silently ignore - column might already exist or table might not exist yet
        }
      }
    }

    // Query with all columns (they should exist after schema creation)
    let result;
    try {
      result = await agencyClient.query(`
        SELECT 
          setup_complete,
          agency_name,
          company_tagline,
          industry,
          business_type,
          legal_name,
          phone,
          email,
          website,
          COALESCE(currency, default_currency) as currency,
          timezone,
          updated_at
        FROM public.agency_settings LIMIT 1
      `);
    } catch (queryError) {
      // If query fails due to missing columns, try to add them and retry once
      if (queryError.code === '42703' && queryError.message.includes('does not exist')) {
        try {
          // Try to add missing columns dynamically
          const missingColumn = queryError.message.match(/column "(\w+)" does not exist/)?.[1];
          if (missingColumn) {
            await agencyClient.query(`
              ALTER TABLE public.agency_settings 
              ADD COLUMN IF NOT EXISTS ${missingColumn} TEXT
            `);
            // Retry the query
            result = await agencyClient.query(`
              SELECT 
                setup_complete,
                agency_name,
                company_tagline,
                industry,
                business_type,
                legal_name,
                phone,
                email,
                website,
                COALESCE(currency, default_currency) as currency,
                timezone,
                updated_at
              FROM public.agency_settings LIMIT 1
            `);
          } else {
            return defaultResponse;
          }
        } catch (retryError) {
          // If retry fails, return default response silently
          return defaultResponse;
        }
      } else {
        // For other errors, return default response silently
        return defaultResponse;
      }
    }

    if (result.rows.length === 0) {
      return defaultResponse;
    }

    const settings = result.rows[0];
    const completedSteps = [];
    let stepCount = 0;

    // Step 1: Company Profile
    if (settings.agency_name) {
      completedSteps.push('Company Profile');
      stepCount++;
    }

    // Step 2: Business Details
    if (settings.legal_name || settings.phone || settings.email) {
      completedSteps.push('Business Details');
      stepCount++;
    }

    // Step 3: Departments
    try {
      const deptResult = await agencyClient.query(`
        SELECT COUNT(*) as count FROM public.departments
      `);
      if (deptResult.rows.length > 0 && parseInt(deptResult.rows[0].count) > 0) {
        completedSteps.push('Departments');
        stepCount++;
      }
    } catch (deptError) {
      // Silently continue without this step
      // Department check is optional for setup progress
    }

    // Step 4: Financial Setup
    if (settings.currency) {
      completedSteps.push('Financial Setup');
      stepCount++;
    }

    // Step 5: Team Members (check if there are more than 1 user, indicating team members were added)
    try {
      const teamResult = await agencyClient.query(`
        SELECT COUNT(*) as count FROM public.users
      `);
      if (teamResult.rows.length > 0) {
        const userCount = parseInt(teamResult.rows[0].count) || 0;
        // If there are 2+ users, assume team members were added (1 is the admin created during agency creation)
        if (userCount > 1) {
          completedSteps.push('Team Members');
          stepCount++;
        }
      }
    } catch (teamError) {
      console.error('[Setup Progress] Error checking team members:', teamError);
      // Continue without this step
    }

    // Step 6: Preferences
    if (settings.timezone) {
      completedSteps.push('Preferences');
      stepCount++;
    }

    // Step 7: Review (always available if other steps are done)
    if (stepCount >= 6) {
      completedSteps.push('Review');
      stepCount++;
    }

    const progress = Math.round((stepCount / 7) * 100);

    return {
      setupComplete: settings.setup_complete || false,
      progress: progress || 0,
      completedSteps: Array.isArray(completedSteps) ? completedSteps : [],
      totalSteps: 7,
      lastUpdated: settings.updated_at || null,
      agencyName: settings.agency_name || null,
    };
    } catch (error) {
      // Return default response silently - setup progress is non-critical
      return defaultResponse;
    } finally {
      try {
        agencyClient.release();
        // Don't close pool - it's managed by pool manager
      } catch (cleanupError) {
        // Silently ignore cleanup errors
      }
    }
}

/**
 * Create a new agency with isolated database
 * @param {Object} agencyData - Agency creation data
 * @returns {Promise<Object>} Created agency information
 */
/**
 * Parse address string into structured fields
 * Handles formats like "123 Main St, City, State 12345, Country"
 * @param {string} addressString - Address string to parse
 * @returns {Object} Parsed address object with street, city, state, zipCode, country
 */
function parseAddressString(addressString) {
  if (!addressString || typeof addressString !== 'string' || !addressString.trim()) {
    return { street: null, city: null, state: null, zipCode: null, country: null };
  }

  const trimmed = addressString.trim();
  
  // Try to parse common formats
  // Format: "Street, City, State ZIP, Country"
  const commaPattern = /^(.+?),\s*(.+?),\s*(.+?)\s+(\d{5}(?:-\d{4})?)(?:,\s*(.+))?$/;
  const match = trimmed.match(commaPattern);
  
  if (match) {
    return {
      street: match[1].trim() || null,
      city: match[2].trim() || null,
      state: match[3].trim() || null,
      zipCode: match[4].trim() || null,
      country: match[5] ? match[5].trim() : null,
    };
  }
  
  // Format: "Street, City, State, Country"
  const simpleCommaPattern = /^(.+?),\s*(.+?),\s*(.+?)(?:,\s*(.+))?$/;
  const simpleMatch = trimmed.match(simpleCommaPattern);
  
  if (simpleMatch) {
    return {
      street: simpleMatch[1].trim() || null,
      city: simpleMatch[2].trim() || null,
      state: simpleMatch[3].trim() || null,
      zipCode: null,
      country: simpleMatch[4] ? simpleMatch[4].trim() : null,
    };
  }
  
  // If no pattern matches, treat entire string as street
  return {
    street: trimmed,
    city: null,
    state: null,
    zipCode: null,
    country: null,
  };
}

async function createAgency(agencyData) {
  const {
    agencyName,
    domain,
    adminName,
    adminEmail,
    adminPassword,
    subscriptionPlan,
    phone,
    // Optional onboarding metadata
    primaryFocus,
    enableGST,
    modules,
    industry,
    companySize,
    address,
    business_goals,
    page_ids,
  } = agencyData;

  // Validate required fields
  if (!agencyName || !domain || !adminName || !adminEmail || !adminPassword || !subscriptionPlan) {
    throw new Error('Missing required fields: agencyName, domain, adminName, adminEmail, adminPassword, subscriptionPlan');
  }

  // Generate UUIDs
  const agencyId = crypto.randomUUID();
  const adminUserId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const userRoleId = crypto.randomUUID();
  const agencySettingsId = crypto.randomUUID();

  // Hash password
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Plan limits – keep for backward compatibility, but pricing is feature-based.
  // We still populate max_users for legacy code paths, but plans should be managed
  // via feature flags in subscription_plans / plan_features, not per-user pricing.
  const planLimits = {
    starter: 5,
    professional: 25,
    enterprise: 1000,
  };
  const maxUsers = planLimits[subscriptionPlan] || 25;

  // Generate database name
  // Extract subdomain from full domain (e.g., "company-id.app" -> "company-id")
  const { host, port, user, password } = parseDatabaseUrl();
  let subdomain = domain || '';
  // If domain contains a dot, extract the subdomain part (before first dot)
  if (subdomain.includes('.')) {
    subdomain = subdomain.split('.')[0];
  }
  const sanitizedDomain = subdomain
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'agency';

  // PostgreSQL limits identifiers (like database names) to 63 bytes.
  // We ensure the generated name never exceeds this limit by truncating
  // the domain portion while preserving a unique suffix from the agencyId.
  const prefix = 'agency_';
  const suffix = `_${agencyId.substring(0, 8)}`;
  const maxIdentifierLength = 63;
  const maxDomainLength = Math.max(
    1,
    maxIdentifierLength - prefix.length - suffix.length
  );
  const truncatedDomain = sanitizedDomain.slice(0, maxDomainLength);
  const dbName = `${prefix}${truncatedDomain}${suffix}`;

  const mainClient = await pool.connect();
  let postgresClient = null;
  let postgresPool = null;
  let agencyDbClient = null;
  let agencyPool = null;

  try {
    // Check domain availability BEFORE creating database
    const domainAvailable = await checkDomainAvailability(domain);
    if (!domainAvailable) {
      // If the domain is already taken, treat this as an idempotent request:
      // return the existing agency instead of throwing an error.
      console.log(`[API] Domain "${domain}" is already registered. Returning existing agency (idempotent create).`);

      // Try to find the existing agency by domain (supports full domain and subdomain-based patterns)
      const subdomainForSearch = (domain || '').toLowerCase().trim().split('.')[0];
      const existingAgencyResult = await mainClient.query(
        `SELECT 
           id, name, domain, database_name, owner_user_id, 
           subscription_plan, max_users
         FROM public.agencies
         WHERE domain = $1
            OR domain = $2
            OR domain LIKE $3
         ORDER BY created_at ASC
         LIMIT 1`,
        [
          domain,
          subdomainForSearch,
          `${subdomainForSearch}.%`,
        ]
      );

      if (existingAgencyResult.rows.length > 0) {
        const existing = existingAgencyResult.rows[0];

        console.log(
          `[API] ✅ Using existing agency for domain "${domain}": ${existing.id} (db: ${existing.database_name})`
        );

        return {
          agency: {
            id: existing.id,
            name: existing.name,
            domain: existing.domain,
            databaseName: existing.database_name,
            subscriptionPlan: existing.subscription_plan,
          },
          admin: {
            id: existing.owner_user_id,
            email: adminEmail,
            name: adminName,
          },
          reusedExisting: true,
        };
      }

      // If for some reason the domain is reported as taken but no row is found,
      // fall back to a clear error message.
      throw new Error(`Domain "${domain}" is already taken. Please choose a different domain.`);
    }

    // Connect to postgres database to create new database
    console.log(`[API] Connecting to PostgreSQL server to create database: ${dbName}`);
    postgresPool = new Pool({
      host,
      port,
      user,
      password,
      database: 'postgres',
    });
    postgresClient = await postgresPool.connect();
    
    // Verify connection to postgres database
    const postgresCheck = await postgresClient.query('SELECT current_database()');
    console.log(`[API] ✅ Connected to: ${postgresCheck.rows[0].current_database}`);

    // Validate database name before using it in queries
    const { validateDatabaseName, quoteIdentifier } = require('../utils/securityUtils');
    const validatedDbName = validateDatabaseName(dbName);
    const quotedDbName = quoteIdentifier(validatedDbName);
    
    // Check if database already exists
    const dbExistsCheck = await postgresClient.query(`
      SELECT EXISTS(
        SELECT FROM pg_database WHERE datname = $1
      )
    `, [validatedDbName]);
    
    if (dbExistsCheck.rows[0].exists) {
      console.log(`[API] ⚠️ Database ${validatedDbName} already exists, dropping it first...`);
      // Terminate all connections to the database
      await postgresClient.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [validatedDbName]);
      // Use quoted identifier for DROP DATABASE
      await postgresClient.query(`DROP DATABASE IF EXISTS ${quotedDbName}`);
      console.log(`[API] ✅ Dropped existing database: ${validatedDbName}`);
    }

    // Create the agency database using quoted identifier
    console.log(`[API] Creating isolated database: ${validatedDbName}`);
    await postgresClient.query(`CREATE DATABASE ${quotedDbName}`);
    
    // Verify database was created
    const dbCreatedCheck = await postgresClient.query(`
      SELECT EXISTS(
        SELECT FROM pg_database WHERE datname = $1
      )
    `, [dbName]);
    
    if (!dbCreatedCheck.rows[0].exists) {
      throw new Error(`Failed to create database: ${dbName}`);
    }
    console.log(`[API] ✅ Database created: ${dbName}`);

    // Release postgres connection before connecting to new database
    postgresClient.release();
    await postgresPool.end();

    // Connect to the new agency database (isolated)
    // Use pool manager for the newly created database
    console.log(`[API] Connecting to isolated agency database: ${validatedDbName}`);
    const { getAgencyPool } = require('../utils/poolManager');
    agencyPool = getAgencyPool(validatedDbName);
    agencyDbClient = await agencyPool.connect();
    
    // Verify we're connected to the correct isolated database
    const currentDbCheck = await agencyDbClient.query('SELECT current_database()');
    if (currentDbCheck.rows[0].current_database !== dbName) {
      throw new Error(`Database isolation error: expected ${dbName}, got ${currentDbCheck.rows[0].current_database}`);
    }
    console.log(`[API] ✅ Connected to isolated database: ${currentDbCheck.rows[0].current_database}`);
    
    // Verify database is empty (no tables should exist yet)
    const initialTablesCheck = await agencyDbClient.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    console.log(`[API] ✅ Database is clean (${initialTablesCheck.rows[0].count} tables exist)`);

    // Create schema
    console.log(`[API] Creating schema for database: ${dbName}`);
    await createAgencySchema(agencyDbClient);
    
    // Verify critical tables exist after schema creation
    const criticalTablesCheck = await agencyDbClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'profiles', 'user_roles', 'attendance')
    `);
    const existingTables = criticalTablesCheck.rows.map(r => r.table_name);
    const requiredTables = ['users', 'profiles', 'user_roles', 'attendance'];
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      throw new Error(`Critical tables missing after schema creation: ${missingTables.join(', ')}`);
    }
    
    console.log(`[API] ✅ Schema created and verified. Existing tables: ${existingTables.join(', ')}`);

    // Create initial agency_settings row in agency database with onboarding data
    console.log(`[API] Creating initial agency_settings in agency database`);
    const parsedAddress = address ? parseAddressString(address) : { street: null, city: null, state: null, zipCode: null, country: null };
    
    // Ensure agency_settings table exists and has all required columns
    await agencyDbClient.query(`
      DO $$
      BEGIN
        -- Ensure table exists (should already exist from schema creation)
        CREATE TABLE IF NOT EXISTS public.agency_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          agency_name TEXT,
          logo_url TEXT,
          setup_complete BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Add all extended columns if they don't exist
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS industry TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS phone TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS address_street TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS address_city TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS address_state TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS address_zip TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS address_country TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS employee_count TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS enable_gst BOOLEAN DEFAULT false;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS company_tagline TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS business_type TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS founded_year TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS legal_name TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS registration_number TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS tax_id TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS tax_id_type TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS website TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS social_linkedin TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS social_twitter TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS social_facebook TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS fiscal_year_start TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS payment_terms TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS invoice_prefix TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS gst_number TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS bank_name TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS bank_routing_number TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS bank_swift_code TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'MM/DD/YYYY';
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '12';
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS week_start TEXT DEFAULT 'Monday';
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS notifications_email BOOLEAN DEFAULT true;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS notifications_sms BOOLEAN DEFAULT false;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS notifications_push BOOLEAN DEFAULT true;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS notifications_weekly_report BOOLEAN DEFAULT true;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS notifications_monthly_report BOOLEAN DEFAULT true;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS features_enable_payroll BOOLEAN DEFAULT true;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS features_enable_projects BOOLEAN DEFAULT true;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS features_enable_crm BOOLEAN DEFAULT true;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS features_enable_inventory BOOLEAN DEFAULT false;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS features_enable_reports BOOLEAN DEFAULT true;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS domain TEXT;
      END $$;
    `);
    
    // Insert or update initial agency_settings row with onboarding data
    // Check if a row exists first, then update or insert accordingly
    const existingCheck = await agencyDbClient.query(
      `SELECT id FROM public.agency_settings LIMIT 1`
    );
    
    if (existingCheck.rows.length > 0) {
      // Update existing row
      const existingId = existingCheck.rows[0].id;
      await agencyDbClient.query(
        `UPDATE public.agency_settings 
        SET 
          agency_name = COALESCE(NULLIF($1, ''), NULLIF($1, 'My Agency'), agency_name),
          industry = COALESCE($2, industry),
          phone = COALESCE($3, phone),
          address_street = COALESCE($4, address_street),
          address_city = COALESCE($5, address_city),
          address_state = COALESCE($6, address_state),
          address_zip = COALESCE($7, address_zip),
          address_country = COALESCE($8, address_country),
          employee_count = COALESCE($9, employee_count),
          enable_gst = COALESCE($10, enable_gst),
          domain = COALESCE($11, domain),
          updated_at = NOW()
        WHERE id = $12`,
        [
          agencyName || null, // Use provided agency name (null if not provided, won't update)
          industry || null,
          phone || null,
          parsedAddress.street,
          parsedAddress.city,
          parsedAddress.state,
          parsedAddress.zipCode,
          parsedAddress.country,
          companySize || null,
          enableGST === true,
          domain || null,
          existingId,
        ]
      );
    } else {
      // Insert new row
      await agencyDbClient.query(
        `INSERT INTO public.agency_settings (
          agency_name, industry, phone, address_street, address_city, address_state, address_zip, address_country,
          employee_count, enable_gst, domain, setup_complete, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, NOW(), NOW())`,
        [
          agencyName || 'My Agency', // Use provided agency name or default
          industry || null,
          phone || null,
          parsedAddress.street,
          parsedAddress.city,
          parsedAddress.state,
          parsedAddress.zipCode,
          parsedAddress.country,
          companySize || null,
          enableGST === true,
          domain || null, // Store full domain (e.g., "company-id.app")
        ]
      );
    }
    
    console.log(`[API] ✅ Initial agency_settings created in agency database`);

    // Validate UUID format
    const { validateUUID, setSessionVariable } = require('../utils/securityUtils');
    validateUUID(adminUserId);

    // Start transaction for user creation (SET LOCAL requires transaction)
    let userCreationTransactionStarted = false;
    try {
      await agencyDbClient.query('BEGIN');
      userCreationTransactionStarted = true;
      
      // Set user context securely (must be in transaction)
      await setSessionVariable(agencyDbClient, 'app.current_user_id', adminUserId);

      // Verify users table is accessible before inserting
      const usersTableAccess = await agencyDbClient.query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
      AND column_name IN ('id', 'email', 'password_hash')
    `);
    
    if (usersTableAccess.rows[0].count < 3) {
      throw new Error('Users table does not have required columns');
    }

    // Create admin user
    console.log(`[API] Creating admin user: ${adminEmail}`);
    await agencyDbClient.query(
      `INSERT INTO public.users (
        id, email, password_hash, email_confirmed, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [adminUserId, adminEmail, passwordHash, true, true]
    );
    
    // Verify user was created
    const userCheck = await agencyDbClient.query(
      `SELECT id, email FROM public.users WHERE id = $1`,
      [adminUserId]
    );
    
    if (userCheck.rows.length === 0) {
      throw new Error('Failed to create admin user - user not found after insert');
    }
    
    console.log(`[API] ✅ Admin user created: ${userCheck.rows[0].email}`);

    // Verify profiles table is accessible before inserting
    const profilesTableAccess = await agencyDbClient.query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles'
      AND column_name IN ('id', 'user_id', 'full_name')
    `);
    
    if (profilesTableAccess.rows[0].count < 3) {
      throw new Error('Profiles table does not have required columns');
    }

    // Create admin profile WITH agency_id so they show up in queries
    console.log(`[API] Creating admin profile for: ${adminName}`);
    await agencyDbClient.query(
      `INSERT INTO public.profiles (
        id, user_id, full_name, phone, agency_id, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        agency_id = COALESCE(EXCLUDED.agency_id, public.profiles.agency_id),
        updated_at = NOW()`,
      [profileId, adminUserId, adminName, phone || null, agencyId, true]
    );
    
    // Verify profile was created
    const profileCheck = await agencyDbClient.query(
      `SELECT id, user_id, full_name, agency_id FROM public.profiles WHERE user_id = $1`,
      [adminUserId]
    );
    
    if (profileCheck.rows.length === 0) {
      throw new Error('Failed to create admin profile - profile not found after insert');
    }
    
    console.log(`[API] ✅ Admin profile created: ${profileCheck.rows[0].full_name} with agency_id: ${profileCheck.rows[0].agency_id}`);

    // Create employee_details for admin so they show up in unified_employees and employee lists
    const nameParts = String(adminName).trim().split(/\s+/);
    const adminFirstName = nameParts[0] || '';
    const adminLastName = nameParts.slice(1).join(' ') || adminFirstName;
    
    // Generate employee_id for admin (EMP-0001)
    let adminEmployeeId = 'EMP-0001';
    try {
      const existingEmp = await agencyDbClient.query(
        `SELECT employee_id FROM public.employee_details WHERE employee_id = $1 LIMIT 1`,
        [adminEmployeeId]
      );
      if (existingEmp.rows.length > 0) {
        // If EMP-0001 exists, use a timestamp-based one
        const ts = Date.now().toString().slice(-6);
        adminEmployeeId = `EMP-${ts}`;
      }
    } catch (e) {
      console.warn('[API] Could not check existing employee_id, using EMP-0001:', e.message);
    }

    await agencyDbClient.query(
      `INSERT INTO public.employee_details (
        id, user_id, employee_id, agency_id, first_name, last_name, employment_type, is_active, created_at, updated_at
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW())
      ON CONFLICT DO NOTHING`,
      [adminUserId, adminEmployeeId, agencyId, adminFirstName, adminLastName, 'full_time']
    );
    
    console.log(`[API] ✅ Admin employee_details created with employee_id: ${adminEmployeeId}`);

    // Remove employee role if exists
    await agencyDbClient.query(
      `DELETE FROM public.user_roles WHERE user_id = $1 AND role = 'employee'`,
      [adminUserId]
    );

    // Assign super_admin role
    // Note: user_roles has UNIQUE(user_id, role, agency_id), so we need to include agency_id (NULL for admin)
    await agencyDbClient.query(
      `INSERT INTO public.user_roles (
        id, user_id, role, agency_id, assigned_at
      ) VALUES ($1, $2, $3, NULL, NOW())
      ON CONFLICT (user_id, role, agency_id) DO NOTHING`,
      [userRoleId, adminUserId, 'super_admin']
    );

      // Commit transaction (all user creation operations complete)
      await agencyDbClient.query('COMMIT');
      userCreationTransactionStarted = false;
      console.log(`[API] ✅ Transaction committed - admin user setup complete`);
    } catch (userCreationError) {
      // Rollback transaction on error
      if (userCreationTransactionStarted) {
        try {
          await agencyDbClient.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('[API] Error during user creation rollback:', rollbackError.message);
        }
      }
      throw userCreationError;
    }

    // Update main database with agency info
    let transactionStarted = false;
    try {
      await mainClient.query('BEGIN');
      transactionStarted = true;
      
      // Ensure columns exist
      await mainClient.query(`
        ALTER TABLE public.agencies 
        ADD COLUMN IF NOT EXISTS database_name TEXT UNIQUE
      `);
      await mainClient.query(`
        ALTER TABLE public.agencies
        ADD COLUMN IF NOT EXISTS owner_user_id UUID
      `);

      // Insert agency record - handle conflicts on id and domain
      try {
        await mainClient.query(
          `INSERT INTO public.agencies (
            id, name, domain, database_name, owner_user_id,
            is_active, subscription_plan, max_users
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            database_name = EXCLUDED.database_name,
            owner_user_id = COALESCE(public.agencies.owner_user_id, EXCLUDED.owner_user_id)`,
          [agencyId, agencyName, domain, dbName, adminUserId, true, subscriptionPlan, maxUsers]
        );
      } catch (insertError) {
        // If domain conflict occurs, rollback and throw meaningful error
        if (insertError.code === '23505' && (insertError.constraint === 'agencies_domain_key' || insertError.message.includes('agencies_domain_key'))) {
          if (transactionStarted) {
            try {
              await mainClient.query('ROLLBACK');
            } catch (rollbackError) {
              console.error('[API] Error during rollback:', rollbackError.message);
            }
          }
          throw new Error(`Domain "${domain}" is already registered. Please choose a different domain.`);
        }
        throw insertError;
      }

      // Ensure agency_settings table exists with agency_id column and unique constraint
      await mainClient.query(`
        CREATE TABLE IF NOT EXISTS public.agency_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
          agency_name TEXT,
          logo_url TEXT,
          -- Optional onboarding metadata for pre-populating AgencySetup
          primary_focus TEXT,
          enable_gst BOOLEAN DEFAULT false,
          modules JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      
      // Add agency_id column if it doesn't exist
      await mainClient.query(`
        ALTER TABLE public.agency_settings 
        ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE
      `);
      
      // Add unique constraint on agency_id if it doesn't exist
      await mainClient.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'agency_settings_agency_id_key'
          ) THEN
            ALTER TABLE public.agency_settings 
            ADD CONSTRAINT agency_settings_agency_id_key UNIQUE (agency_id);
          END IF;
        END $$;
      `);

      // Ensure new onboarding metadata columns exist (for backward compatibility)
      await mainClient.query(`
        ALTER TABLE public.agency_settings 
        ADD COLUMN IF NOT EXISTS primary_focus TEXT
      `);
      await mainClient.query(`
        ALTER TABLE public.agency_settings 
        ADD COLUMN IF NOT EXISTS enable_gst BOOLEAN DEFAULT false
      `);
      await mainClient.query(`
        ALTER TABLE public.agency_settings 
        ADD COLUMN IF NOT EXISTS modules JSONB
      `);
      await mainClient.query(`
        ALTER TABLE public.agency_settings 
        ADD COLUMN IF NOT EXISTS industry TEXT
      `);
      await mainClient.query(`
        ALTER TABLE public.agency_settings 
        ADD COLUMN IF NOT EXISTS phone TEXT
      `);
      await mainClient.query(`
        ALTER TABLE public.agency_settings 
        ADD COLUMN IF NOT EXISTS address_street TEXT
      `);
      await mainClient.query(`
        ALTER TABLE public.agency_settings 
        ADD COLUMN IF NOT EXISTS address_city TEXT
      `);
      await mainClient.query(`
        ALTER TABLE public.agency_settings 
        ADD COLUMN IF NOT EXISTS address_state TEXT
      `);
      await mainClient.query(`
        ALTER TABLE public.agency_settings 
        ADD COLUMN IF NOT EXISTS address_zip TEXT
      `);
      await mainClient.query(`
        ALTER TABLE public.agency_settings 
        ADD COLUMN IF NOT EXISTS address_country TEXT
      `);
      await mainClient.query(`
        ALTER TABLE public.agency_settings 
        ADD COLUMN IF NOT EXISTS employee_count TEXT
      `);
      
      // Parse address if provided
      const parsedAddress = address ? parseAddressString(address) : { street: null, city: null, state: null, zipCode: null, country: null };
      
      // Insert agency settings with all onboarding data
      await mainClient.query(
        `INSERT INTO public.agency_settings (
          id, agency_id, agency_name, logo_url, primary_focus, enable_gst, modules,
          industry, phone, address_street, address_city, address_state, address_zip, address_country, employee_count,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        ON CONFLICT (agency_id) DO UPDATE SET
          agency_name = EXCLUDED.agency_name,
          primary_focus = COALESCE(EXCLUDED.primary_focus, public.agency_settings.primary_focus),
          enable_gst = COALESCE(EXCLUDED.enable_gst, public.agency_settings.enable_gst),
          modules = COALESCE(EXCLUDED.modules, public.agency_settings.modules),
          industry = COALESCE(EXCLUDED.industry, public.agency_settings.industry),
          phone = COALESCE(EXCLUDED.phone, public.agency_settings.phone),
          address_street = COALESCE(EXCLUDED.address_street, public.agency_settings.address_street),
          address_city = COALESCE(EXCLUDED.address_city, public.agency_settings.address_city),
          address_state = COALESCE(EXCLUDED.address_state, public.agency_settings.address_state),
          address_zip = COALESCE(EXCLUDED.address_zip, public.agency_settings.address_zip),
          address_country = COALESCE(EXCLUDED.address_country, public.agency_settings.address_country),
          employee_count = COALESCE(EXCLUDED.employee_count, public.agency_settings.employee_count),
          updated_at = NOW()`,
        [
          agencySettingsId,
          agencyId,
          agencyName,
          null,
          primaryFocus || null,
          enableGST === true,
          modules ? JSON.stringify(modules) : null,
          industry || null,
          phone || null,
          parsedAddress.street,
          parsedAddress.city,
          parsedAddress.state,
          parsedAddress.zipCode,
          parsedAddress.country,
          companySize || null,
        ]
      );

      await mainClient.query('COMMIT');
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) {
        try {
          await mainClient.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('[API] Error during rollback:', rollbackError.message);
        }
      }
      throw error;
    }

    console.log(`[API] Agency created successfully: ${agencyName} (${domain}) - Database: ${dbName}`);

    // Assign pages to agency (if provided or use recommendations)
    try {
      const { getRecommendedPages } = require('../services/pageRecommendationService');
      
      // Get page IDs to assign
      let pageIdsToAssign = [];
      
      // If page_ids provided, use them
      if (agencyData.page_ids && Array.isArray(agencyData.page_ids) && agencyData.page_ids.length > 0) {
        pageIdsToAssign = [...agencyData.page_ids];
        console.log(`[API] Using ${pageIdsToAssign.length} provided page IDs`);
      }
      
      // If business_goals provided, also get recommendations and merge
      if (agencyData.business_goals && (industry || companySize || primaryFocus)) {
        const criteria = {
          industry: industry || '',
          companySize: companySize || '',
          primaryFocus: primaryFocus || '',
          businessGoals: Array.isArray(agencyData.business_goals) ? agencyData.business_goals : [agencyData.business_goals]
        };
        
        const recommendations = await getRecommendedPages(criteria);
        const recommendedPageIds = recommendations.all
          .filter(p => p.rules.some(r => r.is_required) || p.score >= 10)
          .map(p => p.id);
        
        // Merge: combine provided page_ids with recommended required pages
        pageIdsToAssign = [...new Set([...pageIdsToAssign, ...recommendedPageIds])];
        console.log(`[API] After recommendations: ${pageIdsToAssign.length} total pages to assign`);
      }
      
      // If no pages selected and no recommendations, assign all active pages (backward compatibility)
      if (pageIdsToAssign.length === 0) {
        const allPagesResult = await mainClient.query(
          `SELECT id FROM public.page_catalog WHERE is_active = true`
        );
        pageIdsToAssign = allPagesResult.rows.map(r => r.id);
        console.log(`[API] No pages specified, assigning all ${pageIdsToAssign.length} active pages (backward compatibility)`);
      }
      
      // Assign pages
      if (pageIdsToAssign.length > 0) {
        const placeholders = pageIdsToAssign.map((_, i) => `$${i + 1}`).join(',');
        const pageCheck = await mainClient.query(
          `SELECT id FROM public.page_catalog WHERE id IN (${placeholders}) AND is_active = true`,
          pageIdsToAssign
        );
        
        const validPageIds = pageCheck.rows.map(r => r.id);
        
        if (validPageIds.length > 0) {
          /**
           * IMPORTANT:
           * ----------
           * The agency_page_assignments.assigned_by column has a foreign key
           * constraint to public.users.id in the MAIN database (where super admin
           * and staff users live), not the isolated agency database.
           *
           * During agency onboarding we are creating the FIRST admin user inside
           * the isolated agency database only, so adminUserId does NOT exist in
           * public.users yet. Using it here causes a foreign key violation like:
           *
           *   insert or update on table "agency_page_assignments"
           *   violates foreign key constraint "agency_page_assignments_assigned_by_fkey"
           *
           * To avoid this, we set assigned_by to NULL for these initial automatic
           * assignments. Later manual assignments (via the page catalog routes)
           * correctly use req.user.userId from the main users table.
           */
          for (const pageId of validPageIds) {
            await mainClient.query(
              `INSERT INTO public.agency_page_assignments 
               (agency_id, page_id, assigned_by, status)
               VALUES ($1, $2, $3, 'active')
               ON CONFLICT (agency_id, page_id) 
               DO UPDATE SET status = 'active', updated_at = now()`,
              [agencyId, pageId, null] // assigned_by must reference main DB users; null is safe for system assignments
            );
          }
          console.log(`[API] ✅ Assigned ${validPageIds.length} pages to agency`);
        }
      }
    } catch (pageError) {
      // Log but don't fail agency creation if page assignment fails
      console.warn(`[API] ⚠️ Page assignment failed (non-fatal): ${pageError.message}`);
      console.error(pageError);
    }

    return {
      agency: {
        id: agencyId,
        name: agencyName,
        domain,
        databaseName: dbName,
        subscriptionPlan,
      },
      admin: {
        id: adminUserId,
        email: adminEmail,
        name: adminName,
      },
    };
  } catch (error) {
    console.error(`[API] ❌ Agency creation failed: ${error.message}`);
    console.error(`[API] Error code: ${error.code}, constraint: ${error.constraint}`);
    if (error.stack) {
      console.error(`[API] Error stack:`, error.stack);
    }
    
    // Rollback: drop database if creation failed (but not for domain conflicts - those are expected)
    if (dbName && error.code !== '23505') {
      try {
        // Release any existing connections first
        if (agencyDbClient) {
          try {
            agencyDbClient.release();
          } catch {}
        }
        if (agencyPool) {
          try {
            await agencyPool.end();
          } catch {}
        }
        
        // Wait a moment for connections to close
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to get a fresh connection to postgres to drop the database
        const cleanupPool = new Pool({
          host,
          port,
          user,
          password,
          database: 'postgres',
        });
        const cleanupClient = await cleanupPool.connect();
        
        // Terminate all connections to the database first (except our own)
        try {
          await cleanupClient.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = $1 AND pid <> pg_backend_pid()
          `, [dbName]);
        } catch (terminateError) {
          console.warn(`[API] Could not terminate connections: ${terminateError.message}`);
        }
        
        // Wait a moment for connections to close
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Drop the database
        await cleanupClient.query(`DROP DATABASE IF EXISTS ${dbName}`);
        console.log(`[API] ✅ Rolled back database: ${dbName}`);
        
        cleanupClient.release();
        await cleanupPool.end();
      } catch (cleanupError) {
        console.error(`[API] ⚠️ Failed to cleanup database ${dbName}:`, cleanupError.message);
        console.error(`[API] You may need to manually drop the database: DROP DATABASE IF EXISTS ${dbName}`);
      }
    }
    throw error;
  } finally {
    // Cleanup connections
    if (agencyDbClient) {
      try {
        agencyDbClient.release();
      } catch {}
    }
    // Don't close agencyPool - it's managed by pool manager
    if (postgresClient) {
      try {
        postgresClient.release();
      } catch {}
    }
    if (postgresPool) {
      try {
        await postgresPool.end();
      } catch {}
    }
    if (mainClient) {
      try {
        mainClient.release();
      } catch {}
    }
  }
}

/**
 * Repair agency database by running schema creation
 * @param {string} agencyDatabase - Agency database name
 * @returns {Promise<Object>} Repair results
 */
async function repairAgencyDatabase(agencyDatabase) {
  if (!agencyDatabase) {
    throw new Error('Agency database name is required');
  }

  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const { Pool: AgencyPool } = require('pg');
  const agencyPool = new AgencyPool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    // Count tables before
    const beforeTables = await agencyClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    const beforeCount = beforeTables.rows.length;

    // Run schema creation
    await createAgencySchema(agencyClient);

    // Count tables after
    const afterTables = await agencyClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    const afterCount = afterTables.rows.length;
    const addedCount = afterCount - beforeCount;

    console.log(`[API] Database repair complete. Total tables: ${afterCount} (added ${addedCount} new tables)`);

    return {
      database: agencyDatabase,
      tablesBefore: beforeCount,
      tablesAfter: afterCount,
      tablesAdded: addedCount,
      allTables: afterTables.rows.map(r => r.table_name),
    };
  } finally {
    agencyClient.release();
    // Don't close pool - it's managed by pool manager
  }
}

/**
 * Complete agency setup with extended settings
 * @param {string} agencyDatabase - Agency database name
 * @param {Object} setupData - Setup data
 * @returns {Promise<void>}
 */
async function completeAgencySetup(agencyDatabase, setupData) {
  if (!agencyDatabase) {
    throw new Error('Agency database not specified');
  }

  const {
    companyName,
    companyTagline,
    industry,
    businessType,
    foundedYear,
    employeeCount,
    description,
    logo,
    legalName,
    registrationNumber,
    taxId,
    taxIdType,
    address,
    phone,
    email,
    website,
    socialMedia,
    departments,
    teamMembers,
    currency,
    fiscalYearStart,
    paymentTerms,
    invoicePrefix,
    taxRate,
    enableGST,
    gstNumber,
    bankDetails,
    timezone,
    dateFormat,
    timeFormat,
    weekStart,
    language,
    notifications,
    features,
  } = setupData;

  // Get agency_id from main database using database_name
  const mainClient = await pool.connect();
  let agencyId = null;
  try {
    const agencyResult = await mainClient.query(
      'SELECT id FROM public.agencies WHERE database_name = $1 LIMIT 1',
      [agencyDatabase]
    );
    if (agencyResult.rows.length > 0) {
      agencyId = agencyResult.rows[0].id;
      console.log(`[Setup] Found agency_id: ${agencyId} for database: ${agencyDatabase}`);
    } else {
      console.warn(`[Setup] No agency found with database_name: ${agencyDatabase}`);
    }
  } catch (error) {
    console.error('[Setup] Error fetching agency_id from main database:', error);
  } finally {
    mainClient.release();
  }

  if (!agencyId) {
    throw new Error(`Agency not found in main database for database: ${agencyDatabase}`);
  }

  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const { Pool: AgencyPool } = require('pg');
  const agencyPool = new AgencyPool({ connectionString: agencyDbUrl, max: 10 });
  const agencyClient = await agencyPool.connect();

  try {
    await agencyClient.query('BEGIN');
    
    console.log(`[Setup] Starting setup completion for database: ${agencyDatabase} with agency_id: ${agencyId}`);

    // Backfill: Ensure admin/owner profile has agency_id set (for existing agencies created before fix)
    try {
      const ownerUserId = await mainClient.query(
        `SELECT owner_user_id FROM public.agencies WHERE id = $1 LIMIT 1`,
        [agencyId]
      );
      if (ownerUserId.rows.length > 0 && ownerUserId.rows[0].owner_user_id) {
        const ownerId = ownerUserId.rows[0].owner_user_id;
        await agencyClient.query(
          `UPDATE public.profiles 
           SET agency_id = $1, updated_at = NOW() 
           WHERE user_id = $2 AND (agency_id IS NULL OR agency_id != $1)`,
          [agencyId, ownerId]
        );
        console.log(`[Setup] ✅ Backfilled agency_id for owner profile: ${ownerId}`);
      }
    } catch (backfillError) {
      console.warn('[Setup] Could not backfill owner agency_id (non-fatal):', backfillError.message);
    }

    // Ensure setup_complete column exists
    try {
      await agencyClient.query(`
        ALTER TABLE public.agency_settings 
        ADD COLUMN IF NOT EXISTS setup_complete BOOLEAN DEFAULT false
      `);
    } catch (e) {
      console.warn('[Setup] Could not add setup_complete column (may already exist):', e.message);
      // ignore
    }

    // Ensure all extended columns exist (simplified - full version in original)
    await agencyClient.query(`
      DO $$
      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS company_tagline TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS industry TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS business_type TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS founded_year TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS employee_count TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS legal_name TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS registration_number TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS tax_id TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS tax_id_type TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS address_street TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS address_city TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS address_state TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS address_zip TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS address_country TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS phone TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS website TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS social_linkedin TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS social_twitter TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS social_facebook TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS fiscal_year_start TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS payment_terms TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS invoice_prefix TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS enable_gst BOOLEAN DEFAULT false;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS gst_number TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS bank_name TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS bank_routing_number TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS bank_swift_code TEXT;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'MM/DD/YYYY';
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '12';
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS week_start TEXT DEFAULT 'Monday';
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS notifications_email BOOLEAN DEFAULT true;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS notifications_sms BOOLEAN DEFAULT false;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS notifications_push BOOLEAN DEFAULT true;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS notifications_weekly_report BOOLEAN DEFAULT true;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS notifications_monthly_report BOOLEAN DEFAULT true;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS features_enable_payroll BOOLEAN DEFAULT true;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS features_enable_projects BOOLEAN DEFAULT true;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS features_enable_crm BOOLEAN DEFAULT true;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS features_enable_inventory BOOLEAN DEFAULT false;
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS features_enable_reports BOOLEAN DEFAULT true;
      END $$;
    `);

    // Update agency_settings with ALL 50+ fields
    const agencySettingsData = {
      agency_name: companyName || legalName || 'My Agency',
      company_tagline: companyTagline || null,
      industry: industry || null,
      business_type: businessType || null,
      founded_year: foundedYear || null,
      employee_count: employeeCount || null,
      description: description || null,
      legal_name: legalName || null,
      registration_number: registrationNumber || null,
      tax_id: taxId || null,
      tax_id_type: taxIdType || 'EIN',
      address_street: address?.street || null,
      address_city: address?.city || null,
      address_state: address?.state || null,
      address_zip: address?.zipCode || null,
      address_country: address?.country || null,
      phone: phone || null,
      email: email || null,
      website: website || null,
      logo_url: logo || null,
      currency: currency || 'USD',
      fiscal_year_start: fiscalYearStart || '01-01',
      payment_terms: paymentTerms || '30',
      invoice_prefix: invoicePrefix || 'INV',
      tax_rate: parseFloat(taxRate || '0'),
      enable_gst: enableGST || false,
      gst_number: gstNumber || null,
      timezone: timezone || 'UTC',
      date_format: dateFormat || 'MM/DD/YYYY',
      time_format: timeFormat || '12',
      week_start: weekStart || 'Monday',
      language: language || 'en',
    };

    // Fetch existing settings to preserve data
    const existingSettingsCheck = await agencyClient.query(`
      SELECT * FROM public.agency_settings LIMIT 1
    `);
    
    let settingsId;
    let existingSettings = null;
    
    if (existingSettingsCheck.rows.length === 0) {
      // Insert a new row if none exists
      const insertResult = await agencyClient.query(`
        INSERT INTO public.agency_settings (id, agency_name, setup_complete, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, false, NOW(), NOW())
        RETURNING id
      `, [agencySettingsData.agency_name || 'My Agency']);
      settingsId = insertResult.rows[0].id;
    } else {
      settingsId = existingSettingsCheck.rows[0].id;
      existingSettings = existingSettingsCheck.rows[0];
    }

    // Complete update query with ALL 50+ fields, using COALESCE to preserve existing values
    // Only update fields that have new values provided (non-null/non-empty)
    await agencyClient.query(`
      UPDATE public.agency_settings 
      SET 
        agency_name = COALESCE($1, agency_name),
        company_tagline = COALESCE(NULLIF($2, ''), company_tagline),
        industry = COALESCE(NULLIF($3, ''), industry),
        business_type = COALESCE(NULLIF($4, ''), business_type),
        founded_year = COALESCE(NULLIF($5, ''), founded_year),
        employee_count = COALESCE(NULLIF($6, ''), employee_count),
        description = COALESCE(NULLIF($7, ''), description),
        legal_name = COALESCE(NULLIF($8, ''), legal_name),
        registration_number = COALESCE(NULLIF($9, ''), registration_number),
        tax_id = COALESCE(NULLIF($10, ''), tax_id),
        tax_id_type = COALESCE(NULLIF($11, ''), tax_id_type),
        address_street = COALESCE(NULLIF($12, ''), address_street),
        address_city = COALESCE(NULLIF($13, ''), address_city),
        address_state = COALESCE(NULLIF($14, ''), address_state),
        address_zip = COALESCE(NULLIF($15, ''), address_zip),
        address_country = COALESCE(NULLIF($16, ''), address_country),
        phone = COALESCE(NULLIF($17, ''), phone),
        email = COALESCE(NULLIF($18, ''), email),
        website = COALESCE(NULLIF($19, ''), website),
        logo_url = COALESCE($20, logo_url),
        social_linkedin = COALESCE(NULLIF($21, ''), social_linkedin),
        social_twitter = COALESCE(NULLIF($22, ''), social_twitter),
        social_facebook = COALESCE(NULLIF($23, ''), social_facebook),
        currency = COALESCE(NULLIF($24, ''), currency),
        fiscal_year_start = COALESCE(NULLIF($25, ''), fiscal_year_start),
        payment_terms = COALESCE(NULLIF($26, ''), payment_terms),
        invoice_prefix = COALESCE(NULLIF($27, ''), invoice_prefix),
        tax_rate = COALESCE($28, tax_rate),
        enable_gst = COALESCE($29, enable_gst),
        gst_number = COALESCE(NULLIF($30, ''), gst_number),
        bank_account_name = COALESCE(NULLIF($31, ''), bank_account_name),
        bank_account_number = COALESCE(NULLIF($32, ''), bank_account_number),
        bank_name = COALESCE(NULLIF($33, ''), bank_name),
        bank_routing_number = COALESCE(NULLIF($34, ''), bank_routing_number),
        bank_swift_code = COALESCE(NULLIF($35, ''), bank_swift_code),
        timezone = COALESCE(NULLIF($36, ''), timezone),
        date_format = COALESCE(NULLIF($37, ''), date_format),
        time_format = COALESCE(NULLIF($38, ''), time_format),
        week_start = COALESCE(NULLIF($39, ''), week_start),
        language = COALESCE(NULLIF($40, ''), language),
        notifications_email = COALESCE($41, notifications_email),
        notifications_sms = COALESCE($42, notifications_sms),
        notifications_push = COALESCE($43, notifications_push),
        notifications_weekly_report = COALESCE($44, notifications_weekly_report),
        notifications_monthly_report = COALESCE($45, notifications_monthly_report),
        features_enable_payroll = COALESCE($46, features_enable_payroll),
        features_enable_projects = COALESCE($47, features_enable_projects),
        features_enable_crm = COALESCE($48, features_enable_crm),
        features_enable_inventory = COALESCE($49, features_enable_inventory),
        features_enable_reports = COALESCE($50, features_enable_reports),
        setup_complete = true,
        updated_at = NOW()
      WHERE id = $51
    `, [
      agencySettingsData.agency_name || existingSettings?.agency_name,
      agencySettingsData.company_tagline || existingSettings?.company_tagline || null,
      agencySettingsData.industry || existingSettings?.industry || null,
      agencySettingsData.business_type || existingSettings?.business_type || null,
      agencySettingsData.founded_year || existingSettings?.founded_year || null,
      agencySettingsData.employee_count || existingSettings?.employee_count || null,
      agencySettingsData.description || existingSettings?.description || null,
      agencySettingsData.legal_name || existingSettings?.legal_name || null,
      agencySettingsData.registration_number || existingSettings?.registration_number || null,
      agencySettingsData.tax_id || existingSettings?.tax_id || null,
      agencySettingsData.tax_id_type || existingSettings?.tax_id_type || null,
      agencySettingsData.address_street || existingSettings?.address_street || null,
      agencySettingsData.address_city || existingSettings?.address_city || null,
      agencySettingsData.address_state || existingSettings?.address_state || null,
      agencySettingsData.address_zip || existingSettings?.address_zip || null,
      agencySettingsData.address_country || existingSettings?.address_country || null,
      agencySettingsData.phone || existingSettings?.phone || null,
      agencySettingsData.email || existingSettings?.email || null,
      agencySettingsData.website || existingSettings?.website || null,
      agencySettingsData.logo_url || existingSettings?.logo_url || null,
      socialMedia?.linkedin || existingSettings?.social_linkedin || null,
      socialMedia?.twitter || existingSettings?.social_twitter || null,
      socialMedia?.facebook || existingSettings?.social_facebook || null,
      agencySettingsData.currency || existingSettings?.currency || 'USD',
      agencySettingsData.fiscal_year_start || existingSettings?.fiscal_year_start || '01-01',
      agencySettingsData.payment_terms || existingSettings?.payment_terms || '30',
      agencySettingsData.invoice_prefix || existingSettings?.invoice_prefix || 'INV',
      agencySettingsData.tax_rate !== undefined ? agencySettingsData.tax_rate : (existingSettings?.tax_rate || 0),
      agencySettingsData.enable_gst !== undefined ? agencySettingsData.enable_gst : (existingSettings?.enable_gst || false),
      agencySettingsData.gst_number || existingSettings?.gst_number || null,
      bankDetails?.accountName || existingSettings?.bank_account_name || null,
      bankDetails?.accountNumber || existingSettings?.bank_account_number || null,
      bankDetails?.bankName || existingSettings?.bank_name || null,
      bankDetails?.routingNumber || existingSettings?.bank_routing_number || null,
      bankDetails?.swiftCode || existingSettings?.bank_swift_code || null,
      agencySettingsData.timezone || existingSettings?.timezone || 'UTC',
      agencySettingsData.date_format || existingSettings?.date_format || 'MM/DD/YYYY',
      agencySettingsData.time_format || existingSettings?.time_format || '12',
      agencySettingsData.week_start || existingSettings?.week_start || 'Monday',
      agencySettingsData.language || existingSettings?.language || 'en',
      notifications?.email !== undefined ? notifications.email : (existingSettings?.notifications_email !== undefined ? existingSettings.notifications_email : true),
      notifications?.sms !== undefined ? notifications.sms : (existingSettings?.notifications_sms !== undefined ? existingSettings.notifications_sms : false),
      notifications?.push !== undefined ? notifications.push : (existingSettings?.notifications_push !== undefined ? existingSettings.notifications_push : true),
      notifications?.weeklyReport !== undefined ? notifications.weeklyReport : (existingSettings?.notifications_weekly_report !== undefined ? existingSettings.notifications_weekly_report : true),
      notifications?.monthlyReport !== undefined ? notifications.monthlyReport : (existingSettings?.notifications_monthly_report !== undefined ? existingSettings.notifications_monthly_report : true),
      features?.enablePayroll !== undefined ? features.enablePayroll : (existingSettings?.features_enable_payroll !== undefined ? existingSettings.features_enable_payroll : true),
      features?.enableProjects !== undefined ? features.enableProjects : (existingSettings?.features_enable_projects !== undefined ? existingSettings.features_enable_projects : true),
      features?.enableCRM !== undefined ? features.enableCRM : (existingSettings?.features_enable_crm !== undefined ? existingSettings.features_enable_crm : true),
      features?.enableInventory !== undefined ? features.enableInventory : (existingSettings?.features_enable_inventory !== undefined ? existingSettings.features_enable_inventory : false),
      features?.enableReports !== undefined ? features.enableReports : (existingSettings?.features_enable_reports !== undefined ? existingSettings.features_enable_reports : true),
      settingsId,
    ]);

    // Create departments if provided
    // Note: In isolated databases, agency_id should be NULL since agencies table doesn't exist here
    if (departments && departments.length > 0) {
      for (const dept of departments) {
        if (dept.name) {
          // Check if department already exists (by name only, since agency_id is NULL in isolated DBs)
          const existingDept = await agencyClient.query(`
            SELECT id FROM public.departments WHERE name = $1 LIMIT 1
          `, [dept.name]);
          
          if (existingDept.rows.length > 0) {
            // Update existing department
            await agencyClient.query(`
              UPDATE public.departments 
              SET description = $1, updated_at = NOW()
              WHERE id = $2
            `, [dept.description || '', existingDept.rows[0].id]);
            console.log(`[Setup] Updated existing department: ${dept.name}`);
          } else {
            // Insert new department (agency_id is NULL in isolated databases)
            await agencyClient.query(`
              INSERT INTO public.departments (id, name, description, is_active, agency_id, created_at, updated_at)
              VALUES (gen_random_uuid(), $1, $2, true, NULL, NOW(), NOW())
            `, [dept.name, dept.description || '']);
            console.log(`[Setup] Created new department: ${dept.name}`);
          }
        }
      }
    }

    // Create department heads if provided (team members in setup are treated as heads)
    let teamCredentials = [];
    if (teamMembers && teamMembers.length > 0) {
      const bcrypt = require('bcrypt');

      // Helper to generate a strong random password for first login
      const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 14; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };

      // Pre-load the latest employee_id to generate sequential IDs
      // Note: In isolated databases, agency_id is NULL, so we query all records
      let nextEmployeeNumber = 0;
      try {
        const latest = await agencyClient.query(
          `SELECT employee_id FROM public.employee_details 
           WHERE employee_id IS NOT NULL 
           ORDER BY created_at DESC 
           LIMIT 1`
        );
        if (latest.rows.length > 0 && latest.rows[0].employee_id) {
          const match = String(latest.rows[0].employee_id).match(/(\d+)$/);
          if (match) {
            nextEmployeeNumber = parseInt(match[1], 10);
          }
        }
      } catch (e) {
        console.warn('[Setup] Could not determine last employee_id, starting from 0:', e.message);
      }

      const generateEmployeeId = async () => {
        // Try sequential EMP-0001, EMP-0002, ...
        nextEmployeeNumber += 1;
        let candidate = `EMP-${String(nextEmployeeNumber).padStart(4, '0')}`;

        try {
          const exists = await agencyClient.query(
            `SELECT 1 FROM public.employee_details WHERE employee_id = $1 LIMIT 1`,
            [candidate]
          );
          if (exists.rows.length === 0) {
            return candidate;
          }
        } catch (e) {
          console.warn('[Setup] Error checking existing employee_id, using candidate anyway:', e.message);
          return candidate;
        }

        // Fallback: timestamp-based id
        const ts = Date.now().toString().slice(-6);
        candidate = `EMP-${ts}`;
        try {
          const exists2 = await agencyClient.query(
            `SELECT 1 FROM public.employee_details WHERE employee_id = $1 LIMIT 1`,
            [candidate]
          );
          if (exists2.rows.length === 0) {
            return candidate;
          }
        } catch {
          // ignore and continue
        }

        // Final fallback: random UUID segment
        const uuidRes = await agencyClient.query(`SELECT gen_random_uuid() as id`);
        const rid = uuidRes.rows[0]?.id || '';
        return `EMP-${String(rid).replace(/-/g, '').substring(0, 8).toUpperCase()}`;
      };

      for (const member of teamMembers) {
        if (member.name && member.email) {
          try {
            // Use a savepoint for each team member so one failure doesn't abort the whole transaction
            await agencyClient.query('SAVEPOINT team_member_' + member.email.replace(/[^a-zA-Z0-9]/g, '_'));
            const existingUser = await agencyClient.query(
              `SELECT id FROM public.users WHERE email = $1`,
              [member.email.toLowerCase()]
            );
            if (existingUser.rows.length > 0) {
              console.log(`[Setup] User ${member.email} already exists, skipping creation`);
              continue;
            }

            const plainPassword = generatePassword();
            const passwordHash = await bcrypt.hash(plainPassword, 10);

            const userResult = await agencyClient.query(
              `INSERT INTO public.users (id, email, password_hash, is_active, email_confirmed, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, true, false, NOW(), NOW())
               RETURNING id`,
              [member.email.toLowerCase(), passwordHash]
            );
            const userId = userResult.rows[0].id;

            // Split full name into first/last for employee_details
            const nameParts = String(member.name).trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || firstName;

            // Generate a unique employee_id for this head of department
            const employeeId = await generateEmployeeId();

            // Insert profile (agency_id is NULL in isolated databases since agencies table doesn't exist here)
            // The agency_id in profiles is used for multi-tenant main DB, but in isolated DBs it's not needed
            await agencyClient.query(
              `INSERT INTO public.profiles (id, user_id, full_name, phone, agency_id, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, $3, NULL, NOW(), NOW())`,
              [userId, member.name, member.phone || null]
            );

            // Create a basic employee_details record so heads have an employee_id and core metadata
            // Note: agency_id is NULL in isolated databases
            await agencyClient.query(
              `INSERT INTO public.employee_details (
                 id,
                 user_id,
                 employee_id,
                 agency_id,
                 first_name,
                 last_name,
                 employment_type,
                 work_location,
                 is_active,
                 created_at,
                 updated_at
               )
               VALUES (
                 gen_random_uuid(),
                 $1,
                 $2,
                 NULL,
                 $3,
                 $4,
                 $5,
                 NULL,
                 true,
                 NOW(),
                 NOW()
               )`,
              [userId, employeeId, firstName, lastName, 'full_time']
            );

            // Ensure department heads are created with a valid role
            // Note: app_role enum only supports: 'admin', 'hr', 'finance_manager', 'employee', 'super_admin', 'ceo', 'cfo'
            // Use 'admin' for department heads since they need elevated permissions
            const enforcedRole = 'admin';

            // Insert user_role (agency_id is NULL in isolated databases)
            await agencyClient.query(
              `INSERT INTO public.user_roles (id, user_id, role, agency_id, assigned_at)
               VALUES (gen_random_uuid(), $1, $2, NULL, NOW())
               ON CONFLICT (user_id, role, agency_id) DO NOTHING`,
              [userId, enforcedRole]
            );

            let departmentNameForCsv = '';
            if (member.department && member.department !== 'none') {
              // In isolated databases, agency_id is NULL, so query by name only
              const deptResult = await agencyClient.query(
                `SELECT id, name FROM public.departments WHERE name = $1 LIMIT 1`,
                [member.department]
              );
              if (deptResult.rows.length > 0) {
                const deptId = deptResult.rows[0].id;
                departmentNameForCsv = deptResult.rows[0].name || member.department;
                // Insert team_assignment (agency_id is NULL in isolated databases)
                // role_in_department can be a text field, not enum, so we can use 'department_head' here
                await agencyClient.query(
                  `INSERT INTO public.team_assignments (
                    id, user_id, department_id, position_title, role_in_department, 
                    agency_id, start_date, is_active, created_at, updated_at
                  )
                  VALUES (gen_random_uuid(), $1, $2, $3, $4, NULL, NOW(), true, NOW(), NOW())`,
                  [userId, deptId, member.title || 'Department Head', 'department_head']
                );
                console.log(`[Setup] Assigned ${member.name} to department: ${departmentNameForCsv}`);
              } else {
                console.warn(`[Setup] Department "${member.department}" not found for team member ${member.name}`);
              }
            }

            // Collect credentials for CSV export (only for newly created users)
            teamCredentials.push({
              name: member.name,
              email: member.email.toLowerCase(),
              role: enforcedRole, // This is the app_role enum value ('admin')
              department: departmentNameForCsv || member.department || '',
              employeeId,
              temporaryPassword: plainPassword,
            });

            console.log(
              `[Setup] Created department head: ${member.name} (${member.email}) with employeeId ${employeeId} and role ${enforcedRole}`
            );
            // Release savepoint on success
            await agencyClient.query('RELEASE SAVEPOINT team_member_' + member.email.replace(/[^a-zA-Z0-9]/g, '_'));
          } catch (memberError) {
            console.error(`[Setup] Error creating team member ${member.email}:`, memberError);
            // Rollback to savepoint to continue with other team members
            try {
              await agencyClient.query('ROLLBACK TO SAVEPOINT team_member_' + member.email.replace(/[^a-zA-Z0-9]/g, '_'));
              console.log(`[Setup] Rolled back team member ${member.email}, continuing with others`);
            } catch (rollbackError) {
              console.error(`[Setup] Error rolling back savepoint for ${member.email}:`, rollbackError);
            }
            // Continue with next team member instead of aborting entire transaction
          }
        }
      }
    }

    await agencyClient.query('COMMIT');
    console.log(`[Setup] Setup completed successfully for database: ${agencyDatabase}`);

    // Build CSV with first-time login credentials for created department heads
    let teamCredentialsCsv = '';
    if (teamCredentials.length > 0) {
      const header = 'Name,Email,Role,Department,Employee ID,Temporary Password';
      const rows = teamCredentials.map((c) => {
        const escape = (value) => {
          if (value == null) return '';
          const str = String(value);
          if (/[",\n]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        return [
          escape(c.name),
          escape(c.email),
          escape(c.role),
          escape(c.department),
          escape(c.employeeId),
          escape(c.temporaryPassword),
        ].join(',');
      });
      teamCredentialsCsv = [header, ...rows].join('\n');
    }

    // Return metadata so API layer can expose credentials to frontend
    return {
      teamCredentials,
      teamCredentialsCsv,
    };
  } catch (error) {
    console.error(`[Setup] Error completing setup for ${agencyDatabase}:`, error);
    await agencyClient.query('ROLLBACK').catch(rollbackError => {
      console.error('[Setup] Error during rollback:', rollbackError);
    });
    throw error;
  } finally {
    try {
      agencyClient.release();
      // Don't close pool - it's managed by pool manager
    } catch (cleanupError) {
      console.error('[Setup] Error cleaning up connections:', cleanupError);
    }
  }
}

module.exports = {
  checkDomainAvailability,
  checkSetupStatus,
  getSetupProgress,
  createAgency,
  repairAgencyDatabase,
  completeAgencySetup,
};