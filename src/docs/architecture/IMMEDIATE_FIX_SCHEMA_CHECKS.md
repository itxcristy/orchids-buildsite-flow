# IMMEDIATE FIX - Stop Schema Checks on Every Query

## Quick Fix (Apply Now)

### Option 1: Disable Schema Checks Temporarily (Fastest)

Add this to your `.env` file:

```bash
DISABLE_SCHEMA_CHECKS=true
```

Then restart your backend:

```bash
docker-compose restart backend
# OR
npm restart
```

This will completely disable schema validation until you can properly fix the code.

### Option 2: Restart Server (If Code is Already Fixed)

If you've already applied the code fixes, just restart:

```bash
docker-compose restart backend
```

The new code should prevent schema checks from running on every query.

---

## What Was Fixed

1. ✅ Removed schema validation from query execution path
2. ✅ Schema validation now only runs on errors (42P01, 42883)
3. ✅ Added 1-hour cache to prevent repeated checks
4. ✅ Added emergency kill switch via `DISABLE_SCHEMA_CHECKS` env var
5. ✅ Improved error handling to prevent `searchParams` undefined errors

---

## Verify the Fix

After restarting, check your logs:

### ✅ Good (What you want to see):
```
[API] Executing query: SELECT * FROM public.user_roles WHERE user_id = $1
[API] Executing query: SELECT * FROM public.agency_settings LIMIT 1
```

### ❌ Bad (Should be gone):
```
[API] Error checking/repairing schema for agency_delltech_2c29e291: Cannot read properties...
```

---

## If Errors Persist

1. **Check if server restarted**: Look for startup messages in logs
2. **Check environment variable**: Verify `DISABLE_SCHEMA_CHECKS=true` is set
3. **Clear Docker cache**: `docker-compose down && docker-compose up --build`
4. **Check for old code**: Search for any remaining `ensureAgencySchema` calls outside of error handlers

---

## Files Modified

- `server/utils/schemaValidator.js` - Added kill switch and better error handling
- `server/services/databaseService.js` - Removed schema check from query path
- `server/routes/database.js` - Added safety check for `req` object

---

## Long-term Solution

The proper fix is already in place:
- Schema validation only runs when a query fails with schema error
- 1-hour cache prevents repeated checks
- No schema validation on normal query execution

The `DISABLE_SCHEMA_CHECKS` flag is just a temporary safety measure.

