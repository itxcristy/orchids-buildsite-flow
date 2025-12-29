/**
 * GST Compliance Schema
 * 
 * Manages:
 * - gst_settings: GST configuration and settings
 * - gst_returns: GST return filing records
 * - gst_transactions: GST transaction records
 * 
 * Dependencies:
 * - users (for created_by and filed_by references)
 * - invoices (for invoice_id reference in gst_transactions)
 */

/**
 * Ensure gst_settings table exists
 */
async function ensureGstSettingsTable(client) {
  // Check if table exists
  const tableExists = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'gst_settings'
    );
  `);
  
  if (tableExists.rows[0].exists) {
    // Check if table has correct structure
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'gst_settings'
    `);
    
    const existingColumns = columnCheck.rows.map(r => r.column_name);
    const hasAgencyId = existingColumns.includes('agency_id');
    const hasGstin = existingColumns.includes('gstin');
    
    // If table exists but has wrong structure, drop and recreate
    if (!hasAgencyId || !hasGstin) {
      console.log('[SQL] Dropping old gst_settings table to recreate with correct structure...');
      await client.query(`DROP TABLE IF EXISTS public.gst_settings CASCADE;`);
    }
  }
  
  // Create table with correct structure
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.gst_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agency_id UUID NOT NULL,
      gstin TEXT NOT NULL,
      legal_name TEXT NOT NULL,
      trade_name TEXT,
      business_type TEXT NOT NULL CHECK (business_type IN ('regular', 'composition', 'casual', 'non_resident')),
      filing_frequency TEXT NOT NULL CHECK (filing_frequency IN ('monthly', 'quarterly', 'annual')),
      composition_scheme BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  
  // Create indexes (safe to run multiple times)
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_gst_settings_agency_id ON public.gst_settings(agency_id);
    CREATE INDEX IF NOT EXISTS idx_gst_settings_gstin ON public.gst_settings(gstin);
    CREATE INDEX IF NOT EXISTS idx_gst_settings_is_active ON public.gst_settings(is_active);
  `);
}

/**
 * Ensure gst_returns table exists
 */
async function ensureGstReturnsTable(client) {
  const tableExists = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'gst_returns'
    );
  `);
  
  if (tableExists.rows[0].exists) {
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'gst_returns'
    `);
    
    const existingColumns = columnCheck.rows.map(r => r.column_name);
    const hasAgencyId = existingColumns.includes('agency_id');
    const hasReturnType = existingColumns.includes('return_type');
    
    if (!hasAgencyId || !hasReturnType) {
      console.log('[SQL] Dropping old gst_returns table to recreate with correct structure...');
      await client.query(`DROP TABLE IF EXISTS public.gst_returns CASCADE;`);
    }
  }
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.gst_returns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agency_id UUID NOT NULL,
      return_type TEXT NOT NULL CHECK (return_type IN ('GSTR1', 'GSTR3B', 'GSTR9', 'GSTR4')),
      filing_period DATE NOT NULL,
      due_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filed', 'late', 'cancelled')),
      total_taxable_value NUMERIC(15, 2) DEFAULT 0,
      total_tax_amount NUMERIC(15, 2) DEFAULT 0,
      cgst_amount NUMERIC(15, 2) DEFAULT 0,
      sgst_amount NUMERIC(15, 2) DEFAULT 0,
      igst_amount NUMERIC(15, 2) DEFAULT 0,
      cess_amount NUMERIC(15, 2) DEFAULT 0,
      filed_date DATE,
      acknowledgment_number TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_gst_returns_agency_id ON public.gst_returns(agency_id);
    CREATE INDEX IF NOT EXISTS idx_gst_returns_filing_period ON public.gst_returns(filing_period);
    CREATE INDEX IF NOT EXISTS idx_gst_returns_status ON public.gst_returns(status);
    CREATE INDEX IF NOT EXISTS idx_gst_returns_return_type ON public.gst_returns(return_type);
  `);
}

/**
 * Ensure gst_transactions table exists
 */
