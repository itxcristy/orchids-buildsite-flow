/**
 * Inventory Management Routes
 * Handles all inventory operations
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const inventoryService = require('../services/inventoryService');
const { cacheMiddleware } = require('../services/cacheService');

/**
 * GET /api/inventory/warehouses
 * Get all warehouses for the agency
 */
router.get('/warehouses', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const warehouses = await inventoryService.getWarehouses(agencyDatabase, agencyId);

  res.json({
    success: true,
    data: warehouses,
  });
}));

/**
 * POST /api/inventory/warehouses
 * Create a new warehouse
 */
router.post('/warehouses', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const warehouse = await inventoryService.createWarehouse(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: warehouse,
    message: 'Warehouse created successfully',
  });
}));

/**
 * GET /api/inventory/products
 * Get all products with optional filters
 */
router.get('/products', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const filters = {
    category_id: req.query.category_id,
    is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
    search: req.query.search,
    limit: req.query.limit ? parseInt(req.query.limit) : undefined,
  };

  const products = await inventoryService.getProducts(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: products,
  });
}));

/**
 * POST /api/inventory/products
 * Create a new product
 */
router.post('/products', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const product = await inventoryService.createProduct(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: product,
    message: 'Product created successfully',
  });
}));

/**
 * GET /api/inventory/products/:productId/levels
 * Get inventory levels for a product across all warehouses
 */
router.get('/products/:productId/levels', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { productId } = req.params;
  const variantId = req.query.variant_id || null;

  const levels = await inventoryService.getInventoryLevels(agencyDatabase, agencyId, productId, variantId);

  res.json({
    success: true,
    data: levels,
  });
}));

/**
 * POST /api/inventory/transactions
 * Create an inventory transaction (stock movement)
 */
router.post('/transactions', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const transaction = await inventoryService.createInventoryTransaction(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: transaction,
    message: 'Inventory transaction created successfully',
  });
}));

/**
 * GET /api/inventory/alerts/low-stock
 * Get low stock alerts
 */
router.get('/alerts/low-stock', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const alerts = await inventoryService.getLowStockAlerts(agencyDatabase, agencyId);

  res.json({
    success: true,
    data: alerts,
  });
}));

/**
 * GET /api/inventory/products/:productId
 * Get a single product by ID
 */
router.get('/products/:productId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { productId } = req.params;

  const product = await inventoryService.getProductById(agencyDatabase, agencyId, productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found',
      message: 'Product not found',
    });
  }

  res.json({
    success: true,
    data: product,
  });
}));

/**
 * PUT /api/inventory/products/:productId
 * Update a product
 */
router.put('/products/:productId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { productId } = req.params;
  const userId = req.user.id;

  const product = await inventoryService.updateProduct(
    agencyDatabase,
    agencyId,
    productId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: product,
    message: 'Product updated successfully',
  });
}));

/**
 * DELETE /api/inventory/products/:productId
 * Delete a product (soft delete by setting is_active = false)
 */
router.delete('/products/:productId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { productId } = req.params;
  const userId = req.user.id;

  await inventoryService.deleteProduct(agencyDatabase, agencyId, productId, userId);

  res.json({
    success: true,
    message: 'Product deleted successfully',
  });
}));

/**
 * PUT /api/inventory/warehouses/:warehouseId
 * Update a warehouse
 */
router.put('/warehouses/:warehouseId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { warehouseId } = req.params;
  const userId = req.user.id;

  const warehouse = await inventoryService.updateWarehouse(
    agencyDatabase,
    agencyId,
    warehouseId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: warehouse,
    message: 'Warehouse updated successfully',
  });
}));

/**
 * DELETE /api/inventory/warehouses/:warehouseId
 * Delete a warehouse (soft delete)
 */
router.delete('/warehouses/:warehouseId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { warehouseId } = req.params;
  const userId = req.user.id;

  await inventoryService.deleteWarehouse(agencyDatabase, agencyId, warehouseId, userId);

  res.json({
    success: true,
    message: 'Warehouse deleted successfully',
  });
}));

/**
 * GET /api/inventory/categories
 * Get all product categories
 */
router.get('/categories', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const categories = await inventoryService.getProductCategories(agencyDatabase, agencyId);

  res.json({
    success: true,
    data: categories,
  });
}));

/**
 * POST /api/inventory/categories
 * Create a product category
 */
router.post('/categories', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const category = await inventoryService.createProductCategory(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: category,
    message: 'Product category created successfully',
  });
}));

/**
 * POST /api/inventory/transfers
 * Create an inter-warehouse transfer
 */
router.post('/transfers', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const transfer = await inventoryService.createTransfer(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: transfer,
    message: 'Inventory transfer created successfully',
  });
}));

/**
 * POST /api/inventory/adjustments
 * Create an inventory adjustment
 */
router.post('/adjustments', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const adjustment = await inventoryService.createAdjustment(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: adjustment,
    message: 'Inventory adjustment created successfully',
  });
}));

/**
 * GET /api/inventory/transactions
 * Get inventory transactions with filters
 */
router.get('/transactions', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const filters = {
    product_id: req.query.product_id,
    warehouse_id: req.query.warehouse_id,
    transaction_type: req.query.transaction_type,
    start_date: req.query.start_date,
    end_date: req.query.end_date,
    limit: req.query.limit ? parseInt(req.query.limit) : 100,
  };

  const transactions = await inventoryService.getInventoryTransactions(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: transactions,
  });
}));

/**
 * POST /api/inventory/products/:productId/generate-code
 * Generate barcode or QR code for a product
 */
/**
 * GET /api/inventory/boms
 * Get all BOMs
 */
