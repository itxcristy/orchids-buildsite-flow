# TASK: Comprehensive Role-Based Access Control (RBAC) Fix with Agency Isolation

## CONTEXT ANALYSIS REQUIRED

Before implementing any changes, you must:

1. **Examine the following files and understand their current implementation:**
   - `src/App.tsx` - All route definitions and ProtectedRoute usage
   - `src/components/ProtectedRoute.tsx` - Route protection logic
   - `src/utils/rolePages.ts` - Role-to-page mapping definitions
   - `src/components/AppSidebar.tsx` - Navigation menu visibility logic
   - `src/utils/roleUtils.ts` - Role hierarchy and utility functions
   - `src/hooks/useAuth.tsx` - Authentication and role fetching
   - `src/hooks/usePermissions.ts` - Permission checking logic
   - `server/middleware/authMiddleware.js` - Backend authentication and authorization
   - `src/components/RoleGuard.tsx` - Component-level role protection (if exists)
   - All page components in `src/pages/` - To understand page-level access checks

2. **Understand the current architecture:**
   - **Framework:** React 18 with TypeScript, React Router v6
   - **Authentication:** JWT tokens stored in localStorage
   - **Multi-tenancy:** Database-level isolation (each agency has separate PostgreSQL database)
   - **Role System:** 22 roles with hierarchical permissions (super_admin → intern)
   - **Agency Context:** Users belong to one agency, identified by `agency_database` in token
   - **State Management:** React Context (AuthProvider) for user/role state

3. **Database Schema Understanding:**
   - Connect to `buildflow_db` (user: postgres, password: admin)
   - Query `information_schema` to understand:
     - `user_roles` table structure (user_id, role, agency_id if exists)
     - `profiles` table structure (user_id, agency_id)
     - `agencies` table structure (id, database_name)
   - Verify foreign key relationships and constraints

## DETAILED REQUIREMENTS

### Primary Objective

