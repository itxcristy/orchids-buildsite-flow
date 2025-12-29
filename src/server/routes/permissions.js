/**
 * Permissions Management Routes
 * Handles all permission-related operations including role permissions, user permissions, templates, and bulk operations
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireRole, requireAgencyContext } = require('../middleware/authMiddleware');
const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');

// Helper to get agency database connection
async function getAgencyDb(agencyDatabase) {
  if (!agencyDatabase || typeof agencyDatabase !== 'string') {
    throw new Error('Agency database name is required');
  }
  
  const dbConfig = parseDatabaseUrl();
  
  // Validate all required fields are present
  if (!dbConfig.host || !dbConfig.user || dbConfig.password === undefined || !dbConfig.port) {
    throw new Error('Invalid database configuration: missing required connection parameters');
  }
  
  // URL-encode password to handle special characters
  const encodedPassword = encodeURIComponent(dbConfig.password);
  const agencyDbUrl = `postgresql://${dbConfig.user}:${encodedPassword}@${dbConfig.host}:${dbConfig.port}/${agencyDatabase}`;
  
  // Validate connection string is not undefined
  if (!agencyDbUrl || agencyDbUrl.includes('undefined')) {
    throw new Error('Failed to construct valid database connection string');
  }
  
  return new Pool({ connectionString: agencyDbUrl, max: 1 });
}

// Helper to ensure user_permissions table exists
async function ensureUserPermissionsTable(client) {
  const tableCheck = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_permissions'
    );
  `);
  
  if (!tableCheck.rows[0].exists) {
    const { ensureUserPermissionsTable: ensureTable } = require('../utils/schema/authSchema');
    await ensureTable(client);
  }
}

// Helper to log audit trail
async function logAudit(client, tableName, action, userId, recordId, oldValues, newValues, ipAddress, userAgent) {
  try {
    // Ensure audit_logs table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_name TEXT NOT NULL,
        action TEXT NOT NULL,
        user_id UUID REFERENCES public.users(id),
        record_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await client.query(
      `INSERT INTO public.audit_logs (table_name, action, user_id, record_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tableName, action, userId, recordId, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null, ipAddress, userAgent]
    );
  } catch (error) {
    console.error('[Audit] Failed to log audit trail:', error);
    // Don't throw - audit logging failure shouldn't break the operation
  }
}

/**
 * GET /api/permissions
 * Get all permissions (paginated)
 */
router.get('/', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { page = 1, limit = 100, category, search } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    // Check if permissions table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'permissions'
      );
    `);

    if (!tableCheck.rows[0].exists) {
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

    let query = 'SELECT * FROM public.permissions WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) FROM public.permissions WHERE 1=1';
    const params = [];
    const countParams = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      countQuery += ` AND category = $${paramCount}`;
      params.push(category);
      countParams.push(category);
    }

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      countQuery += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    query += ' ORDER BY category, name';
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await client.query(query, params);
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
  } catch (error) {
    console.error('[Permissions] Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to fetch permissions',
        detail: error.detail
      }
    });
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * GET /api/permissions/categories
 * Get all permission categories
 */
router.get('/categories', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    // Check if permissions table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'permissions'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({
        success: true,
        data: []
      });
    }

    const result = await client.query(
      'SELECT DISTINCT category FROM public.permissions WHERE is_active = true ORDER BY category'
    );
    res.json({
      success: true,
      data: result.rows.map(r => r.category)
    });
  } catch (error) {
    console.error('[Permissions] Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to fetch categories',
        detail: error.detail
      }
    });
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * GET /api/permissions/roles/:role
 * Get all permissions for a specific role
 */
router.get('/roles/:role', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { role } = req.params;
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    // Check if tables exist
    const permissionsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'permissions'
      );
    `);

    if (!permissionsTableCheck.rows[0].exists) {
      return res.json({
        success: true,
        data: []
      });
    }

    const result = await client.query(
      `SELECT p.*, rp.granted, rp.id as role_permission_id
       FROM public.permissions p
       LEFT JOIN public.role_permissions rp ON p.id = rp.permission_id AND rp.role = $1
       WHERE p.is_active = true
       ORDER BY p.category, p.name`,
      [role]
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('[Permissions] Error fetching role permissions:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to fetch role permissions',
        detail: error.detail
      }
    });
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * PUT /api/permissions/roles/:role
 * Update permissions for a specific role
 */
