/**
 * API Key Management Service
 * Handles API key generation, validation, and rate limiting
 */

const crypto = require('crypto');
const { Pool } = require('pg');
const { parseDatabaseUrl } = require('../utils/poolManager');

/**
 * Generate API key
 * @param {string} prefix - Key prefix (e.g., 'sk_live', 'sk_test')
 * @returns {string} API key
 */
function generateApiKey(prefix = 'sk') {
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString('base64url');
  return `${prefix}_${key}`;
}

/**
 * Hash API key for storage
 * @param {string} apiKey - Plain API key
 * @returns {string} Hashed key
 */
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Create API key for agency
 * @param {string} agencyDatabase - Agency database name
 * @param {Object} keyData - Key data { name, permissions, rateLimit, expiresAt }
 * @returns {Promise<Object>} Created API key (with plain key shown once)
 */
async function createApiKey(agencyDatabase, keyData) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    // Create api_keys table if not exists
    await agencyClient.query(`
      CREATE TABLE IF NOT EXISTS public.api_keys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        key_prefix TEXT NOT NULL,
        permissions JSONB DEFAULT '{}',
        rate_limit_per_minute INTEGER DEFAULT 60,
        rate_limit_per_hour INTEGER DEFAULT 1000,
        rate_limit_per_day INTEGER DEFAULT 10000,
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP WITH TIME ZONE,
        last_used_at TIMESTAMP WITH TIME ZONE,
        created_by UUID REFERENCES public.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON public.api_keys(is_active);
    `);

    // Generate key
    const prefix = keyData.prefix || 'sk_live';
    const plainKey = generateApiKey(prefix);
    const keyHash = hashApiKey(plainKey);

    // Insert key
    const result = await agencyClient.query(
      `INSERT INTO public.api_keys 
       (name, key_hash, key_prefix, permissions, rate_limit_per_minute, rate_limit_per_hour, 
        rate_limit_per_day, is_active, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        keyData.name,
        keyHash,
        prefix,
        JSON.stringify(keyData.permissions || {}),
        keyData.rateLimitPerMinute || 60,
        keyData.rateLimitPerHour || 1000,
        keyData.rateLimitPerDay || 10000,
        keyData.isActive !== undefined ? keyData.isActive : true,
        keyData.expiresAt || null,
        keyData.createdBy || null,
      ]
    );

    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      key: plainKey, // Show only once
      prefix: result.rows[0].key_prefix,
      permissions: result.rows[0].permissions,
      rateLimitPerMinute: result.rows[0].rate_limit_per_minute,
      rateLimitPerHour: result.rows[0].rate_limit_per_hour,
      rateLimitPerDay: result.rows[0].rate_limit_per_day,
      isActive: result.rows[0].is_active,
      expiresAt: result.rows[0].expires_at,
      createdAt: result.rows[0].created_at,
    };
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Validate API key
 * @param {string} agencyDatabase - Agency database name
 * @param {string} apiKey - Plain API key
 * @returns {Promise<Object|null>} API key data if valid
 */
async function validateApiKey(agencyDatabase, apiKey) {
  const keyHash = hashApiKey(apiKey);

  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    const result = await agencyClient.query(
      `SELECT * FROM public.api_keys 
       WHERE key_hash = $1 
       AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const keyData = result.rows[0];

    // Update last used timestamp
    await agencyClient.query(
      `UPDATE public.api_keys SET last_used_at = NOW() WHERE id = $1`,
      [keyData.id]
    );

    return {
      id: keyData.id,
      name: keyData.name,
      permissions: keyData.permissions,
      rateLimitPerMinute: keyData.rate_limit_per_minute,
      rateLimitPerHour: keyData.rate_limit_per_hour,
      rateLimitPerDay: keyData.rate_limit_per_day,
      expiresAt: keyData.expires_at,
    };
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Check rate limit for API key
 * @param {string} agencyDatabase - Agency database name
 * @param {string} keyId - API key ID
 * @param {string} period - 'minute', 'hour', or 'day'
 * @returns {Promise<Object>} Rate limit status { allowed, remaining, resetAt }
 */
async function checkRateLimit(agencyDatabase, keyId, period = 'minute') {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    // Create api_key_usage table if not exists
    await agencyClient.query(`
      CREATE TABLE IF NOT EXISTS public.api_key_usage (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
        used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_id ON public.api_key_usage(key_id, used_at DESC);
    `);

    // Get key rate limit
    const keyResult = await agencyClient.query(
      `SELECT rate_limit_per_minute, rate_limit_per_hour, rate_limit_per_day 
       FROM public.api_keys WHERE id = $1`,
      [keyId]
    );

    if (keyResult.rows.length === 0) {
      return { allowed: false, remaining: 0, resetAt: null };
    }

    const key = keyResult.rows[0];
    const limitField = period === 'minute' ? 'rate_limit_per_minute' : 
                      period === 'hour' ? 'rate_limit_per_hour' : 
                      'rate_limit_per_day';
    const limit = key[limitField];

    // Calculate time window
    const timeWindow = period === 'minute' ? '1 minute' : 
                       period === 'hour' ? '1 hour' : 
                       '1 day';

    // Count recent usage
    const usageResult = await agencyClient.query(
      `SELECT COUNT(*) as count, MAX(used_at) as last_used
       FROM public.api_key_usage 
       WHERE key_id = $1 
       AND used_at > NOW() - INTERVAL '${timeWindow}'`,
      [keyId]
    );

    const used = parseInt(usageResult.rows[0].count) || 0;
    const remaining = Math.max(0, limit - used);
    const allowed = remaining > 0;

    // Calculate reset time
    let resetAt = null;
    if (usageResult.rows[0].last_used) {
      const resetTime = new Date(usageResult.rows[0].last_used);
      if (period === 'minute') {
        resetTime.setMinutes(resetTime.getMinutes() + 1);
      } else if (period === 'hour') {
        resetTime.setHours(resetTime.getHours() + 1);
      } else {
        resetTime.setDate(resetTime.getDate() + 1);
      }
      resetAt = resetTime;
    }

    // Record usage if allowed
    if (allowed) {
      await agencyClient.query(
        `INSERT INTO public.api_key_usage (key_id) VALUES ($1)`,
        [keyId]
      );
    }

    // Clean up old usage records (older than 30 days)
    await agencyClient.query(
      `DELETE FROM public.api_key_usage 
       WHERE used_at < NOW() - INTERVAL '30 days'`
    );

    return {
      allowed,
      remaining,
      limit,
      used,
      resetAt,
    };
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * List API keys for agency
 * @param {string} agencyDatabase - Agency database name
 * @param {string} userId - Optional user ID to filter by creator
 * @returns {Promise<Array>} List of API keys (without plain keys)
 */
async function listApiKeys(agencyDatabase, userId = null) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    let query = `SELECT id, name, key_prefix, permissions, rate_limit_per_minute, 
                        rate_limit_per_hour, rate_limit_per_day, is_active, expires_at, 
                        last_used_at, created_at, updated_at
                 FROM public.api_keys`;
    const params = [];

    if (userId) {
      query += ` WHERE created_by = $1`;
      params.push(userId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await agencyClient.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      prefix: row.key_prefix,
      permissions: row.permissions,
      rateLimitPerMinute: row.rate_limit_per_minute,
      rateLimitPerHour: row.rate_limit_per_hour,
      rateLimitPerDay: row.rate_limit_per_day,
      isActive: row.is_active,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Revoke API key
 * @param {string} agencyDatabase - Agency database name
 * @param {string} keyId - API key ID
 * @returns {Promise<boolean>} True if revoked
 */
async function revokeApiKey(agencyDatabase, keyId) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    const result = await agencyClient.query(
      `UPDATE public.api_keys SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [keyId]
    );

    return result.rows.length > 0;
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Get API key usage statistics
 * @param {string} agencyDatabase - Agency database name
 * @param {string} keyId - API key ID
 * @param {string} period - 'day', 'week', or 'month'
 * @returns {Promise<Object>} Usage statistics
 */
async function getApiKeyUsageStats(agencyDatabase, keyId, period = 'day') {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    const timeWindow = period === 'day' ? '1 day' : 
                       period === 'week' ? '7 days' : 
                       '30 days';

    const result = await agencyClient.query(
      `SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE used_at > NOW() - INTERVAL '1 hour') as requests_last_hour,
        COUNT(*) FILTER (WHERE used_at > NOW() - INTERVAL '1 day') as requests_last_day,
        MIN(used_at) as first_request,
        MAX(used_at) as last_request
       FROM public.api_key_usage 
       WHERE key_id = $1 
       AND used_at > NOW() - INTERVAL '${timeWindow}'`,
      [keyId]
    );

    const stats = result.rows[0];

    return {
      totalRequests: parseInt(stats.total_requests) || 0,
      requestsLastHour: parseInt(stats.requests_last_hour) || 0,
      requestsLastDay: parseInt(stats.requests_last_day) || 0,
      firstRequest: stats.first_request,
      lastRequest: stats.last_request,
    };
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

module.exports = {
  generateApiKey,
  hashApiKey,
  createApiKey,
  validateApiKey,
  checkRateLimit,
  listApiKeys,
  revokeApiKey,
  getApiKeyUsageStats,
};
