/**
 * Procurement Management Routes
 * Handles all procurement operations
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const procurementService = require('../services/procurementService');
const { cacheMiddleware } = require('../services/cacheService');

/**
 * GET /api/procurement/requisitions
 * Get all purchase requisitions
 */
router.get('/requisitions', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const filters = {
    status: req.query.status,
  };

  const requisitions = await procurementService.getPurchaseRequisitions(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: requisitions,
  });
}));

/**
 * POST /api/procurement/requisitions
 * Create a new purchase requisition
 */
router.post('/requisitions', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const requisition = await procurementService.createPurchaseRequisition(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: requisition,
    message: 'Purchase requisition created successfully',
  });
}));

/**
 * GET /api/procurement/purchase-orders
 * Get all purchase orders
 */
router.get('/purchase-orders', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const filters = {
    status: req.query.status,
    supplier_id: req.query.supplier_id,
  };

  const purchaseOrders = await procurementService.getPurchaseOrders(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: purchaseOrders,
  });
}));

/**
 * POST /api/procurement/purchase-orders
 * Create a new purchase order
 */
router.post('/purchase-orders', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const purchaseOrder = await procurementService.createPurchaseOrder(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: purchaseOrder,
    message: 'Purchase order created successfully',
  });
}));

/**
 * GET /api/procurement/goods-receipts
 * Get all goods receipts
 */
router.get('/goods-receipts', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const filters = {
    status: req.query.status,
  };

  const goodsReceipts = await procurementService.getGoodsReceipts(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: goodsReceipts,
  });
}));

/**
 * POST /api/procurement/goods-receipts
 * Create a new goods receipt (GRN)
 */
router.post('/goods-receipts', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const goodsReceipt = await procurementService.createGoodsReceipt(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: goodsReceipt,
    message: 'Goods receipt created successfully',
  });
}));

/**
 * GET /api/procurement/suppliers
 * Get all suppliers/vendors
 */
router.get('/suppliers', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const filters = {
    is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
    search: req.query.search,
  };

  const suppliers = await procurementService.getSuppliers(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: suppliers,
  });
}));

/**
 * POST /api/procurement/suppliers
 * Create a new supplier/vendor
 */
router.post('/suppliers', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const supplier = await procurementService.createSupplier(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: supplier,
    message: 'Supplier created successfully',
  });
}));

/**
 * GET /api/procurement/suppliers/:supplierId
 * Get a single supplier by ID
 */
router.get('/suppliers/:supplierId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { supplierId } = req.params;

  const supplier = await procurementService.getSupplierById(agencyDatabase, agencyId, supplierId);

  if (!supplier) {
    return res.status(404).json({
      success: false,
      error: 'Supplier not found',
      message: 'Supplier not found',
    });
  }

  res.json({
    success: true,
    data: supplier,
  });
}));

/**
 * PUT /api/procurement/suppliers/:supplierId
 * Update a supplier
 */
router.put('/suppliers/:supplierId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { supplierId } = req.params;
  const userId = req.user.id;

  const supplier = await procurementService.updateSupplier(
    agencyDatabase,
    agencyId,
    supplierId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: supplier,
    message: 'Supplier updated successfully',
  });
}));

/**
 * GET /api/procurement/purchase-orders/:poId
 * Get a single purchase order by ID
 */
router.get('/purchase-orders/:poId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { poId } = req.params;

  const purchaseOrder = await procurementService.getPurchaseOrderById(agencyDatabase, agencyId, poId);

  if (!purchaseOrder) {
    return res.status(404).json({
      success: false,
      error: 'Purchase order not found',
      message: 'Purchase order not found',
    });
  }

  res.json({
    success: true,
    data: purchaseOrder,
  });
}));

/**
 * PUT /api/procurement/purchase-orders/:poId
 * Update a purchase order
 */
router.put('/purchase-orders/:poId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { poId } = req.params;
  const userId = req.user.id;

  const purchaseOrder = await procurementService.updatePurchaseOrder(
    agencyDatabase,
    agencyId,
    poId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: purchaseOrder,
    message: 'Purchase order updated successfully',
  });
}));

/**
 * GET /api/procurement/rfq
 * Get all RFQ/RFP records
 */
router.get('/rfq', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const filters = {
    status: req.query.status,
    type: req.query.type, // RFQ or RFP
  };

  const rfqs = await procurementService.getRfqRfp(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: rfqs,
  });
}));

/**
 * POST /api/procurement/rfq
 * Create a new RFQ/RFP
 */
