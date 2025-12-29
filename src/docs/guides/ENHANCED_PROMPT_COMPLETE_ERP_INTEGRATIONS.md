# TASK: Complete ERP System Integration - Cross-Module Data Flow & Feature Integration

## CONTEXT ANALYSIS REQUIRED

Before implementing any changes, you must:

1. **Examine the following files and understand their current implementation:**

   **Core Page Files (100+ pages in `src/pages/`):**
   - **Project Management:** `ProjectManagement.tsx`, `Projects.tsx`, `ProjectDetails.tsx`, `TaskDetails.tsx`
   - **Employee Management:** `EmployeeManagement.tsx`, `CreateEmployee.tsx`, `EmployeePerformance.tsx`
   - **Client Management:** `Clients.tsx`, `CreateClient.tsx`
   - **CRM:** `CRM.tsx`, `LeadDetail.tsx`, `ActivityDetail.tsx`
   - **Financial Management:** `FinancialManagement.tsx`, `Invoices.tsx`, `Payments.tsx`, `Ledger.tsx`, `CreateJournalEntry.tsx`, `Payroll.tsx`, `JobCosting.tsx`, `Quotations.tsx`, `QuotationForm.tsx`
   - **Department Management:** `DepartmentManagement.tsx`
   - **Inventory:** `InventoryManagement.tsx`, `InventoryProducts.tsx`, `InventoryWarehouses.tsx`, `InventoryStockLevels.tsx`, `InventoryTransfers.tsx`, `InventoryAdjustments.tsx`
   - **Procurement:** `ProcurementManagement.tsx`, `ProcurementVendors.tsx`, `ProcurementPurchaseOrders.tsx`, `ProcurementRequisitions.tsx`, `ProcurementGoodsReceipts.tsx`
   - **Asset Management:** `Assets.tsx`, `AssetCategories.tsx`, `AssetLocations.tsx`, `AssetMaintenance.tsx`
   - **Reports & Analytics:** `Reports.tsx`, `Analytics.tsx`, `CentralizedReports.tsx`, `ReportingDashboard.tsx`

   **Form Dialog Components (in `src/components/`):**
   - `ProjectFormDialog.tsx` - Project creation/editing form
   - `TaskFormDialog.tsx` - Task creation/editing form
   - `LeadFormDialog.tsx` - Lead creation/editing form
   - `ClientFormDialog.tsx` - Client creation/editing form
   - `UserFormDialog.tsx` - User/employee creation/editing form
   - `DepartmentFormDialog.tsx` - Department creation/editing form
   - `InvoiceFormDialog.tsx` - Invoice creation/editing form
   - `QuotationFormDialog.tsx` - Quotation creation/editing form
   - `JobFormDialog.tsx` - Job creation/editing form
   - `PayrollFormDialog.tsx` - Payroll entry form
   - `LeaveRequestFormDialog.tsx` - Leave request form
   - `ReimbursementFormDialog.tsx` - Reimbursement form
   - All other form dialogs in the components directory

   **Service Layer Files (in `src/services/api/`):**
   - `project-service.ts` - Project CRUD operations
   - `crm-service.ts` - CRM operations (leads, activities, pipeline)
   - `postgresql-service.ts` - Generic database operations
   - `employee-selector-service.ts` - Standardized employee fetching
   - `attendance-service.ts` - Attendance operations
   - `inventory-service.ts` - Inventory operations
   - `procurement-service.ts` - Procurement operations
   - `gst-service.ts` - GST operations
   - `performance-service.ts` - Performance tracking
   - All other service files

   **Integration Documentation:**
   - `docs/PHASE1_COMPREHENSIVE_SYSTEM_AUDIT.md` - Current integration state
   - `docs/ERP_UPGRADE_IMPLEMENTATION_STATUS.md` - Implementation status
   - `docs/IMPLEMENTATION_STATUS.md` - Security and feature status

   **Database Schema Files:**
   - `server/utils/schemaCreator.js` - Main schema creation
   - `server/utils/schema/*.js` - Modular schema files
   - Database tables: `projects`, `tasks`, `clients`, `leads`, `crm_activities`, `invoices`, `payments`, `journal_entries`, `employees`, `departments`, `inventory`, `procurement`, etc.

2. **Understand the current architecture:**
   - **Frontend:** React 18.3.1 with TypeScript, Vite build tool
   - **State Management:** Zustand + React Query (TanStack Query)
   - **Forms:** React Hook Form + Zod validation
   - **Database Access:** `db` query builder (`src/lib/database.ts`) + PostgreSQL HTTP client (`src/integrations/postgresql/client-http.ts`)
   - **Service Pattern:** API services in `src/services/api/` wrap database operations
   - **Multi-Tenancy:** `agency_id` filtering on all queries, per-agency database routing via `X-Agency-Database` header
   - **Authentication:** JWT tokens, role-based access control (RBAC) via `roleUtils.ts`
   - **Employee Selection:** Standardized via `employee-selector-service.ts` using `unified_employees` view

