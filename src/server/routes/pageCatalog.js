/**
 * Page Catalog API Routes
 * Handles page catalog management, recommendations, and agency page assignments
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { pool } = require('../config/database');
const { authenticate, requireSuperAdmin, requireAdmin, requireRole } = require('../middleware/authMiddleware');
const { getRecommendedPages, previewRecommendations } = require('../services/pageRecommendationService');

// ============================================================================
// SUPER ADMIN ENDPOINTS
// ============================================================================

/**
 * GET /api/system/page-catalog
 * List all pages in catalog with optional filters
 * Requires admin or super_admin role
 */
router.get(
  '/',
  authenticate,
  requireRole(['super_admin', 'admin', 'ceo']),
  asyncHandler(async (req, res) => {
    const { category, is_active, search, page = 1, limit = 50 } = req.query;
    const client = await pool.connect();
    
    try {
      // Check if tables exist
      const tablesCheck = await client.query(`
        SELECT 
          EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agency_page_assignments') as has_assignments,
          EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'page_recommendation_rules') as has_rules
      `);
      
      const hasAssignments = tablesCheck.rows[0]?.has_assignments || false;
      const hasRules = tablesCheck.rows[0]?.has_rules || false;
      
      let query = `
        SELECT 
          pc.*
      `;
      
      if (hasAssignments) {
        query += `, COUNT(DISTINCT apa.agency_id) as assigned_agencies_count`;
      } else {
        query += `, 0 as assigned_agencies_count`;
      }
      
      if (hasRules) {
        query += `, COUNT(DISTINCT prr.id) as recommendation_rules_count`;
      } else {
        query += `, 0 as recommendation_rules_count`;
      }
      
      query += `
        FROM public.page_catalog pc
      `;
      
      if (hasAssignments) {
        query += ` LEFT JOIN public.agency_page_assignments apa ON pc.id = apa.page_id AND apa.status = 'active'`;
      }
      
      if (hasRules) {
        query += ` LEFT JOIN public.page_recommendation_rules prr ON pc.id = prr.page_id`;
      }
      
      query += ` WHERE 1=1`;
      const params = [];
      let paramCount = 0;

      if (category) {
        paramCount++;
        query += ` AND pc.category = $${paramCount}`;
        params.push(category);
      }

      if (is_active !== undefined) {
        paramCount++;
        query += ` AND pc.is_active = $${paramCount}`;
        params.push(is_active === 'true');
      }

      if (search) {
        paramCount++;
        query += ` AND (pc.title ILIKE $${paramCount} OR pc.description ILIKE $${paramCount} OR pc.path ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      query += ` GROUP BY pc.id ORDER BY pc.category, pc.title`;

      // Pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit), offset);

      const result = await client.query(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(DISTINCT pc.id) as total FROM public.page_catalog pc WHERE 1=1`;
      const countParams = [];
      let countParamCount = 0;

      if (category) {
        countParamCount++;
        countQuery += ` AND pc.category = $${countParamCount}`;
        countParams.push(category);
      }

      if (is_active !== undefined) {
        countParamCount++;
        countQuery += ` AND pc.is_active = $${countParamCount}`;
        countParams.push(is_active === 'true');
      }

      if (search) {
        countParamCount++;
        countQuery += ` AND (pc.title ILIKE $${countParamCount} OR pc.description ILIKE $${countParamCount} OR pc.path ILIKE $${countParamCount})`;
        countParams.push(`%${search}%`);
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        data: result.rows.map(row => ({
          id: row.id,
          path: row.path,
          title: row.title,
          description: row.description,
          icon: row.icon,
          category: row.category,
          base_cost: parseFloat(row.base_cost) || 0,
          is_active: row.is_active,
          requires_approval: row.requires_approval,
          metadata: row.metadata || {},
          assigned_agencies_count: parseInt(row.assigned_agencies_count) || 0,
          recommendation_rules_count: parseInt(row.recommendation_rules_count) || 0,
          created_at: row.created_at,
          updated_at: row.updated_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } finally {
      client.release();
    }
  })
);

/**
 * POST /api/system/page-catalog
 * Create new page in catalog
 */
router.post(
  '/',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { path, title, description, icon, category, base_cost, requires_approval, metadata } = req.body;

    if (!path || !title || !category) {
      return res.status(400).json({
        success: false,
        error: { message: 'path, title, and category are required' }
      });
    }

    const client = await pool.connect();
    try {
      // Check if path already exists
      const existing = await client.query(
        'SELECT id FROM public.page_catalog WHERE path = $1',
        [path]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Page with this path already exists' }
        });
      }

      const result = await client.query(
        `INSERT INTO public.page_catalog 
         (path, title, description, icon, category, base_cost, requires_approval, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          path,
          title,
          description || null,
          icon || null,
          category,
          base_cost || 0,
          requires_approval || false,
          metadata ? JSON.stringify(metadata) : '{}'
        ]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  })
);

/**
 * PUT /api/system/page-catalog/:id
 * Update page metadata/pricing
 */
router.put(
  '/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const client = await pool.connect();

    try {
      const allowedFields = ['title', 'description', 'icon', 'category', 'base_cost', 'is_active', 'requires_approval', 'metadata'];
      const updateFields = [];
      const values = [];
      let paramCount = 0;

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          paramCount++;
          updateFields.push(`${field} = $${paramCount}`);
          if (field === 'metadata' && typeof updates[field] === 'object') {
            values.push(JSON.stringify(updates[field]));
          } else {
            values.push(updates[field]);
          }
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'No valid fields to update' }
        });
      }

      paramCount++;
      values.push(id);

      const result = await client.query(
        `UPDATE public.page_catalog 
         SET ${updateFields.join(', ')}, updated_at = now()
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Page not found' }
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  })
);

/**
 * DELETE /api/system/page-catalog/:id
 * Soft delete (set is_active=false)
 */
router.delete(
  '/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
      const result = await client.query(
        `UPDATE public.page_catalog 
         SET is_active = false, updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Page not found' }
        });
      }

      res.json({
        success: true,
        message: 'Page deactivated successfully'
      });
    } finally {
      client.release();
    }
  })
);

/**
 * POST /api/system/page-catalog/:id/recommendation-rules
 * Create recommendation rule for a page
 */
router.post(
  '/:id/recommendation-rules',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id: pageId } = req.params;
    const { industry, company_size, primary_focus, business_goals, priority, is_required } = req.body;
    const client = await pool.connect();

    try {
      // Verify page exists
      const pageCheck = await client.query(
        'SELECT id FROM public.page_catalog WHERE id = $1',
        [pageId]
      );

      if (pageCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Page not found' }
        });
      }

      const result = await client.query(
        `INSERT INTO public.page_recommendation_rules 
         (page_id, industry, company_size, primary_focus, business_goals, priority, is_required)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          pageId,
          industry || null,
          company_size || null,
          primary_focus || null,
          business_goals || null,
          priority || 5,
          is_required || false
        ]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  })
);

/**
 * OPTIONS /api/system/page-catalog/recommendations/preview
 * Handle CORS preflight requests
 */
router.options('/recommendations/preview', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.sendStatus(204);
});

