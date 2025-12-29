/**
 * Advanced Session Management Service
 * Handles session timeout, concurrent sessions, device tracking, and revocation
 */

const { Pool } = require('pg');
const { parseDatabaseUrl } = require('../utils/poolManager');
const { getRedisClient, isRedisAvailable } = require('../config/redis');

/**
 * Default session configuration
 */
const DEFAULT_SESSION_CONFIG = {
  timeout: 24 * 60 * 60, // 24 hours in seconds
  maxConcurrentSessions: 5,
  deviceTracking: true,
  requireReauthOnSensitive: true,
  idleTimeout: 30 * 60, // 30 minutes in seconds
};

/**
 * Create session record
 * @param {string} agencyDatabase - Agency database name
 * @param {string} userId - User ID
 * @param {Object} sessionData - Session data { token, ipAddress, userAgent, deviceInfo }
 * @returns {Promise<Object>} Created session
 */
async function createSession(agencyDatabase, userId, sessionData) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    // Create sessions table if not exists
    await agencyClient.query(`
      CREATE TABLE IF NOT EXISTS public.user_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        ip_address TEXT,
        user_agent TEXT,
        device_info JSONB,
        is_active BOOLEAN DEFAULT true,
        last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        revoked_at TIMESTAMP WITH TIME ZONE
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id, is_active, expires_at);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON public.user_sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions(last_activity_at);
    `);

    // Get session configuration
    const config = await getSessionConfig(agencyDatabase);
    const expiresAt = new Date(Date.now() + config.timeout * 1000);

    // Hash token for storage
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(sessionData.token).digest('hex');

    // Check concurrent session limit
    const activeSessions = await getActiveSessions(agencyDatabase, userId);
    if (activeSessions.length >= config.maxConcurrentSessions) {
      // Revoke oldest session
      const oldestSession = activeSessions.sort((a, b) => 
        new Date(a.lastActivityAt) - new Date(b.lastActivityAt)
      )[0];
      await revokeSession(agencyDatabase, oldestSession.id);
    }

    // Insert new session
    const result = await agencyClient.query(
      `INSERT INTO public.user_sessions 
       (user_id, token_hash, ip_address, user_agent, device_info, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        tokenHash,
        sessionData.ipAddress || null,
        sessionData.userAgent || null,
        JSON.stringify(sessionData.deviceInfo || {}),
        expiresAt,
      ]
    );

    // Store in Redis for fast access
    if (await isRedisAvailable()) {
      const redisClient = await getRedisClient();
      if (redisClient && redisClient.status === 'ready') {
        await redisClient.setex(
          `session:${tokenHash}`,
          config.timeout,
          JSON.stringify({
            userId,
            sessionId: result.rows[0].id,
            lastActivity: new Date().toISOString(),
          })
        );
      }
    }

    return {
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      ipAddress: result.rows[0].ip_address,
      userAgent: result.rows[0].user_agent,
      deviceInfo: result.rows[0].device_info,
      expiresAt: result.rows[0].expires_at,
      createdAt: result.rows[0].created_at,
    };
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Validate session
 * @param {string} agencyDatabase - Agency database name
 * @param {string} token - Session token
 * @returns {Promise<Object|null>} Session data if valid
 */
async function validateSession(agencyDatabase, token) {
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Try Redis first
  if (await isRedisAvailable()) {
    const redisClient = await getRedisClient();
    if (redisClient && redisClient.status === 'ready') {
      const cached = await redisClient.get(`session:${tokenHash}`);
      if (cached) {
        const sessionData = JSON.parse(cached);
        // Update last activity
        await updateSessionActivity(agencyDatabase, sessionData.sessionId);
        return sessionData;
      }
    }
  }

  // Fallback to database
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    const result = await agencyClient.query(
      `SELECT * FROM public.user_sessions 
       WHERE token_hash = $1 
       AND is_active = true 
       AND expires_at > NOW() 
       AND revoked_at IS NULL`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];

    // Check idle timeout
    const config = await getSessionConfig(agencyDatabase);
    const lastActivity = new Date(session.last_activity_at);
    const idleTime = (Date.now() - lastActivity.getTime()) / 1000;

    if (idleTime > config.idleTimeout) {
      // Session expired due to idle timeout
      await revokeSession(agencyDatabase, session.id, 'idle_timeout');
      return null;
    }

    // Update last activity
    await updateSessionActivity(agencyDatabase, session.id);

    return {
      id: session.id,
      userId: session.user_id,
      sessionId: session.id,
      lastActivity: session.last_activity_at,
    };
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Update session activity timestamp
 * @param {string} agencyDatabase - Agency database name
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
async function updateSessionActivity(agencyDatabase, sessionId) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    await agencyClient.query(
      `UPDATE public.user_sessions 
       SET last_activity_at = NOW() 
       WHERE id = $1`,
      [sessionId]
    );
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Get active sessions for user
 * @param {string} agencyDatabase - Agency database name
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Active sessions
 */
async function getActiveSessions(agencyDatabase, userId) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    const result = await agencyClient.query(
      `SELECT id, ip_address, user_agent, device_info, last_activity_at, expires_at, created_at
       FROM public.user_sessions 
       WHERE user_id = $1 
       AND is_active = true 
       AND expires_at > NOW() 
       AND revoked_at IS NULL
       ORDER BY last_activity_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      deviceInfo: row.device_info,
      lastActivityAt: row.last_activity_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    }));
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Revoke session
 * @param {string} agencyDatabase - Agency database name
 * @param {string} sessionId - Session ID
 * @param {string} reason - Revocation reason
 * @returns {Promise<boolean>} True if revoked
 */
