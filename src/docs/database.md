# Database Documentation

## Connection Details

- **Database:** `buildflow_db`
- **User:** `postgres`
- **Password:** `admin`
- **Host:** `localhost`
- **Port:** `5432`
- **Connection String:** `postgresql://postgres:admin@localhost:5432/buildflow_db`

## Database Structure

### Total Tables: 53

All tables are in the `public` schema.

### Core Authentication (7 tables)

| Table | Purpose |
|-------|---------|
| `users` | User accounts with email and password hash |
| `profiles` | Extended user profiles with agency_id |
| `user_roles` | Role assignments linking users to roles and agencies |
| `employee_details` | Employee information and details |
| `employee_salary_details` | Salary and compensation data |
| `employee_files` | Employee document storage |
| `audit_logs` | System audit trail for all operations |

### Agencies & Multi-Tenancy (2 tables)

| Table | Purpose |
|-------|---------|
| `agencies` | Agency/company records with database mapping |
| `agency_settings` | Agency-specific configuration and branding |

### Departments & Teams (4 tables)

| Table | Purpose |
|-------|---------|
| `departments` | Organizational departments |
| `team_assignments` | User-department relationships |
| `department_hierarchy` | Department organizational structure |
| `team_members` | Team composition tracking |

### Projects & Tasks (5 tables)

| Table | Purpose |
|-------|---------|
| `projects` | Project records with budgets and timelines |
| `tasks` | Task management with status tracking |
| `task_assignments` | Multiple assignees per task |
| `task_comments` | Task discussion and comments |
| `task_time_tracking` | Time tracking on tasks |

### Clients & Financial (5 tables)

| Table | Purpose |
|-------|---------|
| `clients` | Client/customer records |
| `invoices` | Invoice records with payment tracking |
| `quotations` | Quotation records |
| `quotation_templates` | Reusable quotation templates |
| `quotation_line_items` | Quotation line item details |

### Job Costing (3 tables)

| Table | Purpose |
|-------|---------|
| `job_categories` | Job category classification |
| `jobs` | Job records with costing |
| `job_cost_items` | Individual job cost tracking |

### CRM (4 tables)

| Table | Purpose |
|-------|---------|
| `lead_sources` | Lead source categories |
| `leads` | Lead records with status tracking |
| `crm_activities` | CRM activity logging |
| `sales_pipeline` | Sales pipeline stage definitions |

### Financial Accounting (3 tables)

| Table | Purpose |
|-------|---------|
| `chart_of_accounts` | Chart of accounts structure |
| `journal_entries` | Journal entry records |
| `journal_entry_lines` | Journal entry line items |

### HR & Attendance (5 tables)

| Table | Purpose |
|-------|---------|
| `leave_types` | Leave category definitions |
| `leave_requests` | Leave request records |
| `attendance` | Daily attendance tracking |
| `payroll_periods` | Pay period management |
| `payroll` | Employee payroll records |

### GST Compliance (3 tables)

| Table | Purpose |
|-------|---------|
| `gst_settings` | GST configuration and settings |
| `gst_returns` | GST return filing records |
| `gst_transactions` | GST transaction records |

### Expense & Reimbursement (3 tables)

| Table | Purpose |
|-------|---------|
| `expense_categories` | Expense category definitions |
| `reimbursement_requests` | Reimbursement request records |
| `reimbursement_attachments` | Receipt and attachment files |

### Calendar & Events (3 tables)

| Table | Purpose |
|-------|---------|
| `company_events` | Company event records |
| `holidays` | Holiday calendar |
| `calendar_settings` | Calendar configuration |

### Reporting (2 tables)

| Table | Purpose |
|-------|---------|
| `reports` | Generated report records |
| `custom_reports` | Custom report definitions |

### Subscription & Billing (3 tables)

| Table | Purpose |
|-------|---------|
| `subscription_plans` | Subscription plan definitions |
| `plan_features` | Feature definitions |
| `plan_feature_mappings` | Plan-feature relationships |

### Other (1 table)

| Table | Purpose |
|-------|---------|
| `notifications` | System notifications |

## Multi-Tenancy Implementation

### Agency ID Pattern

All business data tables include an `agency_id` column (UUID) that:
- Links records to a specific agency
- Enables data isolation between agencies
- Is automatically added on insert operations
- Is used in all queries for filtering

### Tables Requiring agency_id

The following tables require `agency_id` for multi-tenancy:
- profiles, user_roles, departments, team_assignments
- clients, projects, tasks, invoices, quotations
- leads, crm_activities, chart_of_accounts
- attendance, leave_requests, payroll
- reimbursement_requests, employee_details
- holidays, company_events, notifications
- And all other business data tables

### Global Tables (No agency_id)

These tables are shared across all agencies:
- `agencies` - Agency metadata
- `subscription_plans` - Plan definitions
- `plan_features` - Feature definitions
- `plan_feature_mappings` - Plan-feature links

## Database Functions

### Authentication Functions
- `has_role(user_id, role_name)` - Check if user has role
- `get_user_role(user_id)` - Get user's role
- `current_user_id()` - Get current user ID from context

### Utility Functions
- `update_updated_at_column()` - Auto-update timestamp trigger
- `encrypt_ssn(ssn)` - Encrypt sensitive data
- `decrypt_ssn(encrypted_ssn)` - Decrypt sensitive data

### Business Logic Functions
- `calculate_gst_liability(...)` - GST calculations
- `generate_invoice_number()` - Auto-generate invoice numbers
- `generate_quotation_number()` - Auto-generate quotation numbers

## Indexes

The database includes 236+ indexes for:
- Primary keys
- Foreign keys
- Frequently queried columns
- Multi-column composite indexes
- Partial indexes for filtered queries

## Row-Level Security (RLS)

100+ RLS policies ensure:
- Users can only access their agency's data
- Role-based access control
- Data isolation between agencies
- Secure data access patterns

## Triggers

30+ triggers handle:
- Automatic timestamp updates (`updated_at`)
- Audit logging on data changes
- User profile auto-creation
- Agency ID auto-population
- Data validation

## Backup & Maintenance

### Recommended Practices
- Regular database backups
- Monitor connection pool usage
- Review slow query logs
- Update indexes as needed
- Monitor RLS policy performance
