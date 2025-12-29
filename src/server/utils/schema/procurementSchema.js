/**
 * Procurement & Supply Chain Schema
 * 
 * Manages:
 * - suppliers: Supplier/vendor information
 * - purchase_requisitions: Purchase requisition requests
 * - purchase_orders: Purchase orders
 * - purchase_order_items: Purchase order line items
 * - goods_receipts: Goods receipt notes
 * - grn_items: GRN line items
 * - rfq_rfp: Request for quotation/proposal
 * - rfq_responses: Vendor responses to RFQ
 * 
 * Dependencies:
 * - Requires update_updated_at_column() function
 * - Requires log_audit_change() function
 * - Requires suppliers table (from inventory schema)
 */

/**
 * Ensure purchase_requisitions table exists
 */
async function ensurePurchaseRequisitionsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      requisition_number VARCHAR(100) UNIQUE NOT NULL,
      requested_by UUID NOT NULL REFERENCES public.users(id),
      department_id UUID,
      status VARCHAR(50) DEFAULT 'draft', -- draft, pending, approved, rejected, cancelled
      priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
      required_date DATE,
      total_amount DECIMAL(15,2) DEFAULT 0,
      notes TEXT,
      approved_by UUID REFERENCES public.users(id),
      approved_at TIMESTAMP WITH TIME ZONE,
      rejected_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_agency_id ON public.purchase_requisitions(agency_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_requisition_number ON public.purchase_requisitions(requisition_number);
    CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_requested_by ON public.purchase_requisitions(requested_by);
    CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_status ON public.purchase_requisitions(status);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_purchase_requisitions_updated_at ON public.purchase_requisitions;
    CREATE TRIGGER update_purchase_requisitions_updated_at
      BEFORE UPDATE ON public.purchase_requisitions
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure purchase_requisition_items table exists
 */
async function ensurePurchaseRequisitionItemsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.purchase_requisition_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      requisition_id UUID NOT NULL REFERENCES public.purchase_requisitions(id) ON DELETE CASCADE,
      product_id UUID REFERENCES public.products(id),
      description TEXT NOT NULL,
      quantity DECIMAL(10,2) NOT NULL,
      unit_price DECIMAL(15,2),
      total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity * COALESCE(unit_price, 0)) STORED,
      unit_of_measure VARCHAR(50) DEFAULT 'pcs',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_purchase_requisition_items_requisition_id ON public.purchase_requisition_items(requisition_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_requisition_items_product_id ON public.purchase_requisition_items(product_id);
  `);
}

/**
 * Ensure purchase_orders table exists
 */
async function ensurePurchaseOrdersTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.purchase_orders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      po_number VARCHAR(100) UNIQUE NOT NULL,
      requisition_id UUID REFERENCES public.purchase_requisitions(id),
      supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
      status VARCHAR(50) DEFAULT 'draft', -- draft, sent, acknowledged, partial, received, completed, cancelled
      order_date DATE NOT NULL DEFAULT CURRENT_DATE,
      expected_delivery_date DATE,
      delivery_address TEXT,
      payment_terms VARCHAR(255),
      currency VARCHAR(10) DEFAULT 'INR',
      exchange_rate DECIMAL(10,4) DEFAULT 1,
      subtotal DECIMAL(15,2) DEFAULT 0,
      tax_amount DECIMAL(15,2) DEFAULT 0,
      shipping_cost DECIMAL(15,2) DEFAULT 0,
      discount_amount DECIMAL(15,2) DEFAULT 0,
      total_amount DECIMAL(15,2) DEFAULT 0,
      notes TEXT,
      terms_conditions TEXT,
      created_by UUID REFERENCES public.users(id),
      approved_by UUID REFERENCES public.users(id),
      approved_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_agency_id ON public.purchase_orders(agency_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON public.purchase_orders(po_number);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_requisition_id ON public.purchase_orders(requisition_id);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON public.purchase_orders;
    CREATE TRIGGER update_purchase_orders_updated_at
      BEFORE UPDATE ON public.purchase_orders
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure purchase_order_items table exists
 */
async function ensurePurchaseOrderItemsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.purchase_order_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
      requisition_item_id UUID REFERENCES public.purchase_requisition_items(id),
      product_id UUID REFERENCES public.products(id),
      description TEXT NOT NULL,
      quantity DECIMAL(10,2) NOT NULL,
      unit_price DECIMAL(15,2) NOT NULL,
      total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
      unit_of_measure VARCHAR(50) DEFAULT 'pcs',
      received_quantity DECIMAL(10,2) DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON public.purchase_order_items(po_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id ON public.purchase_order_items(product_id);
  `);
}

