/**
 * Auth & RBAC middleware for protected API routes
 *
 * Tokens are signed JWTs created in authService.generateToken.
 * Tokens are verified using JWT signature validation for security.
 *
 * Token payload shape (see authService.generateToken):
 * {
 *   userId: string;
 *   email: string;
 *   agencyId: string;
 *   agencyDatabase: string;
 *   exp: number; // unix seconds (added by JWT)
 *   iat: number; // unix seconds (added by JWT)
 * }
 */

const { parseDatabaseUrl } = require('../utils/poolManager');

// Rate limiting for error logging to prevent spam
const errorLogCache = new Map();
const ERROR_LOG_THROTTLE_MS = 5000; // Only log same error once per 5 seconds

/**
 * Verify and decode JWT token
 * Returns the payload or null if invalid/expired/tampered
 */
function decodeToken(token) {
  try {
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.VITE_JWT_SECRET || process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('[Auth] JWT_SECRET not configured');
      return null;
    }

    // Validate token format before attempting verification
    if (!token || typeof token !== 'string' || token.length < 10) {
      return null;
    }

    // Verify JWT signature and decode payload
    // This will throw if token is tampered, expired, or invalid
    const payload = jwt.verify(token, jwtSecret, {
      issuer: 'buildflow',
      audience: 'buildflow-api',
      algorithms: ['HS256'],
    });

    // Validate required fields
    if (!payload.userId || !payload.email) {
      return null;
    }

    return payload;
  } catch (error) {
    // Rate limit error logging to prevent spam
    const errorKey = `jwt_error_${error.name || 'unknown'}`;
    const lastLog = errorLogCache.get(errorKey);
    const now = Date.now();
    
    if (!lastLog || (now - lastLog) > ERROR_LOG_THROTTLE_MS) {
      // Only log specific error types to avoid spam
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        console.warn(`[Auth] JWT verification failed: ${error.name} - ${error.message}`);
      }
      errorLogCache.set(errorKey, now);
    }
    
    return null;
  }
}

/**
 * Authenticate requests using the Authorization: Bearer <token> header.
 * Attaches `req.user` and `req.agencyDatabase` on success.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_MISSING_TOKEN',
          message: 'Authentication token is required',
        },
        message: 'Authentication required',
      });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token || token.length < 10) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_EMPTY_TOKEN',
          message: 'Authentication token is missing or empty',
        },
        message: 'Authentication required',
      });
    }

    // Quick validation: token should be reasonable length for JWT
    if (token.length > 10000) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID_TOKEN',
          message: 'Invalid authentication token format',
        },
        message: 'Authentication failed',
      });
    }

    const payload = decodeToken(token);
    if (!payload || !payload.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID_TOKEN',
          message: 'Invalid or expired authentication token',
        },
        message: 'Authentication failed',
      });
    }

    // Attach minimal context for downstream handlers
    req.user = {
      id: payload.userId,
      userId: payload.userId, // Alias for compatibility
      email: payload.email,
      agencyId: payload.agencyId,
      agencyDatabase: payload.agencyDatabase,
      exp: payload.exp,
      iat: payload.iat,
    };

    // Convenience alias commonly used elsewhere
    req.agencyDatabase = payload.agencyDatabase || null;

    return next();
  } catch (error) {
    console.error('[Auth] Unexpected error in authenticate middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_MIDDLEWARE_ERROR',
        message: 'Failed to process authentication',
        details: error.message,
      },
      message: 'Authentication failed',
    });
  }
}

/**
 * Helper: fetch all roles for a user from the agency database.
 * This is used for RBAC checks on protected system endpoints.
 */
