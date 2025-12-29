-- ============================================================================
-- BuildFlow ERP - Seed Page Catalog
-- ============================================================================
-- This migration seeds the page_catalog table with all pages from routePermissions.ts
-- Database: buildflow_db
-- Created: 2025-01-XX
-- ============================================================================

-- Insert pages from routePermissions.ts
-- Core pages (free/default)
INSERT INTO public.page_catalog (path, title, description, icon, category, base_cost, is_active, requires_approval) VALUES
-- Dashboard
('/dashboard', 'Main Dashboard', 'Main dashboard for all users', 'BarChart3', 'dashboard', 0, true, false),
('/system', 'System Dashboard', 'System administration dashboard', 'Server', 'system', 0, true, true),
('/system-health', 'System Health', 'System health monitoring', 'Activity', 'system', 0, true, true),
('/agency', 'Agency Dashboard', 'Agency dashboard', 'Building2', 'dashboard', 0, true, false),

-- Employee Management
('/employee-management', 'Employee Management', 'Employee management and administration', 'Users', 'management', 0, true, false),
('/create-employee', 'Create Employee', 'Create new employee', 'UserPlus', 'management', 0, true, false),
('/assign-user-roles', 'Assign User Roles', 'Assign roles to users', 'UserCog', 'management', 0, true, false),
('/employee-performance', 'Employee Performance', 'Employee performance tracking', 'TrendingUp', 'hr', 0, true, false),

-- Project Management
('/project-management', 'Project Management', 'Project management interface', 'FolderKanban', 'projects', 0, true, false),
('/projects', 'Projects', 'Projects overview (admin view)', 'Briefcase', 'projects', 0, true, false),
('/projects/:id', 'Project Details', 'Project details', 'FileText', 'projects', 0, true, false),
('/tasks/:id', 'Task Details', 'Task details', 'CheckSquare', 'projects', 0, true, false),
('/my-projects', 'My Projects', 'Employee view of assigned projects', 'Briefcase', 'projects', 0, true, false),

-- Settings
('/settings', 'Settings', 'User settings', 'Settings', 'settings', 0, true, false),
('/agency-setup', 'Agency Setup', 'Agency configuration and setup', 'Building2', 'settings', 0, true, false),
('/agency-setup-progress', 'Agency Setup Progress', 'Agency setup progress tracking', 'Progress', 'settings', 0, true, false),

-- HR Management
('/attendance', 'Attendance', 'Attendance management (HR)', 'Clock', 'hr', 0, true, false),
('/leave-requests', 'Leave Requests', 'Leave request management (HR)', 'ClipboardList', 'hr', 0, true, false),
('/holiday-management', 'Holiday Management', 'Holiday calendar management', 'CalendarDays', 'hr', 0, true, false),
('/role-requests', 'Role Requests', 'Role change requests', 'UserCog', 'hr', 0, true, false),
('/calendar', 'Calendar', 'Calendar view', 'Calendar', 'hr', 0, true, false),

-- Financial Management
('/payroll', 'Payroll', 'Payroll management', 'DollarSign', 'finance', 0, true, false),
('/invoices', 'Invoices', 'Invoice management', 'FileText', 'finance', 0, true, false),
('/payments', 'Payments', 'Payment tracking', 'CreditCard', 'finance', 0, true, false),
('/receipts', 'Receipts', 'Receipt management', 'Receipt', 'finance', 0, true, false),
('/ledger', 'Ledger', 'General ledger', 'BookOpen', 'finance', 0, true, false),
('/ledger/create-entry', 'Create Journal Entry', 'Create journal entry', 'Plus', 'finance', 0, true, false),
('/financial-management', 'Financial Management', 'Financial management dashboard', 'Calculator', 'finance', 0, true, false),
('/gst-compliance', 'GST Compliance', 'GST compliance management', 'FileBarChart', 'finance', 0, true, false),
('/quotations', 'Quotations', 'Quotation management', 'FileCheck', 'finance', 0, true, false),
('/reimbursements', 'Reimbursements', 'Reimbursement requests', 'DollarSign', 'finance', 0, true, false),
('/jobs', 'Job Costing', 'Job costing', 'Target', 'projects', 0, true, false),