3. **Analyze integration patterns:**
   - **Current Integration State:** Many integrations are partial or missing (see `docs/PHASE1_COMPREHENSIVE_SYSTEM_AUDIT.md`)
   - **Form Dialog Pattern:** Forms fetch dropdown data independently, often duplicating logic
   - **Data Flow:** Direct database queries in components vs. service layer usage is inconsistent
   - **Cross-Module Links:** Missing bidirectional relationships (e.g., projects don't show client financials, clients don't show project list)

## DETAILED REQUIREMENTS

### Primary Objective

Complete all missing integrations across the entire ERP system to ensure:
1. **Bidirectional Data Flow:** All related modules show data from each other
2. **Form Integration:** All form dialogs populate dropdowns from related modules
3. **Real-Time Updates:** Changes in one module reflect in related modules
4. **Manager Perspectives:** Each manager role sees integrated data relevant to their responsibilities
5. **Production Readiness:** All integrations work reliably with proper error handling, loading states, and multi-tenant isolation

### Integration Categories

#### 1. Project Management ↔ All Modules Integration

**Current State:** ⚠️ Partial - Projects exist but lack full integration with other modules

**Required Integrations:**

**1.1 Projects ↔ Clients Integration:**
- ✅ **EXISTS:** Projects can be assigned to clients (`client_id` field)
- ❌ **MISSING:** Client dropdown in ProjectFormDialog should show all active clients with search/filter
- ❌ **MISSING:** Project Details page should show full client information (contact, address, payment terms, credit limit)
- ❌ **MISSING:** Clients page should show list of all projects for each client
- ❌ **MISSING:** Client financial summary (total project value, invoices, payments) should appear in Project Details
- ❌ **MISSING:** When creating project from CRM lead conversion, client should auto-populate

**1.2 Projects ↔ Financial Management Integration:**
- ✅ **EXISTS:** Projects have `budget` and `actual_cost` fields
- ❌ **MISSING:** Automatic journal entry creation when project costs are recorded
- ❌ **MISSING:** Real-time budget vs actual tracking with visual indicators
- ❌ **MISSING:** Project profitability calculations (revenue - costs = profit margin)
- ❌ **MISSING:** Invoice generation from project milestones
- ❌ **MISSING:** Project costs should appear in Financial Management → Jobs tab
- ❌ **MISSING:** Cost center allocation from projects to chart of accounts
- ❌ **MISSING:** Project expenses should create journal entries automatically
- ❌ **MISSING:** Project revenue should link to invoices

**1.3 Projects ↔ Employee Management Integration:**
- ✅ **EXISTS:** Projects can have assigned team members (`assigned_team` JSONB field)
- ✅ **EXISTS:** `project_manager_id` and `account_manager_id` fields
- ❌ **MISSING:** Employee dropdown in ProjectFormDialog should use `employee-selector-service.ts` for consistent employee fetching
- ❌ **MISSING:** Project Details should show employee assignments with roles, departments, and contact info
- ❌ **MISSING:** Employee Management page should show "Projects" tab listing all projects for each employee
- ❌ **MISSING:** Employee Performance page should show project contributions (tasks completed, hours logged per project)
- ❌ **MISSING:** Task assignments should sync with employee workload visibility
- ❌ **MISSING:** Project resource allocation should show employee availability from attendance/leave data

**1.4 Projects ↔ CRM Integration:**
- ❌ **MISSING:** Lead conversion to project should create project automatically with lead data pre-filled
- ❌ **MISSING:** Project creation from CRM should link project to lead/opportunity
- ❌ **MISSING:** Project status updates should create CRM activities automatically
- ❌ **MISSING:** Project milestones should trigger CRM notifications
- ❌ **MISSING:** CRM pipeline should show project status for converted leads
- ❌ **MISSING:** Project completion should update CRM opportunity status

**1.5 Projects ↔ Department Management Integration:**
- ✅ **EXISTS:** Projects can have `departments` array field
- ❌ **MISSING:** Department dropdown in ProjectFormDialog should show all active departments
- ❌ **MISSING:** Project Details should show department assignments with department info
- ❌ **MISSING:** Department Management page should show "Projects" section listing all projects for each department
- ❌ **MISSING:** Department budget allocation should consider project budgets

**1.6 Projects ↔ Tasks Integration:**
- ✅ **EXISTS:** Tasks belong to projects (`project_id` field)
- ❌ **MISSING:** Task completion should update project progress percentage
- ❌ **MISSING:** Task time tracking should update project `actual_cost`
- ❌ **MISSING:** Project Gantt chart should show all tasks with dependencies
- ❌ **MISSING:** Project resource planning should consider task assignments

