/**
 * Inventory Management Service
 * Handles all inventory operations: products, warehouses, stock management
 */

const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');
const crypto = require('crypto');
const { ensureInventorySchema } = require('../utils/schema/inventorySchema');

// Generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Get agency database connection
 */
async function getAgencyConnection(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const client = await agencyPool.connect();
  // Attach pool to client for cleanup
  client.pool = agencyPool;
  return client;
}

/**
 * Create a new warehouse
 */
async function createWarehouse(agencyDatabase, warehouseData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.warehouses (
        id, agency_id, code, name, address, city, state, postal_code, country,
        contact_person, phone, email, is_active, is_primary, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        warehouseData.agency_id,
        warehouseData.code,
        warehouseData.name,
        warehouseData.address || null,
        warehouseData.city || null,
        warehouseData.state || null,
        warehouseData.postal_code || null,
        warehouseData.country || 'India',
        warehouseData.contact_person || null,
        warehouseData.phone || null,
        warehouseData.email || null,
        warehouseData.is_active !== false,
        warehouseData.is_primary || false,
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get all warehouses for an agency
 */
async function getWarehouses(agencyDatabase, agencyId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'SELECT * FROM public.warehouses WHERE agency_id = $1 ORDER BY is_primary DESC, name ASC',
      [agencyId]
    );
    return result.rows;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Create a new product
 */
async function createProduct(agencyDatabase, productData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.products (
        id, agency_id, sku, name, description, category_id, brand, unit_of_measure,
        barcode, qr_code, weight, dimensions, image_url, is_active, is_trackable,
        track_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        productData.agency_id,
        productData.sku,
        productData.name,
        productData.description || null,
        productData.category_id || null,
        productData.brand || null,
        productData.unit_of_measure || 'pcs',
        productData.barcode || null,
        productData.qr_code || null,
        productData.weight || null,
        productData.dimensions || null,
        productData.image_url || null,
        productData.is_active !== false,
        productData.is_trackable || false,
        productData.track_by || 'none',
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get all products for an agency
 */
async function getProducts(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = 'SELECT * FROM public.products WHERE agency_id = $1';
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.category_id) {
      query += ` AND category_id = $${paramIndex}`;
      params.push(filters.category_id);
      paramIndex++;
    }

    if (filters.is_active !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(filters.is_active);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex} OR barcode ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get inventory levels for a product across all warehouses
 */
async function getInventoryLevels(agencyDatabase, agencyId, productId, variantId = null) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        i.*,
        p.name as product_name,
        p.sku as product_sku,
        w.name as warehouse_name,
        w.code as warehouse_code
      FROM public.inventory i
      JOIN public.products p ON i.product_id = p.id
      JOIN public.warehouses w ON i.warehouse_id = w.id
      WHERE i.agency_id = $1 AND i.product_id = $2
    `;
    const params = [agencyId, productId];

    if (variantId) {
      query += ' AND i.variant_id = $3';
      params.push(variantId);
    } else {
      query += ' AND i.variant_id IS NULL';
    }

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Create inventory transaction (stock movement)
 */
async function createInventoryTransaction(agencyDatabase, transactionData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    // Get or create inventory record
    let inventoryResult = await client.query(
      `SELECT * FROM public.inventory 
       WHERE product_id = $1 
       AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE($2, '00000000-0000-0000-0000-000000000000'::uuid)
       AND warehouse_id = $3`,
      [transactionData.product_id, transactionData.variant_id || null, transactionData.warehouse_id]
    );

    let inventoryId;
    if (inventoryResult.rows.length === 0) {
      // Create inventory record
      const newInventory = await client.query(
        `INSERT INTO public.inventory (
          id, agency_id, product_id, variant_id, warehouse_id, quantity, 
          reserved_quantity, reorder_point, reorder_quantity, valuation_method,
          average_cost, last_cost, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 0, 0, $6, $7, $8, 0, 0, NOW(), NOW())
        RETURNING id`,
        [
          generateUUID(),
          transactionData.agency_id,
          transactionData.product_id,
          transactionData.variant_id || null,
          transactionData.warehouse_id,
          transactionData.reorder_point || 0,
          transactionData.reorder_quantity || 0,
          transactionData.valuation_method || 'weighted_average',
        ]
      );
      inventoryId = newInventory.rows[0].id;
    } else {
      inventoryId = inventoryResult.rows[0].id;
    }

    // Calculate new quantity based on transaction type
    const currentInventory = inventoryResult.rows[0] || { quantity: 0, reserved_quantity: 0 };
    let newQuantity = parseFloat(currentInventory.quantity) || 0;
    
    if (transactionData.transaction_type === 'IN' || transactionData.transaction_type === 'RETURN') {
      newQuantity += parseFloat(transactionData.quantity);
    } else if (transactionData.transaction_type === 'OUT') {
      newQuantity -= parseFloat(transactionData.quantity);
      if (newQuantity < 0) {
        throw new Error('Insufficient stock');
      }
    } else if (transactionData.transaction_type === 'ADJUSTMENT') {
      newQuantity = parseFloat(transactionData.quantity);
    }

    // Update inventory quantity
    await client.query(
      `UPDATE public.inventory 
       SET quantity = $1, 
           last_movement_date = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [newQuantity, inventoryId]
    );

    // Update average cost for weighted average method
    if (transactionData.unit_cost && transactionData.transaction_type === 'IN') {
      const currentCost = parseFloat(currentInventory.average_cost) || 0;
      const currentQty = parseFloat(currentInventory.quantity) || 0;
      const newCost = parseFloat(transactionData.unit_cost);
      const newQty = parseFloat(transactionData.quantity);

      if (currentQty + newQty > 0) {
        const weightedAverage = ((currentCost * currentQty) + (newCost * newQty)) / (currentQty + newQty);
        await client.query(
          'UPDATE public.inventory SET average_cost = $1, last_cost = $2 WHERE id = $3',
          [weightedAverage, newCost, inventoryId]
        );
      }
    }

    // Create transaction record
    const transactionResult = await client.query(
      `INSERT INTO public.inventory_transactions (
        id, agency_id, inventory_id, transaction_type, quantity, unit_cost,
        reference_type, reference_id, from_warehouse_id, to_warehouse_id,
        serial_numbers, batch_number, expiry_date, notes, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING *`,
      [
        generateUUID(),
        transactionData.agency_id,
        inventoryId,
        transactionData.transaction_type,
        transactionData.quantity,
        transactionData.unit_cost || null,
        transactionData.reference_type || null,
        transactionData.reference_id || null,
        transactionData.from_warehouse_id || null,
        transactionData.to_warehouse_id || null,
        transactionData.serial_numbers || null,
        transactionData.batch_number || null,
        transactionData.expiry_date || null,
        transactionData.notes || null,
        userId,
      ]
    );

    await client.query('COMMIT');
    return transactionResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get low stock alerts (products below reorder point)
 */
async function getLowStockAlerts(agencyDatabase, agencyId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Ensure inventory schema exists before querying
    await ensureInventorySchema(client);
    
    const result = await client.query(
      `SELECT 
        i.*,
        p.name as product_name,
        p.sku as product_sku,
        w.name as warehouse_name,
        (i.reorder_point - i.available_quantity) as shortage
      FROM public.inventory i
      JOIN public.products p ON i.product_id = p.id
      JOIN public.warehouses w ON i.warehouse_id = w.id
      WHERE i.agency_id = $1 
      AND i.available_quantity <= i.reorder_point
      AND i.reorder_point > 0
      ORDER BY shortage DESC`,
      [agencyId]
    );
    return result.rows;
  } catch (error) {
    // If table doesn't exist yet, return empty array
    if (error.message && error.message.includes('does not exist')) {
      console.warn(`[Inventory] Table not found, returning empty alerts: ${error.message}`);
      return [];
    }
    throw error;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Generate barcode/QR code for product
 */
async function generateProductCode(agencyDatabase, productId, codeType = 'barcode') {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Get product
    const productResult = await client.query(
      'SELECT * FROM public.products WHERE id = $1',
      [productId]
    );

    if (productResult.rows.length === 0) {
      throw new Error('Product not found');
    }

    const product = productResult.rows[0];
    
    // Generate code (in production, use a barcode library)
    const code = product.barcode || `PROD-${product.sku}-${Date.now()}`;
    
    // Update product with code
    if (codeType === 'barcode') {
      await client.query(
        'UPDATE public.products SET barcode = $1, updated_at = NOW() WHERE id = $2',
        [code, productId]
      );
    } else {
      await client.query(
        'UPDATE public.products SET qr_code = $1, updated_at = NOW() WHERE id = $2',
        [code, productId]
      );
    }

    return code;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get a single product by ID
 */
async function getProductById(agencyDatabase, agencyId, productId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'SELECT * FROM public.products WHERE id = $1 AND agency_id = $2',
      [productId, agencyId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Update a product
 */
async function updateProduct(agencyDatabase, agencyId, productId, productData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['name', 'description', 'category_id', 'brand', 'unit_of_measure', 
                          'barcode', 'qr_code', 'weight', 'dimensions', 'image_url', 
                          'is_active', 'is_trackable', 'track_by'];
    
    for (const field of allowedFields) {
      if (productData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(productData[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(productId, agencyId);

    const query = `
      UPDATE public.products 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Product not found');
    }

    return result.rows[0];
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Delete a product (soft delete)
 */
async function deleteProduct(agencyDatabase, agencyId, productId, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `UPDATE public.products 
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND agency_id = $2
       RETURNING id`,
      [productId, agencyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Product not found');
    }

    return true;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Update a warehouse
 */
async function updateWarehouse(agencyDatabase, agencyId, warehouseId, warehouseData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['code', 'name', 'address', 'city', 'state', 'postal_code', 
                          'country', 'contact_person', 'phone', 'email', 'is_active', 'is_primary'];
    
    for (const field of allowedFields) {
      if (warehouseData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(warehouseData[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(warehouseId, agencyId);

    const query = `
      UPDATE public.warehouses 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Warehouse not found');
    }

    return result.rows[0];
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Delete a warehouse (soft delete)
 */
async function deleteWarehouse(agencyDatabase, agencyId, warehouseId, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `UPDATE public.warehouses 
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND agency_id = $2
       RETURNING id`,
      [warehouseId, agencyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Warehouse not found');
    }

    return true;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get all product categories
 */
async function getProductCategories(agencyDatabase, agencyId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'SELECT * FROM public.product_categories WHERE agency_id = $1 ORDER BY name ASC',
      [agencyId]
    );
    return result.rows;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Create a product category
 */
async function createProductCategory(agencyDatabase, categoryData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.product_categories (
        id, agency_id, parent_id, name, description, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        categoryData.agency_id,
        categoryData.parent_id || null,
        categoryData.name,
        categoryData.description || null,
        categoryData.is_active !== false,
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Create an inter-warehouse transfer
 */
async function createTransfer(agencyDatabase, transferData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    // Create OUT transaction from source warehouse
    const outTransaction = await createInventoryTransaction(
      agencyDatabase,
      {
        agency_id: transferData.agency_id,
        product_id: transferData.product_id,
        variant_id: transferData.variant_id,
        warehouse_id: transferData.from_warehouse_id,
        transaction_type: 'OUT',
        quantity: -Math.abs(transferData.quantity),
        reference_type: 'TRANSFER',
        to_warehouse_id: transferData.to_warehouse_id,
        notes: transferData.notes,
      },
      userId
    );

    // Create IN transaction to destination warehouse
    const inTransaction = await createInventoryTransaction(
      agencyDatabase,
      {
        agency_id: transferData.agency_id,
        product_id: transferData.product_id,
        variant_id: transferData.variant_id,
        warehouse_id: transferData.to_warehouse_id,
        transaction_type: 'IN',
        quantity: Math.abs(transferData.quantity),
        reference_type: 'TRANSFER',
        reference_id: outTransaction.id,
        from_warehouse_id: transferData.from_warehouse_id,
        notes: transferData.notes,
      },
      userId
    );

    await client.query('COMMIT');
    return { outTransaction, inTransaction };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Create an inventory adjustment
 */
async function createAdjustment(agencyDatabase, adjustmentData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const adjustment = await createInventoryTransaction(
      agencyDatabase,
      {
        agency_id: adjustmentData.agency_id,
        product_id: adjustmentData.product_id,
        variant_id: adjustmentData.variant_id,
        warehouse_id: adjustmentData.warehouse_id,
        transaction_type: 'ADJUSTMENT',
        quantity: adjustmentData.quantity,
        unit_cost: adjustmentData.unit_cost,
        reference_type: 'ADJUSTMENT',
        notes: adjustmentData.reason || adjustmentData.notes,
      },
      userId
    );

    return adjustment;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get inventory transactions with filters
 */
async function getInventoryTransactions(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        it.*,
        p.name as product_name,
        p.sku as product_sku,
        w.name as warehouse_name,
        w.code as warehouse_code
      FROM public.inventory_transactions it
      JOIN public.inventory i ON it.inventory_id = i.id
      JOIN public.products p ON i.product_id = p.id
      JOIN public.warehouses w ON i.warehouse_id = w.id
      WHERE it.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.product_id) {
      query += ` AND i.product_id = $${paramIndex}`;
      params.push(filters.product_id);
      paramIndex++;
    }

    if (filters.warehouse_id) {
      query += ` AND i.warehouse_id = $${paramIndex}`;
      params.push(filters.warehouse_id);
      paramIndex++;
    }

    if (filters.transaction_type) {
      query += ` AND it.transaction_type = $${paramIndex}`;
      params.push(filters.transaction_type);
      paramIndex++;
    }

    if (filters.start_date) {
      query += ` AND it.created_at >= $${paramIndex}`;
      params.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      query += ` AND it.created_at <= $${paramIndex}`;
      params.push(filters.end_date);
      paramIndex++;
    }

    query += ' ORDER BY it.created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
    }

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get all BOMs for a product
 */
async function getBoms(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        b.*,
        p.name as product_name,
        p.sku as product_sku,
        COUNT(bi.id) as item_count
      FROM public.bom b
      JOIN public.products p ON b.product_id = p.id
      LEFT JOIN public.bom_items bi ON b.id = bi.bom_id
      WHERE b.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.product_id) {
      query += ` AND b.product_id = $${paramIndex}`;
      params.push(filters.product_id);
      paramIndex++;
    }

    if (filters.is_active !== undefined) {
      query += ` AND b.is_active = $${paramIndex}`;
      params.push(filters.is_active);
      paramIndex++;
    }

    query += ' GROUP BY b.id, p.name, p.sku ORDER BY b.created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
    }

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get BOM by ID with items
 */
async function getBomById(agencyDatabase, agencyId, bomId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Get BOM header
    const bomResult = await client.query(
      `SELECT 
        b.*,
        p.name as product_name,
        p.sku as product_sku
      FROM public.bom b
      JOIN public.products p ON b.product_id = p.id
      WHERE b.id = $1 AND b.agency_id = $2`,
      [bomId, agencyId]
    );

    if (bomResult.rows.length === 0) {
      return null;
    }

    const bom = bomResult.rows[0];

    // Get BOM items
    const itemsResult = await client.query(
      `SELECT 
        bi.*,
        p.name as component_name,
        p.sku as component_sku,
        p.unit_of_measure as component_uom
      FROM public.bom_items bi
      JOIN public.products p ON bi.component_product_id = p.id
      WHERE bi.bom_id = $1
      ORDER BY bi.sequence, bi.created_at`,
      [bomId]
    );

    bom.items = itemsResult.rows;
    return bom;
  } catch (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return null;
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create a new BOM
 */
async function createBom(agencyDatabase, bomData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    // Create BOM header
    const bomResult = await client.query(
      `INSERT INTO public.bom (
        id, agency_id, product_id, name, version, is_active, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        bomData.agency_id,
        bomData.product_id,
        bomData.name,
        bomData.version || null,
        bomData.is_active !== false,
        bomData.notes || null,
      ]
    );

    const bom = bomResult.rows[0];

    // Insert BOM items
    if (bomData.items && Array.isArray(bomData.items) && bomData.items.length > 0) {
      for (const item of bomData.items) {
        await client.query(
          `INSERT INTO public.bom_items (
            id, bom_id, component_product_id, quantity, unit_of_measure, sequence, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            generateUUID(),
            bom.id,
            item.component_product_id,
            item.quantity,
            item.unit_of_measure || 'pcs',
            item.sequence || 0,
            item.notes || null,
          ]
        );
      }
    }

    await client.query('COMMIT');
    return await getBomById(agencyDatabase, bomData.agency_id, bom.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update a BOM
 */
async function updateBom(agencyDatabase, agencyId, bomId, bomData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['name', 'version', 'is_active', 'notes'];
    
    for (const field of allowedFields) {
      if (bomData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(bomData[field]);
        paramIndex++;
      }
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(bomId, agencyId);

      await client.query(
        `UPDATE public.bom 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}`,
        values
      );
    }

    // Update items if provided
    if (bomData.items !== undefined) {
      // Delete existing items
      await client.query('DELETE FROM public.bom_items WHERE bom_id = $1', [bomId]);

      // Insert new items
      if (Array.isArray(bomData.items) && bomData.items.length > 0) {
        for (const item of bomData.items) {
          await client.query(
            `INSERT INTO public.bom_items (
              id, bom_id, component_product_id, quantity, unit_of_measure, sequence, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              generateUUID(),
              bomId,
              item.component_product_id,
              item.quantity,
              item.unit_of_measure || 'pcs',
              item.sequence || 0,
              item.notes || null,
            ]
          );
        }
      }
    }

    await client.query('COMMIT');
    return await getBomById(agencyDatabase, agencyId, bomId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Delete a BOM
 */
async function deleteBom(agencyDatabase, agencyId, bomId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'DELETE FROM public.bom WHERE id = $1 AND agency_id = $2 RETURNING id',
      [bomId, agencyId]
    );
    return result.rows.length > 0;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get all BOM items for a specific BOM
 */
async function getBomItems(agencyDatabase, agencyId, bomId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // First verify the BOM exists and belongs to the agency
    const bomCheck = await client.query(
      'SELECT id FROM public.bom WHERE id = $1 AND agency_id = $2',
      [bomId, agencyId]
    );
    
    if (bomCheck.rows.length === 0) {
      throw new Error('BOM not found');
    }

    const result = await client.query(
      `SELECT 
        bi.*,
        p.name as component_product_name,
        p.sku as component_product_sku,
        p.unit_of_measure as component_unit_of_measure
      FROM public.bom_items bi
      LEFT JOIN public.products p ON bi.component_product_id = p.id
      WHERE bi.bom_id = $1
      ORDER BY bi.sequence ASC, bi.created_at ASC`,
      [bomId]
    );
    return result.rows;
  } catch (error) {
    console.error('[Inventory Service] Error fetching BOM items:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create a new BOM item
 */
async function createBomItem(agencyDatabase, bomId, itemData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Verify BOM exists
    const bomCheck = await client.query(
      'SELECT agency_id FROM public.bom WHERE id = $1',
      [bomId]
    );
    
    if (bomCheck.rows.length === 0) {
      throw new Error('BOM not found');
    }

    const result = await client.query(
      `INSERT INTO public.bom_items (
        id, bom_id, component_product_id, quantity, unit_of_measure, sequence, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        generateUUID(),
        bomId,
        itemData.component_product_id,
        itemData.quantity,
        itemData.unit_of_measure || 'pcs',
        itemData.sequence || 0,
        itemData.notes || null,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[Inventory Service] Error creating BOM item:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update a BOM item
 */
async function updateBomItem(agencyDatabase, bomId, itemId, itemData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Verify BOM exists and belongs to agency
    const bomCheck = await client.query(
      'SELECT agency_id FROM public.bom WHERE id = $1',
      [bomId]
    );
    
    if (bomCheck.rows.length === 0) {
      throw new Error('BOM not found');
    }

    // Verify item belongs to the BOM
    const itemCheck = await client.query(
      'SELECT id FROM public.bom_items WHERE id = $1 AND bom_id = $2',
      [itemId, bomId]
    );
    
    if (itemCheck.rows.length === 0) {
      throw new Error('BOM item not found');
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'component_product_id', 'quantity', 'unit_of_measure', 'sequence', 'notes'
    ];
    
    for (const field of allowedFields) {
      if (itemData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(itemData[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(itemId, bomId);

    const query = `
      UPDATE public.bom_items 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND bom_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('BOM item not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Inventory Service] Error updating BOM item:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Delete a BOM item
 */
async function deleteBomItem(agencyDatabase, bomId, itemId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Verify item belongs to the BOM
    const itemCheck = await client.query(
      'SELECT id FROM public.bom_items WHERE id = $1 AND bom_id = $2',
      [itemId, bomId]
    );
    
    if (itemCheck.rows.length === 0) {
      throw new Error('BOM item not found');
    }

    const result = await client.query(
      'DELETE FROM public.bom_items WHERE id = $1 AND bom_id = $2 RETURNING id',
      [itemId, bomId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Inventory Service] Error deleting BOM item:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get all serial numbers (with optional filters)
 */
async function getSerialNumbers(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        s.*,
        p.name as product_name,
        p.sku as product_sku,
        w.name as warehouse_name,
        w.code as warehouse_code
      FROM public.serial_numbers s
      LEFT JOIN public.products p ON s.product_id = p.id
      LEFT JOIN public.warehouses w ON s.warehouse_id = w.id
      WHERE s.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.product_id) {
      query += ` AND s.product_id = $${paramIndex}`;
      params.push(filters.product_id);
      paramIndex++;
    }

    if (filters.warehouse_id) {
      query += ` AND s.warehouse_id = $${paramIndex}`;
      params.push(filters.warehouse_id);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (s.serial_number ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ` ORDER BY s.created_at DESC`;

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Inventory Service] Error fetching serial numbers:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create a serial number
 */
async function createSerialNumber(agencyDatabase, serialData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.serial_numbers (
        id, agency_id, product_id, variant_id, serial_number, warehouse_id,
        inventory_id, status, purchase_order_id, sale_id, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        serialData.agency_id,
        serialData.product_id,
        serialData.variant_id || null,
        serialData.serial_number,
        serialData.warehouse_id || null,
        serialData.inventory_id || null,
        serialData.status || 'available',
        serialData.purchase_order_id || null,
        serialData.sale_id || null,
        serialData.notes || null,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[Inventory Service] Error creating serial number:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update a serial number
 */
async function updateSerialNumber(agencyDatabase, agencyId, serialId, serialData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'warehouse_id', 'inventory_id', 'status', 'purchase_order_id',
      'sale_id', 'notes'
    ];
    
    for (const field of allowedFields) {
      if (serialData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(serialData[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(serialId, agencyId);

    const query = `
      UPDATE public.serial_numbers 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Serial number not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Inventory Service] Error updating serial number:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Delete a serial number
 */
async function deleteSerialNumber(agencyDatabase, agencyId, serialId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'DELETE FROM public.serial_numbers WHERE id = $1 AND agency_id = $2 RETURNING id',
      [serialId, agencyId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Inventory Service] Error deleting serial number:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get all batches (with optional filters)
 */
async function getBatches(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        b.*,
        p.name as product_name,
        p.sku as product_sku,
        w.name as warehouse_name,
        w.code as warehouse_code
      FROM public.batches b
      LEFT JOIN public.products p ON b.product_id = p.id
      LEFT JOIN public.warehouses w ON b.warehouse_id = w.id
      WHERE b.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.product_id) {
      query += ` AND b.product_id = $${paramIndex}`;
      params.push(filters.product_id);
      paramIndex++;
    }

    if (filters.warehouse_id) {
      query += ` AND b.warehouse_id = $${paramIndex}`;
      params.push(filters.warehouse_id);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND b.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.expiring_soon) {
      query += ` AND b.expiry_date IS NOT NULL AND b.expiry_date <= CURRENT_DATE + INTERVAL '${filters.expiring_soon} days' AND b.status = 'active'`;
    }

    if (filters.search) {
      query += ` AND (b.batch_number ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ` ORDER BY b.expiry_date ASC NULLS LAST, b.created_at DESC`;

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Inventory Service] Error fetching batches:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create a batch
 */
async function createBatch(agencyDatabase, batchData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.batches (
        id, agency_id, product_id, variant_id, batch_number, warehouse_id,
        inventory_id, quantity, manufacture_date, expiry_date, purchase_order_id,
        cost_per_unit, status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        batchData.agency_id,
        batchData.product_id,
        batchData.variant_id || null,
        batchData.batch_number,
        batchData.warehouse_id || null,
        batchData.inventory_id || null,
        batchData.quantity || 0,
        batchData.manufacture_date || null,
        batchData.expiry_date || null,
        batchData.purchase_order_id || null,
        batchData.cost_per_unit || null,
        batchData.status || 'active',
        batchData.notes || null,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[Inventory Service] Error creating batch:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update a batch
 */
async function updateBatch(agencyDatabase, agencyId, batchId, batchData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'warehouse_id', 'inventory_id', 'quantity', 'manufacture_date',
      'expiry_date', 'purchase_order_id', 'cost_per_unit', 'status', 'notes'
    ];
    
    for (const field of allowedFields) {
      if (batchData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(batchData[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(batchId, agencyId);

    const query = `
      UPDATE public.batches 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Batch not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Inventory Service] Error updating batch:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Delete a batch
 */
async function deleteBatch(agencyDatabase, agencyId, batchId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'DELETE FROM public.batches WHERE id = $1 AND agency_id = $2 RETURNING id',
      [batchId, agencyId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Inventory Service] Error deleting batch:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get inventory reports summary
 */
async function getInventoryReports(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const dateFrom = filters.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = filters.date_to || new Date().toISOString().split('T')[0];

    // Overall statistics
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT w.id) as total_warehouses,
        COUNT(DISTINCT i.id) as total_inventory_records,
        COALESCE(SUM(i.quantity), 0) as total_quantity,
        COALESCE(SUM(i.quantity * i.average_cost), 0) as total_value,
        COUNT(DISTINCT CASE WHEN i.available_quantity <= i.reorder_point THEN i.id END) as low_stock_items
      FROM public.products p
      LEFT JOIN public.inventory i ON p.id = i.product_id
      LEFT JOIN public.warehouses w ON i.warehouse_id = w.id
      WHERE p.agency_id = $1 AND (w.agency_id = $1 OR w.id IS NULL)
    `;
    const statsResult = await client.query(statsQuery, [agencyId]);

    // Transaction summary
    const transactionQuery = `
      SELECT 
        transaction_type,
        COUNT(*) as count,
        SUM(quantity) as total_quantity,
        SUM(total_cost) as total_cost
      FROM public.inventory_transactions
      WHERE agency_id = $1 
        AND created_at >= $2::date 
        AND created_at <= $3::date
      GROUP BY transaction_type
    `;
    const transactionResult = await client.query(transactionQuery, [agencyId, dateFrom, dateTo]);

    // Top products by value
    const topProductsQuery = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        SUM(i.quantity) as total_quantity,
        SUM(i.quantity * i.average_cost) as total_value,
        SUM(i.available_quantity) as available_quantity
      FROM public.products p
      JOIN public.inventory i ON p.id = i.product_id
      WHERE p.agency_id = $1
      GROUP BY p.id, p.sku, p.name
      ORDER BY total_value DESC
      LIMIT 10
    `;
    const topProductsResult = await client.query(topProductsQuery, [agencyId]);

    // Warehouse utilization
    const warehouseQuery = `
      SELECT 
        w.id,
        w.code,
        w.name,
        COUNT(DISTINCT i.product_id) as product_count,
        SUM(i.quantity) as total_quantity,
        SUM(i.quantity * i.average_cost) as total_value
      FROM public.warehouses w
      LEFT JOIN public.inventory i ON w.id = i.warehouse_id
      WHERE w.agency_id = $1
      GROUP BY w.id, w.code, w.name
      ORDER BY total_value DESC
    `;
    const warehouseResult = await client.query(warehouseQuery, [agencyId]);

    return {
      summary: statsResult.rows[0],
      transactions: transactionResult.rows,
      top_products: topProductsResult.rows,
      warehouses: warehouseResult.rows,
      date_range: { from: dateFrom, to: dateTo },
    };
  } catch (error) {
    console.error('[Inventory Service] Error fetching reports:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return {
        summary: {},
        transactions: [],
        top_products: [],
        warehouses: [],
        date_range: { from: null, to: null },
      };
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get stock value report
 */
async function getStockValueReport(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.category_id,
        pc.name as category_name,
        w.id as warehouse_id,
        w.code as warehouse_code,
        w.name as warehouse_name,
        i.quantity,
        i.available_quantity,
        i.average_cost,
        i.last_cost,
        (i.quantity * i.average_cost) as stock_value,
        i.reorder_point,
        CASE 
          WHEN i.available_quantity <= i.reorder_point THEN true 
          ELSE false 
        END as is_low_stock
      FROM public.inventory i
      JOIN public.products p ON i.product_id = p.id
      LEFT JOIN public.product_categories pc ON p.category_id = pc.id
      JOIN public.warehouses w ON i.warehouse_id = w.id
      WHERE p.agency_id = $1 AND w.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.warehouse_id) {
      query += ` AND w.id = $${paramIndex}`;
      params.push(filters.warehouse_id);
      paramIndex++;
    }

    if (filters.category_id) {
      query += ` AND p.category_id = $${paramIndex}`;
      params.push(filters.category_id);
      paramIndex++;
    }

    if (filters.low_stock_only) {
      query += ` AND i.available_quantity <= i.reorder_point`;
    }

    query += ` ORDER BY stock_value DESC`;

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Inventory Service] Error fetching stock value report:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get movement report (transactions over time)
 */
async function getMovementReport(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const dateFrom = filters.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = filters.date_to || new Date().toISOString().split('T')[0];

    let query = `
      SELECT 
        DATE(it.created_at) as date,
        it.transaction_type,
        COUNT(*) as transaction_count,
        SUM(it.quantity) as total_quantity,
        SUM(it.total_cost) as total_cost,
        p.sku,
        p.name as product_name,
        w.code as warehouse_code,
        w.name as warehouse_name
      FROM public.inventory_transactions it
      JOIN public.inventory i ON it.inventory_id = i.id
      JOIN public.products p ON i.product_id = p.id
      LEFT JOIN public.warehouses w ON it.to_warehouse_id = w.id OR it.from_warehouse_id = w.id
      WHERE it.agency_id = $1 
        AND DATE(it.created_at) >= $2::date 
        AND DATE(it.created_at) <= $3::date
    `;
    const params = [agencyId, dateFrom, dateTo];
    let paramIndex = 4;

    if (filters.product_id) {
      query += ` AND p.id = $${paramIndex}`;
      params.push(filters.product_id);
      paramIndex++;
    }

    if (filters.warehouse_id) {
      query += ` AND (it.to_warehouse_id = $${paramIndex} OR it.from_warehouse_id = $${paramIndex})`;
      params.push(filters.warehouse_id);
      paramIndex++;
    }

    if (filters.transaction_type) {
      query += ` AND it.transaction_type = $${paramIndex}`;
      params.push(filters.transaction_type);
      paramIndex++;
    }

    query += ` GROUP BY DATE(it.created_at), it.transaction_type, p.sku, p.name, w.code, w.name
               ORDER BY date DESC, transaction_type`;

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Inventory Service] Error fetching movement report:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get warehouse utilization report
 */
async function getWarehouseUtilizationReport(agencyDatabase, agencyId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const query = `
      SELECT 
        w.id,
        w.code,
        w.name,
        COUNT(DISTINCT i.product_id) as product_count,
        COUNT(DISTINCT i.id) as inventory_records,
        SUM(i.quantity) as total_quantity,
        SUM(i.available_quantity) as available_quantity,
        SUM(i.reserved_quantity) as reserved_quantity,
        SUM(i.quantity * i.average_cost) as total_value,
        COUNT(DISTINCT CASE WHEN i.available_quantity <= i.reorder_point THEN i.id END) as low_stock_count
      FROM public.warehouses w
      LEFT JOIN public.inventory i ON w.id = i.warehouse_id
      WHERE w.agency_id = $1
      GROUP BY w.id, w.code, w.name
      ORDER BY total_value DESC
    `;
    const result = await client.query(query, [agencyId]);
    return result.rows;
  } catch (error) {
    console.error('[Inventory Service] Error fetching warehouse utilization:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Inventory Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Inventory Service] Error ending pool:', err);
      }
    }
  }
}

module.exports = {
  createWarehouse,
  getWarehouses,
  updateWarehouse,
  deleteWarehouse,
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getInventoryLevels,
  createInventoryTransaction,
  getInventoryTransactions,
  getLowStockAlerts,
  generateProductCode,
  getProductCategories,
  createProductCategory,
  createTransfer,
  createAdjustment,
  getBoms,
  getBomById,
  createBom,
  updateBom,
  deleteBom,
  getBomItems,
  createBomItem,
  updateBomItem,
  deleteBomItem,
  getSerialNumbers,
  createSerialNumber,
  updateSerialNumber,
  deleteSerialNumber,
  getBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  getInventoryReports,
  getStockValueReport,
  getMovementReport,
  getWarehouseUtilizationReport,
};