/**
 * Ensure goods_receipts table exists
 */
async function ensureGoodsReceiptsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.goods_receipts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      grn_number VARCHAR(100) UNIQUE NOT NULL,
      po_id UUID NOT NULL REFERENCES public.purchase_orders(id),
      warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
      received_date DATE NOT NULL DEFAULT CURRENT_DATE,
      received_by UUID REFERENCES public.users(id),
      status VARCHAR(50) DEFAULT 'pending', -- pending, inspected, approved, rejected
      inspection_notes TEXT,
      quality_status VARCHAR(50), -- passed, failed, partial
      inspected_by UUID REFERENCES public.users(id),
      inspected_at TIMESTAMP WITH TIME ZONE,
      approved_by UUID REFERENCES public.users(id),
      approved_at TIMESTAMP WITH TIME ZONE,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_goods_receipts_agency_id ON public.goods_receipts(agency_id);
    CREATE INDEX IF NOT EXISTS idx_goods_receipts_grn_number ON public.goods_receipts(grn_number);
    CREATE INDEX IF NOT EXISTS idx_goods_receipts_po_id ON public.goods_receipts(po_id);
    CREATE INDEX IF NOT EXISTS idx_goods_receipts_warehouse_id ON public.goods_receipts(warehouse_id);
    CREATE INDEX IF NOT EXISTS idx_goods_receipts_status ON public.goods_receipts(status);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_goods_receipts_updated_at ON public.goods_receipts;
    CREATE TRIGGER update_goods_receipts_updated_at
      BEFORE UPDATE ON public.goods_receipts
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure grn_items table exists
 */
async function ensureGrnItemsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.grn_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      grn_id UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
      po_item_id UUID NOT NULL REFERENCES public.purchase_order_items(id),
      product_id UUID REFERENCES public.products(id),
      ordered_quantity DECIMAL(10,2) NOT NULL,
      received_quantity DECIMAL(10,2) NOT NULL,
      accepted_quantity DECIMAL(10,2) DEFAULT 0,
      rejected_quantity DECIMAL(10,2) DEFAULT 0,
      unit_price DECIMAL(15,2),
      batch_number VARCHAR(100),
      expiry_date DATE,
      serial_numbers TEXT[],
      quality_status VARCHAR(50), -- passed, failed, partial
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_grn_items_grn_id ON public.grn_items(grn_id);
    CREATE INDEX IF NOT EXISTS idx_grn_items_po_item_id ON public.grn_items(po_item_id);
    CREATE INDEX IF NOT EXISTS idx_grn_items_product_id ON public.grn_items(product_id);
  `);
}

/**
 * Ensure rfq_rfp table exists
 */
async function ensureRfqRfpTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.rfq_rfp (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      rfq_number VARCHAR(100) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(20) DEFAULT 'RFQ', -- RFQ, RFP
      status VARCHAR(50) DEFAULT 'draft', -- draft, published, closed, awarded
      published_date DATE,
      closing_date DATE,
      currency VARCHAR(10) DEFAULT 'INR',
      terms_conditions TEXT,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_rfq_rfp_agency_id ON public.rfq_rfp(agency_id);
    CREATE INDEX IF NOT EXISTS idx_rfq_rfp_rfq_number ON public.rfq_rfp(rfq_number);
    CREATE INDEX IF NOT EXISTS idx_rfq_rfp_status ON public.rfq_rfp(status);
  `);
}

/**
 * Ensure rfq_items table exists
 */
