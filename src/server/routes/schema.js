/**
 * Schema Diagnostics Routes
 * Provides read-only insight into the core PostgreSQL schema used by BuildFlow.
 */

const express = require('express');
const router = express.Router();
const { pool, getAgencyPool } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const { ensureMessagingSchema } = require('../utils/schema/messagingSchema');
const { quickSyncSchema } = require('../utils/schemaSyncService');

/**
 * GET /api/schema/overview
 * Returns table, column, and constraint information for core auth/agency tables.
 *
 * NOTE: This endpoint is intended for development and diagnostics only.
 * In production you should protect or disable it at the proxy level.
 */
router.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    // List of tables we care most about for auth + agencies
    const coreTables = [
      'agencies',
      'agency_settings',
      'users',
      'profiles',
      'user_roles',
      'departments',
      'team_assignments',
    ];

    const client = await pool.connect();

    try {
      const tablesResult = await client.query(
        `
        SELECT
          table_name,
          table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
        `
      );

      const columnsResult = await client.query(
        `
        SELECT
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
        ORDER BY table_name, ordinal_position
        `,
        [coreTables]
      );

      const constraintsResult = await client.query(
        `
        SELECT
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        LEFT JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = ANY($1::text[])
        ORDER BY tc.table_name, tc.constraint_name, kcu.position_in_unique_constraint
        `,
        [coreTables]
      );

      res.json({
        success: true,
        message: 'Schema overview fetched successfully',
        data: {
          tables: tablesResult.rows,
          columns: columnsResult.rows,
          constraints: constraintsResult.rows,
        },
      });
    } catch (error) {
      console.error('[Schema Diagnostics] Error fetching schema overview:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to fetch schema overview',
      });
    } finally {
      client.release();
    }
  })
);

/**
 * POST /api/schema/ensure-messaging
 * Ensure messaging schema exists for the current agency database
 */
router.post(
  '/ensure-messaging',
  authenticate,
  requireAgencyContext,
  asyncHandler(async (req, res) => {
    const agencyDatabase = req.user.agencyDatabase;
    
    if (!agencyDatabase) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_AGENCY_DATABASE', message: 'Agency database not found' },
        message: 'Agency database not found',
      });
    }

    const pool = getAgencyPool(agencyDatabase);
    const client = await pool.connect();

    try {
      await ensureMessagingSchema(client);
      
      res.json({
        success: true,
        message: 'Messaging schema ensured successfully',
      });
    } catch (error) {
      console.error('[Schema] Error ensuring messaging schema:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SCHEMA_ERROR', message: error.message },
        message: 'Failed to ensure messaging schema',
      });
    } finally {
      client.release();
    }
  })
);

/**
 * POST /api/schema/sync
 * Automatically detect and create missing columns in all tables
 * This endpoint scans all tables, compares with expected schema, and creates missing columns
 */
router.post(
  '/sync',
  authenticate,
  requireAgencyContext,
  asyncHandler(async (req, res) => {
    const agencyDatabase = req.user.agencyDatabase;
    
    if (!agencyDatabase) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_AGENCY_DATABASE', message: 'Agency database not found' },
        message: 'Agency database not found',
      });
    }

    const pool = getAgencyPool(agencyDatabase);
    const client = await pool.connect();

    try {
      console.log(`[SchemaSync] Starting manual schema sync for database: ${agencyDatabase}`);
      const syncResult = await quickSyncSchema(client);
      
      res.json({
        success: true,
        message: 'Schema synchronization completed',
        data: {
          tablesProcessed: syncResult.tablesProcessed,
          columnsCreated: syncResult.columnsCreated,
          errors: syncResult.errors.length > 0 ? syncResult.errors : undefined,
          details: syncResult.details.length > 0 ? syncResult.details : undefined,
        },
      });
    } catch (error) {
      console.error('[SchemaSync] Error during schema sync:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SYNC_ERROR', message: error.message },
        message: 'Failed to synchronize schema',
      });
    } finally {
      client.release();
    }
  })
);

/**
 * GET /api/schema/sync-status
 * Get status of schema synchronization (check for missing columns without creating them)
 */
router.get(
  '/sync-status',
  authenticate,
  requireAgencyContext,
  asyncHandler(async (req, res) => {
    const agencyDatabase = req.user.agencyDatabase;
    
    if (!agencyDatabase) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_AGENCY_DATABASE', message: 'Agency database not found' },
        message: 'Agency database not found',
      });
    }

    const pool = getAgencyPool(agencyDatabase);
    const client = await pool.connect();

    try {
      const { extractExpectedSchema, getActualColumns } = require('../utils/schemaSyncService');
      const expectedSchema = extractExpectedSchema();
      
      const status = {
        tablesChecked: 0,
        tablesWithMissingColumns: 0,
        totalMissingColumns: 0,
        details: []
      };
      
      // Get all actual tables
      const actualTablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      const actualTables = new Set(actualTablesResult.rows.map(r => r.table_name));
      
      for (const [tableName, expectedColumns] of Object.entries(expectedSchema)) {
        if (!actualTables.has(tableName)) continue;
        
        status.tablesChecked++;
        const actualColumns = await getActualColumns(client, tableName);
        const actualColumnNames = new Set(actualColumns.map(c => c.name));
        
        const missingColumns = expectedColumns.filter(col => !actualColumnNames.has(col.name));
        
        if (missingColumns.length > 0) {
          status.tablesWithMissingColumns++;
          status.totalMissingColumns += missingColumns.length;
          status.details.push({
            table: tableName,
            missingColumns: missingColumns.map(c => ({
              name: c.name,
              type: c.type,
              nullable: c.nullable,
              default: c.default
            }))
          });
        }
      }
      
      res.json({
        success: true,
        message: 'Schema sync status retrieved',
        data: status,
      });
    } catch (error) {
      console.error('[SchemaSync] Error checking sync status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'STATUS_ERROR', message: error.message },
        message: 'Failed to check schema sync status',
      });
    } finally {
      client.release();
    }
  })
);

module.exports = router;

