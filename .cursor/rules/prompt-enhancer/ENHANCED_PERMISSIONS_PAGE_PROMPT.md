# TASK: Build Enterprise-Grade Comprehensive Permissions Management Page

## CONTEXT ANALYSIS REQUIRED

Before implementing any changes, you must:

1. **Examine the following files and understand their current implementation:**
   - `src/components/AdvancedPermissions.tsx` - Current permissions page component (incomplete/broken)
   - `src/hooks/usePermissions.ts` - Permission fetching and checking hook
   - `src/hooks/useAuth.tsx` - Authentication and user role context
   - `src/utils/roleUtils.ts` - Role hierarchy and utility functions (22 roles defined)
   - `src/utils/routePermissions.ts` - Route-to-role mapping definitions
   - `src/utils/rolePages.ts` - Role-to-page access mappings
   - `server/utils/schema/authSchema.js` - Database schema for permissions and role_permissions tables
   - `server/middleware/authMiddleware.js` - Backend authentication and authorization middleware
   - `src/integrations/postgresql/client-http.ts` - Database client configuration
   - `src/lib/database.ts` - Database connection setup
   - `src/components/ui/*` - UI component library (Card, Button, Tabs, Table, Dialog, etc.)
   - `src/config/services.ts` - API service configurations
   - `package.json` - Dependencies and project configuration
   - `tsconfig.json` - TypeScript configuration

2. **Understand the current architecture:**
   - **Framework:** React 18 with TypeScript, React Router v6
   - **Database:** PostgreSQL (buildflow_db, user: postgres, password: admin)
   - **Multi-tenancy:** Agency-level isolation (each agency has separate database context)
   - **Role System:** 22 roles with hierarchical permissions (super_admin → intern)
   - **State Management:** React Context (AuthProvider) for user/role state
   - **UI Library:** shadcn/ui components with Tailwind CSS
   - **API:** RESTful API with Express.js backend
   - **Styling:** Tailwind CSS with custom design system

3. **Database Schema Understanding:**
   - Connect to `buildflow_db` (user: postgres, password: admin)
   - Query `information_schema` to understand:
     - `permissions` table structure (id, name, category, description, is_active, created_at, updated_at)
     - `role_permissions` table structure (id, role, permission_id, granted, created_at, updated_at)
     - `user_roles` table structure (id, user_id, role, agency_id, assigned_at, assigned_by)
     - `users` table structure (id, email, password_hash, is_active, etc.)
     - `profiles` table structure (id, user_id, full_name, agency_id, department, position, etc.)
     - `agencies` table structure (id, name, database_name, is_active, etc.)
     - `audit_logs` table structure (for tracking permission changes)
   - Verify foreign key relationships and constraints
   - Check for existing indexes on permissions tables

## DETAILED REQUIREMENTS

### Primary Objective

Build a **complete, enterprise-grade permissions management page** that provides comprehensive control over:
1. **Role-Based Permissions** - Manage which permissions each of the 22 roles has
2. **User-Level Permissions** - Override permissions for specific users
3. **Permission Categories** - Organize permissions by functional areas
4. **Role Hierarchy Management** - Visualize and manage role relationships
5. **Permission Templates** - Create and apply permission sets
6. **Audit Trail** - Track all permission changes with full history
7. **Bulk Operations** - Efficiently manage permissions at scale
8. **Import/Export** - Backup and restore permission configurations
9. **Compliance & Reporting** - Generate permission reports for audits
10. **Real-time Updates** - Live permission changes across the system

### Specific Implementation Details

#### 1. Permission Management Dashboard (CRITICAL)

**Requirements:**
- **Multi-tab interface** with the following sections:
  - **Overview Tab:** Permission summary, role distribution, recent changes
  - **Roles & Permissions Tab:** Manage permissions per role (22 roles)
  - **Users & Permissions Tab:** Manage user-specific permission overrides
  - **Categories Tab:** Organize permissions by category (e.g., Financial, HR, Projects, System)
  - **Templates Tab:** Create and manage permission templates
  - **Audit Log Tab:** View complete audit trail of permission changes
  - **Reports Tab:** Generate compliance and permission reports
  - **Settings Tab:** Configure permission system settings

