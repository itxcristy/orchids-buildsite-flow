# Schema Modules Documentation

This directory contains the modular schema creation system for agency databases. The monolithic `schemaCreator.js` has been refactored into domain-specific modules for better maintainability, safety, and clarity.

## Structure

### Main Orchestrator
- **`../schemaCreator.js`** - Main entry point that orchestrates all schema modules

### Schema Modules

#### 1. `sharedFunctions.js`
**Purpose**: Database extensions, types, functions, triggers, and views shared across all modules.

**Manages**:
- Database extensions (uuid-ossp, pgcrypto)
- Custom types (app_role enum)
- Utility functions (current_user_id, update_updated_at_column, log_audit_change)
- Sync functions (sync_attendance_employee_id, sync_employee_salary, sync_holidays_date)
- unified_employees view
- Updated_at trigger creation helper

**Dependencies**: None (foundational)

---

#### 2. `authSchema.js`
**Purpose**: Authentication and authorization tables.

**Manages**:
- `users` - Core user accounts
- `profiles` - Extended user profiles with agency_id
- `user_roles` - Role assignments
- `audit_logs` - System audit trail
- `permissions` - Permission definitions
- `role_permissions` - Role-permission mappings
- `user_preferences` - User preference settings

**Dependencies**: 
- Requires `app_role` enum (from sharedFunctions)
- Requires `current_user_id()` function (from sharedFunctions)
- Requires `log_audit_change()` function (from sharedFunctions)

---

#### 3. `agenciesSchema.js`
**Purpose**: Agency-specific configuration.

**Manages**:
- `agency_settings` - Agency configuration and branding

**Dependencies**: None (foundational)

---

#### 4. `departmentsSchema.js`
**Purpose**: Organizational structure and team management.

**Manages**:
- `departments` - Organizational departments
- `team_assignments` - User-department relationships
- `department_hierarchy` - Department organizational structure
- `team_members` - Team composition tracking

**Dependencies**: 
- `profiles` (for manager_id reference)

---

#### 5. `hrSchema.js`
**Purpose**: HR and employee management.

**Manages**:
- `employee_details` - Employee information
- `attendance` - Daily attendance tracking
- `leave_types` - Leave category definitions
- `leave_requests` - Leave request records
- `payroll_periods` - Pay period management
- `payroll` - Employee payroll records
- `employee_salary_details` - Salary and compensation data
- `employee_files` - Employee document storage

**Dependencies**: 
- `users` (for user_id references)
- Requires `sync_attendance_employee_id()` function (from sharedFunctions)
- Requires `sync_employee_salary()` function (from sharedFunctions)

---

#### 6. `projectsTasksSchema.js`
**Purpose**: Project and task management.

**Manages**:
- `projects` - Project records
- `tasks` - Task management
- `task_assignments` - Multiple assignees per task
- `task_comments` - Task discussion
- `task_time_tracking` - Time tracking on tasks

**Dependencies**: 
- `clients` (for client_id reference in projects)
- `users` (for user_id references)

---

#### 7. `clientsFinancialSchema.js`
**Purpose**: Clients, financial management, and accounting.

**Manages**:
- `clients` - Client/customer records
- `invoices` - Invoice records
- `quotations` - Quotation records
- `quotation_templates` - Reusable quotation templates
- `quotation_line_items` - Quotation line item details
- `chart_of_accounts` - Chart of accounts structure
- `journal_entries` - Journal entry records
- `journal_entry_lines` - Journal entry line items
- `jobs` - Job records with costing
- `job_categories` - Job category classification
- `job_cost_items` - Individual job cost tracking

**Dependencies**: 
- `users` (for created_by references)
- `chart_of_accounts` must exist before `journal_entry_lines` (for account_id FK)

---

#### 8. `crmSchema.js`
**Purpose**: Customer relationship management.

**Manages**:
- `lead_sources` - Lead source categories
- `leads` - Lead records
- `crm_activities` - CRM activity logging
- `sales_pipeline` - Sales pipeline stage definitions