**1.7 Projects ↔ Inventory/Procurement Integration:**
- ❌ **MISSING:** Project materials/equipment should link to inventory items
- ❌ **MISSING:** Project resource planning should show inventory requirements
- ❌ **MISSING:** Purchase orders for projects should auto-create from project material needs
- ❌ **MISSING:** Project costs should include inventory/material costs

**Implementation Files:**
- `src/pages/ProjectManagement.tsx` - Add integration displays
- `src/pages/Projects.tsx` - Add client/project links
- `src/pages/ProjectDetails.tsx` - Add all integration sections
- `src/components/ProjectFormDialog.tsx` - Enhance dropdowns and data fetching
- `src/services/api/project-service.ts` - Add integration query methods
- `src/pages/Clients.tsx` - Add projects section
- `src/pages/FinancialManagement.tsx` - Add project financials
- `src/pages/EmployeeManagement.tsx` - Add projects tab
- `src/pages/CRM.tsx` - Add project conversion

#### 2. Employee Management ↔ All Modules Integration

**Current State:** ⚠️ Partial - Employees exist but lack full integration

**Required Integrations:**

**2.1 Employees ↔ Projects Integration:**
- ✅ **EXISTS:** Employees can be assigned to projects
- ❌ **MISSING:** Employee Management page should have "Projects" tab showing all projects for selected employee
- ❌ **MISSING:** Employee card should show active project count and project names
- ❌ **MISSING:** Employee assignment dropdowns across all pages should use `employee-selector-service.ts`
- ❌ **MISSING:** Project resource allocation should show employee skills, availability, workload

**2.2 Employees ↔ Financial Management Integration:**
- ✅ **EXISTS:** Employee data flows to payroll
- ❌ **MISSING:** Employee Management should show payroll summary (current month, YTD)
- ❌ **MISSING:** Employee card should show salary, benefits, deductions
- ❌ **MISSING:** Payroll entries should link back to employee records
- ❌ **MISSING:** Employee cost center allocation should appear in financial reports

**2.3 Employees ↔ Attendance/Leave Integration:**
- ✅ **EXISTS:** Attendance and leave records exist
- ❌ **MISSING:** Employee Management should show attendance summary (days present, absent, on leave)
- ❌ **MISSING:** Employee card should show current leave balance
- ❌ **MISSING:** Attendance calendar should be accessible from employee profile
- ❌ **MISSING:** Leave requests should show in employee timeline

**2.4 Employees ↔ Department Integration:**
- ✅ **EXISTS:** Employees belong to departments via `team_assignments`
- ❌ **MISSING:** Employee Management department filter should work correctly
- ❌ **MISSING:** Department page should show employee list with roles and status
- ❌ **MISSING:** Department manager assignment should validate employee belongs to department

**2.5 Employees ↔ Performance Integration:**
- ✅ **EXISTS:** Employee Performance page exists
- ❌ **MISSING:** Employee Management should link to performance reviews
- ❌ **MISSING:** Performance metrics should appear in employee card
- ❌ **MISSING:** Performance data should integrate with project contributions

**Implementation Files:**
- `src/pages/EmployeeManagement.tsx` - Add integration tabs and displays
- `src/components/UserFormDialog.tsx` - Enhance department/role selection
- `src/services/api/employee-selector-service.ts` - Ensure all pages use this
- `src/pages/ProjectManagement.tsx` - Use employee-selector-service
- `src/pages/DepartmentManagement.tsx` - Add employee list integration

#### 3. Client Management ↔ All Modules Integration

**Current State:** ⚠️ Partial - Clients exist but lack full integration

**Required Integrations:**

**3.1 Clients ↔ Projects Integration:**
- ✅ **EXISTS:** Projects can be assigned to clients
- ❌ **MISSING:** Clients page should show "Projects" tab with all projects for client
- ❌ **MISSING:** Client card should show active project count, total project value
- ❌ **MISSING:** Project creation from client page should pre-fill client_id
- ❌ **MISSING:** Client details should show project timeline and milestones

**3.2 Clients ↔ Financial Management Integration:**
- ✅ **EXISTS:** Invoices and payments can be linked to clients
- ❌ **MISSING:** Clients page should show financial summary (total invoiced, paid, outstanding)
- ❌ **MISSING:** Client card should show payment history and credit limit usage
- ❌ **MISSING:** Client aging report should be accessible from client page
- ❌ **MISSING:** Payment terms should be enforced in invoice creation