-- Personal Pages
('/my-profile', 'My Profile', 'User profile', 'User', 'personal', 0, true, false),
('/my-attendance', 'My Attendance', 'Personal attendance view', 'Clock', 'personal', 0, true, false),
('/my-leave', 'My Leave', 'Personal leave management', 'Calendar', 'personal', 0, true, false),

-- Clients & CRM
('/clients', 'Clients', 'Client management', 'Handshake', 'management', 0, true, false),
('/clients/create', 'Create Client', 'Create new client', 'UserPlus', 'management', 0, true, false),
('/clients/edit/:id', 'Edit Client', 'Edit client', 'Edit', 'management', 0, true, false),
('/crm', 'CRM', 'CRM system', 'Users2', 'management', 0, true, false),
('/crm/leads/:leadId', 'Lead Details', 'Lead details', 'User', 'management', 0, true, false),
('/crm/activities/:activityId', 'Activity Details', 'Activity details', 'Activity', 'management', 0, true, false),

-- Reports & Analytics
('/reports', 'Reports', 'Reports dashboard', 'ChartLine', 'reports', 0, true, false),
('/analytics', 'Analytics', 'Analytics dashboard', 'ChartLine', 'reports', 0, true, false),
('/centralized-reports', 'Centralized Reports', 'Centralized reporting', 'FileBarChart', 'reports', 0, true, false),
('/reports/dashboard', 'Reporting Dashboard', 'Advanced reporting dashboard', 'BarChart3', 'reports', 0, true, false),
('/reports/custom', 'Custom Reports', 'Custom report builder', 'FileText', 'reports', 0, true, false),
('/reports/scheduled', 'Scheduled Reports', 'Scheduled reports management', 'Calendar', 'reports', 0, true, false),
('/reports/exports', 'Report Exports', 'Report exports management', 'Download', 'reports', 0, true, false),
('/reports/analytics', 'Analytics Dashboard', 'Analytics dashboard for reporting', 'BarChart3', 'reports', 0, true, false),
('/advanced-dashboard', 'Advanced Dashboard', 'Advanced analytics dashboard', 'TrendingUp', 'reports', 0, true, false),

-- Department Management
('/department-management', 'Department Management', 'Department management', 'Building2', 'management', 0, true, false),

-- AI Features
('/ai-features', 'AI Features', 'AI-powered features', 'Sparkles', 'automation', 0, true, false),

-- System & Super Admin
('/email-testing', 'Email Testing', 'Email service testing and configuration', 'Mail', 'system', 0, true, true),
('/agency/:agencyId/super-admin-dashboard', 'Super Admin Dashboard', 'Super admin dashboard for specific agency', 'Shield', 'system', 0, true, true),

-- Advanced Features
('/permissions', 'Permissions', 'Advanced permissions management', 'Shield', 'system', 0, true, false),
('/documents', 'Documents', 'Document management', 'FileText', 'management', 0, true, false),
('/messages', 'Messages', 'Message center', 'Mail', 'personal', 0, true, false),
('/notifications', 'Notifications', 'Notifications', 'Bell', 'personal', 0, true, false),

-- Inventory
('/inventory/products', 'Product Catalog', 'Product catalog management', 'Boxes', 'inventory', 0, true, false),
('/inventory/bom', 'Bill of Materials', 'Bill of Materials management', 'Layers', 'inventory', 0, true, false),
('/inventory/serial-batch', 'Serial & Batch Tracking', 'Serial numbers and batch tracking', 'Hash', 'inventory', 0, true, false),
('/inventory/warehouses', 'Warehouses', 'Warehouse management', 'Warehouse', 'inventory', 0, true, false),
('/inventory/stock-levels', 'Stock Levels', 'Stock levels and inventory tracking', 'TrendingUp', 'inventory', 0, true, false),
('/inventory/transfers', 'Transfers', 'Inter-warehouse inventory transfers', 'ArrowRightLeft', 'inventory', 0, true, false),
('/inventory/adjustments', 'Adjustments', 'Inventory adjustments and corrections', 'Edit', 'inventory', 0, true, false),
('/inventory/reports', 'Inventory Reports', 'Inventory reports and analytics', 'BarChart3', 'reports', 0, true, false),
('/inventory/settings', 'Inventory Settings', 'Inventory module settings', 'Cog', 'settings', 0, true, false),

