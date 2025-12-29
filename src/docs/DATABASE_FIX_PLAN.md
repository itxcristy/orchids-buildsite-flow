# Database Fix Plan - Complete Agency Schema Implementation

## Problem Analysis

### Current Situation
- **Issue**: New agencies are created with separate databases, but the `createAgencySchema()` function only creates ~15 tables
- **Expected**: Each agency database should have all 53 tables as documented in `docs/database.md`
- **Impact**: Frontend pages are failing with 500 errors because tables don't exist (e.g., `quotations`, `leave_requests`, `payroll`, `gst_settings`, etc.)

### Root Cause
The `createAgencySchema()` function in `server/index.js` (lines 462-1007) is incomplete. It only creates:
- Core: users, profiles, user_roles, audit_logs
- Basic: departments, agency_settings, notifications
- Limited: clients, projects, invoices, employee_details, attendance, journal_entries, journal_entry_lines, reports, team_assignments

### Missing Tables (38+ tables)

#### HR & Employee Management (4 tables)
- ❌ `employee_salary_details` - Salary and compensation data
- ❌ `employee_files` - Employee document storage
- ❌ `leave_types` - Leave category definitions
- ❌ `leave_requests` - Leave request records

#### Payroll (1 table)
- ❌ `payroll_periods` - Pay period management
- ❌ `payroll` - Employee payroll records

#### Financial & Accounting (2 tables)
- ❌ `chart_of_accounts` - Chart of accounts structure (referenced by journal_entry_lines)

#### Quotations (3 tables)
- ❌ `quotations` - Quotation records
- ❌ `quotation_templates` - Reusable quotation templates
- ❌ `quotation_line_items` - Quotation line item details

#### Job Costing (3 tables)
- ❌ `job_categories` - Job category classification
- ❌ `jobs` - Job records with costing
- ❌ `job_cost_items` - Individual job cost tracking

#### CRM (4 tables)
- ❌ `lead_sources` - Lead source categories
- ❌ `leads` - Lead records with status tracking
- ❌ `crm_activities` - CRM activity logging
- ❌ `sales_pipeline` - Sales pipeline stage definitions

#### Projects & Tasks (4 tables)
- ❌ `tasks` - Task management with status tracking
- ❌ `task_assignments` - Multiple assignees per task
- ❌ `task_comments` - Task discussion and comments
- ❌ `task_time_tracking` - Time tracking on tasks

#### GST Compliance (3 tables)
- ❌ `gst_settings` - GST configuration and settings
- ❌ `gst_returns` - GST return filing records
- ❌ `gst_transactions` - GST transaction records

#### Expense & Reimbursement (3 tables)
- ❌ `expense_categories` - Expense category definitions
- ❌ `reimbursement_requests` - Reimbursement request records
- ❌ `reimbursement_attachments` - Receipt and attachment files

#### Calendar & Events (3 tables)
- ❌ `company_events` - Company event records
- ❌ `holidays` - Holiday calendar
- ❌ `calendar_settings` - Calendar configuration

#### Departments & Teams (2 tables)
- ❌ `department_hierarchy` - Department organizational structure
- ❌ `team_members` - Team composition tracking

#### Reporting (1 table)
- ❌ `custom_reports` - Custom report definitions

#### Other (2+ tables)
- ❌ `role_change_requests` - Role change request tracking
- ❌ `receipts` - Receipt records (used by reimbursement system)
- ❌ `feature_flags` - Feature flag management

## Solution Plan

### Phase 1: Complete Schema Creation Function
1. **Expand `createAgencySchema()` function** to include all 53 tables
2. **Add proper foreign key relationships** between tables
3. **Create all necessary indexes** for performance
4. **Add triggers** for `updated_at` columns on all tables
5. **Ensure data types match** frontend expectations

### Phase 2: Schema Structure Requirements

