/**
 * Clients and Financial Management Schema
 * 
 * Manages:
 * - clients: Client/customer records
 * - invoices: Invoice records with payment tracking
 * - quotations: Quotation records
 * - quotation_templates: Reusable quotation templates
 * - quotation_line_items: Quotation line item details
 * - chart_of_accounts: Chart of accounts structure
 * - journal_entries: Journal entry records
 * - journal_entry_lines: Journal entry line items
 * - jobs: Job records with costing
 * - job_categories: Job category classification
 * - job_cost_items: Individual job cost tracking
 * 
 * Dependencies:
 * - users (for created_by references)
 * - chart_of_accounts must exist before journal_entry_lines (for account_id FK)
 */

/**
 * Ensure clients table exists
 */
async function ensureClientsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.clients (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      client_number TEXT,
      name TEXT NOT NULL,
      company_name TEXT,
      industry TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      postal_code TEXT,
      country TEXT,
      website TEXT,
      contact_person TEXT,
      contact_position TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      status TEXT DEFAULT 'active',
      billing_address TEXT,
      billing_city TEXT,
      billing_state TEXT,
      billing_postal_code TEXT,
      billing_country TEXT,
      tax_id TEXT,
      payment_terms TEXT,
      notes TEXT,
      -- Multi-tenant scoping + soft delete
      agency_id UUID,
      is_active BOOLEAN DEFAULT true,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Ensure clients.agency_id and clients.is_active exist for multi-tenant scoping and soft delete
  try {
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'clients' 
          AND column_name = 'agency_id'
        ) THEN
          ALTER TABLE public.clients ADD COLUMN agency_id UUID;
          CREATE INDEX IF NOT EXISTS idx_clients_agency_id ON public.clients(agency_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'clients' 
          AND column_name = 'is_active'
        ) THEN
          ALTER TABLE public.clients ADD COLUMN is_active BOOLEAN DEFAULT true;
          CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients(is_active);
        END IF;
      END $$;
    `);
  } catch (error) {
    console.warn('[SQL] Warning: Could not ensure agency_id/is_active on clients:', error.message);
  }
}

/**
 * Ensure invoices table exists
 */
async function ensureInvoicesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.invoices (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      invoice_number TEXT UNIQUE,
      client_id UUID REFERENCES public.clients(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'draft',
      issue_date DATE NOT NULL,
      due_date DATE,
      subtotal NUMERIC(15, 2) DEFAULT 0,
      tax_rate NUMERIC(5, 2) DEFAULT 0,
      discount NUMERIC(15, 2) DEFAULT 0,
      total_amount NUMERIC(15, 2) DEFAULT 0,
      notes TEXT,
      agency_id UUID,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add missing columns if they don't exist (for backward compatibility)
  await client.query(`
    DO $$ 
    BEGIN
      -- Add agency_id column if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'agency_id'
      ) THEN
        ALTER TABLE public.invoices ADD COLUMN agency_id UUID;
        CREATE INDEX IF NOT EXISTS idx_invoices_agency_id ON public.invoices(agency_id);
      END IF;

      -- Add created_at index if it doesn't exist
      CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);
    END $$;
  `);
}

/**
 * Ensure quotations table exists
 */
async function ensureQuotationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.quotations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      quotation_number TEXT UNIQUE,
      quote_number TEXT,
      client_id UUID REFERENCES public.clients(id),
      template_id UUID REFERENCES public.quotation_templates(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'draft',
      issue_date DATE,
      expiry_date DATE,
      valid_until DATE,
      subtotal NUMERIC(15, 2) DEFAULT 0,
      tax_rate NUMERIC(5, 2) DEFAULT 0,
      tax_amount NUMERIC(15, 2) DEFAULT 0,
      discount NUMERIC(15, 2) DEFAULT 0,
      total_amount NUMERIC(15, 2) DEFAULT 0,
      notes TEXT,
      terms_and_conditions TEXT,
      terms_conditions TEXT,
      -- Multi-tenant scoping
      agency_id UUID,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Ensure quotations multi-tenant and additional columns exist
  try {
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'quotations' 
          AND column_name = 'agency_id'
        ) THEN
          ALTER TABLE public.quotations ADD COLUMN agency_id UUID;
          CREATE INDEX IF NOT EXISTS idx_quotations_agency_id ON public.quotations(agency_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'quotations' 
          AND column_name = 'quote_number'
        ) THEN
          ALTER TABLE public.quotations ADD COLUMN quote_number TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'quotations' 
          AND column_name = 'template_id'
        ) THEN
          ALTER TABLE public.quotations ADD COLUMN template_id UUID REFERENCES public.quotation_templates(id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'quotations' 
          AND column_name = 'valid_until'
        ) THEN
          ALTER TABLE public.quotations ADD COLUMN valid_until DATE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'quotations' 
          AND column_name = 'tax_amount'
        ) THEN
          ALTER TABLE public.quotations ADD COLUMN tax_amount NUMERIC(15, 2) DEFAULT 0;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'quotations' 
          AND column_name = 'terms_conditions'
        ) THEN
          ALTER TABLE public.quotations ADD COLUMN terms_conditions TEXT;
        END IF;
      END $$;
    `);
  } catch (error) {
    console.warn('[SQL] Warning: Could not add multi-tenant/additional columns to quotations:', error.message);
  }
}

