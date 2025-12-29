/**
 * Procurement Management Service
 * Handles all procurement operations: requisitions, purchase orders, GRN, RFQ
 */

const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');
const crypto = require('crypto');

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
 * Generate requisition number
 */
async function generateRequisitionNumber(agencyDatabase, agencyId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const year = new Date().getFullYear();
    const result = await client.query(
      `SELECT COUNT(*) as count 
       FROM public.purchase_requisitions 
       WHERE agency_id = $1 
       AND requisition_number LIKE $2`,
      [agencyId, `PR-${year}-%`]
    );
    const count = parseInt(result.rows[0].count) + 1;
    return `PR-${year}-${String(count).padStart(5, '0')}`;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Generate PO number
 */
async function generatePONumber(agencyDatabase, agencyId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const year = new Date().getFullYear();
    const result = await client.query(
      `SELECT COUNT(*) as count 
       FROM public.purchase_orders 
       WHERE agency_id = $1 
       AND po_number LIKE $2`,
      [agencyId, `PO-${year}-%`]
    );
    const count = parseInt(result.rows[0].count) + 1;
    return `PO-${year}-${String(count).padStart(5, '0')}`;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Generate GRN number
 */
async function generateGRNNumber(agencyDatabase, agencyId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const year = new Date().getFullYear();
    const result = await client.query(
      `SELECT COUNT(*) as count 
       FROM public.goods_receipts 
       WHERE agency_id = $1 
       AND grn_number LIKE $2`,
      [agencyId, `GRN-${year}-%`]
    );
    const count = parseInt(result.rows[0].count) + 1;
    return `GRN-${year}-${String(count).padStart(5, '0')}`;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Create purchase requisition
 */
async function createPurchaseRequisition(agencyDatabase, requisitionData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    // Generate requisition number
    const requisitionNumber = await generateRequisitionNumber(agencyDatabase, requisitionData.agency_id);

    // Create requisition
    const requisitionResult = await client.query(
      `INSERT INTO public.purchase_requisitions (
        id, agency_id, requisition_number, requested_by, department_id,
        status, priority, required_date, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        requisitionData.agency_id,
        requisitionNumber,
        userId,
        requisitionData.department_id || null,
        requisitionData.status || 'draft',
        requisitionData.priority || 'normal',
        requisitionData.required_date || null,
        requisitionData.notes || null,
      ]
    );

    const requisition = requisitionResult.rows[0];
    let totalAmount = 0;

    // Create requisition items
    if (requisitionData.items && requisitionData.items.length > 0) {
      for (const item of requisitionData.items) {
        const itemResult = await client.query(
          `INSERT INTO public.purchase_requisition_items (
            id, requisition_id, product_id, description, quantity,
            unit_price, unit_of_measure, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING *`,
          [
            generateUUID(),
            requisition.id,
            item.product_id || null,
            item.description,
            item.quantity,
            item.unit_price || null,
            item.unit_of_measure || 'pcs',
            item.notes || null,
          ]
        );
        // Calculate total for this item (total_price is a generated column, calculate manually)
        const itemTotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
        totalAmount += itemTotal;
      }

      // Update requisition total
      await client.query(
        'UPDATE public.purchase_requisitions SET total_amount = $1 WHERE id = $2',
        [totalAmount, requisition.id]
      );
      requisition.total_amount = totalAmount;
    }

    await client.query('COMMIT');
    return requisition;
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
 * Create purchase order from requisition
 */
async function createPurchaseOrder(agencyDatabase, poData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    // Generate PO number
    const poNumber = await generatePONumber(agencyDatabase, poData.agency_id);

    // Calculate totals
    let subtotal = 0;
    if (poData.items && poData.items.length > 0) {
      for (const item of poData.items) {
        subtotal += parseFloat(item.quantity) * parseFloat(item.unit_price || 0);
      }
    }

    const taxAmount = poData.tax_amount || 0;
    const shippingCost = poData.shipping_cost || 0;
    const discountAmount = poData.discount_amount || 0;
    const totalAmount = subtotal + taxAmount + shippingCost - discountAmount;

    // Create PO
    const poResult = await client.query(
      `INSERT INTO public.purchase_orders (
        id, agency_id, po_number, requisition_id, supplier_id, status,
        order_date, expected_delivery_date, delivery_address, payment_terms,
        currency, exchange_rate, subtotal, tax_amount, shipping_cost,
        discount_amount, total_amount, notes, terms_conditions,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        poData.agency_id,
        poNumber,
        poData.requisition_id || null,
        poData.supplier_id,
        poData.status || 'draft',
        poData.order_date || new Date().toISOString().split('T')[0],
        poData.expected_delivery_date || null,
        poData.delivery_address || null,
        poData.payment_terms || null,
        poData.currency || 'INR',
        poData.exchange_rate || 1,
        subtotal,
        taxAmount,
        shippingCost,
        discountAmount,
        totalAmount,
        poData.notes || null,
        poData.terms_conditions || null,
        userId,
      ]
    );

    const po = poResult.rows[0];

    // Create PO items
    if (poData.items && poData.items.length > 0) {
      for (const item of poData.items) {
        await client.query(
          `INSERT INTO public.purchase_order_items (
            id, po_id, requisition_item_id, product_id, description,
            quantity, unit_price, unit_of_measure, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            generateUUID(),
            po.id,
            item.requisition_item_id || null,
            item.product_id || null,
            item.description,
            item.quantity,
            item.unit_price,
            item.unit_of_measure || 'pcs',
            item.notes || null,
          ]
        );
      }
    }

    await client.query('COMMIT');
    return po;
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
 * Create goods receipt (GRN)
 */
async function createGoodsReceipt(agencyDatabase, grnData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    // Generate GRN number
    const grnNumber = await generateGRNNumber(agencyDatabase, grnData.agency_id);

    // Create GRN
    const grnResult = await client.query(
      `INSERT INTO public.goods_receipts (
        id, agency_id, grn_number, po_id, warehouse_id,
        received_date, received_by, status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        grnData.agency_id,
        grnNumber,
        grnData.po_id,
        grnData.warehouse_id,
        grnData.received_date || new Date().toISOString().split('T')[0],
        userId,
        grnData.status || 'pending',
        grnData.notes || null,
      ]
    );

    const grn = grnResult.rows[0];

    // Create GRN items
    if (grnData.items && grnData.items.length > 0) {
      for (const item of grnData.items) {
        await client.query(
          `INSERT INTO public.grn_items (
            id, grn_id, po_item_id, product_id, ordered_quantity,
            received_quantity, accepted_quantity, rejected_quantity,
            unit_price, batch_number, expiry_date, serial_numbers,
            quality_status, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
          [
            generateUUID(),
            grn.id,
            item.po_item_id,
            item.product_id || null,
            item.ordered_quantity,
            item.received_quantity,
            item.accepted_quantity || item.received_quantity,
            item.rejected_quantity || 0,
            item.unit_price || null,
            item.batch_number || null,
            item.expiry_date || null,
            item.serial_numbers || null,
            item.quality_status || 'passed',
            item.notes || null,
          ]
        );

        // Update PO item received quantity
        await client.query(
          `UPDATE public.purchase_order_items 
           SET received_quantity = received_quantity + $1 
           WHERE id = $2`,
          [item.accepted_quantity || item.received_quantity, item.po_item_id]
        );

        // Create inventory transaction for accepted quantity
        if (item.accepted_quantity > 0 && item.product_id) {
          const inventoryService = require('./inventoryService');
          await inventoryService.createInventoryTransaction(
            agencyDatabase,
            {
              agency_id: grnData.agency_id,
              product_id: item.product_id,
              warehouse_id: grnData.warehouse_id,
              transaction_type: 'IN',
              quantity: item.accepted_quantity,
              unit_cost: item.unit_price,
              reference_type: 'GOODS_RECEIPT',
              reference_id: grn.id,
              batch_number: item.batch_number,
              expiry_date: item.expiry_date,
              serial_numbers: item.serial_numbers,
            },
            userId
          );
        }
      }

      // Update PO status based on received quantities
      const poItemsCheck = await client.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN received_quantity >= quantity THEN 1 ELSE 0 END) as completed
        FROM public.purchase_order_items
        WHERE po_id = $1`,
        [grnData.po_id]
      );

      const total = parseInt(poItemsCheck.rows[0].total);
      const completed = parseInt(poItemsCheck.rows[0].completed);

      let poStatus = 'partial';
      if (completed === total) {
        poStatus = 'received';
      } else if (completed > 0) {
        poStatus = 'partial';
      }

      await client.query(
        'UPDATE public.purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2',
        [poStatus, grnData.po_id]
      );
    }

    await client.query('COMMIT');
    return grn;
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
 * Get purchase requisitions
 */
async function getPurchaseRequisitions(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        pr.*,
        u.email as requested_by_email,
        p.full_name as requested_by_name
      FROM public.purchase_requisitions pr
      LEFT JOIN public.users u ON pr.requested_by = u.id
      LEFT JOIN public.profiles p ON pr.requested_by = p.user_id
      WHERE pr.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND pr.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    query += ' ORDER BY pr.created_at DESC';

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    // If table doesn't exist or other error, return empty array
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      // Table doesn't exist, return empty array
      console.log('Purchase requisitions table does not exist yet');
      return [];
    }
    console.error('Error fetching purchase requisitions:', error.message);
    // Return empty array instead of throwing to prevent 500 errors
    return [];
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get purchase orders
 */
async function getPurchaseOrders(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        po.*,
        s.name as supplier_name,
        s.code as supplier_code
      FROM public.purchase_orders po
      LEFT JOIN public.suppliers s ON po.supplier_id = s.id
      WHERE po.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND po.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.supplier_id) {
      query += ` AND po.supplier_id = $${paramIndex}`;
      params.push(filters.supplier_id);
      paramIndex++;
    }

    query += ' ORDER BY po.created_at DESC';

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    // If table doesn't exist or other error, return empty array
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      // Table doesn't exist, return empty array
      console.log('Purchase orders table does not exist yet');
      return [];
    }
    console.error('Error fetching purchase orders:', error.message);
    // Return empty array instead of throwing to prevent 500 errors
    return [];
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get goods receipts
 */
async function getGoodsReceipts(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        gr.*,
        po.po_number,
        w.name as warehouse_name,
        w.code as warehouse_code
      FROM public.goods_receipts gr
      LEFT JOIN public.purchase_orders po ON gr.po_id = po.id
      LEFT JOIN public.warehouses w ON gr.warehouse_id = w.id
      WHERE gr.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND gr.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    query += ' ORDER BY gr.created_at DESC';

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    // If table doesn't exist or other error, return empty array
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      // Table doesn't exist, return empty array
      console.log('Goods receipts table does not exist yet');
      return [];
    }
    console.error('Error fetching goods receipts:', error.message);
    // Return empty array instead of throwing to prevent 500 errors
    return [];
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get all suppliers/vendors
 */
async function getSuppliers(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = 'SELECT * FROM public.suppliers WHERE agency_id = $1';
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.is_active !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(filters.is_active);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR company_name ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ' ORDER BY name ASC';

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
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
 * Create a new supplier/vendor
 */
async function createSupplier(agencyDatabase, supplierData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.suppliers (
        id, agency_id, code, name, company_name, contact_person, email, phone,
        alternate_phone, address, city, state, postal_code, country, tax_id,
        payment_terms, credit_limit, rating, is_active, is_preferred, notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        supplierData.agency_id,
        supplierData.code || null,
        supplierData.name,
        supplierData.company_name || null,
        supplierData.contact_person || null,
        supplierData.email || null,
        supplierData.phone || null,
        supplierData.alternate_phone || null,
        supplierData.address || null,
        supplierData.city || null,
        supplierData.state || null,
        supplierData.postal_code || null,
        supplierData.country || 'India',
        supplierData.tax_id || null,
        supplierData.payment_terms || null,
        supplierData.credit_limit || null,
        supplierData.rating || 0,
        supplierData.is_active !== false,
        supplierData.is_preferred || false,
        supplierData.notes || null,
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
 * Get a single supplier by ID
 */
async function getSupplierById(agencyDatabase, agencyId, supplierId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'SELECT * FROM public.suppliers WHERE id = $1 AND agency_id = $2',
      [supplierId, agencyId]
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
 * Update a supplier
 */
async function updateSupplier(agencyDatabase, agencyId, supplierId, supplierData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['code', 'name', 'company_name', 'contact_person', 'email', 'phone',
                          'alternate_phone', 'address', 'city', 'state', 'postal_code', 'country',
                          'tax_id', 'payment_terms', 'credit_limit', 'rating', 'is_active', 
                          'is_preferred', 'notes'];
    
    for (const field of allowedFields) {
      if (supplierData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(supplierData[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(supplierId, agencyId);

    const query = `
      UPDATE public.suppliers 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Supplier not found');
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
 * Get a single purchase order by ID with items
 */
async function getPurchaseOrderById(agencyDatabase, agencyId, poId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Get PO
    const poResult = await client.query(
      `SELECT 
        po.*,
        s.name as supplier_name,
        s.code as supplier_code
      FROM public.purchase_orders po
      LEFT JOIN public.suppliers s ON po.supplier_id = s.id
      WHERE po.id = $1 AND po.agency_id = $2`,
      [poId, agencyId]
    );

    if (poResult.rows.length === 0) {
      return null;
    }

    const purchaseOrder = poResult.rows[0];

    // Get PO items
    const itemsResult = await client.query(
      `SELECT 
        poi.*,
        p.name as product_name,
        p.sku as product_sku
      FROM public.purchase_order_items poi
      LEFT JOIN public.products p ON poi.product_id = p.id
      WHERE poi.po_id = $1
      ORDER BY poi.created_at ASC`,
      [poId]
    );

    purchaseOrder.items = itemsResult.rows;
    return purchaseOrder;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Update a purchase order
 */
async function updatePurchaseOrder(agencyDatabase, agencyId, poId, poData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['status', 'expected_delivery_date', 'delivery_address', 
                          'payment_terms', 'currency', 'exchange_rate', 'subtotal',
                          'tax_amount', 'shipping_cost', 'discount_amount', 'total_amount',
                          'notes', 'terms_conditions'];
    
    for (const field of allowedFields) {
      if (poData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(poData[field]);
        paramIndex++;
      }
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(poId, agencyId);

      const query = `
        UPDATE public.purchase_orders 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Purchase order not found');
      }
    }

    // Update items if provided
    if (poData.items && Array.isArray(poData.items)) {
      // Delete existing items
      await client.query('DELETE FROM public.purchase_order_items WHERE po_id = $1', [poId]);

      // Insert new items
      for (const item of poData.items) {
        await client.query(
          `INSERT INTO public.purchase_order_items (
            id, po_id, requisition_item_id, product_id, description, quantity,
            unit_price, unit_of_measure, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            generateUUID(),
            poId,
            item.requisition_item_id || null,
            item.product_id || null,
            item.description,
            item.quantity,
            item.unit_price,
            item.unit_of_measure || 'pcs',
            item.notes || null,
          ]
        );
      }

      // Recalculate totals
      const itemsResult = await client.query(
        'SELECT SUM(total_price) as subtotal FROM public.purchase_order_items WHERE po_id = $1',
        [poId]
      );
      const subtotal = parseFloat(itemsResult.rows[0].subtotal || 0);

      await client.query(
        `UPDATE public.purchase_orders 
         SET subtotal = $1, total_amount = $1 + COALESCE(tax_amount, 0) + COALESCE(shipping_cost, 0) - COALESCE(discount_amount, 0),
         updated_at = NOW()
         WHERE id = $2`,
        [subtotal, poId]
      );
    }

    await client.query('COMMIT');

    // Return updated PO with items
    return await getPurchaseOrderById(agencyDatabase, agencyId, poId);
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
 * Generate RFQ number
 */
async function generateRfqNumber(agencyDatabase, agencyId, type = 'RFQ') {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const year = new Date().getFullYear();
    const prefix = type === 'RFP' ? 'RFP' : 'RFQ';
    const result = await client.query(
      `SELECT COUNT(*) as count 
       FROM public.rfq_rfp 
       WHERE agency_id = $1 
       AND rfq_number LIKE $2`,
      [agencyId, `${prefix}-${year}-%`]
    );
    const count = parseInt(result.rows[0].count) + 1;
    return `${prefix}-${year}-${String(count).padStart(5, '0')}`;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get all RFQ/RFP records
 */
async function getRfqRfp(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = 'SELECT * FROM public.rfq_rfp WHERE agency_id = $1';
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.type) {
      query += ` AND type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
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
 * Create a new RFQ/RFP
 */
async function createRfqRfp(agencyDatabase, rfqData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    const rfqNumber = await generateRfqNumber(agencyDatabase, rfqData.agency_id, rfqData.type || 'RFQ');

    const rfqResult = await client.query(
      `INSERT INTO public.rfq_rfp (
        id, agency_id, rfq_number, title, description, type, status,
        published_date, closing_date, currency, terms_conditions, created_by,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        rfqData.agency_id,
        rfqNumber,
        rfqData.title,
        rfqData.description || null,
        rfqData.type || 'RFQ',
        rfqData.status || 'draft',
        rfqData.published_date || null,
        rfqData.closing_date || null,
        rfqData.currency || 'INR',
        rfqData.terms_conditions || null,
        userId,
      ]
    );

    const rfq = rfqResult.rows[0];

    // Insert items if provided
    if (rfqData.items && Array.isArray(rfqData.items)) {
      for (const item of rfqData.items) {
        await client.query(
          `INSERT INTO public.rfq_items (
            id, rfq_id, product_id, description, quantity, unit_of_measure,
            specifications, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            generateUUID(),
            rfq.id,
            item.product_id || null,
            item.description,
            item.quantity,
            item.unit_of_measure || 'pcs',
            item.specifications || null,
          ]
        );
      }
    }

    await client.query('COMMIT');
    return rfq;
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
 * Get vendor contracts
 */
async function getVendorContracts(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        vc.*,
        s.name as supplier_name,
        s.code as supplier_code,
        u.email as signed_by_email
      FROM public.vendor_contracts vc
      LEFT JOIN public.suppliers s ON vc.supplier_id = s.id
      LEFT JOIN public.users u ON vc.signed_by = u.id
      WHERE vc.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.supplier_id) {
      query += ` AND vc.supplier_id = $${paramIndex}`;
      params.push(filters.supplier_id);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND vc.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.contract_type) {
      query += ` AND vc.contract_type = $${paramIndex}`;
      params.push(filters.contract_type);
      paramIndex++;
    }

    query += ' ORDER BY vc.created_at DESC';

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Procurement Service] Error fetching vendor contracts:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Procurement Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Procurement Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get vendor contract by ID
 */
async function getVendorContractById(agencyDatabase, agencyId, contractId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT 
        vc.*,
        s.name as supplier_name,
        s.code as supplier_code,
        u.email as signed_by_email
      FROM public.vendor_contracts vc
      LEFT JOIN public.suppliers s ON vc.supplier_id = s.id
      LEFT JOIN public.users u ON vc.signed_by = u.id
      WHERE vc.id = $1 AND vc.agency_id = $2`,
      [contractId, agencyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Vendor contract not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Procurement Service] Error fetching vendor contract:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Procurement Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Procurement Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create vendor contract
 */
async function createVendorContract(agencyDatabase, contractData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const contractNumber = `CONTRACT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const result = await client.query(
      `INSERT INTO public.vendor_contracts (
        agency_id, supplier_id, contract_number, title, contract_type,
        start_date, end_date, value, currency, terms_conditions,
        renewal_terms, status, signed_by, signed_date, document_url, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        contractData.agency_id,
        contractData.supplier_id,
        contractNumber,
        contractData.title,
        contractData.contract_type || null,
        contractData.start_date,
        contractData.end_date || null,
        contractData.value || null,
        contractData.currency || 'INR',
        contractData.terms_conditions || null,
        contractData.renewal_terms || null,
        contractData.status || 'draft',
        contractData.signed_by || userId,
        contractData.signed_date || null,
        contractData.document_url || null,
        contractData.notes || null,
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('[Procurement Service] Error creating vendor contract:', error);
    if (error.code === '23505') {
      throw new Error('Contract number already exists');
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Procurement Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Procurement Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update vendor contract
 */
async function updateVendorContract(agencyDatabase, agencyId, contractId, contractData) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (contractData.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      values.push(contractData.title);
    }
    if (contractData.contract_type !== undefined) {
      updateFields.push(`contract_type = $${paramIndex++}`);
      values.push(contractData.contract_type);
    }
    if (contractData.start_date !== undefined) {
      updateFields.push(`start_date = $${paramIndex++}`);
      values.push(contractData.start_date);
    }
    if (contractData.end_date !== undefined) {
      updateFields.push(`end_date = $${paramIndex++}`);
      values.push(contractData.end_date);
    }
    if (contractData.value !== undefined) {
      updateFields.push(`value = $${paramIndex++}`);
      values.push(contractData.value);
    }
    if (contractData.currency !== undefined) {
      updateFields.push(`currency = $${paramIndex++}`);
      values.push(contractData.currency);
    }
    if (contractData.terms_conditions !== undefined) {
      updateFields.push(`terms_conditions = $${paramIndex++}`);
      values.push(contractData.terms_conditions);
    }
    if (contractData.renewal_terms !== undefined) {
      updateFields.push(`renewal_terms = $${paramIndex++}`);
      values.push(contractData.renewal_terms);
    }
    if (contractData.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(contractData.status);
    }
    if (contractData.signed_by !== undefined) {
      updateFields.push(`signed_by = $${paramIndex++}`);
      values.push(contractData.signed_by);
    }
    if (contractData.signed_date !== undefined) {
      updateFields.push(`signed_date = $${paramIndex++}`);
      values.push(contractData.signed_date);
    }
    if (contractData.document_url !== undefined) {
      updateFields.push(`document_url = $${paramIndex++}`);
      values.push(contractData.document_url);
    }
    if (contractData.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      values.push(contractData.notes);
    }

    if (updateFields.length === 0) {
      return await getVendorContractById(agencyDatabase, agencyId, contractId);
    }

    values.push(contractId, agencyId);
    const result = await client.query(
      `UPDATE public.vendor_contracts 
       SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Vendor contract not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Procurement Service] Error updating vendor contract:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Procurement Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Procurement Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Delete vendor contract
 */
async function deleteVendorContract(agencyDatabase, agencyId, contractId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'DELETE FROM public.vendor_contracts WHERE id = $1 AND agency_id = $2 RETURNING id',
      [contractId, agencyId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('[Procurement Service] Error deleting vendor contract:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Procurement Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Procurement Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get vendor performance records
 */
async function getVendorPerformance(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        vp.*,
        s.name as supplier_name,
        s.code as supplier_code,
        u.email as evaluated_by_email
      FROM public.vendor_performance vp
      LEFT JOIN public.suppliers s ON vp.supplier_id = s.id
      LEFT JOIN public.users u ON vp.evaluated_by = u.id
      WHERE vp.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.supplier_id) {
      query += ` AND vp.supplier_id = $${paramIndex}`;
      params.push(filters.supplier_id);
      paramIndex++;
    }

    if (filters.period_start) {
      query += ` AND vp.period_start >= $${paramIndex}`;
      params.push(filters.period_start);
      paramIndex++;
    }

    if (filters.period_end) {
      query += ` AND vp.period_end <= $${paramIndex}`;
      params.push(filters.period_end);
      paramIndex++;
    }

    query += ' ORDER BY vp.period_end DESC, vp.overall_rating DESC';

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Procurement Service] Error fetching vendor performance:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Procurement Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Procurement Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get vendor performance by ID
 */
async function getVendorPerformanceById(agencyDatabase, agencyId, performanceId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT 
        vp.*,
        s.name as supplier_name,
        s.code as supplier_code,
        u.email as evaluated_by_email
      FROM public.vendor_performance vp
      LEFT JOIN public.suppliers s ON vp.supplier_id = s.id
      LEFT JOIN public.users u ON vp.evaluated_by = u.id
      WHERE vp.id = $1 AND vp.agency_id = $2`,
      [performanceId, agencyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Vendor performance record not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Procurement Service] Error fetching vendor performance:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Procurement Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Procurement Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create vendor performance record
 */
async function createVendorPerformance(agencyDatabase, performanceData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.vendor_performance (
        agency_id, supplier_id, period_start, period_end,
        total_orders, total_order_value, on_time_delivery_rate,
        quality_rating, cost_rating, communication_rating,
        overall_rating, late_deliveries, rejected_items, notes, evaluated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        performanceData.agency_id,
        performanceData.supplier_id,
        performanceData.period_start,
        performanceData.period_end,
        performanceData.total_orders || 0,
        performanceData.total_order_value || 0,
        performanceData.on_time_delivery_rate || 0,
        performanceData.quality_rating || 0,
        performanceData.cost_rating || 0,
        performanceData.communication_rating || 0,
        performanceData.overall_rating || 0,
        performanceData.late_deliveries || 0,
        performanceData.rejected_items || 0,
        performanceData.notes || null,
        userId,
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('[Procurement Service] Error creating vendor performance:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Procurement Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Procurement Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update vendor performance record
 */
async function updateVendorPerformance(agencyDatabase, agencyId, performanceId, performanceData) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (performanceData.period_start !== undefined) {
      updateFields.push(`period_start = $${paramIndex++}`);
      values.push(performanceData.period_start);
    }
    if (performanceData.period_end !== undefined) {
      updateFields.push(`period_end = $${paramIndex++}`);
      values.push(performanceData.period_end);
    }
    if (performanceData.total_orders !== undefined) {
      updateFields.push(`total_orders = $${paramIndex++}`);
      values.push(performanceData.total_orders);
    }
    if (performanceData.total_order_value !== undefined) {
      updateFields.push(`total_order_value = $${paramIndex++}`);
      values.push(performanceData.total_order_value);
    }
    if (performanceData.on_time_delivery_rate !== undefined) {
      updateFields.push(`on_time_delivery_rate = $${paramIndex++}`);
      values.push(performanceData.on_time_delivery_rate);
    }
    if (performanceData.quality_rating !== undefined) {
      updateFields.push(`quality_rating = $${paramIndex++}`);
      values.push(performanceData.quality_rating);
    }
    if (performanceData.cost_rating !== undefined) {
      updateFields.push(`cost_rating = $${paramIndex++}`);
      values.push(performanceData.cost_rating);
    }
    if (performanceData.communication_rating !== undefined) {
      updateFields.push(`communication_rating = $${paramIndex++}`);
      values.push(performanceData.communication_rating);
    }
    if (performanceData.overall_rating !== undefined) {
      updateFields.push(`overall_rating = $${paramIndex++}`);
      values.push(performanceData.overall_rating);
    }
    if (performanceData.late_deliveries !== undefined) {
      updateFields.push(`late_deliveries = $${paramIndex++}`);
      values.push(performanceData.late_deliveries);
    }
    if (performanceData.rejected_items !== undefined) {
      updateFields.push(`rejected_items = $${paramIndex++}`);
      values.push(performanceData.rejected_items);
    }
    if (performanceData.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      values.push(performanceData.notes);
    }

    if (updateFields.length === 0) {
      return await getVendorPerformanceById(agencyDatabase, agencyId, performanceId);
    }

    values.push(performanceId, agencyId);
    const result = await client.query(
      `UPDATE public.vendor_performance 
       SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Vendor performance record not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Procurement Service] Error updating vendor performance:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Procurement Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Procurement Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Delete vendor performance record
 */
async function deleteVendorPerformance(agencyDatabase, agencyId, performanceId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'DELETE FROM public.vendor_performance WHERE id = $1 AND agency_id = $2 RETURNING id',
      [performanceId, agencyId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('[Procurement Service] Error deleting vendor performance:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Procurement Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Procurement Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get procurement reports summary
 */
async function getProcurementReports(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const dateFrom = filters.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = filters.date_to || new Date().toISOString().split('T')[0];

    // Overall statistics
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT pr.id) as total_requisitions,
        COUNT(DISTINCT CASE WHEN pr.status = 'approved' THEN pr.id END) as approved_requisitions,
        COUNT(DISTINCT po.id) as total_purchase_orders,
        COUNT(DISTINCT CASE WHEN po.status = 'completed' THEN po.id END) as completed_orders,
        COUNT(DISTINCT gr.id) as total_goods_receipts,
        COUNT(DISTINCT s.id) as total_suppliers,
        COALESCE(SUM(CASE WHEN po.status IN ('pending', 'approved', 'partially_received') THEN po.total_amount ELSE 0 END), 0) as pending_po_value,
        COALESCE(SUM(CASE WHEN po.status = 'completed' THEN po.total_amount ELSE 0 END), 0) as completed_po_value,
        COALESCE(SUM(po.total_amount), 0) as total_po_value
      FROM public.purchase_requisitions pr
      FULL OUTER JOIN public.purchase_orders po ON po.agency_id = pr.agency_id
      FULL OUTER JOIN public.goods_receipts gr ON gr.agency_id = COALESCE(pr.agency_id, po.agency_id)
      FULL OUTER JOIN public.suppliers s ON s.agency_id = COALESCE(pr.agency_id, po.agency_id)
      WHERE COALESCE(pr.agency_id, po.agency_id, gr.agency_id, s.agency_id) = $1
        AND (
          (pr.created_at >= $2::date AND pr.created_at <= $3::date) OR
          (po.created_at >= $2::date AND po.created_at <= $3::date) OR
          (gr.created_at >= $2::date AND gr.created_at <= $3::date) OR
          pr.created_at IS NULL AND po.created_at IS NULL AND gr.created_at IS NULL
        )
    `;
    const statsResult = await client.query(statsQuery, [agencyId, dateFrom, dateTo]).catch(() => ({ rows: [{}] }));

    // Requisitions by status
    const requisitionsByStatusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total_amount
      FROM public.purchase_requisitions
      WHERE agency_id = $1
        AND created_at >= $2::date
        AND created_at <= $3::date
      GROUP BY status
    `;
    const requisitionsByStatusResult = await client.query(requisitionsByStatusQuery, [agencyId, dateFrom, dateTo]).catch(() => ({ rows: [] }));

    // Purchase orders by status
    const poByStatusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total_amount
      FROM public.purchase_orders
      WHERE agency_id = $1
        AND created_at >= $2::date
        AND created_at <= $3::date
      GROUP BY status
    `;
    const poByStatusResult = await client.query(poByStatusQuery, [agencyId, dateFrom, dateTo]).catch(() => ({ rows: [] }));

    // Top suppliers by order value
    const topSuppliersQuery = `
      SELECT 
        s.id,
        s.name,
        s.code,
        COUNT(DISTINCT po.id) as order_count,
        COALESCE(SUM(po.total_amount), 0) as total_order_value,
        COUNT(DISTINCT CASE WHEN po.status = 'completed' THEN po.id END) as completed_orders
      FROM public.suppliers s
      LEFT JOIN public.purchase_orders po ON po.supplier_id = s.id
        AND po.created_at >= $2::date
        AND po.created_at <= $3::date
      WHERE s.agency_id = $1
      GROUP BY s.id, s.name, s.code
      ORDER BY total_order_value DESC
      LIMIT 10
    `;
    const topSuppliersResult = await client.query(topSuppliersQuery, [agencyId, dateFrom, dateTo]).catch(() => ({ rows: [] }));

    // Monthly trend
    const monthlyTrendQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total_amount
      FROM public.purchase_orders
      WHERE agency_id = $1
        AND created_at >= $2::date
        AND created_at <= $3::date
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT 12
    `;
    const monthlyTrendResult = await client.query(monthlyTrendQuery, [agencyId, dateFrom, dateTo]).catch(() => ({ rows: [] }));

    return {
      summary: statsResult.rows[0] || {},
      requisitions_by_status: requisitionsByStatusResult.rows,
      purchase_orders_by_status: poByStatusResult.rows,
      top_suppliers: topSuppliersResult.rows,
      monthly_trend: monthlyTrendResult.rows,
      date_range: { from: dateFrom, to: dateTo },
    };
  } catch (error) {
    console.error('[Procurement Service] Error fetching reports:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return {
        summary: {},
        requisitions_by_status: [],
        purchase_orders_by_status: [],
        top_suppliers: [],
        monthly_trend: [],
        date_range: { from: null, to: null },
      };
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Procurement Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Procurement Service] Error ending pool:', err);
      }
    }
  }
}

module.exports = {
  createPurchaseRequisition,
  createPurchaseOrder,
  createGoodsReceipt,
  getPurchaseRequisitions,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  getGoodsReceipts,
  generateRequisitionNumber,
  generatePONumber,
  generateGRNNumber,
  getSuppliers,
  createSupplier,
  getSupplierById,
  updateSupplier,
  getRfqRfp,
  createRfqRfp,
  generateRfqNumber,
  getVendorContracts,
  getVendorContractById,
  createVendorContract,
  updateVendorContract,
  deleteVendorContract,
  getVendorPerformance,
  getVendorPerformanceById,
  createVendorPerformance,
  updateVendorPerformance,
  deleteVendorPerformance,
  getProcurementReports,
};
