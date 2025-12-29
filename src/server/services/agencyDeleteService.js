/**
 * Agency Delete Service
 * Completely removes an agency database and all related records
 */

const { Pool } = require('pg');
const { pool } = require('../config/database');
const { parseDatabaseUrl } = require('../utils/poolManager');

/**
 * Delete an agency completely
 * - Drops the agency database
 * - Removes agency record from main database
 * - All related records are removed via CASCADE or manual cleanup
 * 
 * @param {string} agencyId - Agency ID from main database
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function deleteAgency(agencyId) {
  if (!agencyId) {
    throw new Error('Agency ID is required');
  }

  const mainClient = await pool.connect();
  
  try {
    // Get agency information including database_name
    const agencyResult = await mainClient.query(
      'SELECT id, name, database_name FROM public.agencies WHERE id = $1',
      [agencyId]
    );

    if (agencyResult.rows.length === 0) {
      throw new Error('Agency not found');
    }

    const agency = agencyResult.rows[0];
    let databaseName = agency.database_name;
    const agencyName = agency.name;

    // If database_name is not set, try to discover it
    if (!databaseName) {
      console.log(`[Delete] Agency ${agencyId} has no database_name, attempting discovery...`);
      const { discoverAndUpdateAgencyDatabase } = require('./agencyDatabaseDiscovery');
      const discoveredDb = await discoverAndUpdateAgencyDatabase(agencyId);
      
      if (discoveredDb) {
        databaseName = discoveredDb;
        console.log(`[Delete] Discovered database ${databaseName} for agency ${agencyId}`);
      } else {
        // If no database found, just delete the agency record
        console.log(`[Delete] Agency ${agencyName} has no database_name and none found, deleting record only`);
        await mainClient.query('DELETE FROM public.agencies WHERE id = $1', [agencyId]);
        return {
          success: true,
          message: `Agency "${agencyName}" record has been deleted (no database was associated)`,
          agencyName,
          databaseName: null
        };
      }
    }

    console.log(`[Delete] Starting deletion of agency: ${agencyName} (${agencyId})`);
    console.log(`[Delete] Database to drop: ${databaseName}`);

    // Step 1: Drop the agency database
    // We need to connect to the default postgres database to drop the agency database
    // because you cannot drop a database while connected to it
    const { host, port, user, password } = parseDatabaseUrl();
    const postgresDbUrl = `postgresql://${user}:${password}@${host}:${port}/postgres`;
    const postgresPool = new Pool({ connectionString: postgresDbUrl, max: 1 });
    const postgresClient = await postgresPool.connect();

    try {
      // Check if database exists first
      const dbExistsCheck = await postgresClient.query(
        'SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) as exists',
        [databaseName]
      );

      if (!dbExistsCheck.rows[0].exists) {
        console.log(`[Delete] Database ${databaseName} does not exist, skipping drop`);
        // Continue to delete agency record even if database doesn't exist
      } else {
        // Terminate all connections to the target database first
        console.log(`[Delete] Terminating connections to database: ${databaseName}`);
        try {
          await postgresClient.query(`
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = $1
            AND pid <> pg_backend_pid()
          `, [databaseName]);
        } catch (terminateError) {
          // Ignore errors if no connections exist
          console.warn(`[Delete] Could not terminate connections: ${terminateError.message}`);
        }

        // Wait a moment for connections to close
        await new Promise(resolve => setTimeout(resolve, 500));

        // Drop the database securely
        const { validateDatabaseName, quoteIdentifier } = require('../utils/securityUtils');
        const validatedDbName = validateDatabaseName(databaseName);
        const quotedDbName = quoteIdentifier(validatedDbName);
        console.log(`[Delete] Dropping database: ${validatedDbName}`);
        await postgresClient.query(`DROP DATABASE IF EXISTS ${quotedDbName}`);
        console.log(`[Delete] ✅ Database ${databaseName} dropped successfully`);
      }
    } catch (error) {
      console.error(`[Delete] Error dropping database ${databaseName}:`, error);
      // Don't throw - continue to delete agency record even if database drop fails
      console.warn(`[Delete] Continuing with agency record deletion despite database drop error`);
    } finally {
      postgresClient.release();
      await postgresPool.end();
    }

    // Step 2: Delete agency record from main database
    // This should cascade delete related records if foreign keys are set up
    console.log(`[Delete] Removing agency record from main database`);
    await mainClient.query('BEGIN');
    
    try {
      // Delete from agencies table
      const deleteResult = await mainClient.query(
        'DELETE FROM public.agencies WHERE id = $1',
        [agencyId]
      );

      if (deleteResult.rowCount === 0) {
        throw new Error('Failed to delete agency record');
      }

      // Commit the transaction
      await mainClient.query('COMMIT');
      console.log(`[Delete] ✅ Agency record removed from main database`);

      return {
        success: true,
        message: `Agency "${agencyName}" and its database have been completely deleted`,
        agencyName,
        databaseName
      };
    } catch (error) {
      await mainClient.query('ROLLBACK');
      console.error('[Delete] Error deleting agency record:', error);
      throw new Error(`Failed to delete agency record: ${error.message}`);
    }
  } catch (error) {
    console.error('[Delete] Error during agency deletion:', error);
    throw error;
  } finally {
    mainClient.release();
  }
}

/**
 * Check if agency can be safely deleted
 * Returns warnings if agency has active data
 */
async function checkAgencyDeletionSafety(agencyId) {
  if (!agencyId) {
    throw new Error('Agency ID is required');
  }

  const mainClient = await pool.connect();
  
  try {
    const agencyResult = await mainClient.query(
      'SELECT id, name, database_name FROM public.agencies WHERE id = $1',
      [agencyId]
    );

    if (agencyResult.rows.length === 0) {
      throw new Error('Agency not found');
    }

    const agency = agencyResult.rows[0];
    const databaseName = agency.database_name;

    if (!databaseName) {
      return {
        canDelete: true,
        warnings: []
      };
    }

    // Connect to agency database to check data
    const { host, port, user, password } = parseDatabaseUrl();
    const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${databaseName}`;
    const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
    const agencyClient = await agencyPool.connect();

    const warnings = [];

    try {
      // Check for users
      const userCount = await agencyClient.query('SELECT COUNT(*) as count FROM public.profiles');
      if (parseInt(userCount.rows[0].count) > 0) {
        warnings.push(`Agency has ${userCount.rows[0].count} user(s)`);
      }

      // Check for projects
      const projectCount = await agencyClient.query('SELECT COUNT(*) as count FROM public.projects');
      if (parseInt(projectCount.rows[0].count) > 0) {
        warnings.push(`Agency has ${projectCount.rows[0].count} project(s)`);
      }

      // Check for invoices
      const invoiceCount = await agencyClient.query('SELECT COUNT(*) as count FROM public.invoices');
      if (parseInt(invoiceCount.rows[0].count) > 0) {
        warnings.push(`Agency has ${invoiceCount.rows[0].count} invoice(s)`);
      }
    } catch (error) {
      // If tables don't exist, that's okay - agency might be empty
      console.warn('[Delete] Could not check agency data:', error.message);
    } finally {
      agencyClient.release();
      await agencyPool.end();
    }

    return {
      canDelete: true, // Always can delete, but with warnings
      warnings
    };
  } catch (error) {
    console.error('[Delete] Error checking deletion safety:', error);
    throw error;
  } finally {
    mainClient.release();
  }
}

module.exports = {
  deleteAgency,
  checkAgencyDeletionSafety,
};
