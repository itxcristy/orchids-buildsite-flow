/**
 * Asset Management Routes
 * Handles all asset management operations
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const assetManagementService = require('../services/assetManagementService');
const { cacheMiddleware } = require('../services/cacheService');

/**
 * GET /api/assets/categories
 * Get all asset categories
 */
router.get('/categories', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const categories = await assetManagementService.getAssetCategories(agencyDatabase, agencyId);

  res.json({
    success: true,
    data: categories,
  });
}));

/**
 * GET /api/assets
 * Get all assets with optional filters
 */
router.get('/', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const filters = {
    category_id: req.query.category_id,
    status: req.query.status,
    location_id: req.query.location_id,
    search: req.query.search,
    limit: req.query.limit ? parseInt(req.query.limit) : undefined,
  };

  const assets = await assetManagementService.getAssets(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: assets,
  });
}));

/**
 * POST /api/assets
 * Create a new asset
 */
router.post('/', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const asset = await assetManagementService.createAsset(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: asset,
    message: 'Asset created successfully',
  });
}));

// NOTE: Routes that start with fixed segments like /categories, /locations,
// /depreciation, /disposals, /reports are defined BEFORE the generic /:assetId
// route at the bottom of this file to avoid treating those fixed segments
// as asset IDs (which would cause invalid UUID errors).

/**
 * POST /api/assets/categories
 * Create an asset category
 */
router.post('/categories', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const category = await assetManagementService.createAssetCategory(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: category,
    message: 'Asset category created successfully',
  });
}));

/**
 * PUT /api/assets/categories/:categoryId
 * Update an asset category
 */
router.put('/categories/:categoryId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { categoryId } = req.params;
  const userId = req.user.id;

  const category = await assetManagementService.updateAssetCategory(
    agencyDatabase,
    agencyId,
    categoryId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: category,
    message: 'Asset category updated successfully',
  });
}));

/**
 * DELETE /api/assets/categories/:categoryId
 * Delete an asset category
 */
router.delete('/categories/:categoryId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { categoryId } = req.params;

  await assetManagementService.deleteAssetCategory(agencyDatabase, agencyId, categoryId);

  res.json({
    success: true,
    message: 'Asset category deleted successfully',
  });
}));

/**
 * GET /api/assets/locations
 * Get all asset locations
 */
router.get('/locations', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const locations = await assetManagementService.getAssetLocations(agencyDatabase, agencyId);

  res.json({
    success: true,
    data: locations,
  });
}));

/**
 * POST /api/assets/locations
 * Create an asset location
 */
router.post('/locations', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const location = await assetManagementService.createAssetLocation(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: location,
    message: 'Asset location created successfully',
  });
}));

/**
 * PUT /api/assets/locations/:locationId
 * Update an asset location
 */
router.put('/locations/:locationId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { locationId } = req.params;
  const userId = req.user.id;

  const location = await assetManagementService.updateAssetLocation(
    agencyDatabase,
    agencyId,
    locationId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: location,
    message: 'Asset location updated successfully',
  });
}));

/**
 * DELETE /api/assets/locations/:locationId
 * Delete an asset location
 */
router.delete('/locations/:locationId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { locationId } = req.params;

  await assetManagementService.deleteAssetLocation(agencyDatabase, agencyId, locationId);

  res.json({
    success: true,
    message: 'Asset location deleted successfully',
  });
}));

/**
 * GET /api/assets/depreciation
 * Get all depreciation records (with optional filters)
 */
router.get('/depreciation', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const filters = {
    asset_id: req.query.asset_id,
    is_posted: req.query.is_posted !== undefined ? req.query.is_posted === 'true' : undefined,
    depreciation_method: req.query.depreciation_method,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    search: req.query.search,
  };

  const depreciation = await assetManagementService.getAllDepreciation(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: depreciation,
  });
}));

/**
 * GET /api/assets/:assetId/depreciation
 * Get depreciation records for an asset
 */
router.get('/:assetId/depreciation', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { assetId } = req.params;

  const depreciation = await assetManagementService.getAssetDepreciation(agencyDatabase, agencyId, assetId);

  res.json({
    success: true,
    data: depreciation,
  });
}));

/**
 * POST /api/assets/depreciation
 * Create a depreciation record
 */
router.post('/depreciation', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const depreciation = await assetManagementService.createDepreciation(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: depreciation,
    message: 'Depreciation record created successfully',
  });
}));

/**
 * PUT /api/assets/depreciation/:depreciationId
 * Update a depreciation record
 */
router.put('/depreciation/:depreciationId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { depreciationId } = req.params;
  const userId = req.user.id;

  const depreciation = await assetManagementService.updateDepreciation(
    agencyDatabase,
    agencyId,
    depreciationId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: depreciation,
    message: 'Depreciation record updated successfully',
  });
}));

/**
 * DELETE /api/assets/depreciation/:depreciationId
 * Delete a depreciation record
 */
router.delete('/depreciation/:depreciationId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { depreciationId } = req.params;

  await assetManagementService.deleteDepreciation(agencyDatabase, agencyId, depreciationId);

  res.json({
    success: true,
    message: 'Depreciation record deleted successfully',
  });
}));