**Dependencies**: 
- `users` (for created_by and assigned_to references)

---

#### 9. `gstSchema.js`
**Purpose**: GST compliance and tax management.

**Manages**:
- `gst_settings` - GST configuration
- `gst_returns` - GST return filing records
- `gst_transactions` - GST transaction records

**Dependencies**: 
- `users` (for created_by and filed_by references)
- `invoices` (for invoice_id reference in gst_transactions)

---

#### 10. `reimbursementSchema.js`
**Purpose**: Expense and reimbursement management.

**Manages**:
- `expense_categories` - Expense category definitions
- `reimbursement_requests` - Reimbursement request records
- `reimbursement_attachments` - Receipt and attachment files
- `receipts` - Receipt records

**Dependencies**: 
- `users` (for user_id and created_by references)

---

#### 11. `miscSchema.js`
**Purpose**: Miscellaneous system tables.

**Manages**:
- `notifications` - System notifications
- `holidays` - Holiday calendar
- `company_events` - Company event records
- `calendar_settings` - Calendar configuration
- `reports` - Generated report records
- `custom_reports` - Custom report definitions
- `role_change_requests` - Role change request tracking
- `feature_flags` - Feature flag management
- `file_storage` - File storage metadata

**Dependencies**: 
- `users` (for user_id and created_by references)
- Requires `sync_holidays_date()` function (from sharedFunctions)

---

#### 12. `indexesAndFixes.js`
**Purpose**: Centralized index creation and backward compatibility fixes.

**Manages**:
- All index creation for performance
- Backward compatibility ALTER TABLE statements
- Column additions for existing databases
- Data backfilling for new columns

**Dependencies**: 
- All tables must exist before indexes are created

---

## Execution Order

The main `createAgencySchema` function executes modules in this order to respect dependencies:

1. **sharedFunctions** - Extensions, types, functions (foundational)
2. **authSchema** - Users, profiles, roles (foundational)
3. **agenciesSchema** - Agency settings (foundational)
4. **departmentsSchema** - Departments (depends on profiles)
5. **hrSchema** - HR tables (depends on users)
6. **clientsFinancialSchema** - Clients and financial (depends on users, must come before projects)
7. **projectsTasksSchema** - Projects and tasks (depends on clients)
8. **crmSchema** - CRM (depends on users)
9. **gstSchema** - GST (depends on invoices)
10. **reimbursementSchema** - Reimbursement (depends on users)
11. **miscSchema** - Miscellaneous (depends on users)
12. **indexesAndFixes** - Indexes and backward compatibility (depends on all tables)
13. **updated_at triggers** - Applied to all tables with updated_at column

## Benefits of Modular Design

1. **Easier to Understand**: Each module focuses on a specific domain
2. **Safer Changes**: Financial changes only touch `clientsFinancialSchema.js`
3. **Better for AI Tools**: Smaller, focused files are easier for AI to modify safely
4. **Clear Dependencies**: Each module documents its dependencies
5. **Maintainable**: Future schema changes are localized to relevant modules
6. **Testable**: Each module can be tested independently

## Making Changes

### Adding a New Table

1. Identify which domain the table belongs to
2. Add the table creation to the appropriate schema module
3. Add indexes to `indexesAndFixes.js`
4. Add updated_at trigger if needed (via `sharedFunctions.ensureUpdatedAtTriggers`)

### Modifying an Existing Table

1. Find the table in the appropriate schema module
2. Make changes to that module only
3. If adding columns, also add backward compatibility fix in `indexesAndFixes.js`

### Adding a New Index

1. Add the index creation to the appropriate function in `indexesAndFixes.js`
2. Consider if it's a foreign key index (usually created automatically) or a performance index

## Backward Compatibility

All modules include backward compatibility checks:
- Columns are added with `IF NOT EXISTS` or checked before adding
- Indexes are created with `IF NOT EXISTS`
- Data backfilling is performed for new columns when needed

This ensures the schema creation is idempotent and safe to run on existing databases.