/**
 * GET /api/system/page-catalog/recommendations/preview
 * Preview recommendations based on criteria
 * Public endpoint - used during onboarding before authentication
 */
router.get(
  '/recommendations/preview',
  asyncHandler(async (req, res) => {
    try {
      // Set CORS headers explicitly for this public endpoint
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
        res.setHeader('Access-Control-Max-Age', '86400');
      }

      const { industry, company_size, primary_focus, business_goals } = req.query;

      // Validate that required fields are present and not empty
      const industryTrimmed = industry?.trim();
      const companySizeTrimmed = company_size?.trim();
      const primaryFocusTrimmed = primary_focus?.trim();

      if (!industryTrimmed || !companySizeTrimmed || !primaryFocusTrimmed) {
        // Return empty recommendations instead of error for better UX
        return res.json({
          success: true,
          data: {
            all: [],
            categorized: {
              required: [],
              recommended: [],
              optional: []
            }
          }
        });
      }

      const criteria = {
        industry: industryTrimmed,
        companySize: companySizeTrimmed,
        primaryFocus: primaryFocusTrimmed,
        businessGoals: business_goals ? (Array.isArray(business_goals) ? business_goals : [business_goals]) : []
      };

      const recommendations = await previewRecommendations(criteria);

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      // Set CORS headers even on error
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
      }

      // Enhanced error logging
      console.error('[API] Recommendations preview error:', error);
      console.error('[API] Recommendations preview error stack:', error.stack);
      console.error('[API] Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        name: error.name,
        query: req.query,
        origin: origin,
        url: req.url,
        method: req.method
      });
      
      // Determine error message and code
      let errorMessage = error.message || 'Failed to fetch recommendations';
      let errorCode = error.code || 'INTERNAL_ERROR';
      
      // Handle specific error types
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        errorMessage = 'Page catalog tables not found. Please run database migrations.';
        errorCode = 'MISSING_TABLES';
      } else if (error.message?.includes('connection') || error.message?.includes('pool')) {
        errorMessage = 'Database connection error. Please check database configuration.';
        errorCode = 'DATABASE_CONNECTION_ERROR';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
        errorCode = 'TIMEOUT_ERROR';
      }
      
      // Return error response with CORS headers and fallback data
      const errorResponse = {
        success: false,
        error: {
          message: errorMessage,
          code: errorCode,
          detail: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
          // Include original error message in development
          originalMessage: process.env.NODE_ENV !== 'production' ? error.message : undefined
        },
        data: {
          all: [],
          categorized: {
            required: [],
            recommended: [],
            optional: []
          },
          summary: {
            total: 0,
            required: 0,
            recommended: 0,
            optional: 0
          }
        }
      };

      // Log the error response for debugging
      console.error('[API] Returning error response:', JSON.stringify(errorResponse, null, 2));

      res.status(500).json(errorResponse);
    }
  })
);

