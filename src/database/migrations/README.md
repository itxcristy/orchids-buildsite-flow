# PostgreSQL Database Migrations

This directory contains clean, organized PostgreSQL database migration scripts for the BuildFlow ERP system.

## Migration Files

### 01_core_schema.sql
Core authentication and agency tables:
- `agencies` - Multi-tenant agency records
- `users` - User accounts
- `profiles` - User profiles
- `user_roles` - Role assignments
- `audit_logs` - System audit trail

### 02_hr_schema.sql
HR and employee management:
- `employee_details` - Employee information
- `employee_salary_details` - Salary data
- `employee_files` - Employee documents
- `departments` - Organizational departments
- `department_hierarchy` - Department structure
- `team_assignments` - User-department relationships
- `team_members` - Team composition

### 03_attendance_payroll_schema.sql
Attendance and payroll:
- `attendance` - Daily attendance tracking
- `leave_types` - Leave categories
- `leave_requests` - Leave requests
- `payroll_periods` - Pay periods
- `payroll` - Payroll records
- `expense_categories` - Expense categories
- `reimbursement_requests` - Reimbursement requests
- `reimbursement_attachments` - Receipt files

### 04_projects_tasks_schema.sql
Projects and tasks:
- `projects` - Project records
- `tasks` - Task management
- `task_assignments` - Task assignments
- `task_comments` - Task discussions
- `task_time_tracking` - Time tracking
- `job_categories` - Job categories
- `jobs` - Job records
- `job_cost_items` - Job cost tracking

### 05_financial_schema.sql
Financial management:
- `clients` - Client records
- `invoices` - Invoice management
- `quotation_templates` - Quotation templates
- `quotations` - Quotation records
- `quotation_line_items` - Quotation line items
- `chart_of_accounts` - Chart of accounts
- `journal_entries` - Journal entries
- `journal_entry_lines` - Journal entry lines

### 06_crm_schema.sql
CRM and sales:
- `lead_sources` - Lead source categories
- `leads` - Lead records
- `crm_activities` - CRM activity logging
- `sales_pipeline` - Sales pipeline stages

### 07_gst_calendar_schema.sql
GST compliance and calendar:
- `gst_settings` - GST configuration
- `gst_returns` - GST return filings
- `gst_transactions` - GST transaction records
- `holidays` - Holiday calendar
- `company_events` - Company events
- `calendar_settings` - Calendar configuration

### 08_system_schema.sql
System and settings:
- `agency_settings` - Agency configuration
- `notifications` - System notifications
- `reports` - Generated reports
- `custom_reports` - Custom report definitions
- `subscription_plans` - Subscription plans
- `plan_features` - Feature definitions
- `plan_feature_mappings` - Plan-feature relationships

## Running Migrations

### Apply All Migrations

```bash
# Connect to database
psql -U postgres -d buildflow_db

# Run migrations in order
\i database/migrations/01_core_schema.sql
\i database/migrations/02_hr_schema.sql
\i database/migrations/03_attendance_payroll_schema.sql
\i database/migrations/04_projects_tasks_schema.sql
\i database/migrations/05_financial_schema.sql
\i database/migrations/06_crm_schema.sql
\i database/migrations/07_gst_calendar_schema.sql
\i database/migrations/08_system_schema.sql
```

### Or use PowerShell

```powershell
$env:PGPASSWORD='admin'
Get-Content database/migrations/01_core_schema.sql | psql -U postgres -d buildflow_db
Get-Content database/migrations/02_hr_schema.sql | psql -U postgres -d buildflow_db
# ... continue for all files
```

## Migration Order

Migrations must be run in numerical order (01, 02, 03, etc.) because:
1. Core schema creates base tables and functions
2. Later migrations reference tables created in earlier migrations
3. Foreign key constraints require parent tables to exist first

## Notes

- All migrations use `CREATE TABLE IF NOT EXISTS` for idempotency
- All tables include proper indexes for performance
- Foreign key constraints ensure data integrity
- Triggers automatically update `updated_at` timestamps
- All multi-tenant tables include `agency_id` column

## Verification

After running migrations, verify the schema:

```sql
-- Count tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Should return 53 tables
```