**Acceptance Criteria:**
- All tabs are functional and accessible based on user role
- Data loads efficiently with pagination for large datasets
- Real-time updates when permissions change
- Clear visual indicators for granted/denied permissions
- Search and filter capabilities on all lists

**Files to modify:**
- `src/components/AdvancedPermissions.tsx` - Complete rewrite/enhancement

#### 2. Role-Based Permission Management

**Requirements:**
- **Role Selection Interface:**
  - Dropdown/selector for all 22 roles (super_admin, ceo, cto, cfo, coo, admin, operations_manager, department_head, team_lead, project_manager, hr, finance_manager, sales_manager, marketing_manager, quality_assurance, it_support, legal_counsel, business_analyst, customer_success, employee, contractor, intern)
  - Visual role hierarchy display showing relationships
  - Role metadata display (display name, description, level, category)
  
- **Permission Grid/List:**
  - Display all permissions grouped by category
  - Checkbox/toggle for each permission per role
  - Visual indicators: Green (granted), Red (denied), Gray (inherited)
  - Bulk select/deselect by category
  - Search and filter permissions
  - Show permission descriptions on hover/click
  
- **Permission Inheritance:**
  - Show which permissions are inherited from higher roles
  - Allow override of inherited permissions
  - Visual hierarchy showing permission flow
  
- **Save/Update Functionality:**
  - Save role permission changes to `role_permissions` table
  - Validate that user has permission to modify role permissions
  - Show confirmation dialog before saving
  - Optimistic UI updates with rollback on error
  - Success/error notifications

**Acceptance Criteria:**
- All 22 roles can have permissions assigned/removed
- Changes are persisted to database immediately
- Role hierarchy is respected (higher roles can access lower role permissions)
- Bulk operations work correctly
- Permission inheritance is clearly displayed

**Files to create/modify:**
- `src/components/AdvancedPermissions.tsx` - Add role permission management UI
- `src/components/permissions/RolePermissionManager.tsx` - New component for role-permission management
- `src/services/permissions.ts` - API service for permission operations
- `server/routes/permissions.js` - Backend API endpoints for permission CRUD

#### 3. User-Level Permission Overrides

**Requirements:**
- **User Search & Selection:**
  - Searchable user list with filters (name, email, role, department)
  - User profile display (avatar, name, role, department)
  - Current role and permissions display
  
- **Permission Override Interface:**
  - List of all permissions with current state (role-based, overridden, denied)
  - Toggle switches to grant/deny specific permissions for user
  - Visual distinction between role-based and user-specific permissions
  - Ability to reset user permissions to role defaults
  
- **Override Management:**
  - Create `user_permissions` table if it doesn't exist:
    ```sql
    CREATE TABLE IF NOT EXISTS user_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      granted BOOLEAN NOT NULL,
      granted_by UUID REFERENCES users(id),
      granted_at TIMESTAMPTZ DEFAULT now(),
      reason TEXT,
      expires_at TIMESTAMPTZ,
      UNIQUE(user_id, permission_id)
    );
    ```
  - Track who granted the override and when
  - Support temporary permission overrides (with expiration)
  - Reason field for audit purposes

**Acceptance Criteria:**
- Users can be searched and selected efficiently
- Permission overrides are clearly distinguished from role permissions
- Overrides can be temporary or permanent
- All overrides are logged in audit trail
- Overrides can be bulk removed/reset

**Files to create/modify:**
- `src/components/permissions/UserPermissionManager.tsx` - New component
- `src/services/permissions.ts` - Add user permission API methods
- `server/routes/permissions.js` - Add user permission endpoints
- Database migration for `user_permissions` table

#### 4. Permission Categories Management

**Requirements:**
- **Category Organization:**
  - Display permissions grouped by category (Financial, HR, Projects, System, etc.)
  - Allow creating/editing/deleting categories
  - Drag-and-drop to reorganize categories
  - Category-level permission toggles (grant/deny all in category)
  