**3.3 Clients ↔ CRM Integration:**
- ✅ **EXISTS:** Leads can convert to clients
- ❌ **MISSING:** Clients page should show lead source and conversion history
- ❌ **MISSING:** Client activities from CRM should appear in client timeline
- ❌ **MISSING:** Client page should show sales pipeline status
- ❌ **MISSING:** New client creation should create CRM activity automatically

**3.4 Clients ↔ Invoices/Quotations Integration:**
- ✅ **EXISTS:** Invoices and quotations can be linked to clients
- ❌ **MISSING:** Clients page should show recent invoices and quotations
- ❌ **MISSING:** Client card should show quotation-to-invoice conversion rate
- ❌ **MISSING:** Invoice creation from client page should pre-fill client data

**Implementation Files:**
- `src/pages/Clients.tsx` - Add integration tabs (Projects, Financials, CRM, Invoices)
- `src/components/ClientFormDialog.tsx` - Enhance form with related data
- `src/pages/ProjectManagement.tsx` - Show client info in project cards
- `src/pages/FinancialManagement.tsx` - Add client financial summary
- `src/pages/CRM.tsx` - Link clients to leads

#### 4. CRM ↔ All Modules Integration

**Current State:** ⚠️ Partial - CRM exists but lacks full integration

**Required Integrations:**

**4.1 CRM ↔ Projects Integration:**
- ❌ **MISSING:** Lead conversion should offer "Create Project" option
- ❌ **MISSING:** Pipeline stages should trigger project creation workflows
- ❌ **MISSING:** Project status updates should sync to CRM opportunity status
- ❌ **MISSING:** CRM activities should link to projects
- ❌ **MISSING:** Project milestones should create CRM activities

**4.2 CRM ↔ Clients Integration:**
- ✅ **EXISTS:** Leads can convert to clients
- ❌ **MISSING:** Client creation from lead should preserve all lead data
- ❌ **MISSING:** Client page should show lead source and conversion date
- ❌ **MISSING:** CRM activities should appear in client timeline
- ❌ **MISSING:** Client status changes should update CRM records

**4.3 CRM ↔ Financial Management Integration:**
- ❌ **MISSING:** Lead value should flow to project budget estimates
- ❌ **MISSING:** Opportunity won should trigger invoice creation workflow
- ❌ **MISSING:** Sales pipeline should show revenue projections
- ❌ **MISSING:** CRM activities should link to quotations

**4.4 CRM ↔ Employee Integration:**
- ✅ **EXISTS:** Activities can be assigned to employees
- ❌ **MISSING:** Employee assignment dropdown should use employee-selector-service
- ❌ **MISSING:** Employee performance should include CRM activity metrics
- ❌ **MISSING:** Sales team assignments should sync with employee records

**Implementation Files:**
- `src/pages/CRM.tsx` - Add integration features
- `src/components/LeadFormDialog.tsx` - Enhance with project/client options
- `src/components/ConvertLeadToClientDialog.tsx` - Add project creation option
- `src/components/crm/PipelineBoard.tsx` - Add project creation from pipeline

#### 5. Financial Management ↔ All Modules Integration

**Current State:** ⚠️ Partial - Financials exist but lack full integration

**Required Integrations:**

**5.1 Financials ↔ Projects Integration:**
- ❌ **MISSING:** Project costs should auto-create journal entries
- ❌ **MISSING:** Financial Management → Jobs should show all projects with financials
- ❌ **MISSING:** Project budget vs actual should appear in financial reports
- ❌ **MISSING:** Project profitability should be calculated and displayed
- ❌ **MISSING:** Invoice generation from project milestones

**5.2 Financials ↔ Clients Integration:**
- ✅ **EXISTS:** Invoices and payments linked to clients
- ❌ **MISSING:** Client aging report in Financial Management
- ❌ **MISSING:** Client payment history and trends
- ❌ **MISSING:** Credit limit monitoring and alerts

**5.3 Financials ↔ Employees Integration:**
- ✅ **EXISTS:** Payroll linked to employees
- ❌ **MISSING:** Employee cost allocation to projects/departments
- ❌ **MISSING:** Payroll summary in Employee Management
- ❌ **MISSING:** Employee expense tracking and reimbursement integration

**5.4 Financials ↔ Inventory/Procurement Integration:**
- ❌ **MISSING:** Purchase orders should create journal entries
- ❌ **MISSING:** Inventory valuation should appear in financial reports
- ❌ **MISSING:** Goods receipt should update accounts payable
- ❌ **MISSING:** Inventory costs should flow to project costs

**Implementation Files:**
- `src/pages/FinancialManagement.tsx` - Add all integration sections
- `src/pages/CreateJournalEntry.tsx` - Auto-populate from related modules
- `src/services/api/project-service.ts` - Add financial integration methods
- `src/pages/ProjectManagement.tsx` - Show financial summary

