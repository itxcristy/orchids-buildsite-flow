# TASK: Fix Role Request Page to Work Properly

## CONTEXT ANALYSIS REQUIRED
Before implementing any changes, you must:
1. Examine the following files and understand their current implementation:
   - `src/components/RoleChangeRequests.tsx` - Main component that needs fixing
   - `server/utils/schema/miscSchema.js` - Database schema definition for role_change_requests table
   - `src/services/api/postgresql-service.ts` - PostgreSQL service for database operations
   - `src/lib/database.ts` - Database query builder wrapper
   - `src/hooks/useAuth.tsx` - Authentication hook to understand user context
   - `src/utils/roleUtils.ts` - Role utilities and constants
   - `server/index.js` - Server entry point to check for API routes

2. Understand the current architecture:
   - Frontend uses React with TypeScript
   - Database operations use PostgreSQL via `postgresql-service`
   - Component currently mixes Supabase client (`db`) with `postgresql-service` - needs consistency
   - Database schema defines `previous_role` but component expects `existing_role`
   - Schema doesn't have `expires_at` field but component interface includes it
   - Schema has `reviewed_by` but component uses `approved_by`/`rejected_by`

## DETAILED REQUIREMENTS

### Primary Objective
Fix the RoleChangeRequests component to properly:
1. Fetch role change requests from the database using consistent API
2. Display existing role (fetched from user_roles table) and requested role
3. Create new role change requests with proper data structure
4. Approve/reject requests and update user roles accordingly
5. Handle all error states and loading states properly

### Specific Implementation Details

1. **Database Schema Alignment**
   - Update component interface to match actual database schema:
     - Use `previous_role` instead of `existing_role` (or fetch from user_roles)
     - Remove `expires_at` from interface (not in schema)
     - Add `reviewed_by` and `reviewed_at` fields
     - Ensure `approved_by` and `rejected_by` are handled correctly
   - Fetch existing role from `user_roles` table when displaying requests
   - Ensure table exists in database (check migration/schema creation)

2. **API Consistency**
   - Replace all Supabase client (`db`) calls with `postgresql-service` methods
   - Use `selectRecords`, `selectOne`, `insertRecord`, `updateRecord` from postgresql-service
   - Ensure all database operations go through the PostgreSQL API service

3. **Data Fetching**
   - Fetch role change requests with proper joins to get user profiles
   - Fetch existing role from `user_roles` table for each request
   - Handle cases where user might not have a role yet
   - Properly map database fields to component interface

4. **Create Request Functionality**
   - Validate all required fields before submission
   - Fetch existing role from `user_roles` table before creating request
   - Set `previous_role` field when creating request
   - Use proper UUID generation
   - Show proper success/error messages

5. **Approve/Reject Functionality**
   - Update request status correctly
   - Set `reviewed_by` and `reviewed_at` when approving/rejecting
   - When approving, update the user's role in `user_roles` table
   - Handle role updates properly (may need to update existing or create new)
   - Show proper success/error messages

6. **Error Handling**
   - Handle missing table gracefully (show helpful message)
   - Handle database connection errors
   - Handle validation errors
   - Show user-friendly error messages using toast notifications

7. **Loading States**
   - Show loading indicator while fetching requests
   - Disable buttons during create/approve/reject operations
   - Show proper loading states in dialogs

### Technical Constraints
- Must use PostgreSQL service, not Supabase client directly
- Must match database schema exactly
- Must follow existing code patterns in the project
- Must use TypeScript with proper types
- Must use existing UI components (shadcn/ui)
- Must use toast notifications for user feedback

### Error Handling Requirements
- Catch and display database errors clearly
- Handle missing data gracefully (null checks)
- Validate user permissions before allowing actions
- Show appropriate error messages for each error type
- Log errors to console for debugging

### Data Validation
- Validate user_id is selected before creating request
- Validate requested_role is selected
- Validate user has permission to create requests
- Validate user has permission to approve/reject requests
- Ensure existing role is fetched before creating request

## INTEGRATION REQUIREMENTS

### Files to Modify
1. `src/components/RoleChangeRequests.tsx`: 
   - Fix interface to match database schema
   - Replace Supabase client with postgresql-service
   - Add logic to fetch existing role from user_roles
   - Fix create/approve/reject handlers
   - Add proper error handling

2. `server/utils/schema/miscSchema.js` (if needed):
   - Verify table schema matches component needs
   - Add `approved_by` and `rejected_by` fields if needed
   - Ensure all required fields are present

### Files to Create (if any)
- None required, but may need to verify database migration exists

### Dependencies/Imports
- Use existing `@/services/api/postgresql-service` for all database operations
- Use `@/lib/uuid` for UUID generation
- Use `@/hooks/useAuth` for user context
- Use `@/utils/roleUtils` for role utilities
- Use `sonner` for toast notifications

### State Management
- Use React useState for component state
- Fetch data on component mount
- Refresh data after create/approve/reject operations

## CODE QUALITY REQUIREMENTS

### Type Safety
- Define proper TypeScript interface matching database schema
- Type all function parameters and return values
- Use proper types from roleUtils for AppRole
- No `any` types unless absolutely necessary

### Code Style
- Follow existing code formatting
- Use descriptive variable names
- Add comments for complex logic
- Use early returns for error handling
- Follow DRY principle

### Best Practices
- Use async/await for all async operations
- Handle errors with try/catch blocks
- Show loading states during operations
- Provide user feedback for all actions
- Validate inputs before submission

## VERIFICATION CHECKLIST

Before submitting the code, verify:
- [ ] Component loads without errors
- [ ] Role change requests are fetched and displayed correctly
- [ ] Existing role is shown correctly (from user_roles table)
- [ ] Create request dialog works and validates inputs
- [ ] New requests are created successfully in database
- [ ] Approve button updates request status and user role
- [ ] Reject button updates request status
- [ ] Error messages are displayed properly
- [ ] Loading states work correctly
- [ ] No console errors or warnings
- [ ] TypeScript types are correct
- [ ] Code follows project conventions
- [ ] All database operations use postgresql-service
- [ ] User permissions are checked correctly

## COMMON PITFALLS TO AVOID
- Don't mix Supabase client with postgresql-service
- Don't assume existing_role exists in request - fetch from user_roles
- Don't forget to update user_roles table when approving
- Don't use `expires_at` field (not in schema)
- Don't forget to handle null/undefined values
- Don't skip error handling

## EXPECTED OUTPUT

Provide:
1. Complete, working code for RoleChangeRequests.tsx
2. Updated interface matching database schema
3. All database operations using postgresql-service
4. Proper error handling and loading states
5. Clear explanation of changes made

## SUCCESS CRITERIA
The implementation is successful when:
- Role change requests page loads and displays data correctly
- Users can create new role change requests
- Super admins/CEOs can approve/reject requests
- Approving a request updates the user's role in user_roles table
- All error states are handled gracefully
- No console errors or warnings
