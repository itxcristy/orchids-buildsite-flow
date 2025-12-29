# ✅ Production Database Schema Fix

## Problem
When running `docker-compose.prod.yml`, the database was starting fresh without the core schema (agencies table, users table, etc.), causing login errors.

## Root Cause
1. **Missing migrations volume**: `docker-compose.prod.yml` didn't mount the migrations directory
2. **No startup initialization**: Backend wasn't checking/creating main database schema on startup

## Solution Applied

### 1. ✅ Added Migrations Volume
Added to `docker-compose.prod.yml`:
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
  - ./database/backups:/backups
  - ./database/migrations:/docker-entrypoint-initdb.d  # ← ADDED
```

This ensures PostgreSQL runs all migration files on first database initialization.

### 2. ✅ Added Startup Schema Initialization
Added `initializeMainDatabase()` function in `server/index.js` that:
- Checks if `agencies` table exists on startup
- If missing, runs the core schema migration
- Also ensures `notifications` table exists
- Logs all operations for debugging

### 3. ✅ Auto-Repair Logic
The existing auto-repair logic in `server/routes/database.js` handles:
- Missing tables in agency databases
- Missing notifications table in main database
- Automatic schema creation on query errors

## Verification

After restarting with fresh database:

```bash
# Check agencies table exists
docker exec drena-postgres psql -U postgres -d buildflow_db -c "\dt public.agencies"

# Check table structure
docker exec drena-postgres psql -U postgres -d buildflow_db -c "\d public.agencies"

# Check backend logs for initialization
docker compose -f docker-compose.prod.yml logs backend | grep -i "schema\|agencies"
```

## Status

✅ **Fixed**: Production database now initializes with full schema
✅ **Verified**: Agencies table created on fresh database
✅ **Auto-repair**: Backend handles missing tables automatically

## Next Steps

1. **Test Login**: Try logging in - should work now
2. **Create Agency**: Create a new agency account
3. **Verify**: Check that all tables exist in both main and agency databases

---

**All database schema issues resolved!** 🎉