#### 6. Form Dialog Integration Requirements

**Current State:** ⚠️ Forms fetch data independently, causing duplication and inconsistency

**Required Standardizations:**

**6.1 Employee Selection Standardization:**
- ✅ **EXISTS:** `employee-selector-service.ts` provides standardized employee fetching
- ❌ **MISSING:** All form dialogs must use `getEmployeesForAssignmentAuto()` from `employee-selector-service.ts`
- ❌ **MISSING:** Remove all direct `unified_employees` queries from form dialogs
- ❌ **MISSING:** Employee dropdowns should support search, filter by department, filter by role
- ❌ **MISSING:** Employee selection should show employee details (department, position, avatar)

**Affected Form Dialogs:**
- `ProjectFormDialog.tsx` - Project manager, account manager, team members
- `TaskFormDialog.tsx` - Task assignees
- `LeadFormDialog.tsx` - Assigned to employee
- `ActivityFormDialog.tsx` - Assigned to employee
- `JobFormDialog.tsx` - Employee assignments
- `PayrollFormDialog.tsx` - Employee selection
- `LeaveRequestFormDialog.tsx` - Employee selection
- All other forms with employee selection

**6.2 Client Selection Standardization:**
- ❌ **MISSING:** Create `client-selector-service.ts` for standardized client fetching
- ❌ **MISSING:** Client dropdowns should support search, filter by status, filter by industry
- ❌ **MISSING:** Client selection should show client details (contact person, email, phone)

**Affected Form Dialogs:**
- `ProjectFormDialog.tsx` - Client selection
- `InvoiceFormDialog.tsx` - Client selection
- `QuotationFormDialog.tsx` - Client selection
- `LeadFormDialog.tsx` - Company/client selection

**6.3 Department Selection Standardization:**
- ❌ **MISSING:** Create `department-selector-service.ts` for standardized department fetching
- ❌ **MISSING:** Department dropdowns should support search, show manager name, show member count

**Affected Form Dialogs:**
- `ProjectFormDialog.tsx` - Department assignments
- `UserFormDialog.tsx` - Department assignment
- `DepartmentFormDialog.tsx` - Parent department selection

**6.4 Project Selection Standardization:**
- ❌ **MISSING:** Create `project-selector-service.ts` for standardized project fetching
- ❌ **MISSING:** Project dropdowns should support search, filter by status, filter by client

**Affected Form Dialogs:**
- `TaskFormDialog.tsx` - Project selection
- `InvoiceFormDialog.tsx` - Project selection (for project-based invoicing)
- `JobFormDialog.tsx` - Project selection

**6.5 Inventory/Product Selection Standardization:**
- ❌ **MISSING:** Create `inventory-selector-service.ts` for standardized product fetching
- ❌ **MISSING:** Product dropdowns should support search, filter by category, show stock levels

**Affected Form Dialogs:**
- `JobFormDialog.tsx` - Material/product selection
- Purchase order forms - Product selection
- Invoice forms - Product/service selection

### Manager Perspective Requirements

#### Project Manager Perspective

**Required Integrated Views:**
1. **Project Dashboard:**
   - All projects with status, budget, timeline
   - Client information for each project
   - Team member assignments and availability
   - Financial summary (budget vs actual, profitability)
   - Task completion rates
   - Resource allocation and workload

2. **Project Details:**
   - Full client information and contact details
   - All assigned employees with roles and contact info
   - Financial breakdown (budget, costs, revenue, profit)
   - Task list with assignments and progress
   - Timeline and milestones
   - Related invoices and payments
   - Department assignments

3. **Resource Planning:**
   - Employee availability from attendance/leave data
   - Employee skills and past project experience
   - Department capacity and workload
   - Project resource conflicts and overallocation

#### Financial Manager Perspective

**Required Integrated Views:**
1. **Financial Dashboard:**
   - All projects with financial status
   - Client financial summary (invoiced, paid, outstanding)
   - Employee cost allocation
   - Department budget vs actual
   - Revenue projections from CRM pipeline
   - Inventory valuation and costs

2. **Client Financials:**
   - All invoices and payment history
   - Outstanding balances and aging
   - Credit limit usage
   - Project financials linked to client
   - Payment terms and history

3. **Project Financials:**
   - Budget vs actual costs
   - Revenue from invoices
   - Profitability calculations
   - Cost center allocations
   - Journal entries linked to projects

#### HR Manager Perspective

**Required Integrated Views:**
1. **Employee Dashboard:**
   - All employees with status and department
   - Project assignments per employee
   - Attendance and leave summaries
   - Performance metrics
   - Payroll summaries

2. **Department Overview:**
   - All employees in department
   - Department projects and workload
   - Department budget allocation
   - Performance metrics by department

#### Sales Manager (CRM) Perspective

