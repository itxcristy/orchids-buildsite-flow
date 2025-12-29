/**
 * Advanced Reporting Routes
 * Handles custom report builder and scheduled reports
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const reportBuilderService = require('../services/reportBuilderService');
const scheduledReportService = require('../services/scheduledReportService');
const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');
const crypto = require('crypto');

function generateUUID() {
  return crypto.randomUUID();
}

async function getAgencyConnection(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  return await agencyPool.connect();
}

/**
 * POST /api/advanced-reports/build
 * Build custom report from configuration
 */
router.post('/build', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { reportConfig } = req.body;

  const reportData = await reportBuilderService.buildReport(agencyDatabase, reportConfig);

  res.json({
    success: true,
    data: reportData,
  });
}));

/**
 * POST /api/advanced-reports/generate
 * Generate report file in specified format
 */
router.post('/generate', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { reportConfig, format } = req.body;

  const reportData = await reportBuilderService.buildReport(agencyDatabase, reportConfig);
  const file = await reportBuilderService.generateReportFile(agencyDatabase, reportData, format || 'json');

  res.json({
    success: true,
    data: {
      format: file.format,
      data: file.data,
      rowCount: reportData.length,
    },
  });
}));

/**
 * POST /api/advanced-reports/schedules
 * Create a new report schedule
 */
router.post('/schedules', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const userId = req.user.id;

  const schedule = await scheduledReportService.createReportSchedule(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: schedule,
    message: 'Report schedule created successfully',
  });
}));

/**
 * GET /api/advanced-reports/schedules
 * Get all report schedules
 */
router.get('/schedules', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;

  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT * FROM public.report_schedules 
       WHERE agency_id = $1 
       ORDER BY created_at DESC`,
      [agencyId]
    );
    res.json({
      success: true,
      data: result.rows,
    });
  } finally {
    client.release();
    await client.client.pool.end();
  }
}));

/**
 * GET /api/advanced-reports/executions
 * Get report execution history
 */
router.get('/executions', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;

  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT 
        e.*,
        r.name as report_name,
        s.schedule_name
       FROM public.report_executions e
       LEFT JOIN public.custom_reports r ON e.report_id = r.id
       LEFT JOIN public.report_schedules s ON e.schedule_id = s.id
       WHERE e.agency_id = $1
       ORDER BY e.created_at DESC
       LIMIT 100`,
      [agencyId]
    );
    res.json({
      success: true,
      data: result.rows,
    });
  } finally {
    client.release();
    await client.client.pool.end();
  }
}));

/**
 * POST /api/advanced-reports/tables
 * Get available tables and columns for report builder
 */
router.post('/tables', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;

  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Get all tables
    const tablesResult = await client.query(`
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    // Get columns for each table
    const tablesWithColumns = await Promise.all(
      tablesResult.rows.map(async (table) => {
        const columnsResult = await client.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = $1
          ORDER BY ordinal_position
        `, [table.table_name]);

        return {
          name: table.table_name,
          type: table.table_type,
          columns: columnsResult.rows.map(col => ({
            name: col.column_name,
            type: col.data_type,
            nullable: col.is_nullable === 'YES',
          })),
        };
      })
    );

    res.json({
      success: true,
      data: tablesWithColumns,
    });
  } finally {
    client.release();
    await client.client.pool.end();
  }
}));

module.exports = router;