/**
 * GET /api/assets/maintenance
 * Get all maintenance records (with optional filters)
 */
router.get('/maintenance', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const filters = {
    asset_id: req.query.asset_id,
    status: req.query.status,
    maintenance_type: req.query.maintenance_type,
    priority: req.query.priority,
    search: req.query.search,
  };

  const maintenance = await assetManagementService.getAllMaintenance(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: maintenance,
  });
}));

/**
 * GET /api/assets/:assetId/maintenance
 * Get maintenance records for an asset
 */
router.get('/:assetId/maintenance', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { assetId } = req.params;

  const maintenance = await assetManagementService.getAssetMaintenance(agencyDatabase, agencyId, assetId);

  res.json({
    success: true,
    data: maintenance,
  });
}));

/**
 * POST /api/assets/maintenance
 * Create a maintenance record
 */
router.post('/maintenance', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const maintenance = await assetManagementService.createMaintenance(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: maintenance,
    message: 'Maintenance record created successfully',
  });
}));

/**
 * PUT /api/assets/maintenance/:maintenanceId
 * Update a maintenance record
 */
router.put('/maintenance/:maintenanceId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { maintenanceId } = req.params;
  const userId = req.user.id;

  const maintenance = await assetManagementService.updateMaintenance(
    agencyDatabase,
    agencyId,
    maintenanceId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: maintenance,
    message: 'Maintenance record updated successfully',
  });
}));

/**
 * DELETE /api/assets/maintenance/:maintenanceId
 * Delete a maintenance record
 */
router.delete('/maintenance/:maintenanceId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { maintenanceId } = req.params;

  await assetManagementService.deleteMaintenance(agencyDatabase, agencyId, maintenanceId);

  res.json({
    success: true,
    message: 'Maintenance record deleted successfully',
  });
}));

/**
 * GET /api/assets/disposals
 * Get all asset disposals
 */
router.get('/disposals', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const filters = {
    asset_id: req.query.asset_id,
    disposal_type: req.query.disposal_type,
    approval_status: req.query.approval_status,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
  };

  const disposals = await assetManagementService.getAllDisposals(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: disposals,
  });
}));

/**
 * GET /api/assets/disposals/:disposalId
 * Get asset disposal by ID
 */
router.get('/disposals/:disposalId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { disposalId } = req.params;

  const disposal = await assetManagementService.getDisposalById(agencyDatabase, agencyId, disposalId);

  res.json({
    success: true,
    data: disposal,
  });
}));

/**
 * POST /api/assets/disposals
 * Create new asset disposal
 */
router.post('/disposals', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  if (!req.body.asset_id || !req.body.disposal_date || !req.body.disposal_type) {
    return res.status(400).json({
      success: false,
      error: 'Asset ID, disposal date, and disposal type are required',
      message: 'Asset ID, disposal date, and disposal type are required',
    });
  }

  const disposal = await assetManagementService.createDisposal(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.status(201).json({
    success: true,
    data: disposal,
    message: 'Asset disposal created successfully',
  });
}));

/**
 * PUT /api/assets/disposals/:disposalId
 * Update asset disposal
 */
router.put('/disposals/:disposalId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { disposalId } = req.params;

  const disposal = await assetManagementService.updateDisposal(
    agencyDatabase,
    agencyId,
    disposalId,
    req.body
  );

  res.json({
    success: true,
    data: disposal,
    message: 'Asset disposal updated successfully',
  });
}));

/**
 * DELETE /api/assets/disposals/:disposalId
 * Delete asset disposal
 */
router.delete('/disposals/:disposalId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { disposalId } = req.params;

  await assetManagementService.deleteDisposal(agencyDatabase, agencyId, disposalId);

  res.json({
    success: true,
    message: 'Asset disposal deleted successfully',
  });
}));

/**
 * POST /api/assets/disposals/:disposalId/approve
 * Approve asset disposal
 */
router.post('/disposals/:disposalId/approve', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const { disposalId } = req.params;

  const disposal = await assetManagementService.approveDisposal(agencyDatabase, agencyId, disposalId, userId);

  res.json({
    success: true,
    data: disposal,
    message: 'Asset disposal approved successfully',
  });
}));

/**
 * GET /api/assets/reports
 * Get asset reports and analytics
 */
router.get('/reports', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const filters = {
    date_from: req.query.date_from,
    date_to: req.query.date_to,
  };

  const reports = await assetManagementService.getAssetReports(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: reports,
  });
}));

/**
 * GET /api/assets/:assetId
 * Get a single asset by ID
 */
router.get('/:assetId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { assetId } = req.params;

  const asset = await assetManagementService.getAssetById(agencyDatabase, agencyId, assetId);

  if (!asset) {
    return res.status(404).json({
      success: false,
      error: 'Asset not found',
      message: 'Asset not found',
    });
  }

  res.json({
    success: true,
    data: asset,
  });
}));

/**
 * PUT /api/assets/:assetId
 * Update an asset
 */
router.put('/:assetId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { assetId } = req.params;
  const userId = req.user.id;

  const asset = await assetManagementService.updateAsset(
    agencyDatabase,
    agencyId,
    assetId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: asset,
    message: 'Asset updated successfully',
  });
}));

module.exports = router;