**Required Integrated Views:**
1. **CRM Dashboard:**
   - All leads with status and value
   - Pipeline with conversion rates
   - Client information and history
   - Project status for converted leads
   - Revenue from won opportunities

2. **Lead/Client Details:**
   - Full lead/client information
   - All related projects
   - All related invoices and payments
   - Activity history and timeline
   - Conversion history (lead → client → project)

### Technical Constraints

- **Must maintain:**
  - Existing functionality (no breaking changes)
  - Multi-tenant isolation (`agency_id` filtering on all queries)
  - Database schema compatibility
  - API contract compatibility
  - Performance (no N+1 queries, proper pagination)

- **Must follow:**
  - Existing service layer patterns (`src/services/api/*.ts`)
  - Standardized selector services for dropdowns
  - React Query for data fetching and caching
  - TypeScript strict mode
  - Existing component structure and naming

- **Performance requirements:**
  - All dropdowns must support search and pagination
  - Large datasets must be paginated (25-50 items per page)
  - Use React Query caching to avoid redundant API calls
  - Debounce search inputs (300ms)
  - Lazy load related data (load on tab click, not on page load)

### Error Handling Requirements

- **All API calls:**
  - Must have try-catch blocks
  - Must show loading states
  - Must show error messages to users via toast notifications
  - Must log errors for debugging
  - Must handle network failures gracefully

- **Data validation:**
  - All form inputs must be validated with Zod schemas
  - Related data must be validated before linking (e.g., client must exist before assigning to project)
  - Foreign key constraints must be handled with user-friendly error messages

- **Empty states:**
  - All dropdowns must show "No results" when empty
  - All integration sections must show "No data" when empty
  - Provide helpful guidance (e.g., "Create a client first" when no clients exist)

### Data Validation

- **All integrations:**
  - Verify `agency_id` is set on all inserts
  - Verify foreign key relationships exist before linking
  - Validate data types and formats
  - Handle null/undefined values gracefully

- **Form submissions:**
  - Validate all required fields
  - Validate relationships (e.g., employee belongs to selected department)
  - Validate business rules (e.g., project end date after start date)
  - Show validation errors inline

## INTEGRATION REQUIREMENTS

### Files to Create

1. **`src/services/api/client-selector-service.ts`** - Standardized client fetching service
   - `getClientsForSelection(filters?)` - Fetch clients with search/filter support
   - `getClientById(id)` - Fetch single client with full details
   - Support pagination, search, status filter, industry filter

2. **`src/services/api/department-selector-service.ts`** - Standardized department fetching service
   - `getDepartmentsForSelection(filters?)` - Fetch departments with search/filter
   - `getDepartmentById(id)` - Fetch single department with manager and member info
   - Support search, active filter, manager filter

3. **`src/services/api/project-selector-service.ts`** - Standardized project fetching service
   - `getProjectsForSelection(filters?)` - Fetch projects with search/filter
   - `getProjectById(id)` - Fetch single project with full details
   - Support search, status filter, client filter

4. **`src/services/api/inventory-selector-service.ts`** - Standardized inventory/product fetching service
   - `getProductsForSelection(filters?)` - Fetch products with search/filter
   - `getProductById(id)` - Fetch single product with stock levels
   - Support search, category filter, stock level filter

### Files to Modify

**Core Pages (Add Integration Sections):**

1. **`src/pages/ProjectManagement.tsx`**
   - Add client information display in project cards
   - Add financial summary (budget vs actual) in project cards
   - Add employee assignment display with avatars and roles
   - Add department assignment display
   - Add integration tabs in project details view

2. **`src/pages/Projects.tsx`**
   - Add client filter and display
   - Add financial summary column
   - Add employee assignment display
   - Link to client pages from project cards

3. **`src/pages/ProjectDetails.tsx`**
   - Add "Client Information" section with full client details
   - Add "Financial Summary" section (budget, costs, revenue, profit)
   - Add "Team Members" section with employee details and roles
   - Add "Department Assignments" section
   - Add "Related Invoices" section
   - Add "Task Progress" section with completion rates
   - Add "Timeline" section with milestones

4. **`src/pages/EmployeeManagement.tsx`**
   - Add "Projects" tab showing all projects for selected employee
   - Add "Financial Summary" section (payroll, expenses)
   - Add "Attendance Summary" section
   - Add "Performance" section with metrics
   - Add "Department" section with department details

5. **`src/pages/Clients.tsx`**
   - Add "Projects" tab showing all projects for client
   - Add "Financial Summary" section (invoiced, paid, outstanding)
   - Add "CRM Activities" section
   - Add "Recent Invoices" section
   - Add "Recent Quotations" section
   - Add client card enhancements with integrated data

