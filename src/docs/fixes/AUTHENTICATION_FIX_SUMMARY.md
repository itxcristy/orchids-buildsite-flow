# Authentication Fix - System Dashboard Page Catalog

**Date:** 2024-12-19  
**Issue:** Super admin user getting 401 errors on page-catalog endpoints

---

## Root Cause

The `requireRole` function was only checking roles in the **agency database**, but system-level roles like `super_admin`, `admin`, and `ceo` should be checked in the **main database** for system-level operations.

### The Problem:
1. `requireRole` required `agencyDatabase` context
2. It only checked roles in the agency database
3. System-level endpoints need to check main database for system roles
4. `requireSuperAdmin` was delegating to `requireRole` which had the same issue

---

## Solution Implemented

### 1. Added `getUserRolesFromMainDb` Function
- Checks roles in the main database (buildflow_db)
- Used for system-level role verification
- Falls back to agency database if no roles found in main DB

### 2. Enhanced `requireSuperAdmin` Function
- Now checks **both** main database and agency database
- First checks main DB for system-level super_admin
- Falls back to agency DB if needed
- Provides better error messages

### 3. Enhanced `requireRole` Function
- For system roles (`super_admin`, `admin`, `ceo`): checks main database first
- For agency-specific roles: requires agency context and checks agency database
- More flexible role checking

---

## Code Changes

### New Function: `getUserRolesFromMainDb`
```javascript
async function getUserRolesFromMainDb(userId) {
  // Checks user_roles table in main database
  // Falls back to users.role column if table doesn't exist
  // Returns array of role strings
}
```

### Updated: `requireSuperAdmin`
```javascript
async function requireSuperAdmin(req, res, next) {
  // 1. Check main database for super_admin role
  // 2. If not found, check agency database
  // 3. Return 403 if super_admin not found in either
}
```

### Updated: `requireRole`
```javascript
function requireRole(requiredRoles, allowHigherRoles = true) {
  // For system roles: check main DB first, then agency DB
  // For agency roles: require agency context, check agency DB only
}
```

---

## How It Works Now

### For System-Level Endpoints (page-catalog):
1. User authenticates with JWT token
2. `requireRole(['super_admin', 'admin', 'ceo'])` is called
3. System checks **main database** first for these roles
4. If not found, checks **agency database** as fallback
5. Grants access if role found in either database

### For Agency-Specific Endpoints:
1. Requires agency context (agencyDatabase)
2. Checks roles only in agency database
3. Works as before

---

## Testing

After restart:
1. ✅ Super admin should be able to access `/api/system/page-catalog`
2. ✅ Admin/CEO should also be able to access
3. ✅ Regular users will still get 403 (expected)
4. ✅ Better error messages for debugging

---

## Database Structure Expected

### Main Database (buildflow_db):
- `public.users` table with `id` and optionally `role` column
- `public.user_roles` table with `user_id` and `role` columns (preferred)

### Agency Database:
- `public.user_roles` table with `user_id` and `role` columns

---

## Status

✅ **FIXED** - Authentication now checks main database for system roles

**Next Steps:**
- Refresh the page
- The 401 errors should stop
- If still getting errors, check that your user has `super_admin` role in the main database

---

## Verification

To verify your user has super_admin role in main database:

```sql
-- Check in main database
SELECT * FROM public.user_roles WHERE user_id = 'YOUR_USER_ID' AND role = 'super_admin';

-- Or if using users.role column
SELECT id, email, role FROM public.users WHERE id = 'YOUR_USER_ID' AND role = 'super_admin';
```

