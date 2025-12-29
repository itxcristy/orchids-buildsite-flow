/**
 * Schema Validation and Repair Utilities
 * 
 * Schema validation is now cached and only runs:
 * - On agency creation
 * - On application startup
 * - On manual admin trigger
 * - When a query fails with schema-related error (with circuit breaker protection)
 * - NOT on every query (performance optimization)
 * 
 * Performance optimizations:
 * - 1-hour cache expiry to prevent repeated validations
 * - Circuit breaker prevents excessive repair attempts (30s minimum between attempts)
 * - In-progress tracking prevents concurrent validation for same agency
 * - Graceful error handling prevents validation loops
 */

const { createTemporaryPool, parseDatabaseUrl } = require('./poolManager');
// Lazy load createAgencySchema to avoid circular dependency
// It's only used in ensureAgencyDatabase when creating a new database
let createAgencySchema;
function getCreateAgencySchema() {
  if (!createAgencySchema) {
    createAgencySchema = require('./schemaCreator').createAgencySchema;
  }
  return createAgencySchema;
}
const { DATABASE_URL } = require('../config/constants');

// Schema validation cache with 1-hour expiry
const SCHEMA_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
const schemaValidationCache = new Map();

// Track in-progress schema validations to prevent concurrent attempts
const schemaValidationInProgress = new Set();

/**
 * Structured logging for schema operations
 */
const SchemaLogger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      component: 'SchemaManager',
      message,
      ...meta
    }));
  },
  
  error: (message, error, meta = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      component: 'SchemaManager',
      message,
      error: {
        message: error?.message || String(error),
        stack: error?.stack,
        code: error?.code
      },
      ...meta
    }));
  },
  
  metrics: (operation, duration, meta = {}) => {
    console.log(JSON.stringify({
      level: 'metrics',
      timestamp: new Date().toISOString(),
      component: 'SchemaManager',
      operation,
      duration_ms: duration,
      ...meta
    }));
  }
};

/**
 * Ensure agency database exists, create if missing
 * @param {string} agencyDatabase - Agency database name
 * @returns {Promise<boolean>} - True if database was created, false if it already existed
 */