async function revokeSession(agencyDatabase, sessionId, reason = 'manual') {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    // Get token hash before revoking
    const sessionResult = await agencyClient.query(
      `SELECT token_hash FROM public.user_sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return false;
    }

    const tokenHash = sessionResult.rows[0].token_hash;

    // Revoke in database
    await agencyClient.query(
      `UPDATE public.user_sessions 
       SET is_active = false, revoked_at = NOW() 
       WHERE id = $1`,
      [sessionId]
    );

    // Remove from Redis
    if (await isRedisAvailable()) {
      const redisClient = await getRedisClient();
      if (redisClient && redisClient.status === 'ready') {
        await redisClient.del(`session:${tokenHash}`);
      }
    }

    return true;
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Revoke all sessions for user
 * @param {string} agencyDatabase - Agency database name
 * @param {string} userId - User ID
 * @param {string} excludeSessionId - Optional session ID to exclude from revocation
 * @returns {Promise<number>} Number of sessions revoked
 */
async function revokeAllUserSessions(agencyDatabase, userId, excludeSessionId = null) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    // Get all active sessions
    let query = `SELECT id, token_hash FROM public.user_sessions 
                 WHERE user_id = $1 AND is_active = true AND revoked_at IS NULL`;
    const params = [userId];

    if (excludeSessionId) {
      query += ` AND id != $2`;
      params.push(excludeSessionId);
    }

    const sessionsResult = await agencyClient.query(query, params);

    // Revoke in database
    let revokeQuery = `UPDATE public.user_sessions 
                       SET is_active = false, revoked_at = NOW() 
                       WHERE user_id = $1 AND is_active = true AND revoked_at IS NULL`;
    const revokeParams = [userId];

    if (excludeSessionId) {
      revokeQuery += ` AND id != $2`;
      revokeParams.push(excludeSessionId);
    }

    await agencyClient.query(revokeQuery, revokeParams);

    // Remove from Redis
    if (await isRedisAvailable()) {
      const redisClient = await getRedisClient();
      if (redisClient && redisClient.status === 'ready') {
        for (const session of sessionsResult.rows) {
          if (session.token_hash) {
            await redisClient.del(`session:${session.token_hash}`);
          }
        }
      }
    }

    return sessionsResult.rows.length;
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Get session configuration for agency
 * @param {string} agencyDatabase - Agency database name
 * @returns {Promise<Object>} Session configuration
 */
async function getSessionConfig(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    // Create session_config table if not exists
    await agencyClient.query(`
      CREATE TABLE IF NOT EXISTS public.session_config (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        timeout INTEGER DEFAULT ${DEFAULT_SESSION_CONFIG.timeout},
        max_concurrent_sessions INTEGER DEFAULT ${DEFAULT_SESSION_CONFIG.maxConcurrentSessions},
        device_tracking BOOLEAN DEFAULT ${DEFAULT_SESSION_CONFIG.deviceTracking},
        require_reauth_on_sensitive BOOLEAN DEFAULT ${DEFAULT_SESSION_CONFIG.requireReauthOnSensitive},
        idle_timeout INTEGER DEFAULT ${DEFAULT_SESSION_CONFIG.idleTimeout},
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const result = await agencyClient.query(
      `SELECT * FROM public.session_config ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length > 0) {
      const config = result.rows[0];
      return {
        timeout: config.timeout,
        maxConcurrentSessions: config.max_concurrent_sessions,
        deviceTracking: config.device_tracking,
        requireReauthOnSensitive: config.require_reauth_on_sensitive,
        idleTimeout: config.idle_timeout,
      };
    }

    // Return default config
    return DEFAULT_SESSION_CONFIG;
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Update session configuration
 * @param {string} agencyDatabase - Agency database name
 * @param {Object} config - Session configuration
 * @returns {Promise<Object>} Updated configuration
 */
async function updateSessionConfig(agencyDatabase, config) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    await agencyClient.query(`
      CREATE TABLE IF NOT EXISTS public.session_config (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        timeout INTEGER DEFAULT ${DEFAULT_SESSION_CONFIG.timeout},
        max_concurrent_sessions INTEGER DEFAULT ${DEFAULT_SESSION_CONFIG.maxConcurrentSessions},
        device_tracking BOOLEAN DEFAULT ${DEFAULT_SESSION_CONFIG.deviceTracking},
        require_reauth_on_sensitive BOOLEAN DEFAULT ${DEFAULT_SESSION_CONFIG.requireReauthOnSensitive},
        idle_timeout INTEGER DEFAULT ${DEFAULT_SESSION_CONFIG.idleTimeout},
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Delete existing and create new
    await agencyClient.query(`DELETE FROM public.session_config`);

    const result = await agencyClient.query(
      `INSERT INTO public.session_config 
       (timeout, max_concurrent_sessions, device_tracking, require_reauth_on_sensitive, idle_timeout)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        config.timeout || DEFAULT_SESSION_CONFIG.timeout,
        config.maxConcurrentSessions || DEFAULT_SESSION_CONFIG.maxConcurrentSessions,
        config.deviceTracking !== undefined ? config.deviceTracking : DEFAULT_SESSION_CONFIG.deviceTracking,
        config.requireReauthOnSensitive !== undefined ? config.requireReauthOnSensitive : DEFAULT_SESSION_CONFIG.requireReauthOnSensitive,
        config.idleTimeout || DEFAULT_SESSION_CONFIG.idleTimeout,
      ]
    );

    return result.rows[0];
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Clean up expired sessions
 * @param {string} agencyDatabase - Agency database name
 * @returns {Promise<number>} Number of sessions cleaned up
 */
async function cleanupExpiredSessions(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    // Get expired sessions
    const expiredResult = await agencyClient.query(
      `SELECT token_hash FROM public.user_sessions 
       WHERE (expires_at <= NOW() OR revoked_at IS NOT NULL) 
       AND is_active = true`
    );

    // Delete expired sessions
    await agencyClient.query(
      `DELETE FROM public.user_sessions 
       WHERE expires_at <= NOW() OR revoked_at IS NOT NULL`
    );

    // Remove from Redis
    if (await isRedisAvailable()) {
      const redisClient = await getRedisClient();
      if (redisClient && redisClient.status === 'ready') {
        for (const session of expiredResult.rows) {
          if (session.token_hash) {
            await redisClient.del(`session:${session.token_hash}`);
          }
        }
      }
    }

    return expiredResult.rows.length;
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

module.exports = {
  createSession,
  validateSession,
  updateSessionActivity,
  getActiveSessions,
  revokeSession,
  revokeAllUserSessions,
  getSessionConfig,
  updateSessionConfig,
  cleanupExpiredSessions,
  DEFAULT_SESSION_CONFIG,
};
