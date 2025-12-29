/**
 * Cache Service
 * Provides caching functionality using Redis
 * Falls back to in-memory cache if Redis is unavailable
 */

const { getRedisClient, isRedisAvailable } = require('../config/redis');

// In-memory fallback cache
const memoryCache = new Map();
const memoryCacheTTL = new Map();

// Default TTL (Time To Live) in seconds
const DEFAULT_TTL = 3600; // 1 hour

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached value or null
 */
async function get(key) {
  try {
    // Try Redis first
    if (await isRedisAvailable()) {
      const client = await getRedisClient();
      if (client && client.status === 'ready') {
        const value = await client.get(key);
        if (value) {
          return JSON.parse(value);
        }
      }
      return null;
    }
  } catch (error) {
    console.warn('[Cache] Redis get error, falling back to memory:', error.message);
  }

  // Fallback to memory cache
  if (memoryCache.has(key)) {
    const ttl = memoryCacheTTL.get(key);
    if (ttl && Date.now() < ttl) {
      return memoryCache.get(key);
    } else {
      // Expired, remove it
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    }
  }

  return null;
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 1 hour)
 * @returns {Promise<boolean>} Success status
 */
async function set(key, value, ttl = DEFAULT_TTL) {
  try {
    // Try Redis first
    if (await isRedisAvailable()) {
      const client = await getRedisClient();
      if (client && client.status === 'ready') {
        await client.setex(key, ttl, JSON.stringify(value));
        return true;
      }
    }
  } catch (error) {
    console.warn('[Cache] Redis set error, falling back to memory:', error.message);
  }

  // Fallback to memory cache
  try {
    memoryCache.set(key, value);
    memoryCacheTTL.set(key, Date.now() + (ttl * 1000));
    return true;
  } catch (error) {
    console.error('[Cache] Memory cache set error:', error);
    return false;
  }
}

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
async function del(key) {
  try {
    // Try Redis first
    if (await isRedisAvailable()) {
      const client = await getRedisClient();
      if (client && client.status === 'ready') {
        await client.del(key);
        return true;
      }
    }
  } catch (error) {
    console.warn('[Cache] Redis delete error, falling back to memory:', error.message);
  }

  // Fallback to memory cache
  memoryCache.delete(key);
  memoryCacheTTL.delete(key);
  return true;
}

/**
 * Delete multiple keys matching a pattern
 * @param {string} pattern - Pattern to match (e.g., 'user:*')
 * @returns {Promise<number>} Number of keys deleted
 */
async function delPattern(pattern) {
  let deleted = 0;

  try {
    // Try Redis first
    if (await isRedisAvailable()) {
      const client = await getRedisClient();
      if (client && client.status === 'ready') {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(...keys);
          deleted = keys.length;
        }
      }
      return deleted;
    }
  } catch (error) {
    console.warn('[Cache] Redis pattern delete error, falling back to memory:', error.message);
  }

  // Fallback to memory cache
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern.replace('*', ''))) {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
      deleted++;
    }
  }

  return deleted;
}

/**
 * Clear all cache
 * @returns {Promise<boolean>} Success status
 */
async function clear() {
  try {
    // Try Redis first
    if (await isRedisAvailable()) {
      const client = await getRedisClient();
      if (client && client.status === 'ready') {
        await client.flushdb();
        return true;
      }
    }
  } catch (error) {
    console.warn('[Cache] Redis clear error, falling back to memory:', error.message);
  }

  // Fallback to memory cache
  memoryCache.clear();
  memoryCacheTTL.clear();
  return true;
}

/**
 * Get cache statistics
 * @returns {Promise<Object>} Cache statistics
 */
async function getStats() {
  const stats = {
    type: 'memory',
    size: 0,
    redisAvailable: false,
  };

  try {
    if (await isRedisAvailable()) {
      const client = await getRedisClient();
      if (client && client.status === 'ready') {
        stats.type = 'redis';
        stats.redisAvailable = true;
        // Get database size
        stats.size = await client.dbsize();
      } else {
        stats.size = memoryCache.size;
      }
    } else {
      stats.size = memoryCache.size;
    }
  } catch (error) {
    stats.size = memoryCache.size;
  }

  return stats;
}

/**
 * Cache middleware for Express routes
 * Caches GET request responses
 * @param {number} ttl - Time to live in seconds
 * @param {Function} keyGenerator - Optional function to generate cache key from request
 */
function cacheMiddleware(ttl = DEFAULT_TTL, keyGenerator = null) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `cache:${req.path}:${JSON.stringify(req.query)}:${req.user?.id || 'anonymous'}`;

    try {
      // Try to get from cache
      const cached = await get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function(data) {
        // Cache the response
        set(cacheKey, data, ttl).catch(err => {
          console.error('[Cache] Failed to cache response:', err);
        });

        // Send response
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('[Cache] Middleware error:', error);
      next();
    }
  };
}

module.exports = {
  get,
  set,
  del,
  delPattern,
  clear,
  getStats,
  cacheMiddleware,
};
