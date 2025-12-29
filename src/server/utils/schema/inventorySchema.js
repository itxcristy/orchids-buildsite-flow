/**
 * Inventory Management Schema
 * 
 * Manages:
 * - warehouses: Warehouse locations
 * - products: Product catalog
 * - product_variants: Product variants (size, color, etc.)
 * - inventory: Stock levels per warehouse
 * - inventory_transactions: Stock movement history
 * - suppliers: Supplier/vendor information
 * - purchase_orders: Purchase orders (part of procurement)
 * - goods_receipts: Goods receipt notes
 * 
 * Dependencies:
 * - Requires update_updated_at_column() function
 * - Requires log_audit_change() function
 */

/**
 * Ensure warehouses table exists
 */
async function ensureWarehousesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.warehouses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      postal_code VARCHAR(20),
      country VARCHAR(100) DEFAULT 'India',
      contact_person VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(agency_id, code)
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_warehouses_agency_id ON public.warehouses(agency_id);
    CREATE INDEX IF NOT EXISTS idx_warehouses_code ON public.warehouses(code);
    CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON public.warehouses(is_active);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_warehouses_updated_at ON public.warehouses;
    CREATE TRIGGER update_warehouses_updated_at
      BEFORE UPDATE ON public.warehouses
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);

  // Create audit trigger
  await client.query(`
    DROP TRIGGER IF EXISTS audit_warehouses_changes ON public.warehouses;
    CREATE TRIGGER audit_warehouses_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.warehouses
      FOR EACH ROW
      EXECUTE FUNCTION public.log_audit_change();
  `);
}

/**
 * Ensure products table exists
 */
async function ensureProductsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.products (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      sku VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category_id UUID,
      brand VARCHAR(100),
      unit_of_measure VARCHAR(50) DEFAULT 'pcs',
      barcode VARCHAR(100),
      qr_code TEXT,
      weight DECIMAL(10,2),
      dimensions VARCHAR(100),
      image_url TEXT,
      is_active BOOLEAN DEFAULT true,
      is_trackable BOOLEAN DEFAULT false, -- For serial/batch tracking
      track_by VARCHAR(20), -- 'serial', 'batch', 'none'
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(agency_id, sku)
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_products_agency_id ON public.products(agency_id);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
    CREATE TRIGGER update_products_updated_at
      BEFORE UPDATE ON public.products
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);

  // Create audit trigger
  await client.query(`
    DROP TRIGGER IF EXISTS audit_products_changes ON public.products;
    CREATE TRIGGER audit_products_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.products
      FOR EACH ROW
      EXECUTE FUNCTION public.log_audit_change();
  `);
}

/**
 * Ensure product_variants table exists
 */
async function ensureProductVariantsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.product_variants (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
      agency_id UUID NOT NULL,
      variant_sku VARCHAR(100),
      variant_name VARCHAR(255), -- e.g., "Red - Large"
      attributes JSONB, -- {"color": "red", "size": "large"}
      price DECIMAL(15,2),
      cost DECIMAL(15,2),
      image_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(product_id, variant_sku)
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_variants_agency_id ON public.product_variants(agency_id);
    CREATE INDEX IF NOT EXISTS idx_product_variants_variant_sku ON public.product_variants(variant_sku);
  `);
}

/**
 * Ensure product_categories table exists
 */
async function ensureProductCategoriesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.product_categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      parent_id UUID REFERENCES public.product_categories(id),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_product_categories_agency_id ON public.product_categories(agency_id);
    CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id ON public.product_categories(parent_id);
  `);
}

/**
 * Ensure inventory table exists
 */
