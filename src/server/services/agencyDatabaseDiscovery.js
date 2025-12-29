/**
 * Agency Database Discovery Service
 * Discovers and maps existing databases to agencies that don't have database_name set
 */

const { Pool } = require('pg');
const { pool } = require('../config/database');
const { parseDatabaseUrl } = require('../utils/poolManager');

/**
 * Discover database name for an agency by trying common patterns
 * @param {string} agencyId - Agency ID
 * @param {string} agencyName - Agency name
 * @param {string} domain - Agency domain
 * @returns {Promise<string|null>} Database name if found, null otherwise
 */
async function discoverAgencyDatabase(agencyId, agencyName, domain) {
  const { host, port, user, password } = parseDatabaseUrl();
  const postgresPool = new Pool({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });
  const postgresClient = await postgresPool.connect();

  try {
    // Get all databases that start with 'agency_'
    const dbResult = await postgresClient.query(`
      SELECT datname 
      FROM pg_database 
      WHERE datname LIKE 'agency_%'
      AND datistemplate = false
      ORDER BY datname
    `);

    const allAgencyDatabases = dbResult.rows.map(row => row.datname);

    // Try to match by agency ID (last 8 characters in database name)
    const agencyIdSuffix = agencyId.substring(0, 8);
    for (const dbName of allAgencyDatabases) {
      if (dbName.includes(agencyIdSuffix)) {
        console.log(`[Discovery] Found database ${dbName} for agency ${agencyId} by ID match`);
        return dbName;
      }
    }

    // Try to match by domain (sanitized)
    if (domain) {
      let subdomain = domain.toLowerCase().trim().split('.')[0];
      const sanitizedDomain = subdomain
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

      for (const dbName of allAgencyDatabases) {
        if (dbName.includes(sanitizedDomain)) {
          console.log(`[Discovery] Found database ${dbName} for agency ${agencyId} by domain match`);
          return dbName;
        }
      }
    }

    // Try to match by checking if database has agency_id in any table
    // This is more expensive but more reliable
    for (const dbName of allAgencyDatabases) {
      try {
        const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${dbName}`;
        const { Pool: AgencyPool } = require('pg');
        const agencyPool = new AgencyPool({ connectionString: agencyDbUrl, max: 1 });
        const agencyClient = await agencyPool.connect();

        try {
          // Check if profiles table exists and has this agency_id
          const profileCheck = await agencyClient.query(`
            SELECT EXISTS(
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'profiles'
            ) as exists
          `);

          if (profileCheck.rows[0].exists) {
            const agencyCheck = await agencyClient.query(
              'SELECT COUNT(*) as count FROM public.profiles WHERE agency_id = $1',
              [agencyId]
            );

            if (parseInt(agencyCheck.rows[0].count) > 0) {
              console.log(`[Discovery] Found database ${dbName} for agency ${agencyId} by agency_id match`);
              return dbName;
            }
          }
        } finally {
          agencyClient.release();
          await agencyPool.end();
        }
      } catch (error) {
        // Skip databases we can't connect to
        continue;
      }
    }

    console.log(`[Discovery] Could not find database for agency ${agencyId}`);
    return null;
  } catch (error) {
    console.error('[Discovery] Error discovering database:', error);
    return null;
  } finally {
    postgresClient.release();
    await postgresPool.end();
  }
}

/**
 * Update agency record with discovered database_name
 * @param {string} agencyId - Agency ID
 * @param {string} databaseName - Database name to set
 * @returns {Promise<boolean>} True if updated successfully
 */
async function updateAgencyDatabaseName(agencyId, databaseName) {
  const client = await pool.connect();
  try {
    await client.query(
      'UPDATE public.agencies SET database_name = $1 WHERE id = $2',
      [databaseName, agencyId]
    );
    console.log(`[Discovery] Updated agency ${agencyId} with database_name: ${databaseName}`);
    return true;
  } catch (error) {
    console.error('[Discovery] Error updating database_name:', error);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Discover and update database_name for an agency
 * @param {string} agencyId - Agency ID
 * @returns {Promise<string|null>} Database name if found and updated, null otherwise
 */
async function discoverAndUpdateAgencyDatabase(agencyId) {
  const client = await pool.connect();
  try {
    const agencyResult = await client.query(
      'SELECT id, name, domain, database_name FROM public.agencies WHERE id = $1',
      [agencyId]
    );

    if (agencyResult.rows.length === 0) {
      return null;
    }

    const agency = agencyResult.rows[0];

    // If database_name already exists, return it
    if (agency.database_name) {
      return agency.database_name;
    }

    // Try to discover the database
    const discoveredDb = await discoverAgencyDatabase(
      agency.id,
      agency.name,
      agency.domain
    );

    if (discoveredDb) {
      // Update the agency record
      await updateAgencyDatabaseName(agencyId, discoveredDb);
      return discoveredDb;
    }

    return null;
  } catch (error) {
    console.error('[Discovery] Error in discoverAndUpdate:', error);
    return null;
  } finally {
    client.release();
  }
}

module.exports = {
  discoverAgencyDatabase,
  updateAgencyDatabaseName,
  discoverAndUpdateAgencyDatabase,
};