/**
 * GET /api/system/agencies/:agencyId/pages
 * Get pages assigned to an agency
 */
router.get(
  '/agencies/:agencyId/pages',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { agencyId } = req.params;
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT 
          apa.*,
          pc.path,
          pc.title,
          pc.description,
          pc.icon,
          pc.category,
          pc.base_cost,
          COALESCE(apa.cost_override, pc.base_cost) as final_cost
         FROM public.agency_page_assignments apa
         INNER JOIN public.page_catalog pc ON apa.page_id = pc.id
         WHERE apa.agency_id = $1
         ORDER BY pc.category, pc.title`,
        [agencyId]
      );

      // Calculate total cost
      const totalCost = result.rows.reduce((sum, row) => {
        return sum + parseFloat(row.final_cost || 0);
      }, 0);

      res.json({
        success: true,
        data: result.rows.map(row => ({
          id: row.id,
          page_id: row.page_id,
          path: row.path,
          title: row.title,
          description: row.description,
          icon: row.icon,
          category: row.category,
          base_cost: parseFloat(row.base_cost) || 0,
          cost_override: row.cost_override ? parseFloat(row.cost_override) : null,
          final_cost: parseFloat(row.final_cost) || 0,
          status: row.status,
          assigned_at: row.assigned_at,
          metadata: row.metadata || {}
        })),
        summary: {
          total_pages: result.rows.length,
          total_cost: totalCost
        }
      });
    } finally {
      client.release();
    }
  })
);

/**
 * POST /api/system/agencies/:agencyId/pages
 * Assign pages to an agency
 */
router.post(
  '/agencies/:agencyId/pages',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { agencyId } = req.params;
    const { page_ids, cost_overrides = {} } = req.body;
    const client = await pool.connect();

    try {
      if (!Array.isArray(page_ids) || page_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'page_ids array is required' }
        });
      }

      // Verify agency exists
      const agencyCheck = await client.query(
        'SELECT id FROM public.agencies WHERE id = $1',
        [agencyId]
      );

      if (agencyCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Agency not found' }
        });
      }

      // Verify all pages exist
      const placeholders = page_ids.map((_, i) => `$${i + 1}`).join(',');
      const pagesCheck = await client.query(
        `SELECT id FROM public.page_catalog WHERE id IN (${placeholders})`,
        page_ids
      );

      if (pagesCheck.rows.length !== page_ids.length) {
        return res.status(400).json({
          success: false,
          error: { message: 'One or more pages not found' }
        });
      }

      // Insert assignments (using ON CONFLICT to handle duplicates)
      const assignments = [];
      for (const pageId of page_ids) {
        const costOverride = cost_overrides[pageId] || null;
        const result = await client.query(
          `INSERT INTO public.agency_page_assignments 
           (agency_id, page_id, assigned_by, cost_override, status)
           VALUES ($1, $2, $3, $4, 'active')
           ON CONFLICT (agency_id, page_id) 
           DO UPDATE SET 
             cost_override = EXCLUDED.cost_override,
             status = 'active',
             updated_at = now()
           RETURNING *`,
          [agencyId, pageId, req.user.userId, costOverride]
        );
        assignments.push(result.rows[0]);
      }

      res.status(201).json({
        success: true,
        data: assignments,
        message: `Successfully assigned ${assignments.length} pages`
      });
    } finally {
      client.release();
    }
  })
);

/**
 * GET /api/system/page-requests
 * List all page requests
 * Requires admin or super_admin role
 */
router.get(
  '/page-requests',
  authenticate,
  requireRole(['super_admin', 'admin', 'ceo']),
  asyncHandler(async (req, res) => {
    const { status, agency_id, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { buildPaginatedResponse } = require('../utils/paginationHelper');
    
    const client = await pool.connect();

    try {
      // Check if agency_page_requests table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'agency_page_requests'
        );
      `);
      
      if (!tableCheck.rows[0]?.exists) {
        // Table doesn't exist, return empty result
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0
          }
        });
      }
      
      // Build main query with pagination
      let query = `
        SELECT 
          apr.*,
          a.name as agency_name,
          pc.path,
          pc.title,
          pc.description,
          pc.base_cost,
          u1.email as requested_by_email,
          u2.email as reviewed_by_email
        FROM public.agency_page_requests apr
        INNER JOIN public.agencies a ON apr.agency_id = a.id
        INNER JOIN public.page_catalog pc ON apr.page_id = pc.id
        INNER JOIN public.users u1 ON apr.requested_by = u1.id
        LEFT JOIN public.users u2 ON apr.reviewed_by = u2.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` AND apr.status = $${paramCount}`;
        params.push(status);
      }

      if (agency_id) {
        paramCount++;
        query += ` AND apr.agency_id = $${paramCount}`;
        params.push(agency_id);
      }

      query += ` ORDER BY apr.created_at DESC`;
      
      // Add pagination
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await client.query(query, params);
      
      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM public.agency_page_requests apr
        WHERE 1=1
      `;
      const countParams = [];
      let countParamCount = 0;
      
      if (status) {
        countParamCount++;
        countQuery += ` AND apr.status = $${countParamCount}`;
        countParams.push(status);
      }
      
      if (agency_id) {
        countParamCount++;
        countQuery += ` AND apr.agency_id = $${countParamCount}`;
        countParams.push(agency_id);
      }
      
      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total, 10);

      res.json(buildPaginatedResponse(
        result.rows.map(row => ({
          id: row.id,
          agency_id: row.agency_id,
          agency_name: row.agency_name,
          page_id: row.page_id,
          path: row.path,
          title: row.title,
          description: row.description,
          base_cost: parseFloat(row.base_cost) || 0,
          status: row.status,
          reason: row.reason,
          requested_by: row.requested_by,
          requested_by_email: row.requested_by_email,
          reviewed_by: row.reviewed_by,
          reviewed_by_email: row.reviewed_by_email,
          reviewed_at: row.reviewed_at,
          created_at: row.created_at,
          updated_at: row.updated_at
        })),
        { page: parseInt(page), limit: parseInt(limit), total }
      ));
    } finally {
      client.release();
    }
  })
);