async function ensureRfqItemsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.rfq_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      rfq_id UUID NOT NULL REFERENCES public.rfq_rfp(id) ON DELETE CASCADE,
      product_id UUID REFERENCES public.products(id),
      description TEXT NOT NULL,
      quantity DECIMAL(10,2) NOT NULL,
      unit_of_measure VARCHAR(50) DEFAULT 'pcs',
      specifications TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq_id ON public.rfq_items(rfq_id);
    CREATE INDEX IF NOT EXISTS idx_rfq_items_product_id ON public.rfq_items(product_id);
  `);
}

/**
 * Ensure rfq_responses table exists
 */
async function ensureRfqResponsesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.rfq_responses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      rfq_id UUID NOT NULL REFERENCES public.rfq_rfp(id) ON DELETE CASCADE,
      supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
      status VARCHAR(50) DEFAULT 'submitted', -- submitted, under_review, accepted, rejected
      total_amount DECIMAL(15,2) DEFAULT 0,
      validity_days INTEGER,
      delivery_terms TEXT,
      payment_terms TEXT,
      notes TEXT,
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      reviewed_by UUID REFERENCES public.users(id),
      reviewed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(rfq_id, supplier_id)
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_rfq_responses_rfq_id ON public.rfq_responses(rfq_id);
    CREATE INDEX IF NOT EXISTS idx_rfq_responses_supplier_id ON public.rfq_responses(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_rfq_responses_status ON public.rfq_responses(status);
  `);
}

/**
 * Ensure rfq_response_items table exists
 */
async function ensureRfqResponseItemsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.rfq_response_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      response_id UUID NOT NULL REFERENCES public.rfq_responses(id) ON DELETE CASCADE,
      rfq_item_id UUID NOT NULL REFERENCES public.rfq_items(id),
      unit_price DECIMAL(15,2) NOT NULL,
      quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
      total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
      delivery_days INTEGER,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_rfq_response_items_response_id ON public.rfq_response_items(response_id);
    CREATE INDEX IF NOT EXISTS idx_rfq_response_items_rfq_item_id ON public.rfq_response_items(rfq_item_id);
  `);
}

/**
 * Ensure vendor_contacts table exists
 */
async function ensureVendorContactsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.vendor_contacts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      designation VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      alternate_phone VARCHAR(50),
      is_primary BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_vendor_contacts_agency_id ON public.vendor_contacts(agency_id);
    CREATE INDEX IF NOT EXISTS idx_vendor_contacts_supplier_id ON public.vendor_contacts(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_vendor_contacts_is_primary ON public.vendor_contacts(is_primary);
  `);
}

/**
 * Ensure vendor_contracts table exists
 */
async function ensureVendorContractsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.vendor_contracts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
      contract_number VARCHAR(100) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      contract_type VARCHAR(50), -- service, goods, maintenance, etc.
      start_date DATE NOT NULL,
      end_date DATE,
      value DECIMAL(15,2),
      currency VARCHAR(10) DEFAULT 'INR',
      terms_conditions TEXT,
      renewal_terms TEXT,
      status VARCHAR(50) DEFAULT 'active', -- draft, active, expired, terminated
      signed_by UUID REFERENCES public.users(id),
      signed_date DATE,
      document_url TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_vendor_contracts_agency_id ON public.vendor_contracts(agency_id);
    CREATE INDEX IF NOT EXISTS idx_vendor_contracts_supplier_id ON public.vendor_contracts(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_vendor_contracts_contract_number ON public.vendor_contracts(contract_number);
    CREATE INDEX IF NOT EXISTS idx_vendor_contracts_status ON public.vendor_contracts(status);
    CREATE INDEX IF NOT EXISTS idx_vendor_contracts_end_date ON public.vendor_contracts(end_date);
  `);
}

/**
 * Ensure vendor_performance table exists
 */
async function ensureVendorPerformanceTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.vendor_performance (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      total_orders INTEGER DEFAULT 0,
      total_order_value DECIMAL(15,2) DEFAULT 0,
      on_time_delivery_rate DECIMAL(5,2) DEFAULT 0, -- percentage
      quality_rating DECIMAL(3,2) DEFAULT 0, -- 0-5 rating
      cost_rating DECIMAL(3,2) DEFAULT 0, -- 0-5 rating
      communication_rating DECIMAL(3,2) DEFAULT 0, -- 0-5 rating
      overall_rating DECIMAL(3,2) DEFAULT 0, -- 0-5 rating
      late_deliveries INTEGER DEFAULT 0,
      rejected_items INTEGER DEFAULT 0,
      notes TEXT,
      evaluated_by UUID REFERENCES public.users(id),
      evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_vendor_performance_agency_id ON public.vendor_performance(agency_id);
    CREATE INDEX IF NOT EXISTS idx_vendor_performance_supplier_id ON public.vendor_performance(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_vendor_performance_period ON public.vendor_performance(period_start, period_end);
  `);
}