- **Category CRUD:**
  - Create new categories with name, description, icon
  - Edit existing categories
  - Delete categories (with permission reassignment)
  - Category color coding for visual organization

**Acceptance Criteria:**
- All permissions are properly categorized
- Categories can be managed (CRUD operations)
- Category changes don't break existing permission assignments
- Visual organization is clear and intuitive

**Files to create/modify:**
- `src/components/permissions/CategoryManager.tsx` - New component
- `src/services/permissions.ts` - Category management API
- `server/routes/permissions.js` - Category endpoints

#### 5. Permission Templates

**Requirements:**
- **Template Management:**
  - Create permission templates (e.g., "Finance Manager Template", "Project Lead Template")
  - Templates contain a set of permissions that can be applied to roles/users
  - Save templates with name, description, and permission set
  - Apply templates to one or multiple roles/users at once
  - Clone existing templates
  - Import/export templates as JSON
  
- **Template Library:**
  - Pre-built templates for common role configurations
  - Custom templates created by admins
  - Template versioning (track changes over time)
  - Template comparison (diff view)

**Acceptance Criteria:**
- Templates can be created, edited, and deleted
- Templates can be applied to roles/users efficiently
- Template application is logged in audit trail
- Templates can be exported/imported

**Files to create/modify:**
- `src/components/permissions/PermissionTemplates.tsx` - New component
- `src/services/permissions.ts` - Template API methods
- `server/routes/permissions.js` - Template endpoints
- Database table: `permission_templates` (if needed)

#### 6. Comprehensive Audit Trail

**Requirements:**
- **Audit Log Display:**
  - Table/list of all permission changes with:
    - Timestamp
    - User who made the change
    - Action type (granted, denied, removed, template applied)
    - Target (role or user)
    - Permission affected
    - Old value → New value
    - Reason/notes
    - IP address and user agent
  
- **Filtering & Search:**
  - Filter by date range
  - Filter by user who made change
  - Filter by target (role/user)
  - Filter by permission
  - Filter by action type
  - Search across all fields
  
- **Export Functionality:**
  - Export audit logs to CSV/Excel
  - Export to PDF for compliance reports
  - Scheduled audit report generation
  
- **Audit Log Storage:**
  - All permission changes must be logged to `audit_logs` table
  - Include full context (before/after values)
  - Never allow deletion of audit logs (immutable)

**Acceptance Criteria:**
- Every permission change is logged
- Audit logs are searchable and filterable
- Export functionality works correctly
- Audit logs cannot be deleted or modified
- Performance is acceptable with large audit log datasets

**Files to create/modify:**
- `src/components/permissions/AuditLogViewer.tsx` - New component
- `src/services/audit.ts` - Audit log API service
- `server/routes/audit.js` - Audit log endpoints
- Ensure all permission operations log to `audit_logs` table

#### 7. Permission Reports & Analytics

**Requirements:**
- **Report Types:**
  - **Permission Distribution Report:** Shows which roles have which permissions
  - **User Permission Report:** Shows all users and their effective permissions
  - **Compliance Report:** Checks for compliance issues (e.g., users with excessive permissions)
  - **Role Coverage Report:** Shows which permissions are assigned to which roles
  - **Change History Report:** Summary of permission changes over time period
  - **Unused Permissions Report:** Permissions that are never granted
  
- **Report Generation:**
  - Generate reports on-demand
  - Schedule recurring reports (daily, weekly, monthly)
  - Export reports as PDF, Excel, CSV
  - Email reports to specified recipients
  - Custom date ranges and filters
  
- **Visualizations:**
  - Charts showing permission distribution
  - Role hierarchy visualization
  - Permission usage heatmaps
  - Trend analysis charts

**Acceptance Criteria:**
- All report types generate correctly
- Reports are exportable in multiple formats
- Visualizations are accurate and informative
- Report generation is performant
- Scheduled reports work correctly

**Files to create/modify:**
- `src/components/permissions/Reports.tsx` - New component
- `src/services/reports.ts` - Report generation API
- `server/routes/reports.js` - Report endpoints