/**
 * PUT /api/system/page-requests/:id/approve
 * Approve a page request
 */
router.put(
  '/page-requests/:id/approve',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { cost_override } = req.body;
    const client = await pool.connect();

    try {
      // Get the request
      const requestResult = await client.query(
        `SELECT * FROM public.agency_page_requests WHERE id = $1`,
        [id]
      );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Request not found' }
        });
      }

      const request = requestResult.rows[0];

      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: { message: `Request is already ${request.status}` }
        });
      }

      // Update request status
      await client.query(
        `UPDATE public.agency_page_requests 
         SET status = 'approved', reviewed_by = $1, reviewed_at = now(), updated_at = now()
         WHERE id = $2`,
        [req.user.userId, id]
      );

      // Create page assignment
      await client.query(
        `INSERT INTO public.agency_page_assignments 
         (agency_id, page_id, assigned_by, cost_override, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (agency_id, page_id) 
         DO UPDATE SET 
           cost_override = EXCLUDED.cost_override,
           status = 'active',
           updated_at = now()`,
        [request.agency_id, request.page_id, req.user.userId, cost_override || null]
      );

      res.json({
        success: true,
        message: 'Request approved and page assigned'
      });
    } finally {
      client.release();
    }
  })
);

/**
 * PUT /api/system/page-requests/:id/reject
 * Reject a page request
 */