/**
 * Ensure vendor_invoices table exists
 */
async function ensureVendorInvoicesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.vendor_invoices (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
      invoice_number VARCHAR(100) UNIQUE NOT NULL,
      po_id UUID REFERENCES public.purchase_orders(id),
      invoice_date DATE NOT NULL,
      due_date DATE,
      subtotal DECIMAL(15,2) DEFAULT 0,
      tax_amount DECIMAL(15,2) DEFAULT 0,
      total_amount DECIMAL(15,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'INR',
      status VARCHAR(50) DEFAULT 'pending', -- pending, approved, paid, disputed, cancelled
      payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, partial, paid
      paid_amount DECIMAL(15,2) DEFAULT 0,
      paid_date DATE,
      payment_method VARCHAR(50),
      notes TEXT,
      document_url TEXT,
      created_by UUID REFERENCES public.users(id),
      approved_by UUID REFERENCES public.users(id),
      approved_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_vendor_invoices_agency_id ON public.vendor_invoices(agency_id);
    CREATE INDEX IF NOT EXISTS idx_vendor_invoices_supplier_id ON public.vendor_invoices(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_vendor_invoices_invoice_number ON public.vendor_invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_vendor_invoices_po_id ON public.vendor_invoices(po_id);
    CREATE INDEX IF NOT EXISTS idx_vendor_invoices_status ON public.vendor_invoices(status);
    CREATE INDEX IF NOT EXISTS idx_vendor_invoices_payment_status ON public.vendor_invoices(payment_status);
  `);
}

/**
 * Ensure all procurement management tables
 */
async function ensureProcurementSchema(client) {
  console.log('[SQL] Ensuring procurement management schema...');
  
  try {
    // Note: suppliers table is created in inventorySchema
    // Ensure it exists first
    const suppliersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'suppliers'
      );
    `);
    
    if (!suppliersCheck.rows[0].exists) {
      throw new Error('Suppliers table must be created before procurement schema');
    }

    await ensurePurchaseRequisitionsTable(client);
    await ensurePurchaseRequisitionItemsTable(client);
    await ensurePurchaseOrdersTable(client);
    await ensurePurchaseOrderItemsTable(client);
    await ensureGoodsReceiptsTable(client);
    await ensureGrnItemsTable(client);
    await ensureRfqRfpTable(client);
    await ensureRfqItemsTable(client);
    await ensureRfqResponsesTable(client);
    await ensureRfqResponseItemsTable(client);
    await ensureVendorContactsTable(client);
    await ensureVendorContractsTable(client);
    await ensureVendorPerformanceTable(client);
    await ensureVendorInvoicesTable(client);
    
    console.log('[SQL] ✅ Procurement management schema ensured');
  } catch (error) {
    console.error('[SQL] ❌ Error ensuring procurement schema:', error.message);
    throw error;
  }
}

module.exports = {
  ensureProcurementSchema,
  ensurePurchaseRequisitionsTable,
  ensurePurchaseRequisitionItemsTable,
  ensurePurchaseOrdersTable,
  ensurePurchaseOrderItemsTable,
  ensureGoodsReceiptsTable,
  ensureGrnItemsTable,
  ensureRfqRfpTable,
  ensureRfqItemsTable,
  ensureRfqResponsesTable,
  ensureRfqResponseItemsTable,
  ensureVendorContactsTable,
  ensureVendorContractsTable,
  ensureVendorPerformanceTable,
  ensureVendorInvoicesTable,
};
