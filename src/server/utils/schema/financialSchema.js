/**
 * Financial Management Schema Enhancements
 * 
 * Adds:
 * - currencies: Currency and exchange rate management
 * - bank_accounts: Bank account management
 * - bank_transactions: Bank transaction records
 * - bank_reconciliations: Bank reconciliation records
 * - budgets: Budget planning and tracking
 * - budget_items: Budget line items
 */

/**
 * Ensure currencies table exists
 */
async function ensureCurrenciesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.currencies (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(3) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      symbol VARCHAR(10),
      exchange_rate DECIMAL(10,4) DEFAULT 1,
      is_base BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_currencies_code ON public.currencies(code);
    CREATE INDEX IF NOT EXISTS idx_currencies_is_base ON public.currencies(is_base);
  `);

  // Insert default currencies if table is empty
  const countResult = await client.query('SELECT COUNT(*) as count FROM public.currencies');
  if (parseInt(countResult.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO public.currencies (code, name, symbol, exchange_rate, is_base) VALUES
        ('INR', 'Indian Rupee', '₹', 1, true),
        ('USD', 'US Dollar', '$', 0.012, false),
        ('EUR', 'Euro', '€', 0.011, false),
        ('GBP', 'British Pound', '£', 0.0095, false),
        ('JPY', 'Japanese Yen', '¥', 1.8, false),
        ('AUD', 'Australian Dollar', 'A$', 0.018, false),
        ('CAD', 'Canadian Dollar', 'C$', 0.016, false),
        ('CHF', 'Swiss Franc', 'CHF', 0.011, false),
        ('CNY', 'Chinese Yuan', '¥', 0.087, false),
        ('AED', 'UAE Dirham', 'د.إ', 0.044, false),
        ('SAR', 'Saudi Riyal', '﷼', 0.045, false)
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_currencies_updated_at ON public.currencies;
    CREATE TRIGGER update_currencies_updated_at
      BEFORE UPDATE ON public.currencies
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure bank_accounts table exists
 */
async function ensureBankAccountsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.bank_accounts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      account_name VARCHAR(255) NOT NULL,
      account_number VARCHAR(100),
      bank_name VARCHAR(255) NOT NULL,
      branch_name VARCHAR(255),
      ifsc_code VARCHAR(20),
      swift_code VARCHAR(20),
      account_type VARCHAR(50), -- savings, current, fixed_deposit, etc.
      currency VARCHAR(10) DEFAULT 'INR',
      opening_balance DECIMAL(15,2) DEFAULT 0,
      current_balance DECIMAL(15,2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      is_primary BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_bank_accounts_agency_id ON public.bank_accounts(agency_id);
    CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON public.bank_accounts(is_active);
  `);
}

/**
 * Ensure bank_transactions table exists
 */
async function ensureBankTransactionsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.bank_transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
      transaction_date DATE NOT NULL,
      transaction_type VARCHAR(50) NOT NULL, -- debit, credit
      amount DECIMAL(15,2) NOT NULL,
      balance_after DECIMAL(15,2),
      description TEXT,
      reference_number VARCHAR(100),
      cheque_number VARCHAR(100),
      category VARCHAR(100), -- payment, receipt, transfer, fee, interest, etc.
      reconciled BOOLEAN DEFAULT false,
      reconciliation_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_agency_id ON public.bank_transactions(agency_id);
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_bank_account_id ON public.bank_transactions(bank_account_id);
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON public.bank_transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciled ON public.bank_transactions(reconciled);
  `);
}

/**
 * Ensure bank_reconciliations table exists
 */
async function ensureBankReconciliationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
      reconciliation_date DATE NOT NULL,
      statement_balance DECIMAL(15,2) NOT NULL,
      book_balance DECIMAL(15,2) NOT NULL,
      difference DECIMAL(15,2) GENERATED ALWAYS AS (statement_balance - book_balance) STORED,
      status VARCHAR(50) DEFAULT 'pending', -- pending, reconciled, adjusted
      notes TEXT,
      reconciled_by UUID REFERENCES public.users(id),
      reconciled_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_agency_id ON public.bank_reconciliations(agency_id);
    CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_bank_account_id ON public.bank_reconciliations(bank_account_id);
    CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_date ON public.bank_reconciliations(reconciliation_date);
  `);
}

/**
 * Ensure budgets table exists
 */
async function ensureBudgetsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.budgets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      budget_name VARCHAR(255) NOT NULL,
      budget_type VARCHAR(50), -- annual, quarterly, monthly, project, department
      fiscal_year VARCHAR(10), -- 2024, 2025, etc.
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      department_id UUID,
      project_id UUID,
      total_budget DECIMAL(15,2) NOT NULL,
      spent_amount DECIMAL(15,2) DEFAULT 0,
      remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (total_budget - spent_amount) STORED,
      status VARCHAR(50) DEFAULT 'draft', -- draft, approved, active, closed
      approved_by UUID REFERENCES public.users(id),
      approved_at TIMESTAMP WITH TIME ZONE,
      notes TEXT,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_budgets_agency_id ON public.budgets(agency_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year ON public.budgets(fiscal_year);
    CREATE INDEX IF NOT EXISTS idx_budgets_department_id ON public.budgets(department_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_project_id ON public.budgets(project_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_status ON public.budgets(status);
  `);
}

/**
 * Ensure budget_items table exists
 */
async function ensureBudgetItemsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.budget_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
      account_id UUID REFERENCES public.chart_of_accounts(id),
      category VARCHAR(100),
      description TEXT,
      budgeted_amount DECIMAL(15,2) NOT NULL,
      spent_amount DECIMAL(15,2) DEFAULT 0,
      remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (budgeted_amount - spent_amount) STORED,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON public.budget_items(budget_id);
    CREATE INDEX IF NOT EXISTS idx_budget_items_account_id ON public.budget_items(account_id);
  `);
}

/**
 * Ensure all financial enhancement tables
 */
async function ensureFinancialSchema(client) {
  console.log('[SQL] Ensuring financial enhancements schema...');
  
  try {
    await ensureCurrenciesTable(client);
    await ensureBankAccountsTable(client);
    await ensureBankTransactionsTable(client);
    await ensureBankReconciliationsTable(client);
    await ensureBudgetsTable(client);
    await ensureBudgetItemsTable(client);
    
    console.log('[SQL] ✅ Financial enhancements schema ensured');
  } catch (error) {
    console.error('[SQL] ❌ Error ensuring financial schema:', error.message);
    throw error;
  }
}

module.exports = {
  ensureFinancialSchema,
  ensureCurrenciesTable,
  ensureBankAccountsTable,
  ensureBankTransactionsTable,
  ensureBankReconciliationsTable,
  ensureBudgetsTable,
  ensureBudgetItemsTable,
};