/**
 * Ensure quotation_templates table exists
 */
async function ensureQuotationTemplatesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.quotation_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      template_data JSONB,
      is_default BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      last_used TIMESTAMP WITH TIME ZONE,
      -- Multi-tenant scoping
      agency_id UUID,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Ensure quotation_templates multi-tenant and additional columns exist
  try {
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'quotation_templates' 
          AND column_name = 'agency_id'
        ) THEN
          ALTER TABLE public.quotation_templates ADD COLUMN agency_id UUID;
          CREATE INDEX IF NOT EXISTS idx_quotation_templates_agency_id ON public.quotation_templates(agency_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'quotation_templates' 
          AND column_name = 'is_active'
        ) THEN
          ALTER TABLE public.quotation_templates ADD COLUMN is_active BOOLEAN DEFAULT true;
          CREATE INDEX IF NOT EXISTS idx_quotation_templates_is_active ON public.quotation_templates(is_active);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'quotation_templates' 
          AND column_name = 'last_used'
        ) THEN
          ALTER TABLE public.quotation_templates ADD COLUMN last_used TIMESTAMP WITH TIME ZONE;
        END IF;
      END $$;
    `);
  } catch (error) {
    console.warn('[SQL] Warning: Could not add multi-tenant/additional columns to quotation_templates:', error.message);
  }
}

/**
 * Ensure quotation_line_items table exists
 */
async function ensureQuotationLineItemsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.quotation_line_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      description TEXT,
      quantity NUMERIC(10, 2) DEFAULT 1,
      unit_price NUMERIC(15, 2) DEFAULT 0,
      tax_rate NUMERIC(5, 2) DEFAULT 0,
      discount NUMERIC(15, 2) DEFAULT 0,
      discount_percentage NUMERIC(5, 2) DEFAULT 0,
      line_total NUMERIC(15, 2) DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Ensure quotation_line_items additional columns exist
  try {
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'quotation_line_items' 
          AND column_name = 'discount_percentage'
        ) THEN
          ALTER TABLE public.quotation_line_items ADD COLUMN discount_percentage NUMERIC(5, 2) DEFAULT 0;
        END IF;
      END $$;
    `);
  } catch (error) {
    console.warn('[SQL] Warning: Could not add discount_percentage to quotation_line_items:', error.message);
  }
}

/**
 * Ensure chart_of_accounts table exists
 */
async function ensureChartOfAccountsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      account_code TEXT UNIQUE NOT NULL,
      account_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      parent_account_id UUID REFERENCES public.chart_of_accounts(id),
      is_active BOOLEAN DEFAULT true,
      description TEXT,
      -- Optional creator and multi-tenant scoping
      created_by UUID REFERENCES public.users(id),
      agency_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Ensure chart_of_accounts.agency_id exists
  try {
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'chart_of_accounts' 
          AND column_name = 'agency_id'
        ) THEN
          ALTER TABLE public.chart_of_accounts ADD COLUMN agency_id UUID;
          CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_agency_id ON public.chart_of_accounts(agency_id);
        END IF;
      END $$;
    `);
  } catch (error) {
    console.warn('[SQL] Warning: Could not add agency_id to chart_of_accounts:', error.message);
  }
}

/**
 * Ensure journal_entries table exists
 */
async function ensureJournalEntriesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.journal_entries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      entry_number TEXT UNIQUE,
      entry_date DATE NOT NULL,
      description TEXT,
      reference TEXT,
      status TEXT DEFAULT 'draft',
      -- Multi-tenant support
      agency_id UUID,
      -- Pre-calculated totals for faster queries
      total_debit NUMERIC(15, 2) DEFAULT 0,
      total_credit NUMERIC(15, 2) DEFAULT 0,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Ensure journal_entries multi-tenant and total columns exist
  try {
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'journal_entries' 
          AND column_name = 'agency_id'
        ) THEN
          ALTER TABLE public.journal_entries ADD COLUMN agency_id UUID;
          CREATE INDEX IF NOT EXISTS idx_journal_entries_agency_id ON public.journal_entries(agency_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'journal_entries' 
          AND column_name = 'total_debit'
        ) THEN
          ALTER TABLE public.journal_entries ADD COLUMN total_debit NUMERIC(15, 2) DEFAULT 0;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'journal_entries' 
          AND column_name = 'total_credit'
        ) THEN
          ALTER TABLE public.journal_entries ADD COLUMN total_credit NUMERIC(15, 2) DEFAULT 0;
        END IF;
      END $$;
    `);
  } catch (error) {
    console.warn('[SQL] Warning: Could not add multi-tenant/total columns to journal_entries:', error.message);
  }
}

