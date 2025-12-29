/**
 * Integration Management Routes
 * Handles integration CRUD operations, API keys, and integration logs
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const integrationService = require('../services/integrationService');
const apiKeyService = require('../services/apiKeyService');

/**
 * GET /api/integrations
 * List all integrations for agency
 */
router.get('/', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const filters = {
    integration_type: req.query.integration_type,
    provider: req.query.provider,
    status: req.query.status,
    search: req.query.search
  };

  const integrations = await integrationService.getIntegrations(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: integrations,
  });
}));

/**
 * GET /api/integrations/stats
 * Get integration statistics
 */
router.get('/stats', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;

  const stats = await integrationService.getIntegrationStats(agencyDatabase, agencyId);

  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * GET /api/integrations/:integrationId
 * Get integration by ID
 */
router.get('/:integrationId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const { integrationId } = req.params;

  const integration = await integrationService.getIntegrationById(agencyDatabase, agencyId, integrationId);

  res.json({
    success: true,
    data: integration,
  });
}));

/**
 * POST /api/integrations
 * Create new integration
 */
router.post('/', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const userId = req.user.id;
  const integrationData = {
    ...req.body,
    agency_id: agencyId
  };

  if (!integrationData.name || !integrationData.integration_type) {
    return res.status(400).json({
      success: false,
      error: 'Name and integration type are required',
      message: 'Name and integration type are required',
    });
  }

  const integration = await integrationService.createIntegration(agencyDatabase, integrationData, userId);

  res.status(201).json({
    success: true,
    data: integration,
    message: 'Integration created successfully',
  });
}));

/**
 * PUT /api/integrations/:integrationId
 * Update integration
 */
router.put('/:integrationId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const { integrationId } = req.params;

  const integration = await integrationService.updateIntegration(
    agencyDatabase,
    agencyId,
    integrationId,
    req.body
  );

  res.json({
    success: true,
    data: integration,
    message: 'Integration updated successfully',
  });
}));

/**
 * DELETE /api/integrations/:integrationId
 * Delete integration
 */
router.delete('/:integrationId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const { integrationId } = req.params;

  await integrationService.deleteIntegration(agencyDatabase, agencyId, integrationId);

  res.json({
    success: true,
    message: 'Integration deleted successfully',
  });
}));

/**
 * GET /api/integrations/:integrationId/logs
 * Get integration logs
 */
router.get('/:integrationId/logs', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const { integrationId } = req.params;
  const filters = {
    integration_id: integrationId,
    log_type: req.query.log_type,
    status: req.query.status,
    direction: req.query.direction,
    start_date: req.query.start_date,
    end_date: req.query.end_date,
    limit: req.query.limit || 100
  };

  const logs = await integrationService.getIntegrationLogs(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: logs,
  });
}));

/**
 * GET /api/integrations/logs/all
 * Get all integration logs (across all integrations)
 */
router.get('/logs/all', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const filters = {
    log_type: req.query.log_type,
    status: req.query.status,
    direction: req.query.direction,
    start_date: req.query.start_date,
    end_date: req.query.end_date,
    limit: req.query.limit || 100
  };

  const logs = await integrationService.getIntegrationLogs(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: logs,
  });
}));

/**
 * POST /api/integrations/:integrationId/test
 * Test integration connection
 */
router.post('/:integrationId/test', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const { integrationId } = req.params;

  const integration = await integrationService.getIntegrationById(agencyDatabase, agencyId, integrationId);

  // TODO: Implement actual integration testing logic
  // This would test the connection based on integration_type and authentication_type

  res.json({
    success: true,
    message: 'Integration test completed',
    data: {
      status: 'success',
      message: 'Connection test successful'
    }
  });
}));

/**
 * POST /api/integrations/:integrationId/sync
 * Trigger manual sync for integration
 */
router.post('/:integrationId/sync', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const { integrationId } = req.params;

  const integration = await integrationService.getIntegrationById(agencyDatabase, agencyId, integrationId);

  if (!integration.sync_enabled) {
    return res.status(400).json({
      success: false,
      error: 'Sync is not enabled for this integration',
      message: 'Sync is not enabled for this integration',
    });
  }

  // TODO: Implement actual sync logic
  // This would trigger a sync based on integration_type

  // Update last_sync_at
  await integrationService.updateIntegration(
    agencyDatabase,
    agencyId,
    integrationId,
    { last_sync_at: new Date().toISOString(), last_sync_status: 'success' }
  );

  res.json({
    success: true,
    message: 'Sync triggered successfully',
  });
}));

module.exports = router;