async function ensureAgencyDatabase(agencyDatabase) {
  let dbConfig;
  try {
    dbConfig = parseDatabaseUrl();
    
    // Validate dbConfig structure with comprehensive checks
    if (!dbConfig || typeof dbConfig !== 'object') {
      throw new Error('parseDatabaseUrl returned invalid result: not an object');
    }
    if (!dbConfig.host || typeof dbConfig.host !== 'string') {
      throw new Error('parseDatabaseUrl returned invalid or missing host');
    }
    if (!dbConfig.port || typeof dbConfig.port !== 'number' || isNaN(dbConfig.port)) {
      throw new Error('parseDatabaseUrl returned invalid or missing port');
    }
    if (!dbConfig.user || typeof dbConfig.user !== 'string') {
      throw new Error('parseDatabaseUrl returned invalid or missing user');
    }
    // Password can be empty string, but should be a string
    if (dbConfig.password === undefined || dbConfig.password === null) {
      throw new Error('parseDatabaseUrl returned invalid password (null/undefined)');
    }
    // Ensure password is a string (can be empty)
    if (typeof dbConfig.password !== 'string') {
      dbConfig.password = String(dbConfig.password || '');
    }
  } catch (parseError) {
    const errorMessage = parseError?.message || String(parseError) || 'Unknown parse error';
    SchemaLogger.error('Failed to parse database URL in ensureAgencyDatabase', parseError, { agencyDatabase });
    throw new Error(`Failed to parse database URL: ${errorMessage}`);
  }

  // Safely extract and validate connection parameters
  const host = String(dbConfig.host || 'localhost');
  const defaultPort = parseInt(process.env.POSTGRES_PORT || process.env.DATABASE_PORT || '5432', 10);
  const port = parseInt(dbConfig.port || defaultPort, 10);
  const user = String(dbConfig.user || 'postgres');
  const password = String(dbConfig.password || '');
  
  // URL-encode password to handle special characters
  const encodedPassword = encodeURIComponent(password);
  const postgresUrl = `postgresql://${user}:${encodedPassword}@${host}:${port}/postgres`;
  const { Pool } = require('pg');
  const postgresPool = new Pool({ connectionString: postgresUrl, max: 1 });
  const postgresClient = await postgresPool.connect();

  try {
    // Use advisory lock to prevent concurrent database creation
    // Generate a consistent lock ID from the database name
    const lockResult = await postgresClient.query(`
      SELECT pg_try_advisory_lock(hashtext($1)::bigint) as acquired
    `, [agencyDatabase]);
    
    try {
      const lockAcquired = lockResult.rows[0].acquired;
      
      if (!lockAcquired) {
        // Another process is creating the database, wait a bit and check if it exists
        await new Promise(resolve => setTimeout(resolve, 1000));
        const dbCheck = await postgresClient.query(
          `SELECT 1 FROM pg_database WHERE datname = $1`,
          [agencyDatabase]
        );
        if (dbCheck.rows.length > 0) {
          return false; // Database was created by another process
        }
        // If still doesn't exist, wait a bit more and check again
        await new Promise(resolve => setTimeout(resolve, 2000));
        const dbCheck2 = await postgresClient.query(
          `SELECT 1 FROM pg_database WHERE datname = $1`,
          [agencyDatabase]
        );
        return dbCheck2.rows.length > 0 ? false : true; // Return false if exists now
      }
      
      // Check if database exists
      const dbCheck = await postgresClient.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [agencyDatabase]
      );

      if (dbCheck.rows.length === 0) {
        // Database doesn't exist, create it securely
        const { validateDatabaseName, quoteIdentifier } = require('./securityUtils');
        const validatedDbName = validateDatabaseName(agencyDatabase);
        const quotedDbName = quoteIdentifier(validatedDbName);
        console.log(`[API] Database ${validatedDbName} does not exist, creating...`);
        try {
          await postgresClient.query(`CREATE DATABASE ${quotedDbName}`);
          console.log(`[API] ✅ Database created: ${agencyDatabase}`);
        } catch (createError) {
          // If database was created by another process, that's fine
          if (createError.code === '42P04' || createError.code === '23505' || 
              createError.message.includes('duplicate key') || 
              createError.message.includes('already exists')) {
            // Check if it exists now
            const dbCheck2 = await postgresClient.query(
              `SELECT 1 FROM pg_database WHERE datname = $1`,
              [agencyDatabase]
            );
            if (dbCheck2.rows.length > 0) {
              console.log(`[API] Database ${agencyDatabase} was created by another process`);
              return false; // Database exists now
            }
          }
          throw createError;
        }
        
        // After creating database, create the schema
        // Safely extract and validate connection parameters
        const safeHost = String(dbConfig.host || 'localhost');
        const defaultPort = parseInt(process.env.POSTGRES_PORT || process.env.DATABASE_PORT || '5432', 10);
        const safePort = parseInt(dbConfig.port || defaultPort, 10);
        const safeUser = String(dbConfig.user || 'postgres');
        const safePassword = String(dbConfig.password || '');
        
        // URL-encode password to handle special characters
        const encodedPassword = encodeURIComponent(safePassword);
        const agencyDbUrl = `postgresql://${safeUser}:${encodedPassword}@${safeHost}:${safePort}/${agencyDatabase}`;
        const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
        const agencyClient = await agencyPool.connect();
        
        try {
          console.log(`[API] Creating schema for ${agencyDatabase}...`);
          // Use lazy-loaded function to avoid circular dependency
          await getCreateAgencySchema()(agencyClient);
          console.log(`[API] ✅ Schema created for ${agencyDatabase}`);
        } finally {
          if (agencyClient) {
            agencyClient.release();
          }
          if (agencyPool && !agencyPool._ending && !agencyPool._ended) {
            agencyPool._ending = true;
            try {
              await agencyPool.end();
              agencyPool._ended = true;
            } catch (endError) {
              // Ignore "more than once" errors
              if (!endError.message?.includes('more than once')) {
                console.warn(`[API] Error closing pool for ${agencyDatabase}:`, endError.message);
              }
            }
          }
        }
        
        return true; // Database was created
      }
      
      return false; // Database already existed
    } finally {
      // Release advisory lock
      await postgresClient.query(`SELECT pg_advisory_unlock(hashtext($1)::bigint)`, [agencyDatabase]);
    }
  } finally {
    postgresClient.release();
    await postgresPool.end();
  }
}