async function ensureGstTransactionsTable(client) {
  const tableExists = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'gst_transactions'
    );
  `);
  
  if (tableExists.rows[0].exists) {
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'gst_transactions'
    `);
    
    const existingColumns = columnCheck.rows.map(r => r.column_name);
    const hasAgencyId = existingColumns.includes('agency_id');
    const hasInvoiceNumber = existingColumns.includes('invoice_number');
    
    if (!hasAgencyId || !hasInvoiceNumber) {
      console.log('[SQL] Dropping old gst_transactions table to recreate with correct structure...');
      await client.query(`DROP TABLE IF EXISTS public.gst_transactions CASCADE;`);
    }
  }
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.gst_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agency_id UUID NOT NULL,
      transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'purchase', 'credit_note', 'debit_note')),
      invoice_number TEXT NOT NULL,
      invoice_date DATE NOT NULL,
      customer_gstin TEXT,
      customer_name TEXT NOT NULL,
      place_of_supply TEXT,
      hsn_sac_code TEXT,
      description TEXT,
      quantity NUMERIC(10, 2),
      unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
      taxable_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
      cgst_rate NUMERIC(5, 2) DEFAULT 0,
      sgst_rate NUMERIC(5, 2) DEFAULT 0,
      igst_rate NUMERIC(5, 2) DEFAULT 0,
      cess_rate NUMERIC(5, 2) DEFAULT 0,
      cgst_amount NUMERIC(15, 2) DEFAULT 0,
      sgst_amount NUMERIC(15, 2) DEFAULT 0,
      igst_amount NUMERIC(15, 2) DEFAULT 0,
      cess_amount NUMERIC(15, 2) DEFAULT 0,
      total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_gst_transactions_agency_id ON public.gst_transactions(agency_id);
    CREATE INDEX IF NOT EXISTS idx_gst_transactions_invoice_date ON public.gst_transactions(invoice_date);
    CREATE INDEX IF NOT EXISTS idx_gst_transactions_transaction_type ON public.gst_transactions(transaction_type);
    CREATE INDEX IF NOT EXISTS idx_gst_transactions_invoice_number ON public.gst_transactions(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_gst_transactions_created_at ON public.gst_transactions(created_at);
  `);
}

/**
 * Ensure calculate_gst_liability function exists
 */
async function ensureCalculateGstLiabilityFunction(client) {
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION public.calculate_gst_liability(
        p_agency_id UUID,
        p_start_date DATE,
        p_end_date DATE
      )
      RETURNS TABLE (
        total_taxable_value NUMERIC,
        total_cgst NUMERIC,
        total_sgst NUMERIC,
        total_igst NUMERIC,
        total_cess NUMERIC,
        total_tax NUMERIC
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          COALESCE(SUM(gt.taxable_value), 0)::NUMERIC AS total_taxable_value,
          COALESCE(SUM(gt.cgst_amount), 0)::NUMERIC AS total_cgst,
          COALESCE(SUM(gt.sgst_amount), 0)::NUMERIC AS total_sgst,
          COALESCE(SUM(gt.igst_amount), 0)::NUMERIC AS total_igst,
          COALESCE(SUM(gt.cess_amount), 0)::NUMERIC AS total_cess,
          COALESCE(
            SUM(gt.cgst_amount) + 
            SUM(gt.sgst_amount) + 
            SUM(gt.igst_amount) + 
            SUM(gt.cess_amount), 
            0
          )::NUMERIC AS total_tax
        FROM public.gst_transactions gt
        WHERE gt.agency_id = p_agency_id
          AND gt.invoice_date >= p_start_date
          AND gt.invoice_date <= p_end_date
          AND gt.transaction_type IN ('sale', 'debit_note');
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);
    console.log('[SQL] ✅ calculate_gst_liability function created');
  } catch (error) {
    console.error('[SQL] ❌ Error creating calculate_gst_liability function:', error.message);
    throw error;
  }
}

/**
 * Ensure all GST tables and functions
 */
async function ensureGstSchema(client) {
  console.log('[SQL] Ensuring GST schema...');
  
  try {
    await ensureGstSettingsTable(client);
    await ensureGstReturnsTable(client);
    await ensureGstTransactionsTable(client);
    await ensureCalculateGstLiabilityFunction(client);
    
    // Ensure triggers for updated_at
    try {
      await client.query(`
        DROP TRIGGER IF EXISTS update_gst_settings_updated_at ON public.gst_settings;
        CREATE TRIGGER update_gst_settings_updated_at
          BEFORE UPDATE ON public.gst_settings
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column();
      `);
      
      await client.query(`
        DROP TRIGGER IF EXISTS update_gst_transactions_updated_at ON public.gst_transactions;
        CREATE TRIGGER update_gst_transactions_updated_at
          BEFORE UPDATE ON public.gst_transactions
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column();
      `);
      
      await client.query(`
        DROP TRIGGER IF EXISTS update_gst_returns_updated_at ON public.gst_returns;
        CREATE TRIGGER update_gst_returns_updated_at
          BEFORE UPDATE ON public.gst_returns
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column();
      `);
    } catch (error) {
      console.warn('[SQL] Could not create triggers (update_updated_at_column function may not exist yet):', error.message);
    }
    
    console.log('[SQL] ✅ GST schema ensured');
  } catch (error) {
    console.error('[SQL] ❌ Error ensuring GST schema:', error.message);
    // Don't throw - allow other schemas to continue
    console.warn('[SQL] Continuing with other schemas despite GST schema error');
  }
}

module.exports = {
  ensureGstSchema,
  ensureGstSettingsTable,
  ensureGstReturnsTable,
  ensureGstTransactionsTable,
  ensureCalculateGstLiabilityFunction,
};