async function getUserRolesFromAgencyDb(userId, agencyDatabase) {
  if (!userId || !agencyDatabase) {
    return [];
  }

  try {
    const dbConfig = parseDatabaseUrl();
    
    // Validate all required fields are present
    if (!dbConfig.host || !dbConfig.user || dbConfig.password === undefined || !dbConfig.port) {
      console.error('[Auth] Invalid database configuration for getUserRolesFromAgencyDb');
      return [];
    }
    
    // URL-encode password to handle special characters
    const encodedPassword = encodeURIComponent(dbConfig.password);
    const agencyDbUrl = `postgresql://${dbConfig.user}:${encodedPassword}@${dbConfig.host}:${dbConfig.port}/${agencyDatabase}`;
    
    // Validate connection string is not undefined
    if (!agencyDbUrl || agencyDbUrl.includes('undefined')) {
      console.error('[Auth] Failed to construct valid database connection string');
      return [];
    }
    
    const { Pool } = require('pg');
    const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
    const client = await agencyPool.connect();

    try {
      const result = await client.query(
        'SELECT role FROM public.user_roles WHERE user_id = $1',
        [userId]
      );
      return result.rows.map((row) => row.role);
    } finally {
      client.release();
      await agencyPool.end();
    }
  } catch (error) {
    console.error('[Auth] Error in getUserRolesFromAgencyDb:', error.message);
    // Return empty array on error to allow request to continue (will fail authorization check)
    return [];
  }
}

/**
 * Role hierarchy levels (lower number = higher authority)
 * Must match frontend roleUtils.ts
 */
const ROLE_HIERARCHY = {
  super_admin: 1,
  ceo: 2,
  cto: 3,
  cfo: 4,
  coo: 5,
  admin: 6,
  operations_manager: 7,
  department_head: 8,
  team_lead: 9,
  project_manager: 10,
  hr: 11,
  finance_manager: 12,
  sales_manager: 13,
  marketing_manager: 14,
  quality_assurance: 15,
  it_support: 16,
  legal_counsel: 17,
  business_analyst: 18,
  customer_success: 19,
  employee: 20,
  contractor: 21,
  intern: 22,
};

/**
 * Check if user role has equal or higher authority than minimum role
 */
function hasRoleOrHigher(userRole, minimumRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 99;
  const minimumLevel = ROLE_HIERARCHY[minimumRole] || 99;
  return userLevel <= minimumLevel;
}

/**
 * Verify agency context matches request
 * Ensures users can only access their own agency's data
 */
function requireAgencyContext(req, res, next) {
  const agencyDatabase = req.user?.agencyDatabase || req.agencyDatabase;
  const headerAgencyDatabase = req.headers['x-agency-database'];

  if (!agencyDatabase) {
    console.warn('[Auth] Agency context missing', {
      userId: req.user?.id,
      path: req.path,
    });
    return res.status(403).json({
      success: false,
      error: {
        code: 'RBAC_NO_AGENCY_CONTEXT',
        message: 'Agency context is required',
      },
      message: 'Access denied',
    });
  }

  // If header is provided, verify it matches token
  if (headerAgencyDatabase && headerAgencyDatabase !== agencyDatabase) {
    console.warn('[Auth] Agency context mismatch', {
      userId: req.user?.id,
      tokenAgency: agencyDatabase,
      headerAgency: headerAgencyDatabase,
      path: req.path,
    });
    return res.status(403).json({
      success: false,
      error: {
        code: 'RBAC_AGENCY_MISMATCH',
        message: 'Agency context mismatch',
      },
      message: 'Access denied',
    });
  }

  return next();
}

/**
 * Helper: fetch all roles for a user from the MAIN database.
 * Used for system-level operations that don't require agency context.
 */
