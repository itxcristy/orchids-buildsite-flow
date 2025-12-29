/**
 * Schema Admin and Health Check Routes
 * Provides endpoints for monitoring and managing schema validation
 */

const express = require('express');
const router = express.Router();
const { getAgencyPool } = require('../config/database');
const { ensureAgencySchema, getSchemaVersion, clearSchemaCache, SchemaLogger } = require('../utils/schemaValidator');
const { getPoolStats } = require('../utils/poolManager');
const { authenticate, requireSuperAdmin } = require('../middleware/authMiddleware');

/**
 * GET /health/schema/:agencyId
 * Health check for a specific agency's schema
 */
router.get('/health/schema/:agencyId', async (req, res) => {
  try {
    const { agencyId } = req.params;
    const pool = getAgencyPool(agencyId);
    
    if (!pool) {
      return res.status(404).json({ 
        status: 'not_found',
        message: 'Agency pool not found',
        agencyId
      });
    }
    
    // Quick health check
    const healthCheck = await pool.query('SELECT NOW(), current_database()');
    const schemaVersion = await getSchemaVersion(pool);
    const tableCount = await pool.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'"
    );
    
    res.json({
      status: 'healthy',
      agencyId,
      database: healthCheck.rows[0].current_database,
      schemaVersion,
      tableCount: parseInt(tableCount.rows[0].count, 10),
      serverTime: healthCheck.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      agencyId: req.params.agencyId
    });
  }
});

/**
 * POST /admin/validate-schema/:agencyId
 * Manually trigger schema validation for an agency (admin only)
 */
router.post('/admin/validate-schema/:agencyId', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { agencyId } = req.params;
    const force = req.query.force === 'true';
    
    SchemaLogger.info('Manual schema validation requested', {
      agencyId,
      force,
      requestedBy: req.user?.id
    });
    
    // Force schema validation
    const result = await ensureAgencySchema(agencyId, { force });
    
    res.json({
      success: true,
      agencyId,
      validation: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    SchemaLogger.error('Manual schema validation failed', error, {
      agencyId: req.params.agencyId
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      agencyId: req.params.agencyId
    });
  }
});

/**
 * POST /admin/repair-schema/:agencyId
 * Manually trigger schema repair for an agency (admin only)
 */
router.post('/admin/repair-schema/:agencyId', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { agencyId } = req.params;
    
    SchemaLogger.info('Manual schema repair requested', {
      agencyId,
      requestedBy: req.user?.id
    });
    
    // Force schema validation/repair
    const result = await ensureAgencySchema(agencyId, { force: true });
    
    res.json({
      success: true,
      message: 'Schema repair completed',
      agencyId,
      validation: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    SchemaLogger.error('Manual schema repair failed', error, {
      agencyId: req.params.agencyId
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      agencyId: req.params.agencyId
    });
  }
});

/**
 * POST /admin/clear-schema-cache/:agencyId?
 * Clear schema validation cache (admin only)
 * If no agencyId provided, clears all caches
 */
router.post('/admin/clear-schema-cache/:agencyId?', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { agencyId } = req.params;
    
    clearSchemaCache(agencyId || null);
    
    res.json({
      success: true,
      message: agencyId ? `Schema cache cleared for ${agencyId}` : 'All schema caches cleared',
      agencyId: agencyId || 'all',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/pool-status
 * Get connection pool statistics (admin only)
 */
router.get('/admin/pool-status', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const stats = getPoolStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

