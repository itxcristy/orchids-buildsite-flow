# Role Permissions Matrix

This document provides a comprehensive overview of role-based access control (RBAC) in the BuildFlow application.

## Role Hierarchy

Roles are organized in a hierarchy where lower numbers indicate higher authority:

1. **super_admin** - System administrator with full access
2. **ceo** - Chief Executive Officer
3. **cto** - Chief Technology Officer
4. **cfo** - Chief Financial Officer
5. **coo** - Chief Operations Officer
6. **admin** - Administrator
7. **operations_manager** - Operations Manager
8. **department_head** - Department Head
9. **team_lead** - Team Lead
10. **project_manager** - Project Manager
11. **hr** - Human Resources
12. **finance_manager** - Finance Manager
13. **sales_manager** - Sales Manager
14. **marketing_manager** - Marketing Manager
15. **quality_assurance** - Quality Assurance
16. **it_support** - IT Support
17. **legal_counsel** - Legal Counsel
18. **business_analyst** - Business Analyst
19. **customer_success** - Customer Success
20. **employee** - Employee
21. **contractor** - Contractor
22. **intern** - Intern

## Access Control Principles

1. **Role Hierarchy**: Higher roles (lower numbers) can access pages available to lower roles
2. **Agency Isolation**: Users can only access data from their own agency
3. **Route Protection**: All routes are protected at the route level, component level, and API level
4. **Single Source of Truth**: Route permissions are defined in `src/utils/routePermissions.ts`

## Route Permissions

### Public Routes (No Authentication Required)
- `/` - Landing page
- `/pricing` - Pricing page
- `/auth` - Authentication page
- `/agency-signup` - Agency signup
- `/signup-success` - Signup success page
- `/forgot-password` - Password reset

### Authenticated Routes (All Authenticated Users)
- `/dashboard` - Main dashboard
- `/settings` - User settings
- `/my-profile` - User profile
- `/my-attendance` - Personal attendance
- `/my-leave` - Personal leave management
- `/project-management` - Project management
- `/projects/:id` - Project details
- `/tasks/:id` - Task details
- `/clients` - Client management
- `/quotations` - Quotation management
- `/reimbursements` - Reimbursement requests
- `/jobs` - Job costing
- `/department-management` - Department management
- `/ai-features` - AI features
- `/calendar` - Calendar view
- `/employee-performance` - Employee performance
- `/permissions` - Advanced permissions
- `/documents` - Document management
- `/messages` - Message center
- `/notifications` - Notifications

### Admin-Only Routes
- `/agency-setup` - Agency configuration
- `/employee-management` - Employee management
- `/create-employee` - Create employee
- `/assign-user-roles` - Assign user roles
- `/projects` - Projects overview (admin view)
- `/reports` - Reports dashboard
- `/analytics` - Analytics dashboard
- `/agency` - Agency dashboard
- `/advanced-dashboard` - Advanced analytics

### HR-Only Routes
- `/attendance` - Attendance management
- `/leave-requests` - Leave request management
- `/holiday-management` - Holiday calendar
- `/role-requests` - Role change requests
- `/crm` - CRM system
- `/crm/leads/:leadId` - Lead details
- `/crm/activities/:activityId` - Activity details

### Financial Routes (Admin, Finance Manager, CFO)
- `/payroll` - Payroll management
- `/invoices` - Invoice management
- `/payments` - Payment tracking
- `/receipts` - Receipt management
- `/ledger` - General ledger
- `/ledger/create-entry` - Create journal entry
- `/gst-compliance` - GST compliance

### Financial Management (Admin, Finance Manager, CEO, CFO)
- `/financial-management` - Financial dashboard
- `/centralized-reports` - Centralized reporting

### Employee-Only Routes
- `/my-projects` - Employee view of assigned projects

### Super Admin Routes
- `/system` - System administration dashboard
- `/agency/:agencyId/super-admin-dashboard` - Super admin dashboard for specific agency

## Role-Specific Access

### Super Admin
- Full system access
- Can access all routes
- Can manage all agencies
- System administration

### CEO
- Strategic oversight
- Financial overview
- Employee management
- Reports and analytics
- CRM access
- Projects overview

