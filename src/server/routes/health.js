/**
 * Health Check Routes
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { isRedisAvailable } = require('../config/redis');
const { getStats } = require('../services/cacheService');

/**
 * GET /health
 * Health check endpoint - verifies database and Redis connectivity
 * Returns 200 if server is running (even if services aren't ready yet)
 */
router.get('/', asyncHandler(async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {},
  };

  // Check database (non-blocking - don't fail if not ready)
  try {
    const result = await pool.query('SELECT NOW()');
    health.services.database = {
      status: 'connected',
    };
  } catch (error) {
    // Don't fail health check if DB isn't ready - just mark as degraded
    health.status = 'degraded';
    health.services.database = {
      status: 'connecting',
      error: error.message,
    };
  }

  // Check Redis (optional - don't fail if unavailable)
  try {
    const redisAvailable = await isRedisAvailable();
    if (redisAvailable) {
      const cacheStats = await getStats();
      health.services.redis = {
        status: 'connected',
        type: cacheStats.type,
      };
    } else {
      health.services.redis = {
        status: 'unavailable',
        fallback: 'in-memory',
      };
    }
  } catch (error) {
    health.services.redis = {
      status: 'error',
      fallback: 'in-memory',
    };
  }

  // ALWAYS return 200 - server is running, services may be starting
  // This allows container to be considered healthy during startup
  res.status(200).json(health);
}));

module.exports = router;