async function ensureInventoryTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.inventory (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
      variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
      warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
      quantity DECIMAL(10,2) DEFAULT 0,
      reserved_quantity DECIMAL(10,2) DEFAULT 0,
      available_quantity DECIMAL(10,2) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
      reorder_point DECIMAL(10,2) DEFAULT 0,
      reorder_quantity DECIMAL(10,2) DEFAULT 0,
      max_stock DECIMAL(10,2),
      min_stock DECIMAL(10,2),
      valuation_method VARCHAR(50) DEFAULT 'weighted_average', -- FIFO, LIFO, weighted_average
      average_cost DECIMAL(15,2) DEFAULT 0,
      last_cost DECIMAL(15,2) DEFAULT 0,
      last_movement_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(product_id, variant_id, warehouse_id)
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_inventory_agency_id ON public.inventory(agency_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory(product_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_variant_id ON public.inventory(variant_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_id ON public.inventory(warehouse_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_available_quantity ON public.inventory(available_quantity);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_inventory_updated_at ON public.inventory;
    CREATE TRIGGER update_inventory_updated_at
      BEFORE UPDATE ON public.inventory
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure inventory_transactions table exists
 */
async function ensureInventoryTransactionsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.inventory_transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
      transaction_type VARCHAR(50) NOT NULL, -- 'IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN'
      quantity DECIMAL(10,2) NOT NULL,
      unit_cost DECIMAL(15,2),
      total_cost DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
      reference_type VARCHAR(50), -- 'PURCHASE_ORDER', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN'
      reference_id UUID,
      from_warehouse_id UUID REFERENCES public.warehouses(id),
      to_warehouse_id UUID REFERENCES public.warehouses(id),
      serial_numbers TEXT[], -- For serial number tracking
      batch_number VARCHAR(100), -- For batch tracking
      expiry_date DATE, -- For batch tracking
      notes TEXT,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_inventory_transactions_agency_id ON public.inventory_transactions(agency_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id ON public.inventory_transactions(inventory_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON public.inventory_transactions(transaction_type);
    CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON public.inventory_transactions(reference_type, reference_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at);
  `);
}

/**
 * Ensure suppliers table exists
 */
async function ensureSuppliersTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.suppliers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      code VARCHAR(50),
      name VARCHAR(255) NOT NULL,
      company_name VARCHAR(255),
      contact_person VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      alternate_phone VARCHAR(50),
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      postal_code VARCHAR(20),
      country VARCHAR(100) DEFAULT 'India',
      tax_id VARCHAR(100), -- GSTIN, VAT, etc.
      payment_terms VARCHAR(255),
      credit_limit DECIMAL(15,2),
      rating DECIMAL(3,2) DEFAULT 0, -- 0-5 rating
      is_active BOOLEAN DEFAULT true,
      is_preferred BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_suppliers_agency_id ON public.suppliers(agency_id);
    CREATE INDEX IF NOT EXISTS idx_suppliers_code ON public.suppliers(code);
    CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON public.suppliers(is_active);
  `);
}

/**
 * Ensure bom (Bill of Materials) table exists
 */
async function ensureBomTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.bom (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      version VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_bom_agency_id ON public.bom(agency_id);
    CREATE INDEX IF NOT EXISTS idx_bom_product_id ON public.bom(product_id);
    CREATE INDEX IF NOT EXISTS idx_bom_is_active ON public.bom(is_active);
  `);
}

/**
 * Ensure bom_items table exists
 */
async function ensureBomItemsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.bom_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      bom_id UUID NOT NULL REFERENCES public.bom(id) ON DELETE CASCADE,
      component_product_id UUID NOT NULL REFERENCES public.products(id),
      quantity DECIMAL(10,2) NOT NULL,
      unit_of_measure VARCHAR(50) DEFAULT 'pcs',
      sequence INTEGER DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_bom_items_bom_id ON public.bom_items(bom_id);
    CREATE INDEX IF NOT EXISTS idx_bom_items_component_product_id ON public.bom_items(component_product_id);
  `);
}

/**
 * Ensure serial_numbers table exists
 */
async function ensureSerialNumbersTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.serial_numbers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
      variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
      serial_number VARCHAR(255) UNIQUE NOT NULL,
      warehouse_id UUID REFERENCES public.warehouses(id),
      inventory_id UUID REFERENCES public.inventory(id),
      status VARCHAR(50) DEFAULT 'available', -- available, reserved, sold, returned, damaged
      purchase_order_id UUID, -- Will add foreign key constraint after procurement schema is created
      sale_id UUID, -- Reference to sale/invoice
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add foreign key constraint to purchase_orders if the table exists
  try {
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'purchase_orders'
        ) THEN
          -- Check if constraint already exists
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'serial_numbers' 
            AND constraint_name = 'serial_numbers_purchase_order_id_fkey'
          ) THEN
            ALTER TABLE public.serial_numbers 
            ADD CONSTRAINT serial_numbers_purchase_order_id_fkey 
            FOREIGN KEY (purchase_order_id) 
            REFERENCES public.purchase_orders(id);
          END IF;
        END IF;
      END $$;
    `);
  } catch (error) {
    // Ignore if constraint already exists or table doesn't exist yet
    if (!error.message.includes('already exists') && !error.message.includes('does not exist')) {
      console.warn('[SQL] Warning adding purchase_orders FK to serial_numbers:', error.message);
    }
  }

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_serial_numbers_agency_id ON public.serial_numbers(agency_id);
    CREATE INDEX IF NOT EXISTS idx_serial_numbers_product_id ON public.serial_numbers(product_id);
    CREATE INDEX IF NOT EXISTS idx_serial_numbers_serial_number ON public.serial_numbers(serial_number);
    CREATE INDEX IF NOT EXISTS idx_serial_numbers_status ON public.serial_numbers(status);
    CREATE INDEX IF NOT EXISTS idx_serial_numbers_warehouse_id ON public.serial_numbers(warehouse_id);
  `);
}

/**
 * Ensure batches table exists
 */
async function ensureBatchesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.batches (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
      variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
      batch_number VARCHAR(255) NOT NULL,
      warehouse_id UUID REFERENCES public.warehouses(id),
      inventory_id UUID REFERENCES public.inventory(id),
      quantity DECIMAL(10,2) DEFAULT 0,
      manufacture_date DATE,
      expiry_date DATE,
      purchase_order_id UUID, -- Will add foreign key constraint after procurement schema is created
      cost_per_unit DECIMAL(15,2),
      status VARCHAR(50) DEFAULT 'active', -- active, expired, consumed, damaged
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(agency_id, product_id, batch_number)
    );
  `);

  // Add foreign key constraint to purchase_orders if the table exists
  try {
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'purchase_orders'
        ) THEN
          -- Check if constraint already exists
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'batches' 
            AND constraint_name = 'batches_purchase_order_id_fkey'
          ) THEN
            ALTER TABLE public.batches 
            ADD CONSTRAINT batches_purchase_order_id_fkey 
            FOREIGN KEY (purchase_order_id) 
            REFERENCES public.purchase_orders(id);
          END IF;
        END IF;
      END $$;
    `);
  } catch (error) {
    // Ignore if constraint already exists or table doesn't exist yet
    if (!error.message.includes('already exists') && !error.message.includes('does not exist')) {
      console.warn('[SQL] Warning adding purchase_orders FK to batches:', error.message);
    }
  }

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_batches_agency_id ON public.batches(agency_id);
    CREATE INDEX IF NOT EXISTS idx_batches_product_id ON public.batches(product_id);
    CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON public.batches(batch_number);
    CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON public.batches(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_batches_status ON public.batches(status);
  `);
}

/**
 * Ensure all inventory management tables
 */
async function ensureInventorySchema(client) {
  console.log('[SQL] Ensuring inventory management schema...');
  
  try {
    await ensureWarehousesTable(client);
    await ensureProductCategoriesTable(client);
    await ensureProductsTable(client);
    await ensureProductVariantsTable(client);
    await ensureInventoryTable(client);
    await ensureInventoryTransactionsTable(client);
    await ensureSuppliersTable(client);
    await ensureBomTable(client);
    await ensureBomItemsTable(client);
    await ensureSerialNumbersTable(client);
    await ensureBatchesTable(client);
    
    console.log('[SQL] ✅ Inventory management schema ensured');
  } catch (error) {
    console.error('[SQL] ❌ Error ensuring inventory schema:', error.message);
    throw error;
  }
}

module.exports = {
  ensureInventorySchema,
  ensureWarehousesTable,
  ensureProductsTable,
  ensureProductVariantsTable,
  ensureProductCategoriesTable,
  ensureInventoryTable,
  ensureInventoryTransactionsTable,
  ensureSuppliersTable,
  ensureBomTable,
  ensureBomItemsTable,
  ensureSerialNumbersTable,
  ensureBatchesTable,
};