### CTO
- Technology focus
- Employee management
- Projects and project management
- Reports and analytics

### CFO
- Financial oversight
- All financial routes
- Employee management
- Financial reports
- GST compliance

### COO
- Operations oversight
- Employee management
- Projects and project management
- Attendance management
- Reports and analytics

### Admin
- Full operational access
- Employee management
- Department management
- Projects management
- Financial management
- Reports and analytics
- Calendar and holiday management
- CRM access

### Operations Manager
- Operations management
- Employee management
- Project management
- Attendance tracking
- Reports

### Department Head
- Department management
- Employee management
- Project management
- Attendance management
- Leave request management
- Department reports

### Team Lead
- Team management
- Project management
- Employee performance
- Personal pages

### Project Manager
- Project management
- Team members
- Client management
- Project reports

### HR
- HR management
- Employee management
- Attendance management
- Leave management
- Role requests
- Calendar and holiday management
- CRM access
- Reimbursements

### Finance Manager
- Financial management
- Payroll, invoices, payments, receipts
- Ledger management
- GST compliance
- Financial reports
- Client management

### Sales Manager
- Sales management
- CRM access
- Client management
- Quotations
- Sales reports
- Project management

### Marketing Manager
- Marketing management
- CRM access
- Client management
- Project management
- Marketing reports
- Analytics

### Quality Assurance
- QA management
- Projects access
- QA reports

### IT Support
- IT management
- Employee management
- IT reports

### Legal Counsel
- Legal management
- Client management
- Legal reports

### Business Analyst
- Analytics and reporting
- Projects access
- Analytics reports

### Customer Success
- Customer management
- CRM access
- Client management
- Projects access
- Customer reports

### Employee
- Personal pages
- My projects
- My attendance
- My leave
- My reimbursements
- Employee performance

### Contractor
- Personal pages
- My projects
- My attendance
- Employee performance

### Intern
- Personal pages
- My projects
- My attendance
- Employee performance

## Agency Isolation

All data access is isolated by agency:

1. **Token-Based**: Each user's token contains `agencyDatabase` identifier
2. **API Level**: All API requests must include `X-Agency-Database` header
3. **Database Level**: All queries filter by `agency_id` or use agency-specific database
4. **Middleware**: `requireAgencyContext` middleware validates agency context

## Security Best Practices

1. **Defense in Depth**: Protection at route, component, and API levels
2. **Fail Secure**: Default to denying access if role is unclear
3. **Clear Error Messages**: Users understand why access was denied
4. **Audit Logging**: Access denied attempts are logged
5. **Token Validation**: All tokens are validated for expiry and agency context
6. **Role Hierarchy**: Higher roles can access lower role pages automatically

## Implementation Files

- **Route Permissions**: `src/utils/routePermissions.ts` - Single source of truth
- **Role Utilities**: `src/utils/roleUtils.ts` - Role hierarchy and utilities
- **Role Pages**: `src/utils/rolePages.ts` - Role-to-page mappings for navigation
- **Protected Route**: `src/components/ProtectedRoute.tsx` - Route protection component
- **Role Guard**: `src/components/RoleGuard.tsx` - Component-level protection
- **App Sidebar**: `src/components/AppSidebar.tsx` - Navigation with permission filtering
- **Backend Middleware**: `server/middleware/authMiddleware.js` - API-level protection

## Testing Checklist

- [ ] Test each role accessing all pages in their rolePages.ts list
- [ ] Verify no "Access Denied" errors for visible pages
- [ ] Verify "Access Denied" for unauthorized pages
- [ ] Test role hierarchy (higher roles can access lower role pages)
- [ ] Test agency isolation (users can't access other agency data)
- [ ] Test direct URL access (bypassing sidebar)
- [ ] Test API endpoints with different roles
- [ ] Test agency context validation
- [ ] Test expired tokens
- [ ] Test missing tokens

## Maintenance

When adding new routes:

1. Add route to `src/utils/routePermissions.ts` with required roles
2. Add route to `src/App.tsx` with matching `requiredRole` prop
3. Add route to `src/utils/rolePages.ts` for appropriate roles
4. Update this documentation
5. Test with all relevant roles