#### 8. Bulk Operations & Efficiency Features

**Requirements:**
- **Bulk Permission Assignment:**
  - Select multiple roles/users
  - Select multiple permissions
  - Apply grant/deny operation to all selected
  - Preview changes before applying
  - Batch processing with progress indicator
  
- **Import/Export:**
  - Export current permission configuration to JSON
  - Import permission configuration from JSON
  - Validate imported configuration
  - Preview changes before importing
  - Backup/restore functionality
  
- **Quick Actions:**
  - "Grant all permissions" for a role
  - "Deny all permissions" for a role
  - "Reset to default" for a role/user
  - "Copy permissions from role X to role Y"
  - "Apply template to multiple roles"

**Acceptance Criteria:**
- Bulk operations work correctly without performance issues
- Import/export maintains data integrity
- Quick actions are intuitive and safe
- Progress indicators show during long operations
- Confirmation dialogs prevent accidental bulk changes

**Files to create/modify:**
- `src/components/permissions/BulkOperations.tsx` - New component
- `src/services/permissions.ts` - Bulk operation API methods
- `server/routes/permissions.js` - Bulk operation endpoints

#### 9. Permission System Settings

**Requirements:**
- **Configuration Options:**
  - Enable/disable permission inheritance
  - Default permission policy (deny all vs. allow all)
  - Permission expiration settings
  - Audit log retention period
  - Notification settings for permission changes
  - Permission approval workflow (require approval for certain changes)
  
- **Security Settings:**
  - Require confirmation for sensitive permission changes
  - Two-factor authentication for permission changes
  - IP whitelist for permission management
  - Session timeout for permission management

**Acceptance Criteria:**
- All settings are configurable
- Settings are persisted to database
- Settings changes are logged
- Settings have proper validation

**Files to create/modify:**
- `src/components/permissions/PermissionSettings.tsx` - New component
- `src/services/settings.ts` - Settings API
- `server/routes/settings.js` - Settings endpoints
- Database table: `permission_settings` (if needed)

#### 10. Real-Time Updates & Notifications

**Requirements:**
- **Live Updates:**
  - When permissions change, update UI immediately
  - WebSocket or polling for real-time updates
  - Show notification when permissions are changed by other admins
  - Refresh affected user sessions when permissions change
  
- **Notifications:**
  - Notify users when their permissions change
  - Notify admins when permission changes are made
  - Email notifications for critical permission changes
  - In-app notification center integration

**Acceptance Criteria:**
- UI updates in real-time when permissions change
- Notifications are delivered reliably
- User sessions are updated when permissions change
- Performance is not impacted by real-time updates

**Files to create/modify:**
- `src/hooks/useRealtimePermissions.ts` - New hook for real-time updates
- `src/services/notifications.ts` - Notification service
- `server/routes/notifications.js` - Notification endpoints
- WebSocket integration (if applicable)

### Technical Constraints

- **Database:** Must use PostgreSQL (buildflow_db, user: postgres, password: admin)
- **Multi-tenancy:** All operations must respect agency isolation (filter by agency_id)
- **Role Hierarchy:** Must respect role hierarchy from `roleUtils.ts`
- **Type Safety:** All TypeScript types must be properly defined (no `any` types)
- **API Consistency:** Follow existing API patterns in `src/services/`
- **UI Consistency:** Use shadcn/ui components and follow existing design patterns
- **Performance:** Must handle 1000+ permissions and 100+ users efficiently
- **Security:** All permission changes must be validated on backend
- **Access Control:** Only super_admin, ceo, and admin roles can manage permissions
- **Backward Compatibility:** Must not break existing permission checks

### Error Handling Requirements

- **Database Errors:**
  - Handle connection failures gracefully
  - Show user-friendly error messages for constraint violations
  - Log detailed errors to console for debugging
  - Retry failed operations with exponential backoff
  
- **API Errors:**
  - Handle 401 (unauthorized) - redirect to login
  - Handle 403 (forbidden) - show access denied message
  - Handle 404 (not found) - show not found message
  - Handle 500 (server error) - show generic error with support contact
  - Handle network errors - show retry option
  