Fix all role-based access control issues to ensure:
1. **No pages appear in navigation that users cannot access**
2. **No "Access Denied" errors when users click on visible pages**
3. **Proper role-to-page mapping for all 22 user roles**
4. **Complete agency-level data isolation (users can only see their agency's data)**
5. **Consistent protection at route, component, and API levels**
6. **Backend API endpoints enforce role and agency restrictions**

### Specific Implementation Details

#### 1. Route Protection Alignment (CRITICAL)

**Problem:** Routes in `App.tsx` have `requiredRole` that doesn't match `rolePages.ts` definitions, causing:
- Pages visible in sidebar but showing "Access Denied" when opened
- Pages not visible in sidebar but accessible via direct URL
- Inconsistent role requirements across similar pages

**Solution:**
- **Audit every route** in `App.tsx` against `rolePages.ts` mappings
- **For each route:**
  - Check if the route path exists in `rolePages.ts` for the role
  - If route requires specific role(s), ensure `requiredRole` prop matches
  - If route should be accessible to multiple roles, use array: `requiredRole={["role1", "role2"]}`
  - If route should be accessible to role hierarchy, use `hasRoleOrHigher` logic
- **Create a mapping file** `src/utils/routePermissions.ts` that:
  - Defines exact role requirements for each route
  - Exports a function `getRequiredRolesForRoute(path: string): AppRole[]`
  - Ensures single source of truth for route permissions

**Files to modify:**
- `src/App.tsx` - Update all `<ProtectedRoute>` components with correct `requiredRole` props
- `src/utils/routePermissions.ts` - Create new file with route-to-role mapping

**Acceptance Criteria:**
- Every route in `App.tsx` has `requiredRole` that matches `rolePages.ts`
- No route is accessible without proper role check
- Role hierarchy is respected (higher roles can access lower role pages)

#### 2. Sidebar Navigation Synchronization

**Problem:** `AppSidebar.tsx` shows pages based on `rolePages.ts`, but routes may have different protection, causing visible pages that show "Access Denied".

**Solution:**
- **Enhance `AppSidebar.tsx`** to:
  - Use the same `routePermissions.ts` logic to filter visible pages
  - Only show pages that the current user's role can actually access
  - Hide pages that would show "Access Denied" even if they exist in `rolePages.ts`
- **Add real-time permission check** before rendering sidebar items
- **Handle role hierarchy** - if user has higher role, show all pages accessible to lower roles

**Files to modify:**
- `src/components/AppSidebar.tsx` - Add permission checking before rendering menu items
- `src/utils/rolePages.ts` - Ensure all page definitions are accurate

**Acceptance Criteria:**
- Sidebar only shows pages user can actually access
- No "Access Denied" errors when clicking sidebar items
- Pages are properly categorized and sorted

#### 3. Role-Page Mapping Completeness

**Problem:** `rolePages.ts` may have incomplete mappings or pages that don't exist, causing navigation issues.

**Solution:**
- **Audit all pages** in `src/pages/` directory
- **For each page:**
  - Verify it exists in `rolePages.ts` for appropriate roles
  - Ensure page path matches route path in `App.tsx`
  - Add missing pages to appropriate roles
  - Remove non-existent pages from role mappings
- **Create comprehensive role permissions matrix:**
  - Document which roles can access which pages
  - Ensure executive roles (CEO, CTO, CFO, COO) have appropriate access
  - Ensure management roles have operational access
  - Ensure specialized roles (HR, Finance, etc.) have domain-specific access
  - Ensure general roles (employee, contractor, intern) have limited access

**Files to modify:**
- `src/utils/rolePages.ts` - Complete all role-to-page mappings
- Create `docs/ROLE_PERMISSIONS_MATRIX.md` - Document all role permissions

**Acceptance Criteria:**
- All 22 roles have complete page mappings
- No orphaned pages (pages without role assignments)
- No duplicate or conflicting page definitions

#### 4. Agency-Level Data Isolation (CRITICAL)

**Problem:** Users may be able to access data from other agencies, violating multi-tenancy security.

**Solution:**
- **Backend API Protection:**
  - Verify `server/middleware/authMiddleware.js` extracts `agencyDatabase` from token
  - Ensure all API routes use agency-specific database connections
  - Add middleware to verify user's `agencyDatabase` matches request context
  - Add `agency_id` filtering to all database queries
- **Frontend Data Filtering:**
  - Verify all API calls include `X-Agency-Database` header
  - Ensure all data fetching hooks filter by `agency_id` or use agency-specific database
  - Add agency context validation in `useAuth` hook
- **Database Query Protection:**
  - Verify all `SELECT`, `INSERT`, `UPDATE`, `DELETE` queries include agency filter
  - Use parameterized queries with `agency_id` or `agency_database` context
  - Add database-level RLS (Row Level Security) policies if possible

**Files to modify:**
- `server/middleware/authMiddleware.js` - Enhance agency context validation
- `src/hooks/useAuth.tsx` - Add agency context validation
- `src/services/api/*.ts` - Ensure all API calls include agency context
- `server/routes/*.js` - Add agency filtering to all database queries
- `src/integrations/postgresql/client-http.ts` - Verify agency database routing

**Acceptance Criteria:**
- Users can only access data from their own agency
- API endpoints reject requests with mismatched agency context
- Database queries automatically filter by agency
- No cross-agency data leakage possible

#### 5. Component-Level Access Control

**Problem:** Some components may show sensitive data or actions to unauthorized users.

**Solution:**
- **Create `RoleGuard` component** (if doesn't exist) or enhance existing one:
  - Accept `requiredRole` or `requiredRoles` prop
  - Check user's role against requirements
  - Hide component or show "Access Denied" message if unauthorized
- **Audit all sensitive components:**
  - Financial components (payroll, invoices, payments)
  - HR components (employee management, role assignments)
  - System components (super admin dashboard, system settings)
  - Add `RoleGuard` wrappers where needed

**Files to modify:**
- `src/components/RoleGuard.tsx` - Create or enhance component-level protection
- All sensitive page components - Add role checks for sensitive sections

**Acceptance Criteria:**
- Sensitive UI elements are hidden from unauthorized users
- Component-level access matches route-level access
- No sensitive actions available to unauthorized roles

#### 6. Backend API Role Enforcement

**Problem:** Backend API endpoints may not enforce role-based access, allowing unauthorized operations.

**Solution:**
- **Create role checking middleware:**
  - `requireRole(role: AppRole | AppRole[])` - Check if user has required role
  - `requireRoleOrHigher(minimumRole: AppRole)` - Check role hierarchy
  - `requireAgencyContext()` - Verify agency context is present
- **Apply middleware to all protected routes:**
  - Financial routes (payroll, invoices, payments, receipts)
  - HR routes (employee management, role assignments)
  - System routes (super admin, system dashboard)
  - Management routes (projects, clients, departments)
- **Add role validation in route handlers:**
  - Verify user's role before processing requests
  - Return 403 Forbidden with clear error message if unauthorized

**Files to modify:**
- `server/middleware/authMiddleware.js` - Add role checking functions
- `server/routes/*.js` - Apply role middleware to protected routes
- All route handlers - Add role validation

**Acceptance Criteria:**
- All protected API endpoints check user roles
- Unauthorized requests return 403 with clear error messages
- Role hierarchy is respected in API access

#### 7. Error Handling and User Feedback

**Problem:** Users see generic "Access Denied" errors without context.

**Solution:**
- **Enhance `ProtectedRoute` component:**
  - Show specific error message based on access failure reason
  - Provide navigation suggestions (e.g., "This page requires Admin role")
  - Add "Request Access" button for certain scenarios
- **Improve error messages:**
  - "You need [Role] role to access this page"
  - "This page is only available to [Role1, Role2] roles"
  - "Contact your administrator to request access"
- **Add logging:**
  - Log access denied attempts for security auditing
  - Track which roles are trying to access which pages

**Files to modify:**
- `src/components/ProtectedRoute.tsx` - Enhance error messages
- `src/components/ErrorBoundary.tsx` - Add permission error handling
- `server/middleware/authMiddleware.js` - Add access attempt logging

**Acceptance Criteria:**
- Clear, helpful error messages for access denials
- Users understand why access was denied
- Security events are logged for auditing

## INTEGRATION REQUIREMENTS

### Files to Modify

1. **`src/App.tsx`**
   - Update all route definitions with correct `requiredRole` props
   - Ensure consistency with `rolePages.ts` mappings
   - Add missing route protections

2. **`src/components/ProtectedRoute.tsx`**
   - Enhance error messages
   - Add agency context validation
   - Improve role hierarchy checking

3. **`src/components/AppSidebar.tsx`**
   - Filter visible pages based on actual route permissions
   - Add real-time permission checking
   - Handle role hierarchy properly

4. **`src/utils/rolePages.ts`**
   - Complete all role-to-page mappings
   - Remove non-existent pages
   - Add missing pages to appropriate roles

5. **`src/utils/routePermissions.ts`** (NEW FILE)
   - Create single source of truth for route permissions
   - Export functions for permission checking
   - Map all routes to required roles

6. **`server/middleware/authMiddleware.js`**
   - Add role checking middleware functions
   - Enhance agency context validation
   - Add access attempt logging

7. **`src/hooks/useAuth.tsx`**
   - Add agency context validation
   - Ensure role fetching is reliable
   - Add role change detection

8. **All API route files in `server/routes/`**
   - Apply role middleware to protected routes
   - Add agency filtering to all queries
   - Validate user permissions before processing

9. **All page components in `src/pages/`**
   - Add component-level role checks for sensitive sections
   - Ensure pages handle unauthorized access gracefully

### Files to Create

1. **`src/utils/routePermissions.ts`**
   - Route-to-role mapping
   - Permission checking utilities

2. **`docs/ROLE_PERMISSIONS_MATRIX.md`**
   - Complete documentation of role permissions
   - Page access matrix for all roles

3. **`src/components/RoleGuard.tsx`** (if doesn't exist)
   - Component-level role protection
   - Reusable permission checking component

### Dependencies/Imports

- No new dependencies required
- Use existing: `@/hooks/useAuth`, `@/utils/roleUtils`, `react-router-dom`

### State Management

- Use existing `AuthProvider` context for user/role state
- Ensure role state is updated when user changes
- Cache role permissions to avoid repeated API calls

## CODE QUALITY REQUIREMENTS

### Type Safety

- All functions must have explicit TypeScript types
- `AppRole` type must be used consistently
- No `any` types - use proper interfaces
- Route props must be typed correctly

### Code Style

- Follow existing code formatting (Prettier/ESLint)
- Use existing naming conventions
- Maintain consistent indentation
- Add JSDoc comments for complex functions

### Best Practices

- **Single Source of Truth:** Route permissions defined once in `routePermissions.ts`
- **DRY Principle:** Reuse permission checking logic
- **Fail Secure:** Default to denying access if role is unclear
- **Clear Error Messages:** Users should understand why access was denied
- **Performance:** Cache role/permission data, avoid repeated checks
- **Security:** Never trust client-side role checks alone - always verify on backend

### Testing Requirements

- **Manual Testing Checklist:**
  - Test each role accessing all pages in their `rolePages.ts` list
  - Verify no "Access Denied" errors for visible pages
  - Verify "Access Denied" for unauthorized pages
  - Test role hierarchy (higher roles can access lower role pages)
  - Test agency isolation (users can't access other agency data)
  - Test direct URL access (bypassing sidebar)
  - Test API endpoints with different roles
  - Test agency context validation

## VERIFICATION CHECKLIST

Before submitting the code, verify:

- [ ] All routes in `App.tsx` have correct `requiredRole` props matching `rolePages.ts`
- [ ] Sidebar only shows pages user can actually access
- [ ] No "Access Denied" errors when clicking sidebar items
- [ ] All 22 roles have complete page mappings in `rolePages.ts`
- [ ] Agency isolation is enforced at API level
- [ ] All database queries filter by agency context
- [ ] Backend API endpoints check user roles
- [ ] Component-level access control matches route-level control
- [ ] Error messages are clear and helpful
- [ ] Role hierarchy is respected (higher roles can access lower role pages)
- [ ] Direct URL access is properly protected
- [ ] No cross-agency data access possible
- [ ] All TypeScript types are correct
- [ ] No console errors or warnings
- [ ] Code follows project conventions
- [ ] All edge cases are handled (missing roles, expired tokens, etc.)

## COMMON PITFALLS TO AVOID

1. **Inconsistent Role Definitions:** Don't define roles in multiple places - use `roleUtils.ts` as single source
2. **Missing Agency Context:** Always include agency context in API calls and database queries
3. **Client-Side Only Protection:** Never rely solely on frontend checks - always verify on backend
4. **Hardcoded Role Checks:** Use utility functions from `roleUtils.ts` instead of hardcoding role names
5. **Incomplete Role Mappings:** Ensure every page is assigned to appropriate roles
6. **Ignoring Role Hierarchy:** Higher roles should be able to access lower role pages
7. **Missing Error Handling:** Always handle cases where role is undefined or invalid
8. **Performance Issues:** Cache role/permission data to avoid repeated API calls
9. **Security Gaps:** Test that users cannot access other agencies' data
10. **Poor User Experience:** Provide clear error messages, don't just show "Access Denied"

## EXPECTED OUTPUT

Provide:

1. **Complete, working code** for all modified files
2. **New files** (`routePermissions.ts`, `RoleGuard.tsx` if needed, documentation)
3. **Clear explanation** of changes made to each file
4. **Testing instructions** for verifying the fixes
5. **Migration notes** if any database changes are needed
6. **Role permissions matrix** documenting all role-to-page mappings

## SUCCESS CRITERIA

The implementation is successful when:

1. ✅ **No pages appear in navigation that users cannot access**
   - Sidebar only shows accessible pages
   - No "Access Denied" errors for visible pages

2. ✅ **All routes are properly protected**
   - Direct URL access is blocked for unauthorized users
   - Role hierarchy is respected

3. ✅ **Complete role-to-page mapping**
   - All 22 roles have accurate page assignments
   - No orphaned or missing pages

4. ✅ **Agency isolation is enforced**
   - Users can only access their own agency's data
   - API endpoints validate agency context
   - Database queries filter by agency

5. ✅ **Backend API security**
   - All protected endpoints check user roles
   - Unauthorized requests return 403 errors
   - Access attempts are logged

6. ✅ **User experience is improved**
   - Clear error messages for access denials
   - Helpful navigation suggestions
   - No confusing "Access Denied" errors

7. ✅ **Code quality is maintained**
   - TypeScript types are correct
   - Code follows project conventions
   - No console errors or warnings
   - Performance is optimized

## IMPLEMENTATION PRIORITY

1. **CRITICAL (Do First):**
   - Fix route protection alignment (`App.tsx` vs `rolePages.ts`)
   - Fix sidebar navigation synchronization
   - Ensure agency isolation at API level

2. **HIGH (Do Second):**
   - Complete role-to-page mappings
   - Add backend API role enforcement
   - Enhance error handling

3. **MEDIUM (Do Third):**
   - Add component-level access control
   - Create documentation
   - Add logging and auditing

---

**Note:** This is a comprehensive security fix. Take time to test thoroughly with different roles and scenarios. Security is more important than speed - ensure all access controls are properly implemented before considering the task complete.
