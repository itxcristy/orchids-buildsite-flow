# Debugging 500 Error on Recommendations Endpoint

## Current Issue

The recommendations endpoint is returning a 500 Internal Server Error:
```
GET http://dezignbuild.site:3000/api/system/page-catalog/recommendations/preview?industry=architecture&company_size=11-50&primary_focus=hr_&_operations&business_goals=...
[HTTP/1.1 500 Internal Server Error 230ms]
```

## Steps to Debug

### 1. Check Backend Logs

The backend should be logging detailed error information. Check the logs:

```bash
# Check recent backend logs
docker compose logs backend | tail -100

# Filter for recommendations errors
docker compose logs backend | grep -i "recommendations\|error" | tail -50

# Check for database errors
docker compose logs backend | grep -i "database\|connection\|pool" | tail -50
```

### 2. Check Database Connection

Verify the database is accessible:

```bash
# Check if database container is running
docker compose ps postgres

# Test database connection from backend
docker compose exec backend node -e "
const { pool } = require('./server/config/database');
pool.query('SELECT 1').then(() => {
  console.log('Database connection OK');
  process.exit(0);
}).catch(err => {
  console.error('Database connection failed:', err);
  process.exit(1);
});
"
```

### 3. Check if Tables Exist

The recommendations service checks for `page_catalog` and `page_recommendation_rules` tables:

```bash
# Connect to database and check tables
docker compose exec postgres psql -U postgres -d buildflow_db -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('page_catalog', 'page_recommendation_rules');
"
```

### 4. Test the Endpoint Directly

Test the endpoint with curl to see the actual error response:

```bash
# Test from server
curl -v "http://localhost:3000/api/system/page-catalog/recommendations/preview?industry=architecture&company_size=11-50&primary_focus=hr_operations&business_goals=client_management" \
  -H "Origin: http://dezignbuild.site" \
  -H "Accept: application/json"
```

### 5. Check Environment Variables

Verify database connection string is correct:

```bash
# Check backend environment
docker compose exec backend env | grep DATABASE_URL

# Should show:
# DATABASE_URL=postgresql://postgres:...@postgres:5432/buildflow_db
```

## Common Causes

### 1. Database Connection Issue

**Symptoms:**
- Error message contains "connection", "pool", or "ECONNREFUSED"
- Backend logs show database connection errors

**Solution:**
- Verify `DATABASE_URL` in `.env` file
- Check if postgres container is running: `docker compose ps postgres`
- Restart postgres: `docker compose restart postgres`

### 2. Missing Tables

**Symptoms:**
- Error message contains "does not exist" or code "42P01"
- Tables `page_catalog` or `page_recommendation_rules` don't exist

**Solution:**
- Run database migrations
- Check if migrations have been applied:
  ```bash
  docker compose exec postgres psql -U postgres -d buildflow_db -c "\dt"
  ```

### 3. Database Query Error

**Symptoms:**
- Error message contains SQL syntax errors
- Backend logs show query errors

**Solution:**
- Check the query in `server/services/pageRecommendationService.js`
- Verify table structure matches the query
- Check for column name mismatches

### 4. Memory/Resource Issues

**Symptoms:**
- Error message contains "timeout" or "memory"
- Backend container is using high resources

**Solution:**
- Check container resources: `docker stats`
- Increase container memory limits if needed
- Restart backend: `docker compose restart backend`

## Enhanced Error Handling

The code has been updated to:
1. ✅ Return detailed error messages in development
2. ✅ Include error codes for better debugging
3. ✅ Log comprehensive error details
4. ✅ Handle database connection errors gracefully
5. ✅ Provide fallback empty data structure

## Next Steps

1. **Check backend logs** to see the actual error:
   ```bash
   docker compose logs backend | tail -100
   ```

2. **Test database connection**:
   ```bash
   docker compose exec backend node -e "const { pool } = require('./server/config/database'); pool.query('SELECT 1').then(() => console.log('OK')).catch(e => console.error(e));"
   ```

3. **Verify tables exist**:
   ```bash
   docker compose exec postgres psql -U postgres -d buildflow_db -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'page%';"
   ```

4. **Test endpoint directly** to see error response:
   ```bash
   curl -v "http://localhost:3000/api/system/page-catalog/recommendations/preview?industry=architecture&company_size=11-50&primary_focus=hr_operations"
   ```

## Expected Error Response Format

With the updated error handling, you should see:

```json
{
  "success": false,
  "error": {
    "message": "Detailed error message here",
    "code": "ERROR_CODE",
    "detail": "Stack trace in development",
    "originalMessage": "Original error message in development"
  },
  "data": {
    "all": [],
    "categorized": {
      "required": [],
      "recommended": [],
      "optional": []
    },
    "summary": {
      "total": 0,
      "required": 0,
      "recommended": 0,
      "optional": 0
    }
  }
}
```

## Fix Applied

The error handling has been improved to:
- ✅ Show actual backend error messages in the frontend
- ✅ Include error codes for better debugging
- ✅ Log comprehensive error details
- ✅ Handle specific error types (database, connection, timeout)
- ✅ Provide fallback data structure

After checking the backend logs, you should be able to see the exact error causing the 500 response.