- **Validation Errors:**
  - Validate permission names are unique
  - Validate role names match defined roles
  - Validate user IDs exist
  - Show field-level validation errors
  - Prevent invalid permission assignments
  
- **Loading States:**
  - Show loading spinners during data fetching
  - Show skeleton loaders for tables
  - Disable forms during submission
  - Show progress indicators for bulk operations

### Data Validation

- **Permission Names:**
  - Must be unique within category
  - Must match pattern: `[category]_[action]_[resource]` (e.g., `financial_view_invoices`)
  - Must be lowercase with underscores
  - Minimum 3 characters, maximum 100 characters
  
- **Role Names:**
  - Must match one of the 22 defined roles in `roleUtils.ts`
  - Case-sensitive matching
  
- **User IDs:**
  - Must be valid UUIDs
  - Must exist in `users` table
  - Must belong to same agency (for multi-tenancy)
  
- **Permission Assignments:**
  - Cannot assign permission to non-existent role
  - Cannot assign permission to non-existent user
  - Must validate agency context for all operations

## INTEGRATION REQUIREMENTS

### Files to Modify

1. **`src/components/AdvancedPermissions.tsx`**
   - Complete rewrite with all new features
   - Add all tabs and sections
   - Integrate all sub-components
   - Add proper error handling and loading states
   - Ensure TypeScript types are correct

2. **`src/hooks/usePermissions.ts`**
   - Enhance with additional methods:
     - `updateRolePermissions(role, permissions)`
     - `updateUserPermissions(userId, permissions)`
     - `getPermissionCategories()`
     - `getPermissionTemplates()`
     - `applyTemplate(templateId, targetRoles)`
     - `exportPermissions()`
     - `importPermissions(data)`
   - Add real-time subscription support
   - Add caching for performance

3. **`src/utils/roleUtils.ts`**
   - Ensure all 22 roles are properly defined
   - Add helper functions if needed for permission management

4. **`src/App.tsx`**
   - Verify `/permissions` route is properly protected
   - Ensure route has correct `requiredRole` prop (should be `['super_admin', 'ceo', 'admin']`)

5. **`src/utils/routePermissions.ts`**
   - Update `/permissions` route permission to require admin-level roles

### Files to Create

1. **`src/components/permissions/RolePermissionManager.tsx`**
   - Component for managing role-based permissions
   - Permission grid/table with checkboxes
   - Role selector and hierarchy display
   - Bulk operations UI

2. **`src/components/permissions/UserPermissionManager.tsx`**
   - Component for managing user-level permission overrides
   - User search and selection
   - Permission override interface
   - Reset to defaults functionality

3. **`src/components/permissions/CategoryManager.tsx`**
   - Component for managing permission categories
   - Category CRUD interface
   - Category organization UI

4. **`src/components/permissions/PermissionTemplates.tsx`**
   - Component for managing permission templates
   - Template creation/editing
   - Template application interface

5. **`src/components/permissions/AuditLogViewer.tsx`**
   - Component for viewing audit logs
   - Filtering and search interface
   - Export functionality

6. **`src/components/permissions/Reports.tsx`**
   - Component for generating permission reports
   - Report type selection
   - Report generation and export

7. **`src/components/permissions/BulkOperations.tsx`**
   - Component for bulk permission operations
   - Multi-select interfaces
   - Preview and confirmation dialogs

8. **`src/components/permissions/PermissionSettings.tsx`**
   - Component for permission system settings
   - Configuration form
   - Settings validation

9. **`src/services/permissions.ts`** (NEW)
   - API service for all permission operations
   - Methods for CRUD operations
   - Bulk operation methods
   - Import/export methods

10. **`src/services/audit.ts`** (NEW)
    - API service for audit log operations
    - Fetch audit logs with filters
    - Export audit logs

11. **`src/services/reports.ts`** (NEW)
    - API service for report generation
    - Generate various report types
    - Export reports

12. **`src/hooks/useRealtimePermissions.ts`** (NEW)
    - Hook for real-time permission updates
    - WebSocket or polling implementation
    - Notification handling