-- Procurement
('/procurement/vendors', 'Vendors', 'Vendor and supplier management', 'Handshake', 'procurement', 0, true, false),
('/procurement/purchase-orders', 'Purchase Orders', 'Purchase order management', 'ShoppingBag', 'procurement', 0, true, false),
('/procurement/requisitions', 'Requisitions', 'Purchase requisition management', 'FileText', 'procurement', 0, true, false),
('/procurement/goods-receipts', 'Goods Receipts', 'Goods receipt note (GRN) management', 'PackageCheck', 'procurement', 0, true, false),
('/procurement/rfq', 'RFQ/RFP', 'RFQ/RFP management', 'FileSearch', 'procurement', 0, true, false),
('/procurement/vendor-contracts', 'Vendor Contracts', 'Vendor contracts management', 'FileText', 'procurement', 0, true, false),
('/procurement/vendor-performance', 'Vendor Performance', 'Vendor performance tracking', 'TrendingUp', 'procurement', 0, true, false),
('/procurement/reports', 'Procurement Reports', 'Procurement reports and analytics', 'BarChart3', 'reports', 0, true, false),
('/procurement/settings', 'Procurement Settings', 'Procurement module settings', 'Cog', 'settings', 0, true, false),

-- Assets
('/assets', 'Assets', 'Asset management', 'Building2', 'assets', 0, true, false),
('/assets/categories', 'Asset Categories', 'Asset category management', 'FolderTree', 'assets', 0, true, false),
('/assets/locations', 'Asset Locations', 'Asset location management', 'MapPin', 'assets', 0, true, false),
('/assets/maintenance', 'Asset Maintenance', 'Asset maintenance tracking', 'Wrench', 'assets', 0, true, false),
('/assets/depreciation', 'Asset Depreciation', 'Asset depreciation tracking', 'TrendingDown', 'assets', 0, true, false),
('/assets/disposals', 'Asset Disposals', 'Asset disposal management', 'Trash2', 'assets', 0, true, false),
('/assets/reports', 'Asset Reports', 'Asset reports and analytics', 'BarChart3', 'reports', 0, true, false),
('/assets/settings', 'Asset Settings', 'Asset management settings', 'Cog', 'settings', 0, true, false),

-- Workflows
('/workflows', 'Workflows', 'Workflow engine management', 'Workflow', 'workflows', 0, true, false),
('/workflows/builder', 'Workflow Builder', 'Visual workflow builder', 'GitBranch', 'workflows', 0, true, false),
('/workflows/instances', 'Workflow Instances', 'Workflow instance tracking', 'Activity', 'workflows', 0, true, false),
('/workflows/approvals', 'Approval Queue', 'Workflow approval queue', 'CheckCircle2', 'workflows', 0, true, false),
('/workflows/automation', 'Workflow Automation', 'Workflow automation rules', 'Zap', 'automation', 0, true, false),
('/workflows/settings', 'Workflow Settings', 'Workflow engine settings', 'Cog', 'settings', 0, true, false),

-- Integrations
('/integrations', 'Integrations', 'Integration hub management', 'Plug', 'automation', 0, true, false),
('/integrations/settings', 'Integration Settings', 'Integration hub settings', 'Cog', 'settings', 0, true, false)
ON CONFLICT (path) DO NOTHING;

-- Create default recommendation rules based on categories
-- These are basic rules - super admin can refine them later

