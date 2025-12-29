/**
 * Audit Log Routes
 * Handles audit log viewing and export
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireRole, requireAgencyContext } = require('../middleware/authMiddleware');
const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');

// Helper to get agency database connection
async function getAgencyDb(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  return new Pool({ connectionString: agencyDbUrl, max: 1 });
}

/**
 * GET /api/audit/logs
 * Get audit logs with filtering
 */
router.get('/logs', authenticate, requireRole(['super_admin', 'ceo', 'admin']), requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const {
    page = 1,
    limit = 50,
    table_name,
    action,
    user_id,
    start_date,
    end_date,
    search
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    let query = 'SELECT * FROM public.audit_logs WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (table_name) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table_name);
    }

    if (action) {
      paramCount++;
      query += ` AND action = $${paramCount}`;
      params.push(action);
    }

    if (user_id) {
      paramCount++;
      query += ` AND user_id = $${paramCount}`;
      params.push(user_id);
    }

    if (start_date) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      params.push(end_date);
    }

    if (search) {
      paramCount++;
      query += ` AND (
        table_name ILIKE $${paramCount} OR
        action ILIKE $${paramCount} OR
        CAST(old_values AS TEXT) ILIKE $${paramCount} OR
        CAST(new_values AS TEXT) ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC';
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await client.query(query, params);
    
    // Build count query separately with same filters
    let countQuery = 'SELECT COUNT(*) as count FROM public.audit_logs WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (table_name) {
      countParamCount++;
      countQuery += ` AND table_name = $${countParamCount}`;
      countParams.push(table_name);
    }

    if (action) {
      countParamCount++;
      countQuery += ` AND action = $${countParamCount}`;
      countParams.push(action);
    }

    if (user_id) {
      countParamCount++;
      countQuery += ` AND user_id = $${countParamCount}`;
      countParams.push(user_id);
    }

    if (start_date) {
      countParamCount++;
      countQuery += ` AND created_at >= $${countParamCount}`;
      countParams.push(start_date);
    }

    if (end_date) {
      countParamCount++;
      countQuery += ` AND created_at <= $${countParamCount}`;
      countParams.push(end_date);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (
        table_name ILIKE $${countParamCount} OR
        action ILIKE $${countParamCount} OR
        CAST(old_values AS TEXT) ILIKE $${countParamCount} OR
        CAST(new_values AS TEXT) ILIKE $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
    }

    const countResult = await client.query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
      }
    });
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * GET /api/audit/export
 * Export audit logs to CSV/JSON
 */
router.get('/export', authenticate, requireRole(['super_admin', 'ceo', 'admin']), requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { format = 'json', start_date, end_date } = req.query;
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    let query = 'SELECT * FROM public.audit_logs WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      params.push(end_date);
    }

    query += ' ORDER BY created_at DESC';

    const result = await client.query(query, params);

    if (format === 'csv') {
      // Convert to CSV
      const headers = ['id', 'table_name', 'action', 'user_id', 'record_id', 'old_values', 'new_values', 'ip_address', 'user_agent', 'created_at'];
      const csvRows = [
        headers.join(','),
        ...result.rows.map(row => 
          headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
            return String(value).replace(/"/g, '""');
          }).join(',')
        )
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${Date.now()}.csv"`);
      res.send(csvRows.join('\n'));
    } else {
      res.json({
        success: true,
        data: result.rows,
        exported_at: new Date().toISOString()
      });
    }
  } finally {
    client.release();
    await pool.end();
  }
}));

module.exports = router;
