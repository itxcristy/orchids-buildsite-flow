/**
 * API Key Management Routes
 * Handles API key creation, validation, and rate limiting
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const apiKeyService = require('../services/apiKeyService');

/**
 * POST /api/api-keys
 * Create new API key
 * Requires authentication
 */
router.post('/', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const { name, permissions, rateLimitPerMinute, rateLimitPerHour, rateLimitPerDay, expiresAt, prefix } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'API key name is required',
      message: 'API key name is required',
    });
  }

  const keyData = {
    name,
    permissions: permissions || {},
    rateLimitPerMinute: rateLimitPerMinute || 60,
    rateLimitPerHour: rateLimitPerHour || 1000,
    rateLimitPerDay: rateLimitPerDay || 10000,
    expiresAt: expiresAt || null,
    createdBy: userId,
    prefix: prefix || 'sk_live',
  };

  const apiKey = await apiKeyService.createApiKey(agencyDatabase, keyData);

  res.json({
    success: true,
    data: apiKey,
    message: 'API key created successfully. Store this key securely - it will not be shown again.',
  });
}));

/**
 * GET /api/api-keys
 * List all API keys for agency
 * Requires authentication
 */
router.get('/', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const apiKeys = await apiKeyService.listApiKeys(agencyDatabase, userId);

  res.json({
    success: true,
    data: apiKeys,
  });
}));

/**
 * GET /api/api-keys/:id/usage
 * Get API key usage statistics
 * Requires authentication
 */
router.get('/:id/usage', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { id } = req.params;
  const { period } = req.query;

  const stats = await apiKeyService.getApiKeyUsageStats(agencyDatabase, id, period || 'day');

  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * DELETE /api/api-keys/:id
 * Revoke API key
 * Requires authentication
 */
router.delete('/:id', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { id } = req.params;

  const revoked = await apiKeyService.revokeApiKey(agencyDatabase, id);

  if (!revoked) {
    return res.status(404).json({
      success: false,
      error: 'API key not found',
      message: 'API key not found',
    });
  }

  res.json({
    success: true,
    message: 'API key revoked successfully',
  });
}));

/**
 * Middleware to authenticate API key
 * Use this in routes that accept API key authentication
 */
async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      message: 'API key is required in X-API-Key header or Authorization Bearer token',
    });
  }

  // Extract agency database from request (could be in header, query, or subdomain)
  const agencyDatabase = req.headers['x-agency-database'] || req.query.agency_database;

  if (!agencyDatabase) {
    return res.status(400).json({
      success: false,
      error: 'Agency database required',
      message: 'Agency database must be specified',
    });
  }

  // Validate API key
  const keyData = await apiKeyService.validateApiKey(agencyDatabase, apiKey);

  if (!keyData) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      message: 'Invalid or expired API key',
    });
  }

  // Check rate limit
  const rateLimit = await apiKeyService.checkRateLimit(agencyDatabase, keyData.id, 'minute');

  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: `Rate limit exceeded. Limit: ${rateLimit.limit} requests per minute. Reset at: ${rateLimit.resetAt}`,
      rateLimit: {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      },
    });
  }

  // Set API key context
  req.apiKey = keyData;
  req.agencyDatabase = agencyDatabase;
  req.rateLimit = rateLimit;

  next();
}

module.exports = router;
module.exports.authenticateApiKey = authenticateApiKey;