router.put('/roles/:role', authenticate, requireRole(['super_admin', 'ceo', 'admin']), requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { role } = req.params;
  const { permissions } = req.body; // Array of { permission_id, granted }
  const userId = req.user.id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!Array.isArray(permissions)) {
    return res.status(400).json({
      success: false,
      error: 'Permissions must be an array'
    });
  }

  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const perm of permissions) {
      const { permission_id, granted } = perm;

      // Check if permission exists
      const permCheck = await client.query('SELECT id FROM public.permissions WHERE id = $1', [permission_id]);
      if (permCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: `Permission ${permission_id} does not exist`
        });
      }

      // Check if role_permission exists
      const existing = await client.query(
        'SELECT id, granted FROM public.role_permissions WHERE role = $1 AND permission_id = $2',
        [role, permission_id]
      );

      if (existing.rows.length > 0) {
        const oldValue = existing.rows[0].granted;
        if (oldValue !== granted) {
          await client.query(
            'UPDATE public.role_permissions SET granted = $1, updated_at = now() WHERE id = $2',
            [granted, existing.rows[0].id]
          );
          await logAudit(client, 'role_permissions', 'UPDATE', userId, existing.rows[0].id,
            { granted: oldValue }, { granted }, ipAddress, userAgent);
        }
      } else {
        const insertResult = await client.query(
          'INSERT INTO public.role_permissions (role, permission_id, granted) VALUES ($1, $2, $3) RETURNING id',
          [role, permission_id, granted]
        );
        await logAudit(client, 'role_permissions', 'INSERT', userId, insertResult.rows[0].id,
          null, { role, permission_id, granted }, ipAddress, userAgent);
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Role permissions updated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * GET /api/permissions/users/:userId
 * Get all permissions for a specific user (including role-based and overrides)
 */
router.get('/users/:userId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { userId } = req.params;
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    // Get user roles
    const rolesResult = await client.query(
      'SELECT role FROM public.user_roles WHERE user_id = $1',
      [userId]
    );
    const roles = rolesResult.rows.map(r => r.role);

    // Get role-based permissions (only if user has roles)
    let rolePermsResult = { rows: [] };
    if (roles.length > 0) {
      rolePermsResult = await client.query(
        `SELECT DISTINCT p.*, rp.granted, 'role' as source
         FROM public.permissions p
         INNER JOIN public.role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role = ANY($1::text[]) AND rp.granted = true AND p.is_active = true`,
        [roles]
      );
    }

    // Get user-specific overrides (if user_permissions table exists)
    let userPermsResult = { rows: [] };
    try {
      // Check if user_permissions table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'user_permissions'
        );
      `);
      
      if (tableCheck.rows[0].exists) {
        userPermsResult = await client.query(
          `SELECT p.*, up.granted, up.reason, up.expires_at, 'user' as source
           FROM public.permissions p
           INNER JOIN public.user_permissions up ON p.id = up.permission_id
           WHERE up.user_id = $1 AND p.is_active = true`,
          [userId]
        );
      }
    } catch (error) {
      // If table doesn't exist or query fails, continue without user permissions
      if (error.code !== '42P01') {
        console.warn('[Permissions] Error fetching user permissions:', error.message);
      }
    }

    // Merge and deduplicate (user overrides take precedence)
    const permissionsMap = new Map();
    rolePermsResult.rows.forEach(p => {
      permissionsMap.set(p.id, p);
    });
    (userPermsResult.rows || []).forEach(p => {
      permissionsMap.set(p.id, p);
    });

    res.json({
      success: true,
      data: Array.from(permissionsMap.values())
    });
  } catch (error) {
    console.error('[Permissions] Error fetching user permissions:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to fetch user permissions',
        detail: error.detail
      }
    });
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * PUT /api/permissions/users/:userId
 * Update user-specific permission overrides
 */
router.put('/users/:userId', authenticate, requireRole(['super_admin', 'ceo', 'admin']), requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { userId } = req.params;
  const { permissions } = req.body; // Array of { permission_id, granted, reason, expires_at }
  const grantedBy = req.user.id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!Array.isArray(permissions)) {
    return res.status(400).json({
      success: false,
      error: 'Permissions must be an array'
    });
  }

  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const perm of permissions) {
      const { permission_id, granted, reason, expires_at } = perm;

      // Check if permission exists
      const permCheck = await client.query('SELECT id FROM public.permissions WHERE id = $1', [permission_id]);
      if (permCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: `Permission ${permission_id} does not exist`
        });
      }

      // Ensure user_permissions table exists
      await ensureUserPermissionsTable(client);
      
      // Check if user_permission exists
      const existing = await client.query(
        'SELECT id, granted FROM public.user_permissions WHERE user_id = $1 AND permission_id = $2',
        [userId, permission_id]
      );

      if (existing.rows.length > 0) {
        const oldValue = existing.rows[0].granted;
        if (oldValue !== granted) {
          await client.query(
            `UPDATE public.user_permissions 
             SET granted = $1, reason = $2, expires_at = $3, granted_at = now()
             WHERE id = $4`,
            [granted, reason || null, expires_at || null, existing.rows[0].id]
          );
          await logAudit(client, 'user_permissions', 'UPDATE', grantedBy, existing.rows[0].id,
            { granted: oldValue }, { granted, reason, expires_at }, ipAddress, userAgent);
        }
      } else {
        const insertResult = await client.query(
          `INSERT INTO public.user_permissions (user_id, permission_id, granted, granted_by, reason, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [userId, permission_id, granted, grantedBy, reason || null, expires_at || null]
        );
        await logAudit(client, 'user_permissions', 'INSERT', grantedBy, insertResult.rows[0].id,
          null, { user_id: userId, permission_id, granted, reason, expires_at }, ipAddress, userAgent);
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'User permissions updated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * DELETE /api/permissions/users/:userId/overrides
 * Remove all user permission overrides (reset to role defaults)
 */
router.delete('/users/:userId/overrides', authenticate, requireRole(['super_admin', 'ceo', 'admin']), requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { userId } = req.params;
  const grantedBy = req.user.id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    // Ensure user_permissions table exists
    await ensureUserPermissionsTable(client);
    
    await client.query('BEGIN');

    // Get all overrides before deleting
    const overrides = await client.query(
      'SELECT id FROM public.user_permissions WHERE user_id = $1',
      [userId]
    );

    await client.query('DELETE FROM public.user_permissions WHERE user_id = $1', [userId]);

    // Log audit
    for (const override of overrides.rows) {
      await logAudit(client, 'user_permissions', 'DELETE', grantedBy, override.id,
        { user_id: userId }, null, ipAddress, userAgent);
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'User permission overrides removed successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * POST /api/permissions/bulk
 * Bulk update permissions for multiple roles/users
 */
router.post('/bulk', authenticate, requireRole(['super_admin', 'ceo', 'admin']), requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { type, targets, permissions } = req.body; // type: 'roles' | 'users', targets: string[], permissions: { permission_id, granted }[]
  const userId = req.user.id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!['roles', 'users'].includes(type) || !Array.isArray(targets) || !Array.isArray(permissions)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request body'
    });
  }

  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    // Ensure user_permissions table exists if needed
    if (type === 'users') {
      await ensureUserPermissionsTable(client);
    }
    
    await client.query('BEGIN');

    for (const target of targets) {
      for (const perm of permissions) {
        const { permission_id, granted } = perm;

        if (type === 'roles') {
          const existing = await client.query(
            'SELECT id FROM public.role_permissions WHERE role = $1 AND permission_id = $2',
            [target, permission_id]
          );

          if (existing.rows.length > 0) {
            await client.query(
              'UPDATE public.role_permissions SET granted = $1, updated_at = now() WHERE id = $2',
              [granted, existing.rows[0].id]
            );
          } else {
            await client.query(
              'INSERT INTO public.role_permissions (role, permission_id, granted) VALUES ($1, $2, $3)',
              [target, permission_id, granted]
            );
          }
        } else {
          const existing = await client.query(
            'SELECT id FROM public.user_permissions WHERE user_id = $1 AND permission_id = $2',
            [target, permission_id]
          );

          if (existing.rows.length > 0) {
            await client.query(
              'UPDATE public.user_permissions SET granted = $1, granted_at = now() WHERE id = $2',
              [granted, existing.rows[0].id]
            );
          } else {
            await client.query(
              'INSERT INTO public.user_permissions (user_id, permission_id, granted, granted_by) VALUES ($1, $2, $3, $4)',
              [target, permission_id, granted, userId]
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Bulk permissions update completed successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * GET /api/permissions/templates
 * Get all permission templates
 */
router.get('/templates', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    // Check if table exists first
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'permission_templates'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      // Table doesn't exist, return empty array
      return res.json({
        success: true,
        data: []
      });
    }

    const result = await client.query(
      'SELECT * FROM public.permission_templates WHERE is_active = true ORDER BY name'
    );
    
    // Parse JSONB permissions field if it exists
    const templates = result.rows.map(row => ({
      ...row,
      permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || [])
    }));

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('[Permissions] Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to fetch templates',
        detail: error.detail
      }
    });
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * POST /api/permissions/templates
 * Create a new permission template
 */
router.post('/templates', authenticate, requireRole(['super_admin', 'ceo', 'admin']), requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { name, description, permissions } = req.body;
  const createdBy = req.user.id;

  if (!name || !Array.isArray(permissions)) {
    return res.status(400).json({
      success: false,
      error: 'Name and permissions array are required'
    });
  }

  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    // Ensure table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.permission_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_by UUID REFERENCES public.users(id),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        is_active BOOLEAN DEFAULT true
      );
    `);

    const result = await client.query(
      `INSERT INTO public.permission_templates (name, description, permissions, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description || null, JSON.stringify(permissions), createdBy]
    );
    
    const template = result.rows[0];
    // Parse JSONB if needed
    if (typeof template.permissions === 'string') {
      template.permissions = JSON.parse(template.permissions);
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('[Permissions] Error creating template:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to create template',
        detail: error.detail
      }
    });
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * POST /api/permissions/templates/:templateId/apply
 * Apply a template to roles or users
 */
router.post('/templates/:templateId/apply', authenticate, requireRole(['super_admin', 'ceo', 'admin']), requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { templateId } = req.params;
  const { type, targets } = req.body; // type: 'roles' | 'users', targets: string[]
  const userId = req.user.id;

  if (!['roles', 'users'].includes(type) || !Array.isArray(targets)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request body'
    });
  }

  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'permission_templates'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      return res.status(404).json({
        success: false,
        error: 'Templates table does not exist'
      });
    }

    await client.query('BEGIN');

    // Get template
    const templateResult = await client.query(
      'SELECT permissions FROM public.permission_templates WHERE id = $1',
      [templateId]
    );

    if (templateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Parse JSONB if it's a string
    let permissions = templateResult.rows[0].permissions;
    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions);
      } catch (parseError) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Invalid template permissions format'
        });
      }
    }
    if (!Array.isArray(permissions)) {
      permissions = [];
    }

    // Ensure user_permissions table exists if needed
    if (type === 'users') {
      await ensureUserPermissionsTable(client);
    }

    for (const target of targets) {
      for (const perm of permissions) {
        const { permission_id, granted } = perm;

        if (type === 'roles') {
          const existing = await client.query(
            'SELECT id FROM public.role_permissions WHERE role = $1 AND permission_id = $2',
            [target, permission_id]
          );

          if (existing.rows.length > 0) {
            await client.query(
              'UPDATE public.role_permissions SET granted = $1, updated_at = now() WHERE id = $2',
              [granted, existing.rows[0].id]
            );
          } else {
            await client.query(
              'INSERT INTO public.role_permissions (role, permission_id, granted) VALUES ($1, $2, $3)',
              [target, permission_id, granted]
            );
          }
        } else {
          const existing = await client.query(
            'SELECT id FROM public.user_permissions WHERE user_id = $1 AND permission_id = $2',
            [target, permission_id]
          );

          if (existing.rows.length > 0) {
            await client.query(
              'UPDATE public.user_permissions SET granted = $1, granted_at = now() WHERE id = $2',
              [granted, existing.rows[0].id]
            );
          } else {
            await client.query(
              'INSERT INTO public.user_permissions (user_id, permission_id, granted, granted_by) VALUES ($1, $2, $3, $4)',
              [target, permission_id, granted, userId]
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Template applied successfully'
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[Permissions] Rollback error:', rollbackError);
    }
    console.error('[Permissions] Error applying template:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to apply template',
        detail: error.detail
      }
    });
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * POST /api/permissions/export
 * Export current permission configuration
 */
router.post('/export', authenticate, requireRole(['super_admin', 'ceo', 'admin']), requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    // Check which tables exist
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('permissions', 'role_permissions', 'user_permissions', 'permission_templates')
    `);
    const existingTables = new Set(tableCheck.rows.map(r => r.table_name));

    const queries = [];
    if (existingTables.has('permissions')) {
      queries.push(client.query('SELECT * FROM public.permissions').then(r => ({ name: 'permissions', data: r.rows })));
    } else {
      queries.push(Promise.resolve({ name: 'permissions', data: [] }));
    }

    if (existingTables.has('role_permissions')) {
      queries.push(client.query('SELECT * FROM public.role_permissions').then(r => ({ name: 'role_permissions', data: r.rows })));
    } else {
      queries.push(Promise.resolve({ name: 'role_permissions', data: [] }));
    }

    if (existingTables.has('user_permissions')) {
      queries.push(client.query('SELECT * FROM public.user_permissions').then(r => ({ name: 'user_permissions', data: r.rows })));
    } else {
      queries.push(Promise.resolve({ name: 'user_permissions', data: [] }));
    }

    if (existingTables.has('permission_templates')) {
      queries.push(client.query('SELECT * FROM public.permission_templates').then(r => ({ name: 'templates', data: r.rows })));
    } else {
      queries.push(Promise.resolve({ name: 'templates', data: [] }));
    }

    const results = await Promise.all(queries);
    const data = {};
    results.forEach(result => {
      data[result.name === 'templates' ? 'templates' : result.name] = result.data;
    });

    res.json({
      success: true,
      data: {
        ...data,
        exported_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Permissions] Error exporting permissions:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to export permissions',
        detail: error.detail
      }
    });
  } finally {
    client.release();
    await pool.end();
  }
}));

/**
 * POST /api/permissions/import
 * Import permission configuration
 */
router.post('/import', authenticate, requireRole(['super_admin']), requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { data } = req.body;
  const userId = req.user.id;

  if (!data || !data.permissions) {
    return res.status(400).json({
      success: false,
      error: 'Invalid import data'
    });
  }

  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Ensure permissions table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // Ensure role_permissions table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.role_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role TEXT NOT NULL,
        permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
        granted BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(role, permission_id)
      );
    `);

    // Import permissions
    if (data.permissions && Array.isArray(data.permissions)) {
      for (const perm of data.permissions) {
        await client.query(
          `INSERT INTO public.permissions (id, name, category, description, is_active)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (name) DO UPDATE SET
           category = EXCLUDED.category,
           description = EXCLUDED.description,
           is_active = EXCLUDED.is_active,
           updated_at = now()`,
          [perm.id || null, perm.name, perm.category, perm.description || null, perm.is_active !== false]
        );
      }
    }

    // Import role permissions
    if (data.role_permissions && Array.isArray(data.role_permissions)) {
      for (const rp of data.role_permissions) {
        await client.query(
          `INSERT INTO public.role_permissions (role, permission_id, granted)
           VALUES ($1, $2, $3)
           ON CONFLICT (role, permission_id) DO UPDATE SET
           granted = EXCLUDED.granted,
           updated_at = now()`,
          [rp.role, rp.permission_id, rp.granted]
        );
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Permissions imported successfully'
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[Permissions] Rollback error:', rollbackError);
    }
    console.error('[Permissions] Error importing permissions:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to import permissions',
        detail: error.detail
      }
    });
  } finally {
    client.release();
    await pool.end();
  }
}));

module.exports = router;
