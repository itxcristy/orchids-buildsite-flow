/**
 * Database Optimization Routes
 * Query analysis, performance monitoring, and optimization
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const dbOptimizationService = require('../services/databaseOptimizationService');

/**
 * GET /api/database-optimization/slow-queries
 * Get slow query analysis
 * Requires authentication
 */
router.get('/slow-queries', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const minDuration = parseInt(req.query.minDuration) || 1000;
  const limit = parseInt(req.query.limit) || 50;

  const slowQueries = await dbOptimizationService.analyzeSlowQueries(agencyDatabase, minDuration, limit);

  res.json({
    success: true,
    data: slowQueries,
  });
}));

/**
 * GET /api/database-optimization/table-statistics
 * Get table statistics and sizes
 * Requires authentication
 */
router.get('/table-statistics', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const statistics = await dbOptimizationService.getTableStatistics(agencyDatabase);

  res.json({
    success: true,
    data: statistics,
  });
}));

/**
 * GET /api/database-optimization/index-statistics
 * Get index usage statistics
 * Requires authentication
 */
router.get('/index-statistics', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const statistics = await dbOptimizationService.getIndexStatistics(agencyDatabase);

  res.json({
    success: true,
    data: statistics,
  });
}));

/**
 * GET /api/database-optimization/index-recommendations
 * Get index recommendations
 * Requires authentication
 */
router.get('/index-recommendations', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const recommendations = await dbOptimizationService.recommendIndexes(agencyDatabase);

  res.json({
    success: true,
    data: recommendations,
  });
}));

/**
 * GET /api/database-optimization/connection-statistics
 * Get database connection statistics
 * Requires authentication
 */
router.get('/connection-statistics', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const statistics = await dbOptimizationService.getConnectionStatistics(agencyDatabase);

  res.json({
    success: true,
    data: statistics,
  });
}));

/**
 * GET /api/database-optimization/table-bloat
 * Analyze table bloat
 * Requires authentication
 */
router.get('/table-bloat', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const bloatAnalysis = await dbOptimizationService.analyzeTableBloat(agencyDatabase);

  res.json({
    success: true,
    data: bloatAnalysis,
  });
}));

/**
 * POST /api/database-optimization/explain-query
 * Get query execution plan
 * Requires authentication
 */
router.post('/explain-query', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { query, params } = req.body;

  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Query is required',
      message: 'SQL query is required',
    });
  }

  const plan = await dbOptimizationService.explainQuery(agencyDatabase, query, params || []);

  res.json({
    success: true,
    data: plan,
  });
}));

/**
 * POST /api/database-optimization/vacuum
 * Vacuum and analyze tables
 * Requires authentication and admin role
 */
router.post('/vacuum', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { tables } = req.body; // Optional array of specific tables

  const result = await dbOptimizationService.vacuumTables(agencyDatabase, tables);

  res.json({
    success: true,
    data: result,
    message: 'Vacuum operation completed',
  });
}));

/**
 * POST /api/database-optimization/create-indexes
 * Create recommended indexes
 * Requires authentication and admin role
 */
router.post('/create-indexes', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { recommendations } = req.body;

  if (!recommendations || !Array.isArray(recommendations)) {
    return res.status(400).json({
      success: false,
      error: 'Index recommendations array is required',
      message: 'Index recommendations array is required',
    });
  }

  const result = await dbOptimizationService.createRecommendedIndexes(agencyDatabase, recommendations);

  res.json({
    success: true,
    data: result,
    message: `Created ${result.created.length} index(es), skipped ${result.skipped.length}, failed ${result.failed.length}`,
  });
}));

module.exports = router;
