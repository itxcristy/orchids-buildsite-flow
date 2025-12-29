/**
 * Asset Management Schema
 * 
 * Manages:
 * - assets: Fixed asset master data
 * - asset_categories: Asset categorization
 * - asset_depreciation: Depreciation calculations and records
 * - asset_maintenance: Maintenance schedules and history
 * - asset_disposals: Asset disposal management
 * - asset_locations: Asset location tracking
 * 
 * Dependencies:
 * - Requires update_updated_at_column() function
 * - Requires log_audit_change() function
 * - Requires users table (for user references)
 */

/**
 * Ensure asset_categories table exists
 */
async function ensureAssetCategoriesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.asset_categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      parent_id UUID REFERENCES public.asset_categories(id),
      code VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      depreciation_method VARCHAR(50) DEFAULT 'straight_line', -- straight_line, declining_balance, units_of_production
      default_useful_life_years INTEGER,
      default_depreciation_rate DECIMAL(5,2), -- percentage
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(agency_id, code)
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_asset_categories_agency_id ON public.asset_categories(agency_id);
    CREATE INDEX IF NOT EXISTS idx_asset_categories_code ON public.asset_categories(code);
    CREATE INDEX IF NOT EXISTS idx_asset_categories_parent_id ON public.asset_categories(parent_id);
    CREATE INDEX IF NOT EXISTS idx_asset_categories_is_active ON public.asset_categories(is_active);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_asset_categories_updated_at ON public.asset_categories;
    CREATE TRIGGER update_asset_categories_updated_at
      BEFORE UPDATE ON public.asset_categories
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure asset_locations table exists
 */
async function ensureAssetLocationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.asset_locations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      address TEXT,
      building VARCHAR(255),
      floor VARCHAR(50),
      room VARCHAR(100),
      contact_person VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(agency_id, code)
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_asset_locations_agency_id ON public.asset_locations(agency_id);
    CREATE INDEX IF NOT EXISTS idx_asset_locations_code ON public.asset_locations(code);
    CREATE INDEX IF NOT EXISTS idx_asset_locations_is_active ON public.asset_locations(is_active);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_asset_locations_updated_at ON public.asset_locations;
    CREATE TRIGGER update_asset_locations_updated_at
      BEFORE UPDATE ON public.asset_locations
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure assets table exists
 */
async function ensureAssetsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.assets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      asset_number VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category_id UUID REFERENCES public.asset_categories(id),
      location_id UUID REFERENCES public.asset_locations(id),
      department_id UUID,
      assigned_to UUID REFERENCES public.users(id),
      purchase_date DATE,
      purchase_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
      current_value DECIMAL(15,2) DEFAULT 0,
      residual_value DECIMAL(15,2) DEFAULT 0,
      useful_life_years INTEGER,
      depreciation_method VARCHAR(50) DEFAULT 'straight_line',
      depreciation_rate DECIMAL(5,2), -- percentage
      status VARCHAR(50) DEFAULT 'active', -- active, maintenance, disposed, written_off
      condition_status VARCHAR(50) DEFAULT 'good', -- excellent, good, fair, poor
      serial_number VARCHAR(255),
      model_number VARCHAR(255),
      manufacturer VARCHAR(255),
      supplier_id UUID REFERENCES public.suppliers(id),
      warranty_start_date DATE,
      warranty_end_date DATE,
      insurance_policy_number VARCHAR(255),
      insurance_value DECIMAL(15,2),
      insurance_expiry_date DATE,
      notes TEXT,
      image_url TEXT,
      document_url TEXT,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_assets_agency_id ON public.assets(agency_id);
    CREATE INDEX IF NOT EXISTS idx_assets_asset_number ON public.assets(asset_number);
    CREATE INDEX IF NOT EXISTS idx_assets_category_id ON public.assets(category_id);
    CREATE INDEX IF NOT EXISTS idx_assets_location_id ON public.assets(location_id);
    CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON public.assets(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
    CREATE INDEX IF NOT EXISTS idx_assets_department_id ON public.assets(department_id);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_assets_updated_at ON public.assets;
    CREATE TRIGGER update_assets_updated_at
      BEFORE UPDATE ON public.assets
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);

  // Create audit trigger
  await client.query(`
    DROP TRIGGER IF EXISTS audit_assets_changes ON public.assets;
    CREATE TRIGGER audit_assets_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.assets
      FOR EACH ROW
      EXECUTE FUNCTION public.log_audit_change();
  `);
}

/**
 * Ensure asset_depreciation table exists
 */