6. **`src/pages/CRM.tsx`**
   - Add "Create Project" option in lead conversion dialog
   - Add project status display for converted leads
   - Add client information in lead cards
   - Add financial summary (lead value, project value, revenue)

7. **`src/pages/FinancialManagement.tsx`**
   - Add "Projects" section in Jobs tab with project financials
   - Add "Client Financials" section with aging reports
   - Add "Employee Costs" section with cost allocation
   - Add integration with project costs for journal entries

**Form Dialogs (Enhance Dropdowns and Data Fetching):**

8. **`src/components/ProjectFormDialog.tsx`**
   - Use `client-selector-service.ts` for client dropdown
   - Use `employee-selector-service.ts` for all employee selections
   - Use `department-selector-service.ts` for department selection
   - Add client information display when client selected
   - Add employee details display when employees selected
   - Add validation for relationships (e.g., employee belongs to selected department)

9. **`src/components/TaskFormDialog.tsx`**
   - Use `project-selector-service.ts` for project selection
   - Use `employee-selector-service.ts` for assignee selection
   - Add project information display when project selected
   - Add employee availability display

10. **`src/components/LeadFormDialog.tsx`**
    - Use `employee-selector-service.ts` for assigned to selection
    - Add "Create Project" option in conversion flow
    - Add client/company search and selection

11. **`src/components/ClientFormDialog.tsx`**
    - Add related data display (projects, invoices, payments)
    - Add CRM activity history

12. **`src/components/InvoiceFormDialog.tsx`**
    - Use `client-selector-service.ts` for client selection
    - Use `project-selector-service.ts` for project selection (optional)
    - Add client payment history and credit limit display
    - Add project financial summary when project selected

13. **`src/components/JobFormDialog.tsx`**
    - Use `project-selector-service.ts` for project selection
    - Use `employee-selector-service.ts` for employee selection
    - Use `inventory-selector-service.ts` for material selection
    - Add project information display
    - Add employee details display

**Service Layer (Add Integration Methods):**

14. **`src/services/api/project-service.ts`**
    - Add `getProjectWithClient(id)` - Fetch project with full client details
    - Add `getProjectWithFinancials(id)` - Fetch project with financial summary
    - Add `getProjectWithTeam(id)` - Fetch project with team member details
    - Add `getProjectsByClient(clientId)` - Fetch all projects for client
    - Add `getProjectsByEmployee(employeeId)` - Fetch all projects for employee
    - Add `createJournalEntryFromProjectCost(projectId, costData)` - Auto-create journal entries

15. **`src/services/api/crm-service.ts`**
    - Add `convertLeadToProject(leadId, projectData)` - Create project from lead
    - Add `getLeadWithClient(leadId)` - Fetch lead with client details
    - Add `getClientActivities(clientId)` - Fetch CRM activities for client
    - Add `createActivityFromProjectUpdate(projectId, updateData)` - Auto-create activities

16. **`src/services/api/postgresql-service.ts`**
    - Ensure all queries include `agency_id` filtering
    - Add helper methods for common join patterns (e.g., project + client join)

### Dependencies/Imports

- **No new dependencies required** - Use existing:
  - React Query for data fetching
  - Zod for validation
  - Existing UI components (Shadcn/ui)
  - Existing service patterns

### State Management

- **Use React Query for all data fetching:**
  - `useQuery` for fetching data
  - `useMutation` for creating/updating/deleting
  - Proper cache keys for invalidation
  - Optimistic updates where appropriate

- **Use existing Zustand stores if needed:**
  - `authStore` for user/agency context
  - Create new stores only if necessary for cross-module state

## CODE QUALITY REQUIREMENTS

### Type Safety

- **All functions:**
  - Must have explicit return types
  - Must have typed parameters
  - No `any` types (use `unknown` if type is truly unknown, then narrow)

- **All services:**
  - Must export TypeScript interfaces for all data types
  - Must type all API responses
  - Must type all function parameters and return values

- **All components:**
  - Props must be typed with interfaces
  - State must be typed
  - Event handlers must be typed

### Code Style

- **Follow existing patterns:**
  - Use existing service layer patterns
  - Use existing component structure
  - Use existing naming conventions
  - Maintain consistent formatting

- **Service layer pattern:**
  ```typescript
  // Example: client-selector-service.ts
  export interface ClientSelection {
    id: string;
    name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    status: string;
  }

  export async function getClientsForSelection(filters?: {
    search?: string;
    status?: string;
    industry?: string;
    limit?: number;
    offset?: number;
  }): Promise<ClientSelection[]> {
    // Implementation with agency_id filtering
  }
  ```

### Best Practices

- **DRY Principle:**
  - Create selector services instead of duplicating query logic
  - Reuse components for common UI patterns (e.g., employee selector component)
  - Extract common validation logic