router.put(
  '/page-requests/:id/reject',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const client = await pool.connect();

    try {
      const result = await client.query(
        `UPDATE public.agency_page_requests 
         SET status = 'rejected', reviewed_by = $1, reviewed_at = now(), updated_at = now()
         WHERE id = $2 AND status = 'pending'
         RETURNING *`,
        [req.user.userId, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Request not found or already processed' }
        });
      }

      res.json({
        success: true,
        message: 'Request rejected'
      });
    } finally {
      client.release();
    }
  })
);

// ============================================================================
// AGENCY ENDPOINTS
// ============================================================================

/**
 * GET /api/system/agencies/me/pages
 * Get assigned pages for current agency
 */
router.get(
  '/agencies/me/pages',
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.user.agencyId) {
      return res.status(403).json({
        success: false,
        error: { message: 'No agency associated with user' }
      });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          apa.*,
          pc.path,
          pc.title,
          pc.description,
          pc.icon,
          pc.category,
          pc.base_cost,
          COALESCE(apa.cost_override, pc.base_cost) as final_cost
         FROM public.agency_page_assignments apa
         INNER JOIN public.page_catalog pc ON apa.page_id = pc.id
         WHERE apa.agency_id = $1 AND apa.status = 'active'
         ORDER BY pc.category, pc.title`,
        [req.user.agencyId]
      );

      res.json({
        success: true,
        data: result.rows.map(row => ({
          id: row.id,
          page_id: row.page_id,
          path: row.path,
          title: row.title,
          description: row.description,
          icon: row.icon,
          category: row.category,
          base_cost: parseFloat(row.base_cost) || 0,
          final_cost: parseFloat(row.final_cost) || 0,
          status: row.status,
          assigned_at: row.assigned_at
        }))
      });
    } finally {
      client.release();
    }
  })
);

/**
 * POST /api/system/agencies/me/page-requests
 * Request additional page
 */
router.post(
  '/agencies/me/page-requests',
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.user.agencyId) {
      return res.status(403).json({
        success: false,
        error: { message: 'No agency associated with user' }
      });
    }

    const { page_id, reason } = req.body;

    if (!page_id) {
      return res.status(400).json({
        success: false,
        error: { message: 'page_id is required' }
      });
    }

    const client = await pool.connect();
    try {
      // Check if page exists and is active
      const pageCheck = await client.query(
        'SELECT id, requires_approval FROM public.page_catalog WHERE id = $1 AND is_active = true',
        [page_id]
      );

      if (pageCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Page not found or inactive' }
        });
      }

      // Check if already assigned
      const assignmentCheck = await client.query(
        'SELECT id FROM public.agency_page_assignments WHERE agency_id = $1 AND page_id = $2 AND status = $3',
        [req.user.agencyId, page_id, 'active']
      );

      if (assignmentCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Page is already assigned to your agency' }
        });
      }

      // Check if pending request exists
      const pendingCheck = await client.query(
        'SELECT id FROM public.agency_page_requests WHERE agency_id = $1 AND page_id = $2 AND status = $3',
        [req.user.agencyId, page_id, 'pending']
      );

      if (pendingCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Request already pending for this page' }
        });
      }

      // Create request
      const result = await client.query(
        `INSERT INTO public.agency_page_requests 
         (agency_id, page_id, requested_by, reason, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [req.user.agencyId, page_id, req.user.userId, reason || null]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Page request submitted successfully'
      });
    } finally {
      client.release();
    }
  })
);

/**
 * GET /api/system/agencies/me/page-requests
 * List agency's page requests
 */
router.get(
  '/agencies/me/page-requests',
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.user.agencyId) {
      return res.status(403).json({
        success: false,
        error: { message: 'No agency associated with user' }
      });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          apr.*,
          pc.path,
          pc.title,
          pc.description,
          pc.base_cost
         FROM public.agency_page_requests apr
         INNER JOIN public.page_catalog pc ON apr.page_id = pc.id
         WHERE apr.agency_id = $1
         ORDER BY apr.created_at DESC`,
        [req.user.agencyId]
      );

      res.json({
        success: true,
        data: result.rows.map(row => ({
          id: row.id,
          page_id: row.page_id,
          path: row.path,
          title: row.title,
          description: row.description,
          base_cost: parseFloat(row.base_cost) || 0,
          status: row.status,
          reason: row.reason,
          reviewed_at: row.reviewed_at,
          created_at: row.created_at
        }))
      });
    } finally {
      client.release();
    }
  })
);

module.exports = router;