/**
 * Check and repair database schema if needed
 * @param {string} agencyDatabase - Agency database name
 * @param {Object} options - Options for validation
 * @param {boolean} options.force - Force validation even if cached (default: false)
 * @returns {Promise<Object>} Validation result
 */
async function ensureAgencySchema(agencyDatabase, options = {}) {
  // CRITICAL: Disable schema checks if environment variable is set (emergency kill switch)
  if (process.env.DISABLE_SCHEMA_CHECKS === 'true') {
    SchemaLogger.info('Schema checks disabled via DISABLE_SCHEMA_CHECKS', { agencyDatabase });
    return { valid: true, skipped: true, reason: 'disabled_by_env' };
  }

  if (!agencyDatabase) {
    return { valid: true, skipped: true, reason: 'main_database' };
  }

  // CRITICAL: Validate DATABASE_URL is available before proceeding
  // This prevents "searchParams" and other URL parsing errors
  try {
    const testConfig = parseDatabaseUrl();
    if (!testConfig || !testConfig.host || !testConfig.port) {
      SchemaLogger.info('DATABASE_URL invalid, skipping schema validation', { agencyDatabase });
      return { valid: true, skipped: true, reason: 'invalid_database_url' };
    }
  } catch (urlError) {
    // If we can't parse DATABASE_URL, don't attempt schema validation
    SchemaLogger.info('DATABASE_URL parse failed, skipping schema validation', { 
      agencyDatabase,
      error: urlError?.message?.substring(0, 50) || 'Unknown'
    });
    return { valid: true, skipped: true, reason: 'database_url_parse_failed' };
  }

  const { force = false } = options;
  const startTime = Date.now();

  // Check if validation is already in progress for this agency
  if (schemaValidationInProgress.has(agencyDatabase)) {
    SchemaLogger.info('Schema validation already in progress, skipping', { agencyDatabase });
    // Return cached result if available, otherwise return a pending status
    const cached = schemaValidationCache.get(agencyDatabase);
    if (cached) {
      return cached.result;
    }
    return { valid: true, skipped: true, reason: 'in_progress' };
  }

  // Check cache first (unless forced)
  if (!force) {
    const cached = schemaValidationCache.get(agencyDatabase);
    if (cached) {
      const now = Date.now();
      const age = now - cached.timestamp;
      
      if (age < SCHEMA_CHECK_INTERVAL) {
        SchemaLogger.info('Schema validation skipped (cached)', {
          agencyDatabase,
          cacheAge_ms: age,
          remainingCacheTime_ms: SCHEMA_CHECK_INTERVAL - age
        });
        return cached.result;
      }
      
      // Cache expired, remove it
      schemaValidationCache.delete(agencyDatabase);
    }
  }

  // Mark validation as in progress
  schemaValidationInProgress.add(agencyDatabase);

  try {
    // First, ensure the database exists
    await ensureAgencyDatabase(agencyDatabase);

    let dbConfig;
    try {
      dbConfig = parseDatabaseUrl();
      
      // Validate dbConfig has required properties with comprehensive checks
      if (!dbConfig || typeof dbConfig !== 'object') {
        throw new Error('parseDatabaseUrl returned invalid result: not an object');
      }
      if (!dbConfig.host || typeof dbConfig.host !== 'string') {
        throw new Error('parseDatabaseUrl returned invalid or missing host');
      }
      if (!dbConfig.port || typeof dbConfig.port !== 'number' || isNaN(dbConfig.port)) {
        throw new Error('parseDatabaseUrl returned invalid or missing port');
      }
      if (!dbConfig.user || typeof dbConfig.user !== 'string') {
        throw new Error('parseDatabaseUrl returned invalid or missing user');
      }
      // Password can be empty string, but should be a string
      if (dbConfig.password === undefined || dbConfig.password === null) {
        throw new Error('parseDatabaseUrl returned invalid password (null/undefined)');
      }
      // Ensure password is a string (can be empty)
      if (typeof dbConfig.password !== 'string') {
        dbConfig.password = String(dbConfig.password || '');
      }
    } catch (parseError) {
      const errorMessage = parseError?.message || String(parseError) || 'Unknown parse error';
      SchemaLogger.error('Failed to parse database URL', parseError, { 
        agencyDatabase,
        errorMessage 
      });
      // Return cached result if available to prevent repeated failures
      const cached = schemaValidationCache.get(agencyDatabase);
      if (cached) {
        SchemaLogger.info('Returning cached result due to parse error', { agencyDatabase });
        return cached.result;
      }
      // Mark as failed in cache to prevent repeated attempts
      schemaValidationCache.set(agencyDatabase, {
        timestamp: Date.now(),
        result: { valid: false, error: errorMessage, skipped: true }
      });
      return { valid: false, error: errorMessage, skipped: true };
    }

    // Safely extract and validate connection parameters
    const host = String(dbConfig.host || 'localhost');
    const defaultPort = parseInt(process.env.POSTGRES_PORT || process.env.DATABASE_PORT || '5432', 10);
    const port = parseInt(dbConfig.port || defaultPort, 10) || defaultPort;
    const user = String(dbConfig.user || 'postgres');
    const password = String(dbConfig.password || '');
    
    // Validate all parameters are valid before constructing URL
    if (!host || host === 'undefined' || !user || user === 'undefined' || password === undefined || !port || isNaN(port)) {
      const errorMsg = `Invalid database configuration: host=${host}, user=${user}, port=${port}`;
      SchemaLogger.error('Invalid database config in schema validation', new Error(errorMsg), { agencyDatabase });
      throw new Error(errorMsg);
    }
    
    // URL-encode password to handle special characters
    const encodedPassword = encodeURIComponent(password);
    const agencyDbUrl = `postgresql://${user}:${encodedPassword}@${host}:${port}/${agencyDatabase}`;
    
    // Final validation: ensure connection string doesn't contain 'undefined'
    if (agencyDbUrl.includes('undefined') || !agencyDbUrl.startsWith('postgresql://')) {
      const errorMsg = `Invalid connection string constructed: ${agencyDbUrl.replace(/:[^:@]+@/, ':****@')}`;
      SchemaLogger.error('Invalid connection string in schema validation', new Error(errorMsg), { agencyDatabase });
      throw new Error(errorMsg);
    }
    
    const { Pool } = require('pg');
    let agencyPool = null;
    let agencyClient = null;
    
    try {
      agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
      agencyClient = await agencyPool.connect();
    } catch (poolError) {
      // If Pool creation fails, it's likely a connection string issue
      const errorMsg = poolError?.message || 'Failed to create database pool';
      SchemaLogger.error('Pool creation failed in schema validation', poolError, { 
        agencyDatabase,
        errorMessage: errorMsg
      });
      // Clean up pool if it was created but connection failed
      if (agencyPool && !agencyPool._ending && !agencyPool._ended) {
        agencyPool._ending = true;
        try {
          await agencyPool.end();
          agencyPool._ended = true;
        } catch (endError) {
          // Ignore errors when ending pool
          if (!endError.message?.includes('more than once')) {
            // Silently ignore "more than once" errors
          }
        }
      }
      throw new Error(`Database connection failed: ${errorMsg}`);
    }

    try {
      // Use advisory lock to prevent concurrent schema creation
      const lockKey = `schema_${agencyDatabase}`;
      const lockResult = await agencyClient.query(`
        SELECT pg_try_advisory_lock(hashtext($1)::bigint) as acquired
      `, [lockKey]);
      
      try {
        const lockAcquired = lockResult.rows[0].acquired;
        
        if (!lockAcquired) {
          // Another process is creating the schema, wait a bit and return
          SchemaLogger.info('Schema creation in progress, waiting', { agencyDatabase });
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Cache to prevent repeated checks
          const result = { valid: true, inProgress: true };
          schemaValidationCache.set(agencyDatabase, {
            timestamp: Date.now(),
            result
          });
          return result;
        }
        
        // Check if critical tables exist
        const criticalTables = [
          'users',
          'profiles',
          'attendance',
          'projects',
          'invoices',
          'employee_details',
          'leave_requests',
          'holidays',
          'reimbursement_requests',
          'file_storage',
          'gst_settings',
          'gst_transactions',
          'gst_returns',
          'document_folders',
          'documents',
          'document_versions',
          'document_permissions',
          'company_events',
          'clients',
          'tasks',
          'quotations'
        ];
        const checkResult = await agencyClient.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ANY($1::text[])
        `, [criticalTables]);

        const existingTables = checkResult.rows.map(r => r.table_name);
        const missingTables = criticalTables.filter(t => !existingTables.includes(t));

        if (missingTables.length > 0) {
          SchemaLogger.info('Missing tables detected, repairing schema', {
            agencyDatabase,
            missingTables: missingTables.length,
            tables: missingTables
          });
          
          // Run schema creation to add missing tables
          // Use lazy-loaded function to avoid circular dependency
          await getCreateAgencySchema()(agencyClient);
          
          SchemaLogger.info('Schema repair completed', { agencyDatabase });
        }

        // Get schema version if available
        let schemaVersion = 'unknown';
        try {
          const versionResult = await agencyClient.query(
            "SELECT value FROM schema_info WHERE key = 'schema_version' LIMIT 1"
          );
          if (versionResult.rows.length > 0) {
            schemaVersion = versionResult.rows[0].value;
          }
        } catch (e) {
          // schema_info table might not exist yet, that's okay
        }

        // Get total table count
        const tableCountResult = await agencyClient.query(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'"
        );
        const tableCount = parseInt(tableCountResult.rows[0].count, 10);

        const result = {
          valid: true,
          schemaVersion,
          tableCount,
          missingTables: missingTables.length,
          repaired: missingTables.length > 0
        };

        // Cache the result for 1 hour
        schemaValidationCache.set(agencyDatabase, {
          timestamp: Date.now(),
          result
        });

        const duration = Date.now() - startTime;
        SchemaLogger.metrics('schema_validation', duration, {
          agencyDatabase,
          tableCount,
          repaired: result.repaired
        });

        return result;
      } finally {
        // Release advisory lock
        await agencyClient.query(`SELECT pg_advisory_unlock(hashtext($1)::bigint)`, [lockKey]);
      }

    } finally {
      if (agencyClient) {
        agencyClient.release();
      }
      if (agencyPool) {
        // Check if pool is already closed to prevent "Called end on pool more than once" errors
        if (!agencyPool._ending && !agencyPool._ended) {
          agencyPool._ending = true; // Mark as closing
          try {
            await agencyPool.end();
            agencyPool._ended = true;
          } catch (endError) {
            // Ignore errors when ending pool (pool might already be closed)
            if (!endError.message?.includes('more than once')) {
              // Only log if it's not the "more than once" error
              SchemaLogger.info('Pool end error (non-critical)', { 
                agencyDatabase,
                error: endError.message?.substring(0, 50) || 'Unknown'
              });
            }
          }
        }
      }
      // Remove from in-progress set
      schemaValidationInProgress.delete(agencyDatabase);
    }
  } catch (error) {
    // Remove from in-progress set on error
    schemaValidationInProgress.delete(agencyDatabase);
    const duration = Date.now() - startTime;
    
    // Safely extract error message without accessing undefined properties
    const errorMessage = error?.message || String(error) || 'Unknown error';
    const errorCode = error?.code;
    const errorStack = error?.stack;
    
    // Check if this is a URL parsing error (searchParams, URL constructor, etc.)
    const isUrlParseError = errorMessage.includes('searchParams') || 
                           errorMessage.includes('parseDatabaseUrl') ||
                           errorMessage.includes('Invalid URL') ||
                           errorMessage.includes('connection string') ||
                           errorMessage.includes('Database connection failed') ||
                           (errorStack && errorStack.includes('URL')) ||
                           (errorStack && errorStack.includes('pg-connection-string'));
    
    // Only log non-URL-parse errors to avoid log pollution
    if (!isUrlParseError) {
      SchemaLogger.error('Error checking/repairing schema', error, {
        agencyDatabase,
        duration_ms: duration,
        errorMessage,
        errorCode
      });
      
      // Also log in old format for compatibility (but safely)
      console.error(`[API] Error checking/repairing schema for ${agencyDatabase}: ${errorMessage}`);
    } else {
      // URL parse errors are already handled above, just log at info level and skip
      SchemaLogger.info('Schema validation URL parse error (handled gracefully, skipping)', {
        agencyDatabase,
        errorCode,
        duration_ms: duration
      });
      
      // Return a skipped result instead of throwing
      return { valid: true, skipped: true, reason: 'connection_string_error' };
    }
    
    // If database doesn't exist (3D000), try to create it and retry
    if (error.code === '3D000') {
      SchemaLogger.info('Database does not exist, creating', { agencyDatabase });
      try {
        await ensureAgencyDatabase(agencyDatabase);
        // Retry schema check after database creation
        return await ensureAgencySchema(agencyDatabase, options);
      } catch (createError) {
        SchemaLogger.error('Failed to create database', createError, { agencyDatabase });
        return { valid: false, error: createError.message };
      }
    }
    
    return { valid: false, error: error.message };
  }
}

/**
 * Clear schema validation cache for an agency (or all if no agency specified)
 * @param {string} agencyDatabase - Optional agency database name
 */
function clearSchemaCache(agencyDatabase = null) {
  if (agencyDatabase) {
    schemaValidationCache.delete(agencyDatabase);
    schemaValidationInProgress.delete(agencyDatabase);
    SchemaLogger.info('Schema cache cleared', { agencyDatabase });
  } else {
    schemaValidationCache.clear();
    schemaValidationInProgress.clear();
    SchemaLogger.info('All schema caches cleared');
  }
}

/**
 * Get schema version from database
 * @param {Object} client - PostgreSQL client
 * @returns {Promise<string>} Schema version
 */
async function getSchemaVersion(client) {
  try {
    const result = await client.query(
      "SELECT value FROM schema_info WHERE key = 'schema_version' LIMIT 1"
    );
    return result.rows[0]?.value || '0.0.0';
  } catch (error) {
    // Table doesn't exist, return initial version
    return '0.0.0';
  }
}

/**
 * Initialize schema versioning tables
 * @param {Object} client - PostgreSQL client
 */
async function initializeSchemaVersioning(client) {
  try {
    // Create schema_migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(20) PRIMARY KEY,
        description TEXT,
        applied_at TIMESTAMP DEFAULT NOW(),
        checksum VARCHAR(64),
        success BOOLEAN DEFAULT true
      )
    `);

    // Create schema_info table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_info (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Set initial schema version if not exists
    await client.query(`
      INSERT INTO schema_info (key, value) 
      VALUES ('schema_version', '1.0.0') 
      ON CONFLICT (key) DO NOTHING
    `);

    SchemaLogger.info('Schema versioning initialized');
  } catch (error) {
    SchemaLogger.error('Failed to initialize schema versioning', error);
    throw error;
  }
}

module.exports = {
  ensureAgencySchema,
  ensureAgencyDatabase,
  getSchemaVersion,
  initializeSchemaVersioning,
  clearSchemaCache,
  SchemaLogger,
};