13. **`server/routes/permissions.js`** (NEW)
    - Backend API routes for permission management
    - CRUD endpoints for permissions
    - Role permission management endpoints
    - User permission management endpoints
    - Bulk operation endpoints
    - Import/export endpoints

14. **`server/routes/audit.js`** (NEW)
    - Backend API routes for audit logs
    - Fetch audit logs with filters
    - Export audit logs

15. **`server/routes/reports.js`** (NEW)
    - Backend API routes for reports
    - Generate reports
    - Export reports

16. **Database Migration Files:**
    - Create migration for `user_permissions` table (if doesn't exist)
    - Create migration for `permission_templates` table (if needed)
    - Create migration for `permission_settings` table (if needed)
    - Ensure all tables have proper indexes
    - Ensure all tables have proper foreign key constraints

### Dependencies/Imports

- Use existing UI components from `@/components/ui/*`
- Use existing hooks: `useAuth`, `usePermissions`
- Use existing utilities: `roleUtils`, `routePermissions`
- Use existing database client: `@/lib/database`
- Use existing toast notifications: `sonner`
- No new major dependencies required (use existing React, TypeScript, etc.)

### State Management

- Use React hooks (useState, useEffect, useMemo, useCallback) for local state
- Use existing AuthProvider context for user/role state
- Cache permission data to avoid repeated API calls
- Use React Query or similar for data fetching/caching (if available)
- Optimize re-renders with React.memo where appropriate

## CODE QUALITY REQUIREMENTS

### Type Safety

- **All functions must have explicit TypeScript types:**
  ```typescript
  interface Permission {
    id: string;
    name: string;
    category: string;
    description: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  interface RolePermission {
    id: string;
    role: AppRole;
    permission_id: string;
    granted: boolean;
    created_at: string;
    updated_at: string;
  }
  
  interface UserPermission {
    id: string;
    user_id: string;
    permission_id: string;
    granted: boolean;
    granted_by: string;
    granted_at: string;
    reason?: string;
    expires_at?: string;
  }
  ```

- **No `any` types** - use proper interfaces or `unknown` with type guards
- **Props must be typed** with interfaces
- **API responses must be typed**
- **Database queries must return typed data**

### Code Style

- Follow existing code formatting (Prettier/ESLint configuration)
- Use existing naming conventions:
  - Components: PascalCase (e.g., `RolePermissionManager`)
  - Functions: camelCase (e.g., `updateRolePermissions`)
  - Constants: UPPER_SNAKE_CASE (e.g., `PERMISSION_CATEGORIES`)
- Maintain consistent indentation (2 spaces)
- Add JSDoc comments for complex functions:
  ```typescript
  /**
   * Updates permissions for a specific role
   * @param role - The role to update permissions for
   * @param permissions - Array of permission IDs to grant
   * @returns Promise resolving to updated role permissions
   */
  ```

### Best Practices

- **DRY Principle:** Reuse permission checking logic, don't duplicate
- **Single Responsibility:** Each component should have one clear purpose
- **Performance Optimization:**
  - Use `useMemo` for expensive computations
  - Use `useCallback` for event handlers passed to children
  - Implement virtual scrolling for large lists (1000+ items)
  - Debounce search inputs
  - Paginate large datasets
- **Accessibility:**
  - Add ARIA labels to all interactive elements
  - Ensure keyboard navigation works
  - Ensure screen reader compatibility
  - Maintain proper focus management
- **Error Boundaries:** Wrap components in error boundaries
- **Loading States:** Always show loading indicators during async operations
- **Optimistic Updates:** Update UI immediately, rollback on error

### Testing Requirements

- **Manual Testing Checklist:**
  - Test permission assignment for all 22 roles
  - Test user permission overrides
  - Test bulk operations with various selections
  - Test import/export functionality
  - Test audit log filtering and export
  - Test report generation for all report types
  - Test permission inheritance
  - Test role hierarchy respect
  - Test agency isolation (users can't see other agencies' permissions)
  - Test access control (only authorized roles can manage permissions)
  - Test error handling (network failures, invalid data, etc.)
  - Test performance with large datasets (1000+ permissions, 100+ users)

## VERIFICATION CHECKLIST

Before submitting the code, verify:

- [ ] All 10 major features are implemented and functional
- [ ] Permission management works for all 22 roles
- [ ] User permission overrides work correctly
- [ ] Permission categories can be managed
- [ ] Permission templates can be created and applied
- [ ] Audit trail logs all permission changes
- [ ] Reports can be generated and exported
- [ ] Bulk operations work efficiently
- [ ] Import/export maintains data integrity
- [ ] Settings are configurable and persisted
- [ ] Real-time updates work (if implemented)
- [ ] All database tables exist and have proper structure
- [ ] All API endpoints are implemented and tested
- [ ] Agency isolation is enforced (multi-tenancy)
- [ ] Access control is properly enforced (only authorized roles)
- [ ] Role hierarchy is respected
- [ ] All TypeScript types are correct (no `any` types)
- [ ] No console errors or warnings
- [ ] Code follows project conventions
- [ ] All edge cases are handled
- [ ] Performance is acceptable with large datasets
- [ ] Error handling is comprehensive
- [ ] Loading states are implemented
- [ ] UI is responsive and accessible
- [ ] All forms have proper validation
- [ ] Confirmation dialogs prevent accidental changes
- [ ] Success/error notifications are shown
- [ ] Audit logs are immutable and comprehensive

## COMMON PITFALLS TO AVOID

1. **Missing Agency Context:** Always filter by `agency_id` in all queries - this is critical for multi-tenancy security
2. **Ignoring Role Hierarchy:** Higher roles should be able to access lower role permissions
3. **Client-Side Only Validation:** Always validate permissions on backend, never trust client-side checks alone
4. **Performance Issues:** Don't fetch all permissions/users at once - use pagination
5. **Missing Audit Logs:** Every permission change must be logged - no exceptions
6. **Type Safety:** Don't use `any` types - properly type everything
7. **Error Handling:** Don't silently fail - always show user-friendly error messages
8. **Access Control:** Don't allow unauthorized roles to manage permissions
9. **Data Integrity:** Validate all inputs before saving to database
10. **UI/UX:** Don't make users wait without feedback - always show loading states

## EXPECTED OUTPUT

Provide:

1. **Complete, working code** for all modified and new files
2. **Database migration files** for any new tables or schema changes
3. **Clear explanation** of changes made to each file
4. **API documentation** for new endpoints (if applicable)
5. **Testing instructions** for verifying the implementation
6. **Performance considerations** and optimization notes
7. **Security considerations** and access control documentation

## SUCCESS CRITERIA

The implementation is successful when:

1. ✅ **All 10 major features are fully functional**
   - Role-based permission management works
   - User-level permission overrides work
   - Categories can be managed
   - Templates can be created and applied
   - Audit trail is comprehensive
   - Reports can be generated
   - Bulk operations are efficient
   - Import/export works correctly
   - Settings are configurable
   - Real-time updates work (if implemented)

2. ✅ **Enterprise-grade quality**
   - Handles 1000+ permissions efficiently
   - Handles 100+ users efficiently
   - All operations are logged for compliance
   - Multi-tenancy is properly enforced
   - Access control is bulletproof

3. ✅ **User experience is excellent**
   - Intuitive UI that's easy to navigate
   - Fast and responsive
   - Clear error messages
   - Helpful tooltips and descriptions
   - Accessible to all users

4. ✅ **Code quality is high**
   - TypeScript types are correct
   - Code follows project conventions
   - No console errors or warnings
   - Performance is optimized
   - Error handling is comprehensive

5. ✅ **Security is robust**
   - Agency isolation is enforced
   - Access control is properly implemented
   - All operations are audited
   - Input validation is comprehensive
   - No security vulnerabilities

---

**Note:** This is a comprehensive, enterprise-grade feature. Take time to implement it properly. Quality and security are more important than speed. Test thoroughly with different roles, users, and scenarios before considering the task complete. This permissions page is critical for top-level companies using this system, so it must be bulletproof.
