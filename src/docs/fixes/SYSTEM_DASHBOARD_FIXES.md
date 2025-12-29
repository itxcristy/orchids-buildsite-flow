# System Dashboard Fixes - Settings Tab Issues

**Date:** 2024-12-19  
**Issue:** 5th tab in System Dashboard settings not working properly

---

## Problems Identified

### 1. **500 Internal Server Error - Audit Logs**
- **Endpoint:** `GET /api/audit/logs?page=1&limit=50`
- **Issue:** Broken count query using string replacement on parameterized query
- **Fix:** Rebuilt count query separately with proper parameterization

### 2. **401 Unauthorized - Page Catalog**
- **Endpoints:** 
  - `GET /api/system/page-catalog`
  - `GET /api/system/page-catalog/page-requests`
- **Issue:** Requires `super_admin` role, but user may not have this role
- **Status:** These endpoints correctly require super_admin - the 401 is expected if user doesn't have the role

### 3. **Pagination Helper Issue**
- **Issue:** Incorrect usage of `buildPaginatedResponse` function
- **Fix:** Updated to use correct function signature

---

## Fixes Applied

### 1. Fixed Audit Logs Count Query

**Before:**
```javascript
const countResult = await client.query(
  query.replace(/SELECT \*/, 'SELECT COUNT(*)').replace(/ORDER BY.*LIMIT.*OFFSET.*/, '')
);
```

**After:**
```javascript
// Build count query separately with same filters
let countQuery = 'SELECT COUNT(*) as count FROM public.audit_logs WHERE 1=1';
const countParams = [];
// ... proper parameterization with all filters
const countResult = await client.query(countQuery, countParams);
```

### 2. Fixed Page Requests Pagination

**Before:**
```javascript
const { parsePagination, buildPaginatedResponse } = require('../utils/paginationHelper');
const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
// ...
res.json(buildPaginatedResponse(data, { page, limit, total }));
```

**After:**
```javascript
const { page = 1, limit = 50 } = req.query;
const offset = (parseInt(page) - 1) * parseInt(limit);
const { buildPaginatedResponse } = require('../utils/paginationHelper');
// ...
res.json(buildPaginatedResponse(data, { page: parseInt(page), limit: parseInt(limit), total }));
```

---

## Authentication Requirements

### Endpoints Requiring Super Admin:
- `GET /api/system/page-catalog` - List all pages
- `GET /api/system/page-catalog/page-requests` - List page requests
- `POST /api/system/page-catalog` - Create page
- `PUT /api/system/page-catalog/:id` - Update page
- `DELETE /api/system/page-catalog/:id` - Delete page

### Endpoints Requiring Admin/Super Admin:
- `GET /api/audit/logs` - Requires: `super_admin`, `ceo`, or `admin` role

---

## Expected Behavior

### If User Has Super Admin Role:
- ✅ Page catalog endpoints should work
- ✅ Page requests should load
- ✅ Audit logs should work

### If User Doesn't Have Super Admin Role:
- ⚠️ Page catalog endpoints will return 401 (expected)
- ⚠️ Page requests will return 401 (expected)
- ✅ Audit logs should work if user has admin/ceo role

---

## Testing

After fixes:
1. **Audit Logs:** Should no longer return 500 errors
2. **Page Catalog:** Will return 401 if user doesn't have super_admin role (expected)
3. **Pagination:** Should work correctly for all endpoints

---

## Frontend Recommendations

1. **Handle 401 Errors Gracefully:**
   - Check user role before making requests
   - Show appropriate message if user doesn't have required permissions
   - Don't retry 401 errors continuously

2. **Stop Retry Loop:**
   - Implement exponential backoff for failed requests
   - Stop retrying after 3-5 attempts
   - Show error message to user instead of silent retries

3. **Role-Based UI:**
   - Hide/disable features that require super_admin if user doesn't have the role
   - Show "Requires Super Admin" message instead of making failed requests

---

## Status

✅ **FIXED:**
- Audit logs count query
- Page requests pagination

⚠️ **EXPECTED BEHAVIOR:**
- 401 errors for page-catalog if user doesn't have super_admin role

**Next Steps:**
- Frontend should handle 401 errors gracefully
- Stop continuous retry loops
- Implement role-based UI visibility