/**
 * Ensure journal_entry_lines table exists
 */
async function ensureJournalEntryLinesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
      account_id UUID,
      description TEXT,
      debit_amount NUMERIC(15, 2) DEFAULT 0,
      credit_amount NUMERIC(15, 2) DEFAULT 0,
      -- Explicit ordering of lines within an entry
      line_number INTEGER DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Update journal_entry_lines to reference chart_of_accounts
  await client.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'journal_entry_lines_account_id_fkey'
      ) THEN
        ALTER TABLE public.journal_entry_lines
        ADD CONSTRAINT journal_entry_lines_account_id_fkey
        FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);
      END IF;
    END $$;
  `);

  // Ensure journal_entry_lines.line_number exists and is backfilled
  try {
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'journal_entry_lines' 
          AND column_name = 'line_number'
        ) THEN
          ALTER TABLE public.journal_entry_lines ADD COLUMN line_number INTEGER;
        END IF;
      END $$;
    `);

    // Backfill line_number for existing rows where it is NULL or zero
    await client.query(`
      WITH numbered AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY journal_entry_id 
                 ORDER BY created_at, id
               ) AS rn
        FROM public.journal_entry_lines
      )
      UPDATE public.journal_entry_lines jel
      SET line_number = numbered.rn
      FROM numbered
      WHERE jel.id = numbered.id
        AND (jel.line_number IS NULL OR jel.line_number = 0)
    `);
  } catch (error) {
    console.warn('[SQL] Warning: Could not ensure line_number on journal_entry_lines:', error.message);
  }
}

/**
 * Ensure job_categories table exists
 */
async function ensureJobCategoriesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.job_categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure jobs table exists
 */
async function ensureJobsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.jobs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      job_number TEXT UNIQUE,
      client_id UUID REFERENCES public.clients(id),
      category_id UUID REFERENCES public.job_categories(id),
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'planning',
      start_date DATE,
      end_date DATE,
      estimated_cost NUMERIC(15, 2) DEFAULT 0,
      actual_cost NUMERIC(15, 2) DEFAULT 0,
      budget NUMERIC(15, 2) DEFAULT 0,
      -- Multi-tenant scoping
      agency_id UUID,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Ensure jobs.agency_id exists
  try {
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'jobs' 
          AND column_name = 'agency_id'
        ) THEN
          ALTER TABLE public.jobs ADD COLUMN agency_id UUID;
          CREATE INDEX IF NOT EXISTS idx_jobs_agency_id ON public.jobs(agency_id);
        END IF;
      END $$;
    `);
  } catch (error) {
    console.warn('[SQL] Warning: Could not add agency_id to jobs:', error.message);
  }
}

/**
 * Ensure job_cost_items table exists
 */
async function ensureJobCostItemsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.job_cost_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      category TEXT,
      quantity NUMERIC(10, 2) DEFAULT 1,
      unit_cost NUMERIC(15, 2) DEFAULT 0,
      total_cost NUMERIC(15, 2) DEFAULT 0,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure all clients and financial tables
 */
async function ensureClientsFinancialSchema(client) {
  console.log('[SQL] Ensuring clients and financial schema...');
  
  // Create tables in dependency order
  await ensureClientsTable(client);
  await ensureInvoicesTable(client);
  await ensureQuotationTemplatesTable(client); // Must be before quotations (FK dependency)
  await ensureQuotationsTable(client);
  await ensureQuotationLineItemsTable(client);
  await ensureChartOfAccountsTable(client);
  await ensureJournalEntriesTable(client);
  await ensureJournalEntryLinesTable(client);
  await ensureJobCategoriesTable(client);
  await ensureJobsTable(client);
  await ensureJobCostItemsTable(client);
  
  console.log('[SQL] ✅ Clients and financial schema ensured');
}

module.exports = {
  ensureClientsFinancialSchema,
  ensureClientsTable,
  ensureInvoicesTable,
  ensureQuotationsTable,
  ensureQuotationTemplatesTable,
  ensureQuotationLineItemsTable,
  ensureChartOfAccountsTable,
  ensureJournalEntriesTable,
  ensureJournalEntryLinesTable,
  ensureJobCategoriesTable,
  ensureJobsTable,
  ensureJobCostItemsTable,
};
