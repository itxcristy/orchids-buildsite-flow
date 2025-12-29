/**
 * Reports Routes
 * Handles permission report generation
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireRole, requireAgencyContext } = require('../middleware/authMiddleware');
const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');
const reportingDashboardService = require('../services/reportingDashboardService');
const { cacheMiddleware } = require('../services/cacheService');

// Helper to get agency database connection
async function getAgencyDb(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  return new Pool({ connectionString: agencyDbUrl, max: 1 });
}

/**
 * GET /api/reports/permission-distribution
 * Generate permission distribution report
 */
router.get('/permission-distribution', authenticate, requireRole(['super_admin', 'ceo', 'admin']), requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT 
        rp.role,
        p.category,
        COUNT(*) as permission_count,
        SUM(CASE WHEN rp.granted THEN 1 ELSE 0 END) as granted_count
       FROM public.role_permissions rp
       INNER JOIN public.permissions p ON rp.permission_id = p.id
       WHERE p.is_active = true
       GROUP BY rp.role, p.category
       ORDER BY rp.role, p.category`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * GET /api/reports/user-permissions
 * Generate user permissions report
 */
router.get('/user-permissions', authenticate, requireRole(['super_admin', 'ceo', 'admin']), requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT 
        u.id as user_id,
        p.full_name,
        p.email,
        ur.role,
        COUNT(DISTINCT rp.permission_id) as role_permission_count,
        COUNT(DISTINCT up.permission_id) as override_count
       FROM public.users u
       LEFT JOIN public.profiles p ON u.id = p.user_id
       LEFT JOIN public.user_roles ur ON u.id = ur.user_id
       LEFT JOIN public.role_permissions rp ON ur.role = rp.role AND rp.granted = true
       LEFT JOIN public.user_permissions up ON u.id = up.user_id
       GROUP BY u.id, p.full_name, p.email, ur.role
       ORDER BY p.full_name`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * GET /api/reports/unused-permissions
 * Find permissions that are never granted
 */
router.get('/unused-permissions', authenticate, requireRole(['super_admin', 'ceo', 'admin']), requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT p.*
       FROM public.permissions p
       LEFT JOIN public.role_permissions rp ON p.id = rp.permission_id AND rp.granted = true
       LEFT JOIN public.user_permissions up ON p.id = up.permission_id AND up.granted = true
       WHERE p.is_active = true
       AND rp.id IS NULL
       AND up.id IS NULL
       ORDER BY p.category, p.name`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * GET /api/reports/compliance
 * Generate compliance report
 */
router.get('/compliance', authenticate, requireRole(['super_admin', 'ceo', 'admin']), requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    // Check for users with excessive permissions
    const excessivePerms = await client.query(
      `SELECT 
        u.id,
        p.full_name,
        p.email,
        COUNT(DISTINCT up.permission_id) as override_count
       FROM public.users u
       LEFT JOIN public.profiles p ON u.id = p.user_id
       LEFT JOIN public.user_permissions up ON u.id = up.user_id
       GROUP BY u.id, p.full_name, p.email
       HAVING COUNT(DISTINCT up.permission_id) > 20
       ORDER BY override_count DESC`
    );

    // Check for expired permissions
    const expiredPerms = await client.query(
      `SELECT 
        up.*,
        p.name as permission_name,
        pr.full_name as user_name
       FROM public.user_permissions up
       INNER JOIN public.permissions p ON up.permission_id = p.id
       LEFT JOIN public.profiles pr ON up.user_id = pr.user_id
       WHERE up.expires_at IS NOT NULL
       AND up.expires_at < now()
       AND up.granted = true`
    );

    res.json({
      success: true,
      data: {
        excessive_permissions: excessivePerms.rows,
        expired_permissions: expiredPerms.rows
      }
    });
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * GET /api/reports/dashboard
 * Get comprehensive dashboard data from all modules
 */
router.get('/dashboard', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  
  // Validate date filters
  const dateFrom = req.query.date_from;
  const dateTo = req.query.date_to;
  
  if (dateFrom && isNaN(Date.parse(dateFrom))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid date_from format. Use YYYY-MM-DD',
    });
  }
  
  if (dateTo && isNaN(Date.parse(dateTo))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid date_to format. Use YYYY-MM-DD',
    });
  }
  
  if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
    return res.status(400).json({
      success: false,
      error: 'date_from must be before or equal to date_to',
    });
  }
  
  const filters = {
    date_from: dateFrom,
    date_to: dateTo,
  };

  try {
    const dashboardData = await reportingDashboardService.getDashboardData(agencyDatabase, agencyId, filters);

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('[Reports Route] Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch dashboard data',
    });
  }
}));

/**
 * POST /api/reports/custom
 * Generate custom report based on query parameters
 */
router.post('/custom', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const { module, filters, columns, groupBy, orderBy } = req.body;

  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    let query = '';
    let params = [agencyId];
    let paramIndex = 2;

    // Build query based on module
    switch (module) {
      case 'inventory':
        query = `
          SELECT 
            ${columns?.join(', ') || 'p.sku, p.name, i.quantity, i.average_cost, w.name as warehouse_name'}
          FROM public.inventory i
          JOIN public.products p ON i.product_id = p.id
          JOIN public.warehouses w ON i.warehouse_id = w.id
          WHERE p.agency_id = $1
        `;
        break;
      case 'procurement':
        query = `
          SELECT 
            ${columns?.join(', ') || 'po.po_number, po.status, po.total_amount, s.name as supplier_name, po.created_at'}
          FROM public.purchase_orders po
          LEFT JOIN public.suppliers s ON po.supplier_id = s.id
          WHERE po.agency_id = $1
        `;
        break;
      case 'assets':
        query = `
          SELECT 
            ${columns?.join(', ') || 'a.asset_number, a.name, a.status, a.purchase_cost, a.current_value, ac.name as category_name'}
          FROM public.assets a
          LEFT JOIN public.asset_categories ac ON a.category_id = ac.id
          WHERE a.agency_id = $1
        `;
        break;
      case 'financial':
        query = `
          SELECT 
            ${columns?.join(', ') || 'i.invoice_number, i.total_amount, i.status, i.issue_date, c.name as client_name'}
          FROM public.invoices i
          LEFT JOIN public.clients c ON i.client_id = c.id
          WHERE i.agency_id = $1
        `;
        break;
      default:
        throw new Error('Invalid module specified');
    }

    // Add filters
    if (filters && Object.keys(filters).length > 0) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          query += ` AND ${key} = $${paramIndex}`;
          params.push(value);
          paramIndex++;
        }
      }
    }

    // Add date range filters if provided
    if (filters?.date_from) {
      query += ` AND created_at >= $${paramIndex}::date`;
      params.push(filters.date_from);
      paramIndex++;
    }
    if (filters?.date_to) {
      query += ` AND created_at <= $${paramIndex}::date`;
      params.push(filters.date_to);
      paramIndex++;
    }

    // Add GROUP BY
    if (groupBy && groupBy.length > 0) {
      query += ` GROUP BY ${groupBy.join(', ')}`;
    }

    // Add ORDER BY
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    } else {
      query += ` ORDER BY created_at DESC`;
    }

    // Limit results
    query += ` LIMIT 1000`;

    const result = await client.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('[Reports] Error generating custom report:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}));

const scheduledReportService = require('../services/scheduledReportService');

/**
 * GET /api/reports/scheduled
 * Get all scheduled reports
 */
router.get('/scheduled', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const filters = {
    report_type: req.query.report_type,
    is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
    search: req.query.search,
  };

  const schedules = await scheduledReportService.getReportSchedules(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: schedules,
  });
}));

/**
 * GET /api/reports/scheduled/:scheduleId
 * Get scheduled report by ID
 */
router.get('/scheduled/:scheduleId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { scheduleId } = req.params;

  const schedule = await scheduledReportService.getReportScheduleById(agencyDatabase, agencyId, scheduleId);

  res.json({
    success: true,
    data: schedule,
  });
}));

/**
 * POST /api/reports/scheduled
 * Create scheduled report
 */
router.post('/scheduled', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const schedule = await scheduledReportService.createReportSchedule(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.status(201).json({
    success: true,
    data: schedule,
    message: 'Scheduled report created successfully',
  });
}));

/**
 * PUT /api/reports/scheduled/:scheduleId
 * Update scheduled report
 */
router.put('/scheduled/:scheduleId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { scheduleId } = req.params;
  const userId = req.user.id;

  const schedule = await scheduledReportService.updateReportSchedule(
    agencyDatabase,
    agencyId,
    scheduleId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: schedule,
    message: 'Scheduled report updated successfully',
  });
}));

/**
 * DELETE /api/reports/scheduled/:scheduleId
 * Delete scheduled report
 */
router.delete('/scheduled/:scheduleId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { scheduleId } = req.params;

  await scheduledReportService.deleteReportSchedule(agencyDatabase, agencyId, scheduleId);

  res.json({
    success: true,
    message: 'Scheduled report deleted successfully',
  });
}));

/**
 * GET /api/reports/exports
 * Get report exports
 */
router.get('/exports', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const filters = {
    status: req.query.status,
    format: req.query.format,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    search: req.query.search,
  };

  const exports = await scheduledReportService.getReportExports(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: exports,
  });
}));

/**
 * DELETE /api/reports/exports/:exportId
 * Delete report export
 */
router.delete('/exports/:exportId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { exportId } = req.params;

  await scheduledReportService.deleteReportExport(agencyDatabase, agencyId, exportId);

  res.json({
    success: true,
    message: 'Report export deleted successfully',
  });
}));

/**
 * GET /api/reports/analytics
 * Get analytics dashboard data
 */
router.get('/analytics', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const filters = {
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    period: req.query.period || 'month',
  };

  // Use reporting dashboard service for analytics
  const dashboardData = await reportingDashboardService.getDashboardData(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: dashboardData,
  });
}));

module.exports = router;
