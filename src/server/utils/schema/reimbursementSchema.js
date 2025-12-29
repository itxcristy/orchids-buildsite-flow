/**
 * Expense and Reimbursement Schema
 * 
 * Manages:
 * - expense_categories: Expense category definitions
 * - reimbursement_requests: Reimbursement request records
 * - reimbursement_attachments: Receipt and attachment files
 * - receipts: Receipt records
 * 
 * Dependencies:
 * - users (for user_id and created_by references)
 */

/**
 * Ensure expense_categories table exists
 */
async function ensureExpenseCategoriesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.expense_categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID,
      name TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(agency_id, name)
    );
  `);
  
  // Add agency_id column if it doesn't exist (for existing tables)
  await client.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'expense_categories' 
        AND column_name = 'agency_id'
      ) THEN
        ALTER TABLE public.expense_categories ADD COLUMN agency_id UUID;
      END IF;
    END $$;
  `);
  
  // Drop old unique constraint on name if it exists and create new one
  await client.query(`
    DO $$ 
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'expense_categories_name_key'
      ) THEN
        ALTER TABLE public.expense_categories DROP CONSTRAINT expense_categories_name_key;
      END IF;
    END $$;
  `);
  
  // Create index on agency_id
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_expense_categories_agency_id 
    ON public.expense_categories(agency_id);
  `);
}

/**
 * Ensure reimbursement_requests table exists
 */
async function ensureReimbursementRequestsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.reimbursement_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      request_number TEXT UNIQUE,
      agency_id UUID,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      employee_id UUID REFERENCES public.users(id),
      category_id UUID REFERENCES public.expense_categories(id),
      amount NUMERIC(15, 2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      approved_by UUID REFERENCES public.users(id),
      approved_at TIMESTAMP WITH TIME ZONE,
      rejected_by UUID REFERENCES public.users(id),
      rejected_at TIMESTAMP WITH TIME ZONE,
      rejection_reason TEXT,
      paid_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  
  // Add agency_id column if it doesn't exist (for existing tables)
  await client.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reimbursement_requests' 
        AND column_name = 'agency_id'
      ) THEN
        ALTER TABLE public.reimbursement_requests ADD COLUMN agency_id UUID;
      END IF;
    END $$;
  `);
  
  // Add employee_id column if it doesn't exist (for existing tables)
  await client.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reimbursement_requests' 
        AND column_name = 'employee_id'
      ) THEN
        ALTER TABLE public.reimbursement_requests ADD COLUMN employee_id UUID REFERENCES public.users(id);
        -- Populate employee_id from user_id for existing records
        UPDATE public.reimbursement_requests 
        SET employee_id = user_id 
        WHERE employee_id IS NULL;
      END IF;
    END $$;
  `);
  
  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_agency_id 
    ON public.reimbursement_requests(agency_id);
  `);
  
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_employee_id 
    ON public.reimbursement_requests(employee_id);
  `);
}

/**
 * Ensure reimbursement_attachments table exists
 */
async function ensureReimbursementAttachmentsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.reimbursement_attachments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      reimbursement_request_id UUID NOT NULL REFERENCES public.reimbursement_requests(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      file_size BIGINT,
      uploaded_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure receipts table exists
 */
async function ensureReceiptsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.receipts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      receipt_number TEXT UNIQUE,
      reimbursement_request_id UUID REFERENCES public.reimbursement_requests(id),
      category_id UUID REFERENCES public.expense_categories(id),
      amount NUMERIC(15, 2) NOT NULL,
      receipt_date DATE NOT NULL,
      merchant_name TEXT,
      description TEXT,
      file_path TEXT,
      file_name TEXT,
      uploaded_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure all reimbursement tables
 */
async function ensureReimbursementSchema(client) {
  console.log('[SQL] Ensuring reimbursement schema...');
  
  await ensureExpenseCategoriesTable(client);
  await ensureReimbursementRequestsTable(client);
  await ensureReimbursementAttachmentsTable(client);
  await ensureReceiptsTable(client);
  
  console.log('[SQL] ✅ Reimbursement schema ensured');
}

module.exports = {
  ensureReimbursementSchema,
  ensureExpenseCategoriesTable,
  ensureReimbursementRequestsTable,
  ensureReimbursementAttachmentsTable,
  ensureReceiptsTable,
};