#### Table Creation Order
Tables must be created in dependency order:
1. Core tables (users, profiles, user_roles) - ✅ Already exists
2. Reference tables (departments, clients, chart_of_accounts, leave_types, etc.)
3. Transaction tables (projects, tasks, invoices, quotations, etc.)
4. Junction/relationship tables (task_assignments, team_assignments, etc.)

#### Required Columns Pattern
Most business tables should include:
- `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
- `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
- `updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
- `created_by UUID REFERENCES public.users(id)` (where applicable)
- Foreign keys to related tables

#### Indexes Required
- Primary keys (automatic)
- Foreign keys
- Frequently queried columns (status, dates, user_id, etc.)
- Composite indexes for common query patterns

### Phase 3: Implementation Steps

1. **Backup current `createAgencySchema()` function**
2. **Create comprehensive schema SQL** with all 53 tables
3. **Add all foreign key constraints**
4. **Add all indexes**
5. **Add triggers for updated_at on all tables**
6. **Test schema creation** on a new test agency database
7. **Verify all tables exist** after creation
8. **Test frontend pages** to ensure no more 500 errors

### Phase 4: Migration Strategy

#### For Existing Agencies
- Create a migration script to add missing tables to existing agency databases
- Run migration on all existing agency databases
- Verify data integrity after migration

#### For New Agencies
- New agencies will automatically get complete schema via updated `createAgencySchema()`

## Implementation Priority

### High Priority (Critical for Basic Functionality)
1. ✅ Core tables (already exists)
2. 🔴 `quotations`, `quotation_templates`, `quotation_line_items` - Used by Quotations page
3. 🔴 `leave_types`, `leave_requests` - Used by Leave Management
4. 🔴 `payroll_periods`, `payroll` - Used by Payroll page
5. 🔴 `chart_of_accounts` - Used by Ledger and Financial pages
6. 🔴 `tasks`, `task_assignments`, `task_comments`, `task_time_tracking` - Used by Project Management
7. 🔴 `leads`, `lead_sources`, `crm_activities`, `sales_pipeline` - Used by CRM page
8. 🔴 `expense_categories`, `reimbursement_requests`, `reimbursement_attachments`, `receipts` - Used by Reimbursements
9. 🔴 `company_events`, `holidays` - Used by Calendar
10. 🔴 `gst_settings`, `gst_returns`, `gst_transactions` - Used by GST Compliance
11. 🔴 `job_categories`, `jobs`, `job_cost_items` - Used by Job Costing
12. 🔴 `employee_salary_details`, `employee_files` - Used by Employee Management

### Medium Priority
- `department_hierarchy`, `team_members` - Used by Department Management
- `custom_reports` - Used by Reports
- `role_change_requests` - Used by Role Management
- `calendar_settings` - Used by Calendar configuration
- `feature_flags` - Used by Feature Management

## Testing Checklist

After implementation, test:
- [ ] Create new agency - verify all 53 tables are created
- [ ] Access Quotations page - should load without errors
- [ ] Access Leave Requests page - should load without errors
- [ ] Access Payroll page - should load without errors
- [ ] Access Ledger page - should load without errors
- [ ] Access Project Management - should load without errors
- [ ] Access CRM page - should load without errors
- [ ] Access Reimbursements page - should load without errors
- [ ] Access Calendar page - should load without errors
- [ ] Access GST Compliance page - should load without errors
- [ ] Access Job Costing page - should load without errors
- [ ] Access Employee Management - should load without errors
- [ ] Verify foreign key constraints work correctly
- [ ] Verify indexes are created and improve query performance
- [ ] Verify triggers update `updated_at` columns correctly

## Success Criteria

✅ All 53 tables exist in new agency databases
✅ No 500 errors when accessing any frontend page
✅ All CRUD operations work on all tables
✅ Foreign key relationships are properly enforced
✅ Indexes improve query performance
✅ Triggers automatically update timestamps

## Next Steps

1. Implement complete `createAgencySchema()` function
2. Test on new agency creation
3. Create migration script for existing agencies
4. Document all table structures
5. Update API documentation
