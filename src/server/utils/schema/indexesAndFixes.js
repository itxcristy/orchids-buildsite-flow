/**
 * Indexes and Backward Compatibility Fixes
 * 
 * This module centralizes:
 * - All index creation for performance
 * - Backward compatibility ALTER TABLE statements
 * - Column additions for existing databases
 * 
 * Note: Indexes are created with IF NOT EXISTS to be idempotent.
 * Backward compatibility fixes check for column existence before adding.
 */

/**
 * Ensure all indexes for authentication and authorization tables
 */
async function ensureAuthIndexes(client) {
  await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON public.profiles(agency_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_permissions_category ON public.permissions(category)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_permissions_name ON public.permissions(name)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id)`);
}

/**
 * Ensure all indexes for departments and teams tables
 */
async function ensureDepartmentsIndexes(client) {
  await client.query(`CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON public.departments(manager_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_departments_parent_department_id ON public.departments(parent_department_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_departments_agency_id ON public.departments(agency_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_departments_name ON public.departments(name)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_team_assignments_user_id ON public.team_assignments(user_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_team_assignments_department_id ON public.team_assignments(department_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_team_assignments_is_active ON public.team_assignments(is_active)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_team_assignments_agency_id ON public.team_assignments(agency_id)`);
}

/**
 * Ensure all indexes for HR tables
 */
async function ensureHrIndexes(client) {
  // Check if tables exist before creating indexes
  const tableCheck = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('employee_details', 'attendance', 'leave_requests', 'payroll', 'payroll_periods', 'employee_salary_details', 'employee_files')
  `);
  
  const existingTables = new Set(tableCheck.rows.map(r => r.table_name));
  
  if (existingTables.has('employee_details')) {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employee_details_user_id ON public.employee_details(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employee_details_agency_id ON public.employee_details(agency_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employee_details_is_active ON public.employee_details(is_active)`);
  }
  
  if (existingTables.has('attendance')) {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance(employee_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date)`);
  }
  
  if (existingTables.has('leave_requests')) {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON public.leave_requests(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date ON public.leave_requests(start_date)`);
  }
  
  if (existingTables.has('payroll')) {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON public.payroll(employee_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payroll_period_id ON public.payroll(payroll_period_id)`);
  }
  
  if (existingTables.has('payroll_periods')) {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON public.payroll_periods(status)`);
  }
  
  if (existingTables.has('employee_salary_details')) {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employee_salary_details_employee_id ON public.employee_salary_details(employee_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employee_salary_details_agency_id ON public.employee_salary_details(agency_id)`);
  }
  
  if (existingTables.has('employee_files')) {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employee_files_employee_id ON public.employee_files(employee_id)`);
  }
}

/**
 * Ensure all indexes for projects and tasks tables
 */
async function ensureProjectsTasksIndexes(client) {
  await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON public.task_assignments(user_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_task_time_tracking_task_id ON public.task_time_tracking(task_id)`);
}

/**
 * Ensure all indexes for clients and financial tables
 */
async function ensureClientsFinancialIndexes(client) {
  await client.query(`CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_clients_agency_id ON public.clients(agency_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients(is_active)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON public.invoices(issue_date)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON public.quotations(client_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_quotation_line_items_quotation_id ON public.quotation_line_items(quotation_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_account_code ON public.chart_of_accounts(account_code)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_account_type ON public.chart_of_accounts(account_type)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent_account_id ON public.chart_of_accounts(parent_account_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_agency_id ON public.chart_of_accounts(agency_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON public.journal_entries(entry_date)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_journal_entries_agency_id ON public.journal_entries(agency_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON public.journal_entries(status)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_journal_entry_id ON public.journal_entry_lines(journal_entry_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_journal_entry_id_line_number ON public.journal_entry_lines(journal_entry_id, line_number)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON public.jobs(client_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_agency_id ON public.jobs(agency_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_job_cost_items_job_id ON public.job_cost_items(job_id)`);
}

/**
 * Ensure all indexes for CRM tables
 */
async function ensureCrmIndexes(client) {
  // Lead sources indexes
  await client.query(`CREATE INDEX IF NOT EXISTS idx_lead_sources_agency_id ON public.lead_sources(agency_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_lead_sources_is_active ON public.lead_sources(is_active)`);
  
  // Leads indexes
  await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_agency_id ON public.leads(agency_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_source_id ON public.leads(source_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_lead_source_id ON public.leads(lead_source_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(priority)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_due_date ON public.leads(due_date)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date ON public.leads(follow_up_date)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_expected_close_date ON public.leads(expected_close_date)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_converted_to_client_id ON public.leads(converted_to_client_id)`);
  
  // CRM activities indexes
  await client.query(`CREATE INDEX IF NOT EXISTS idx_crm_activities_agency_id ON public.crm_activities(agency_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_crm_activities_lead_id ON public.crm_activities(lead_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_crm_activities_client_id ON public.crm_activities(client_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_crm_activities_status ON public.crm_activities(status)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_crm_activities_activity_type ON public.crm_activities(activity_type)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_crm_activities_due_date ON public.crm_activities(due_date)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_crm_activities_activity_date ON public.crm_activities(activity_date)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_crm_activities_assigned_to ON public.crm_activities(assigned_to)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_crm_activities_created_at ON public.crm_activities(created_at)`);
  
  // Sales pipeline indexes
  await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_pipeline_agency_id ON public.sales_pipeline(agency_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_pipeline_stage_order ON public.sales_pipeline(stage_order)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_pipeline_is_active ON public.sales_pipeline(is_active)`);
}

/**
 * Ensure all indexes for GST tables
 */
async function ensureGstIndexes(client) {
  // Check if filing_period column exists (new schema) or return_period (old schema)
  const columnCheck = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gst_returns'
    AND column_name IN ('filing_period', 'return_period')
  `);
  
  const existingColumns = columnCheck.rows.map(r => r.column_name);
  
  if (existingColumns.includes('filing_period')) {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_gst_returns_filing_period ON public.gst_returns(filing_period)`);
  } else if (existingColumns.includes('return_period')) {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_gst_returns_return_period ON public.gst_returns(return_period)`);
  }
  
  // Check if invoice_date exists (new schema) or transaction_date (old schema)
  const transactionColumnCheck = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gst_transactions'
    AND column_name IN ('invoice_date', 'transaction_date')
  `);
  
  const transactionColumns = transactionColumnCheck.rows.map(r => r.column_name);
  
  if (transactionColumns.includes('invoice_date')) {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_gst_transactions_invoice_date ON public.gst_transactions(invoice_date)`);
  } else if (transactionColumns.includes('transaction_date')) {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_gst_transactions_transaction_date ON public.gst_transactions(transaction_date)`);
  }
}

/**
 * Ensure all indexes for reimbursement tables
 */
async function ensureReimbursementIndexes(client) {
  await client.query(`CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_user_id ON public.reimbursement_requests(user_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_status ON public.reimbursement_requests(status)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_reimbursement_attachments_request_id ON public.reimbursement_attachments(reimbursement_request_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_receipts_reimbursement_request_id ON public.receipts(reimbursement_request_id)`);
}

/**
 * Ensure all indexes for miscellaneous tables
 */
async function ensureMiscIndexes(client) {
  // Check if tables exist before creating indexes
  const tableCheck = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('notifications', 'company_events', 'holidays', 'reports', 'file_storage')
  `);
  
  const existingTables = new Set(tableCheck.rows.map(r => r.table_name));
  
  if (existingTables.has('notifications')) {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at)`);
  }
  
  if (existingTables.has('company_events')) {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_company_events_start_date ON public.company_events(start_date)`);
  }
  
  if (existingTables.has('holidays')) {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_holidays_holiday_date ON public.holidays(holiday_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(date)`);
  }
  
  if (existingTables.has('reports')) {
    // Check if report_type column exists (it should, but verify for safety)
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'reports' 
      AND column_name IN ('report_type', 'type')
    `);
    
    const hasReportType = columnCheck.rows.some(r => r.column_name === 'report_type');
    const hasType = columnCheck.rows.some(r => r.column_name === 'type');
    
    // Create index on report_type if it exists, otherwise on type (for backward compatibility)
    if (hasReportType) {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_type ON public.reports(report_type)`);
    } else if (hasType) {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_type ON public.reports(type)`);
    }
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON public.reports(generated_at)`);
  }
  
  if (existingTables.has('file_storage')) {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_file_storage_bucket_path ON public.file_storage(bucket_name, file_path)`);
  }
}

/**
 * Apply backward compatibility fixes for existing databases
 * These ensure columns exist that may have been added in later schema versions
 */
async function applyBackwardCompatibilityFixes(client) {
  console.log('[SQL] Applying backward compatibility fixes...');

  // Ensure profiles.agency_id exists (already handled in authSchema, but double-check)
  try {
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'agency_id'
        ) THEN
          ALTER TABLE public.profiles ADD COLUMN agency_id UUID;
          CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON public.profiles(agency_id);
        END IF;
      END $$;
    `);
  } catch (error) {
    console.warn('[SQL] Warning: Could not add agency_id to profiles:', error.message);
  }

  // Ensure clients.agency_id and clients.is_active exist (already handled in clientsFinancialSchema, but double-check)
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

  // Ensure employee_details.agency_id exists (already handled in hrSchema, but double-check)
  try {
    await client.query('ALTER TABLE public.employee_details ADD COLUMN IF NOT EXISTS agency_id UUID');
    await client.query('CREATE INDEX IF NOT EXISTS idx_employee_details_agency_id ON public.employee_details(agency_id)');
  } catch (error) {
    if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
      console.warn('[SQL] Warning: Could not add agency_id to employee_details:', error.message);
    }
  }

  // Ensure employee_salary_details.agency_id exists (already handled in hrSchema, but double-check)
  try {
    await client.query('ALTER TABLE public.employee_salary_details ADD COLUMN IF NOT EXISTS agency_id UUID');
    await client.query('CREATE INDEX IF NOT EXISTS idx_employee_salary_details_agency_id ON public.employee_salary_details(agency_id)');
  } catch (error) {
    if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
      console.warn('[SQL] Warning: Could not add agency_id to employee_salary_details:', error.message);
    }
  }

  // Ensure jobs.agency_id exists (already handled in clientsFinancialSchema, but double-check)
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

  // Ensure chart_of_accounts.agency_id exists (already handled in clientsFinancialSchema, but double-check)
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

  // Ensure journal_entries multi-tenant and total columns exist (already handled in clientsFinancialSchema, but double-check)
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

  // Ensure journal_entry_lines.line_number exists and is backfilled (already handled in clientsFinancialSchema, but double-check)
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

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_journal_entry_id_line_number 
      ON public.journal_entry_lines(journal_entry_id, line_number)
    `);
  } catch (error) {
    console.warn('[SQL] Warning: Could not ensure line_number on journal_entry_lines:', error.message);
  }

  // Ensure holidays.date exists (already handled in miscSchema, but double-check)
  try {
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'holidays' 
          AND column_name = 'date'
        ) THEN
          ALTER TABLE public.holidays ADD COLUMN date DATE;
          UPDATE public.holidays SET date = holiday_date WHERE date IS NULL;
          CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(date);
        END IF;
      END $$;
    `);
  } catch (error) {
    console.warn('[SQL] Warning: Could not add date to holidays:', error.message);
  }

  console.log('[SQL] ✅ Backward compatibility fixes applied');
}

/**
 * Ensure all indexes across all tables
 */
async function ensureAllIndexes(client) {
  console.log('[SQL] Ensuring all indexes...');
  
  await ensureAuthIndexes(client);
  await ensureDepartmentsIndexes(client);
  await ensureHrIndexes(client);
  await ensureProjectsTasksIndexes(client);
  await ensureClientsFinancialIndexes(client);
  await ensureCrmIndexes(client);
  await ensureGstIndexes(client);
  await ensureReimbursementIndexes(client);
  await ensureMiscIndexes(client);
  
  console.log('[SQL] ✅ All indexes ensured');
}

/**
 * Ensure all indexes and apply backward compatibility fixes
 */
async function ensureIndexesAndFixes(client) {
  await ensureAllIndexes(client);
  await applyBackwardCompatibilityFixes(client);
}

module.exports = {
  ensureIndexesAndFixes,
  ensureAllIndexes,
  applyBackwardCompatibilityFixes,
  ensureAuthIndexes,
  ensureDepartmentsIndexes,
  ensureHrIndexes,
  ensureProjectsTasksIndexes,
  ensureClientsFinancialIndexes,
  ensureCrmIndexes,
  ensureGstIndexes,
  ensureReimbursementIndexes,
  ensureMiscIndexes,
};