async function getUserRolesFromMainDb(userId) {
  if (!userId) {
    return [];
  }

  try {
    const { pool } = require('../config/database');
    const client = await pool.connect();

    try {
      // Check if user_roles table exists in main database
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'user_roles'
        )
      `);

      if (!tableCheck.rows[0].exists) {
        // If no user_roles table, check if user is in the main users table
        // and has a role field (for backward compatibility)
        const userCheck = await client.query(
          'SELECT role FROM public.users WHERE id = $1',
          [userId]
        );
        if (userCheck.rows.length > 0 && userCheck.rows[0].role) {
          return [userCheck.rows[0].role];
        }
        return [];
      }

      const result = await client.query(
        'SELECT role FROM public.user_roles WHERE user_id = $1',
        [userId]
      );
      return result.rows.map((row) => row.role);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Auth] Error in getUserRolesFromMainDb:', error.message);
    return [];
  }
}

/**
 * Require that the authenticated user has the super_admin role
 * Checks both main database and agency database for system-level access
 */
async function requireSuperAdmin(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'User must be authenticated',
        },
        message: 'Authentication required',
      });
    }

    const userId = req.user.id;
    let userRoles = [];

    // First, try to get roles from main database (for system-level super_admin)
    userRoles = await getUserRolesFromMainDb(userId);

    // If no roles in main DB and agencyDatabase exists, check agency DB
    if (userRoles.length === 0 && req.user.agencyDatabase) {
      userRoles = await getUserRolesFromAgencyDb(userId, req.user.agencyDatabase);
    }

    req.user.roles = userRoles;

    // Check if user has super_admin role
    if (!userRoles.includes('super_admin')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'RBAC_INSUFFICIENT_ROLE',
          message: 'Super admin role required',
        },
        message: 'Access denied: Super admin role required',
      });
    }

    next();
  } catch (error) {
    console.error('[Auth] Error in requireSuperAdmin:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'RBAC_ERROR',
        message: 'Error checking user roles',
      },
      message: 'Internal server error',
    });
  }
}

/**
 * Require that the authenticated user has one of the specified roles
 * or a role higher in the hierarchy.
 * 
 * @param {string|string[]} requiredRoles - Single role or array of roles
 * @param {boolean} allowHigherRoles - If true, higher roles can access (default: true)
 */
function requireRole(requiredRoles, allowHigherRoles = true) {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'User must be authenticated',
          },
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;
      const agencyDatabase = req.user.agencyDatabase || req.agencyDatabase;
      let userRoles = [];

      // For system-level roles (super_admin, admin, ceo), check main database first
      const systemRoles = ['super_admin', 'admin', 'ceo'];
      const requiresSystemRole = roles.some(r => systemRoles.includes(r));
      
      if (requiresSystemRole) {
        // Check main database first for system-level roles
        userRoles = await getUserRolesFromMainDb(userId);
        
        // If no roles in main DB and agencyDatabase exists, check agency DB
        if (userRoles.length === 0 && agencyDatabase) {
          userRoles = await getUserRolesFromAgencyDb(userId, agencyDatabase);
        }
      } else {
        // For agency-specific roles, require agency context
        if (!agencyDatabase) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'RBAC_NO_AGENCY_CONTEXT',
              message: 'Agency context is missing for role check',
            },
            message: 'Access denied',
          });
        }
        
        // Fetch user roles from agency database
        userRoles = await getUserRolesFromAgencyDb(userId, agencyDatabase);
      }
      
      req.user.roles = userRoles;

      if (userRoles.length === 0) {
        console.warn('[Auth] User has no roles', {
          userId,
          agencyDatabase,
          path: req.path,
        });
        return res.status(403).json({
          success: false,
          error: {
            code: 'RBAC_NO_ROLES',
            message: 'User has no assigned roles',
          },
          message: 'Access denied',
        });
      }

      // Find highest role (lowest hierarchy number)
      const highestRole = userRoles.reduce((highest, current) => {
        const currentLevel = ROLE_HIERARCHY[current] || 99;
        const highestLevel = ROLE_HIERARCHY[highest] || 99;
        return currentLevel < highestLevel ? current : highest;
      });

      // Check if user has required role
      let hasAccess = roles.includes(highestRole);

      // If higher roles allowed, check hierarchy
      if (!hasAccess && allowHigherRoles) {
        hasAccess = roles.some(role => hasRoleOrHigher(highestRole, role));
      }

      if (!hasAccess) {
        // Log access denied attempt for security auditing
        console.warn('[Auth] Access denied', {
          userId,
          userRole: highestRole,
          requiredRoles: roles,
          path: req.path,
          method: req.method,
          ip: req.ip || req.connection.remoteAddress,
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'RBAC_FORBIDDEN',
            message: `Access denied. Required role(s): ${roles.join(', ')}`,
            userRole: highestRole,
          },
          message: 'Access denied',
        });
      }

      // Attach highest role to request for downstream use
      req.user.role = highestRole;

      return next();
    } catch (error) {
      console.error('[Auth] Error during role check:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'RBAC_CHECK_FAILED',
          message: 'Failed to verify user permissions',
          details: error.message,
        },
        message: 'Authorization failed',
      });
    }
  };
}

/**
 * Require role or higher (convenience wrapper)
 */
function requireRoleOrHigher(minimumRole) {
  return requireRole([minimumRole], true);
}

module.exports = {
  authenticate,
  requireSuperAdmin,
  requireRole,
  requireRoleOrHigher,
  requireAgencyContext,
  getUserRolesFromAgencyDb,
};