- **Performance:**
  - Use React Query caching
  - Implement pagination for large datasets
  - Debounce search inputs
  - Lazy load related data
  - Use `React.memo()` for expensive components

- **Error Handling:**
  - Always handle errors gracefully
  - Show user-friendly error messages
  - Log errors for debugging
  - Provide fallback UI for error states

## VERIFICATION CHECKLIST

Before considering the integration complete, verify:

### Functionality
- [ ] All form dialogs populate dropdowns from related modules
- [ ] All pages show integrated data from related modules
- [ ] All bidirectional relationships work (e.g., projects show clients, clients show projects)
- [ ] All manager perspectives show relevant integrated data
- [ ] All data flows work correctly (create in one module, see in related modules)

### Integration Completeness
- [ ] Projects ↔ Clients integration complete
- [ ] Projects ↔ Financials integration complete
- [ ] Projects ↔ Employees integration complete
- [ ] Projects ↔ CRM integration complete
- [ ] Projects ↔ Departments integration complete
- [ ] Employees ↔ All modules integration complete
- [ ] Clients ↔ All modules integration complete
- [ ] CRM ↔ All modules integration complete
- [ ] Financials ↔ All modules integration complete

### Form Dialog Integration
- [ ] All employee selections use `employee-selector-service.ts`
- [ ] All client selections use `client-selector-service.ts`
- [ ] All department selections use `department-selector-service.ts`
- [ ] All project selections use `project-selector-service.ts`
- [ ] All inventory selections use `inventory-selector-service.ts`
- [ ] All dropdowns support search and filtering
- [ ] All dropdowns show relevant details (e.g., department shows manager)

### Data Flow
- [ ] Creating project from CRM lead works
- [ ] Project costs create journal entries automatically
- [ ] Client page shows all related projects
- [ ] Employee page shows all related projects
- [ ] Financial data flows correctly between modules
- [ ] Real-time updates work (change in one module reflects in related modules)

### Multi-Tenant Isolation
- [ ] All queries include `agency_id` filtering
- [ ] All selector services filter by `agency_id`
- [ ] No cross-agency data leakage
- [ ] All foreign key relationships respect agency boundaries

### Performance
- [ ] All dropdowns load quickly (< 500ms)
- [ ] Large datasets are paginated
- [ ] Search is debounced
- [ ] React Query caching works correctly
- [ ] No N+1 query problems

### Error Handling
- [ ] All API calls have error handling
- [ ] All errors show user-friendly messages
- [ ] Network failures are handled gracefully
- [ ] Validation errors show inline
- [ ] Empty states are handled properly

### Testing
- [ ] Test as Project Manager - verify all project integrations
- [ ] Test as Financial Manager - verify all financial integrations
- [ ] Test as HR Manager - verify all employee integrations
- [ ] Test as Sales Manager - verify all CRM integrations
- [ ] Test with multiple agencies - verify isolation
- [ ] Test with large datasets - verify performance

## COMMON PITFALLS TO AVOID

- **Don't:**
  - Create duplicate query logic in multiple components
  - Forget `agency_id` filtering on queries
  - Use direct database queries instead of service layer
  - Create N+1 query problems
  - Break existing functionality
  - Expose sensitive data across agencies
  - Create circular dependencies between services

- **Do:**
  - Use selector services for all dropdowns
  - Follow existing service layer patterns
  - Test with multiple agencies
  - Handle all error cases
  - Implement proper loading states
  - Use React Query for caching
  - Validate all relationships before linking

## EXPECTED OUTPUT

Provide:
1. **Complete implementation:**
   - All new selector service files
   - All modified page files with integration sections
   - All modified form dialog files with enhanced dropdowns
   - All modified service files with integration methods

2. **Integration documentation:**
   - List of all integrations implemented
   - Data flow diagrams (if helpful)
   - Testing instructions for each integration

3. **Testing results:**
   - Verification that all integrations work
   - Performance benchmarks
   - Multi-tenant isolation verification

## SUCCESS CRITERIA

The integration is successful when:
- ✅ All form dialogs use standardized selector services
- ✅ All pages show integrated data from related modules
- ✅ All bidirectional relationships work correctly
- ✅ All manager perspectives show relevant integrated data
- ✅ All data flows work (create in one module, see in related modules)
- ✅ Multi-tenant isolation is maintained
- ✅ Performance is acceptable (no slow dropdowns, no N+1 queries)
- ✅ All error cases are handled gracefully
- ✅ Production deployment works without issues

---

**Priority:** 🔴 **CRITICAL** - This is essential for production readiness and user experience.

**Estimated Impact:** This will transform the ERP from a collection of separate modules into a truly integrated system where all data flows seamlessly between modules, providing managers with comprehensive views of their operations.
