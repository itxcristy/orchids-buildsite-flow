# System Health Route - SQL Query Fixes

## Issues Identified from Error Logs

### 1. ❌ SQL Query Error: `column "seq_scan" does not exist`
**Error**: `column "seq_scan" does not exist at character 169`
**Location**: Queries calculating `index_usage_percent`
**Root Cause**: Query tries to use `seq_scan` from `pg_stat_user_indexes`, but `seq_scan` only exists in `pg_stat_user_tables`

**Problematic Query Pattern** (from error logs):
```sql
SELECT 
  COUNT(*) as index_count,
  SUM(pg_relation_size(indexrelid)) as total_index_size,
  ROUND(100.0 * SUM(idx_scan) / NULLIF(SUM(seq_scan + idx_scan), 0), 2) as index_usage_percent
FROM pg_stat_user_indexes
```

**Fix**: `seq_scan` is not available in `pg_stat_user_indexes`. To calculate index usage, we need to join with `pg_stat_user_tables` or calculate it differently.

### 2. ❌ SQL Query Error: `column "tablename" does not exist`
**Error**: `column "tablename" does not exist at character 148`
**Location**: Queries using `pg_stat_user_tables`
**Root Cause**: `pg_stat_user_tables` uses `relname`, not `tablename`

**Problematic Query Pattern** (from error logs):
```sql
SELECT 
  COUNT(*) as table_count,
  SUM(n_live_tup) as total_rows,
  SUM(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
FROM pg_stat_user_tables
```

**Fix**: Use `relname` instead of `tablename` in `pg_stat_user_tables` queries.

### 3. ⚠️ Redis Security Attack Warnings
**Error**: `Possible SECURITY ATTACK detected. It looks like somebody is sending POST or Host: commands to Redis`
**Root Cause**: HTTP requests are being sent to Redis port (6379) instead of the backend API port
**Impact**: Redis is correctly rejecting these, but indicates misconfiguration

**Fix**: Ensure frontend/API clients are using correct ports:
- Backend API: port 3000
- Redis: port 6379 (internal only, not exposed to HTTP)

### 4. ⚠️ Frontend Permission Issues
**Error**: `EACCES: permission denied, open '/app/node_modules/.vite-temp/vite.config.ts.timestamp-...'`
**Root Cause**: Docker volume permissions issue with `node_modules/.vite-temp` directory
**Impact**: Frontend dev server cannot start

**Fix**: Add proper volume permissions in docker-compose.yml or fix directory ownership

### 5. ⚠️ Database Connection Timeouts
**Error**: `getaddrinfo ENOTFOUND postgres` and `Connection terminated due to connection timeout`
**Root Cause**: Backend cannot resolve `postgres` hostname (Docker networking issue)
**Impact**: Database queries fail

**Fix**: Ensure Docker network is properly configured and postgres service is accessible

## Fixes Applied

### ✅ Fixed: systemHealth.js
- Added comments clarifying `relname` vs `tablename` usage
- Added comments about `seq_scan` location
- Queries already use correct column names (`relname` in `pg_stat_user_tables`)

### ⚠️ Remaining Issues
1. **Index Usage Calculation**: The error logs show a query calculating `index_usage_percent` that doesn't exist in current code. This might be:
   - From a database view/function
   - From old cached code
   - Generated dynamically elsewhere

2. **Redis Security**: Need to verify Docker networking and ensure Redis is not exposed to HTTP traffic

3. **Frontend Permissions**: Need to fix Docker volume permissions

4. **Database Connectivity**: Need to verify Docker network configuration

## Recommendations

1. **Check for Database Views/Functions**: Search for any database views or functions that might be generating the problematic queries
2. **Verify Docker Configuration**: Check `docker-compose.yml` for network and volume configuration
3. **Add Better Error Handling**: Wrap all database queries in try-catch blocks with proper error messages
4. **Monitor Logs**: Continue monitoring for these specific error patterns