-- Projects: Required for construction, architecture, engineering
INSERT INTO public.page_recommendation_rules (page_id, industry, company_size, primary_focus, business_goals, priority, is_required)
SELECT id, ARRAY['construction', 'architecture', 'engineering'], NULL, NULL, ARRAY['project_tracking'], 8, true
FROM public.page_catalog WHERE path = '/projects' OR path = '/project-management'
ON CONFLICT DO NOTHING;

-- Financial: Required for all agencies
INSERT INTO public.page_recommendation_rules (page_id, industry, company_size, primary_focus, business_goals, priority, is_required)
SELECT id, NULL, NULL, NULL, ARRAY['financial_planning'], 9, true
FROM public.page_catalog WHERE path IN ('/invoices', '/payments', '/financial-management')
ON CONFLICT DO NOTHING;

-- HR: Recommended for companies with 11+ employees
INSERT INTO public.page_recommendation_rules (page_id, industry, company_size, primary_focus, business_goals, priority, is_required)
SELECT id, NULL, ARRAY['11-50', '51-200', '201-500', '500+'], NULL, ARRAY['hr_management'], 7, false
FROM public.page_catalog WHERE path IN ('/attendance', '/leave-requests', '/employee-management')
ON CONFLICT DO NOTHING;

-- Inventory: Required for manufacturing, recommended for retail
INSERT INTO public.page_recommendation_rules (page_id, industry, company_size, primary_focus, business_goals, priority, is_required)
SELECT id, ARRAY['manufacturing'], NULL, NULL, ARRAY['inventory_control'], 9, true
FROM public.page_catalog WHERE path LIKE '/inventory%'
ON CONFLICT DO NOTHING;

-- Procurement: Recommended for manufacturing, construction
INSERT INTO public.page_recommendation_rules (page_id, industry, company_size, primary_focus, business_goals, priority, is_required)
SELECT id, ARRAY['manufacturing', 'construction'], NULL, NULL, ARRAY['procurement'], 7, false
FROM public.page_catalog WHERE path LIKE '/procurement%'
ON CONFLICT DO NOTHING;

-- Assets: Recommended for larger companies
INSERT INTO public.page_recommendation_rules (page_id, industry, company_size, primary_focus, business_goals, priority, is_required)
SELECT id, NULL, ARRAY['51-200', '201-500', '500+'], NULL, ARRAY['asset_tracking'], 6, false
FROM public.page_catalog WHERE path LIKE '/assets%'
ON CONFLICT DO NOTHING;

-- CRM: Recommended for sales-focused companies
INSERT INTO public.page_recommendation_rules (page_id, industry, company_size, primary_focus, business_goals, priority, is_required)
SELECT id, NULL, NULL, NULL, ARRAY['client_management'], 8, false
FROM public.page_catalog WHERE path IN ('/crm', '/clients')
ON CONFLICT DO NOTHING;

-- Workflows: Recommended for larger companies
INSERT INTO public.page_recommendation_rules (page_id, industry, company_size, primary_focus, business_goals, priority, is_required)
SELECT id, NULL, ARRAY['51-200', '201-500', '500+'], NULL, ARRAY['workflow_automation'], 7, false
FROM public.page_catalog WHERE path LIKE '/workflows%'
ON CONFLICT DO NOTHING;

-- Reports: Recommended for all
INSERT INTO public.page_recommendation_rules (page_id, industry, company_size, primary_focus, business_goals, priority, is_required)
SELECT id, NULL, NULL, NULL, ARRAY['analytics_insights', 'compliance_reporting'], 6, false
FROM public.page_catalog WHERE path LIKE '/reports%' OR path = '/analytics' OR path = '/advanced-dashboard'
ON CONFLICT DO NOTHING;

-- Assign all pages to existing agencies (backward compatibility)
-- This ensures existing agencies have access to all pages
INSERT INTO public.agency_page_assignments (agency_id, page_id, status)
SELECT a.id, pc.id, 'active'
FROM public.agencies a
CROSS JOIN public.page_catalog pc
WHERE pc.is_active = true
ON CONFLICT (agency_id, page_id) DO NOTHING;