router.get('/boms', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const boms = await inventoryService.getBoms(agencyDatabase, agencyId, req.query);

  res.json({
    success: true,
    data: boms,
  });
}));

/**
 * GET /api/inventory/boms/:bomId
 * Get a single BOM by ID
 */
router.get('/boms/:bomId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { bomId } = req.params;

  const bom = await inventoryService.getBomById(agencyDatabase, agencyId, bomId);

  if (!bom) {
    return res.status(404).json({
      success: false,
      message: 'BOM not found',
    });
  }

  res.json({
    success: true,
    data: bom,
  });
}));

/**
 * POST /api/inventory/boms
 * Create a new BOM
 */
router.post('/boms', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const bom = await inventoryService.createBom(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: bom,
    message: 'BOM created successfully',
  });
}));

/**
 * PUT /api/inventory/boms/:bomId
 * Update a BOM
 */
router.put('/boms/:bomId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { bomId } = req.params;
  const userId = req.user.id;

  const bom = await inventoryService.updateBom(
    agencyDatabase,
    agencyId,
    bomId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: bom,
    message: 'BOM updated successfully',
  });
}));

/**
 * DELETE /api/inventory/boms/:bomId
 * Delete a BOM
 */
router.delete('/boms/:bomId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { bomId } = req.params;

  await inventoryService.deleteBom(agencyDatabase, agencyId, bomId);

  res.json({
    success: true,
    message: 'BOM deleted successfully',
  });
}));

router.post('/products/:productId/generate-code', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { productId } = req.params;
  const { codeType } = req.body; // 'barcode' or 'qr'

  const code = await inventoryService.generateProductCode(agencyDatabase, productId, codeType || 'barcode');

  res.json({
    success: true,
    data: { code, codeType: codeType || 'barcode' },
    message: 'Product code generated successfully',
  });
}));

/**
 * GET /api/inventory/serial-numbers
 * Get all serial numbers (with optional filters)
 */
router.get('/serial-numbers', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const filters = {
    product_id: req.query.product_id,
    warehouse_id: req.query.warehouse_id,
    status: req.query.status,
    search: req.query.search,
  };

  const serialNumbers = await inventoryService.getSerialNumbers(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: serialNumbers,
  });
}));

/**
 * POST /api/inventory/serial-numbers
 * Create a serial number
 */
router.post('/serial-numbers', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const serialNumber = await inventoryService.createSerialNumber(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: serialNumber,
    message: 'Serial number created successfully',
  });
}));

/**
 * PUT /api/inventory/serial-numbers/:serialId
 * Update a serial number
 */
router.put('/serial-numbers/:serialId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { serialId } = req.params;
  const userId = req.user.id;

  const serialNumber = await inventoryService.updateSerialNumber(
    agencyDatabase,
    agencyId,
    serialId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: serialNumber,
    message: 'Serial number updated successfully',
  });
}));

/**
 * DELETE /api/inventory/serial-numbers/:serialId
 * Delete a serial number
 */
router.delete('/serial-numbers/:serialId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { serialId } = req.params;

  await inventoryService.deleteSerialNumber(agencyDatabase, agencyId, serialId);

  res.json({
    success: true,
    message: 'Serial number deleted successfully',
  });
}));

/**
 * GET /api/inventory/batches
 * Get all batches (with optional filters)
 */
router.get('/batches', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const filters = {
    product_id: req.query.product_id,
    warehouse_id: req.query.warehouse_id,
    status: req.query.status,
    expiring_soon: req.query.expiring_soon,
    search: req.query.search,
  };

  const batches = await inventoryService.getBatches(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: batches,
  });
}));

/**
 * POST /api/inventory/batches
 * Create a batch
 */
router.post('/batches', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const batch = await inventoryService.createBatch(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: batch,
    message: 'Batch created successfully',
  });
}));

/**
 * PUT /api/inventory/batches/:batchId
 * Update a batch
 */
router.put('/batches/:batchId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { batchId } = req.params;
  const userId = req.user.id;

  const batch = await inventoryService.updateBatch(
    agencyDatabase,
    agencyId,
    batchId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: batch,
    message: 'Batch updated successfully',
  });
}));

/**
 * DELETE /api/inventory/batches/:batchId
 * Delete a batch
 */
router.delete('/batches/:batchId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { batchId } = req.params;

  await inventoryService.deleteBatch(agencyDatabase, agencyId, batchId);

  res.json({
    success: true,
    message: 'Batch deleted successfully',
  });
}));

/**
 * GET /api/inventory/reports
 * Get inventory reports summary
 */
router.get('/reports', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const filters = {
    date_from: req.query.date_from,
    date_to: req.query.date_to,
  };

  const reports = await inventoryService.getInventoryReports(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: reports,
  });
}));

/**
 * GET /api/inventory/reports/stock-value
 * Get stock value report
 */
router.get('/reports/stock-value', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const filters = {
    warehouse_id: req.query.warehouse_id,
    category_id: req.query.category_id,
    low_stock_only: req.query.low_stock_only === 'true',
  };

  const report = await inventoryService.getStockValueReport(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: report,
  });
}));

/**
 * GET /api/inventory/reports/movement
 * Get movement report
 */
router.get('/reports/movement', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const filters = {
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    product_id: req.query.product_id,
    warehouse_id: req.query.warehouse_id,
    transaction_type: req.query.transaction_type,
  };

  const report = await inventoryService.getMovementReport(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: report,
  });
}));

/**
 * GET /api/inventory/reports/warehouse-utilization
 * Get warehouse utilization report
 */
router.get('/reports/warehouse-utilization', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const report = await inventoryService.getWarehouseUtilizationReport(agencyDatabase, agencyId);

  res.json({
    success: true,
    data: report,
  });
}));

module.exports = router;