async function ensureAssetDepreciationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.asset_depreciation (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
      depreciation_date DATE NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      depreciation_amount DECIMAL(15,2) NOT NULL,
      accumulated_depreciation DECIMAL(15,2) NOT NULL,
      book_value DECIMAL(15,2) NOT NULL,
      depreciation_method VARCHAR(50) NOT NULL,
      is_posted BOOLEAN DEFAULT false,
      journal_entry_id UUID, -- Reference to journal entry if posted to ledger
      posted_at TIMESTAMP WITH TIME ZONE,
      posted_by UUID REFERENCES public.users(id),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_asset_depreciation_agency_id ON public.asset_depreciation(agency_id);
    CREATE INDEX IF NOT EXISTS idx_asset_depreciation_asset_id ON public.asset_depreciation(asset_id);
    CREATE INDEX IF NOT EXISTS idx_asset_depreciation_depreciation_date ON public.asset_depreciation(depreciation_date);
    CREATE INDEX IF NOT EXISTS idx_asset_depreciation_is_posted ON public.asset_depreciation(is_posted);
    CREATE INDEX IF NOT EXISTS idx_asset_depreciation_period ON public.asset_depreciation(period_start, period_end);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_asset_depreciation_updated_at ON public.asset_depreciation;
    CREATE TRIGGER update_asset_depreciation_updated_at
      BEFORE UPDATE ON public.asset_depreciation
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure asset_maintenance table exists
 */
async function ensureAssetMaintenanceTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.asset_maintenance (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
      maintenance_type VARCHAR(50) NOT NULL, -- scheduled, preventive, corrective, emergency
      title VARCHAR(255) NOT NULL,
      description TEXT,
      scheduled_date DATE,
      completed_date DATE,
      due_date DATE,
      status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled, overdue
      priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
      cost DECIMAL(15,2) DEFAULT 0,
      vendor_id UUID REFERENCES public.suppliers(id),
      technician VARCHAR(255),
      technician_contact VARCHAR(255),
      parts_used TEXT,
      labor_hours DECIMAL(10,2),
      notes TEXT,
      next_maintenance_date DATE,
      performed_by UUID REFERENCES public.users(id),
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_asset_maintenance_agency_id ON public.asset_maintenance(agency_id);
    CREATE INDEX IF NOT EXISTS idx_asset_maintenance_asset_id ON public.asset_maintenance(asset_id);
    CREATE INDEX IF NOT EXISTS idx_asset_maintenance_status ON public.asset_maintenance(status);
    CREATE INDEX IF NOT EXISTS idx_asset_maintenance_scheduled_date ON public.asset_maintenance(scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_asset_maintenance_due_date ON public.asset_maintenance(due_date);
    CREATE INDEX IF NOT EXISTS idx_asset_maintenance_type ON public.asset_maintenance(maintenance_type);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_asset_maintenance_updated_at ON public.asset_maintenance;
    CREATE TRIGGER update_asset_maintenance_updated_at
      BEFORE UPDATE ON public.asset_maintenance
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure asset_disposals table exists
 */
async function ensureAssetDisposalsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.asset_disposals (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
      disposal_number VARCHAR(100) UNIQUE NOT NULL,
      disposal_date DATE NOT NULL,
      disposal_type VARCHAR(50) NOT NULL, -- sale, scrap, donation, write_off, transfer
      disposal_reason TEXT,
      disposal_value DECIMAL(15,2) DEFAULT 0,
      buyer_name VARCHAR(255),
      buyer_contact VARCHAR(255),
      disposal_method VARCHAR(50), -- auction, direct_sale, scrap_dealer, etc.
      approval_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
      approved_by UUID REFERENCES public.users(id),
      approved_at TIMESTAMP WITH TIME ZONE,
      disposal_cost DECIMAL(15,2) DEFAULT 0, -- Cost of disposal process
      net_proceeds DECIMAL(15,2) DEFAULT 0, -- disposal_value - disposal_cost
      journal_entry_id UUID, -- Reference to journal entry if posted
      posted_at TIMESTAMP WITH TIME ZONE,
      posted_by UUID REFERENCES public.users(id),
      notes TEXT,
      document_url TEXT,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_asset_disposals_agency_id ON public.asset_disposals(agency_id);
    CREATE INDEX IF NOT EXISTS idx_asset_disposals_asset_id ON public.asset_disposals(asset_id);
    CREATE INDEX IF NOT EXISTS idx_asset_disposals_disposal_number ON public.asset_disposals(disposal_number);
    CREATE INDEX IF NOT EXISTS idx_asset_disposals_disposal_date ON public.asset_disposals(disposal_date);
    CREATE INDEX IF NOT EXISTS idx_asset_disposals_approval_status ON public.asset_disposals(approval_status);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_asset_disposals_updated_at ON public.asset_disposals;
    CREATE TRIGGER update_asset_disposals_updated_at
      BEFORE UPDATE ON public.asset_disposals
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure all asset management tables
 */
async function ensureAssetManagementSchema(client) {
  console.log('[SQL] Ensuring asset management schema...');
  
  try {
    // Check if suppliers table exists (for vendor references)
    const suppliersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'suppliers'
      );
    `);
    
    if (!suppliersCheck.rows[0].exists) {
      console.log('[SQL] ⚠️ Suppliers table not found, asset management will work without vendor references');
    }

    await ensureAssetCategoriesTable(client);
    await ensureAssetLocationsTable(client);
    await ensureAssetsTable(client);
    await ensureAssetDepreciationTable(client);
    await ensureAssetMaintenanceTable(client);
    await ensureAssetDisposalsTable(client);
    
    console.log('[SQL] ✅ Asset management schema ensured');
  } catch (error) {
    console.error('[SQL] ❌ Error ensuring asset management schema:', error.message);
    throw error;
  }
}

module.exports = {
  ensureAssetManagementSchema,
  ensureAssetCategoriesTable,
  ensureAssetLocationsTable,
  ensureAssetsTable,
  ensureAssetDepreciationTable,
  ensureAssetMaintenanceTable,
  ensureAssetDisposalsTable,
};

