# Database Repair Guide

## Problem
Existing agency databases created before the complete schema implementation are missing many tables, causing 500 errors.

## Solution

### Automatic Repair (Recommended)
The system now **automatically repairs** missing tables when you access the database:
- On first query, it checks for critical tables
- If missing, it automatically creates all missing tables
- If a query fails with "table does not exist", it repairs and retries

**Just refresh your browser** - the system will auto-repair on the next query!

### Manual Repair Endpoint

If you want to manually repair a database, use the repair endpoint:

#### Using cURL:
```bash
curl -X POST http://localhost:3000/api/agencies/repair-database \
  -H "Content-Type: application/json" \
  -H "x-agency-database: agency_your_domain_12345678" \
  -d '{}'
```

#### Using JavaScript/Fetch:
```javascript
const response = await fetch('http://localhost:3000/api/agencies/repair-database', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-agency-database': 'agency_your_domain_12345678' // Your agency database name
  },
  body: JSON.stringify({})
});

const result = await response.json();
console.log(result);
```

#### Response:
```json
{
  "success": true,
  "message": "Database repair completed successfully",
  "database": "agency_your_domain_12345678",
  "tablesBefore": 15,
  "tablesAfter": 55,
  "tablesAdded": 40,
  "allTables": ["users", "profiles", "attendance", ...]
}
```

## How to Find Your Agency Database Name

1. Check your browser's localStorage:
   - Open DevTools (F12)
   - Go to Application > Local Storage
   - Look for `agencyDatabase` or `user` object
   - The database name is in `user.agency.databaseName`

2. Or check the backend logs when you log in - it shows the database name

3. Or query the main database:
```sql
SELECT database_name FROM public.agencies WHERE domain = 'your-domain';
```

## What Gets Repaired

The repair process adds all missing tables:
- ✅ All 53 core tables
- ✅ All indexes
- ✅ All foreign key relationships
- ✅ All triggers for `updated_at` columns
- ✅ Missing tables: permissions, role_permissions, and all others

## Troubleshooting

### Still Getting Errors?
1. **Clear browser cache** and refresh
2. **Check backend logs** for repair messages
3. **Manually call repair endpoint** with your database name
4. **Restart backend server** to clear schema check cache

### "Agencies table does not exist" Error
The `agencies` table is in the **main database** (buildflow_db), not in agency databases. This is expected - agencies are queried from the main database.

### Repair Takes Too Long?
- First repair may take 10-30 seconds
- Subsequent repairs are cached for 5 minutes
- Large databases may take longer

## Verification

After repair, verify tables exist:
```sql
-- Connect to your agency database
\c agency_your_domain_12345678

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should show 55+ tables
```

## Next Steps

After repair:
1. ✅ Refresh your browser
2. ✅ Navigate through all pages
3. ✅ Verify no more 500 errors
4. ✅ Test CRUD operations on all features

---

**Note**: New agencies created after this fix will automatically have the complete schema - no repair needed!
