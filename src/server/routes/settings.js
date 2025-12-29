/**
 * Settings Routes
 * Handles module-specific settings management
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const settingsService = require('../services/settingsService');

/**
 * GET /api/settings/inventory
 * Get inventory settings
 */
router.get('/inventory', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const settings = await settingsService.getInventorySettings(agencyDatabase, agencyId);

  res.json({
    success: true,
    data: settings,
  });
}));

/**
 * PUT /api/settings/inventory
 * Update inventory settings
 */
router.put('/inventory', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const settings = await settingsService.updateInventorySettings(
    agencyDatabase,
    agencyId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: settings,
    message: 'Inventory settings updated successfully',
  });
}));

/**
 * GET /api/settings/procurement
 * Get procurement settings
 */
router.get('/procurement', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const settings = await settingsService.getProcurementSettings(agencyDatabase, agencyId);

  res.json({
    success: true,
    data: settings,
  });
}));

/**
 * PUT /api/settings/procurement
 * Update procurement settings
 */
router.put('/procurement', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const settings = await settingsService.updateProcurementSettings(
    agencyDatabase,
    agencyId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: settings,
    message: 'Procurement settings updated successfully',
  });
}));

/**
 * GET /api/settings/assets
 * Get asset settings
 */
router.get('/assets', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const settings = await settingsService.getAssetSettings(agencyDatabase, agencyId);

  res.json({
    success: true,
    data: settings,
  });
}));

/**
 * PUT /api/settings/assets
 * Update asset settings
 */
router.put('/assets', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const settings = await settingsService.updateAssetSettings(
    agencyDatabase,
    agencyId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: settings,
    message: 'Asset settings updated successfully',
  });
}));

/**
 * GET /api/settings/workflow
 * Get workflow settings
 */
router.get('/workflow', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const settings = await settingsService.getWorkflowSettings(agencyDatabase, agencyId);

  res.json({
    success: true,
    data: settings,
  });
}));

/**
 * PUT /api/settings/workflow
 * Update workflow settings
 */
router.put('/workflow', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const settings = await settingsService.updateWorkflowSettings(
    agencyDatabase,
    agencyId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: settings,
    message: 'Workflow settings updated successfully',
  });
}));

/**
 * GET /api/settings/integration
 * Get integration settings
 */
router.get('/integration', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const settings = await settingsService.getIntegrationSettings(agencyDatabase, agencyId);

  res.json({
    success: true,
    data: settings,
  });
}));

/**
 * PUT /api/settings/integration
 * Update integration settings
 */
router.put('/integration', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const settings = await settingsService.updateIntegrationSettings(
    agencyDatabase,
    agencyId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: settings,
    message: 'Integration settings updated successfully',
  });
}));

module.exports = router;