router.post('/rfq', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const rfq = await procurementService.createRfqRfp(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: rfq,
    message: 'RFQ/RFP created successfully',
  });
}));

/**
 * GET /api/procurement/vendor-contracts
 * Get all vendor contracts
 */
router.get('/vendor-contracts', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const filters = {
    supplier_id: req.query.supplier_id,
    status: req.query.status,
    contract_type: req.query.contract_type,
  };

  const contracts = await procurementService.getVendorContracts(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: contracts,
  });
}));

/**
 * GET /api/procurement/vendor-contracts/:contractId
 * Get vendor contract by ID
 */
router.get('/vendor-contracts/:contractId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { contractId } = req.params;

  const contract = await procurementService.getVendorContractById(agencyDatabase, agencyId, contractId);

  res.json({
    success: true,
    data: contract,
  });
}));

/**
 * POST /api/procurement/vendor-contracts
 * Create new vendor contract
 */
router.post('/vendor-contracts', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  if (!req.body.supplier_id || !req.body.title || !req.body.start_date) {
    return res.status(400).json({
      success: false,
      error: 'Supplier ID, title, and start date are required',
      message: 'Supplier ID, title, and start date are required',
    });
  }

  const contract = await procurementService.createVendorContract(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.status(201).json({
    success: true,
    data: contract,
    message: 'Vendor contract created successfully',
  });
}));

/**
 * PUT /api/procurement/vendor-contracts/:contractId
 * Update vendor contract
 */
router.put('/vendor-contracts/:contractId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { contractId } = req.params;

  const contract = await procurementService.updateVendorContract(
    agencyDatabase,
    agencyId,
    contractId,
    req.body
  );

  res.json({
    success: true,
    data: contract,
    message: 'Vendor contract updated successfully',
  });
}));

/**
 * DELETE /api/procurement/vendor-contracts/:contractId
 * Delete vendor contract
 */
router.delete('/vendor-contracts/:contractId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { contractId } = req.params;

  await procurementService.deleteVendorContract(agencyDatabase, agencyId, contractId);

  res.json({
    success: true,
    message: 'Vendor contract deleted successfully',
  });
}));

/**
 * GET /api/procurement/vendor-performance
 * Get all vendor performance records
 */
router.get('/vendor-performance', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const filters = {
    supplier_id: req.query.supplier_id,
    period_start: req.query.period_start,
    period_end: req.query.period_end,
  };

  const performance = await procurementService.getVendorPerformance(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: performance,
  });
}));

/**
 * GET /api/procurement/vendor-performance/:performanceId
 * Get vendor performance by ID
 */
router.get('/vendor-performance/:performanceId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { performanceId } = req.params;

  const performance = await procurementService.getVendorPerformanceById(agencyDatabase, agencyId, performanceId);

  res.json({
    success: true,
    data: performance,
  });
}));

/**
 * POST /api/procurement/vendor-performance
 * Create new vendor performance record
 */
router.post('/vendor-performance', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  if (!req.body.supplier_id || !req.body.period_start || !req.body.period_end) {
    return res.status(400).json({
      success: false,
      error: 'Supplier ID, period start, and period end are required',
      message: 'Supplier ID, period start, and period end are required',
    });
  }

  const performance = await procurementService.createVendorPerformance(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.status(201).json({
    success: true,
    data: performance,
    message: 'Vendor performance record created successfully',
  });
}));

/**
 * PUT /api/procurement/vendor-performance/:performanceId
 * Update vendor performance record
 */
router.put('/vendor-performance/:performanceId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { performanceId } = req.params;

  const performance = await procurementService.updateVendorPerformance(
    agencyDatabase,
    agencyId,
    performanceId,
    req.body
  );

  res.json({
    success: true,
    data: performance,
    message: 'Vendor performance record updated successfully',
  });
}));

/**
 * DELETE /api/procurement/vendor-performance/:performanceId
 * Delete vendor performance record
 */
router.delete('/vendor-performance/:performanceId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { performanceId } = req.params;

  await procurementService.deleteVendorPerformance(agencyDatabase, agencyId, performanceId);

  res.json({
    success: true,
    message: 'Vendor performance record deleted successfully',
  });
}));

/**
 * GET /api/procurement/reports
 * Get procurement reports and analytics
 */
router.get('/reports', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const filters = {
    date_from: req.query.date_from,
    date_to: req.query.date_to,
  };

  const reports = await procurementService.getProcurementReports(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: reports,
  });
}));

module.exports = router;
