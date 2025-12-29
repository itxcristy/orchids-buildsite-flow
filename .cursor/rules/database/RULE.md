---
alwaysApply: true
---
# Database Connection Rule

## CRITICAL: Always Use This Exact Connection String

**For ANY database query, migration, connection, or database-related operation:**

```
postgresql://postgres:admin@localhost:5432/buildflow_db
```

## Rule Details

### When This Applies
- Running database queries
- Creating migrations
- Database connections in code
- Testing database operations
- Seeding data
- Running scripts that access the database
- ANY operation that requires database access

### What to Do
1. **ALWAYS include the complete connection string with password**
2. **NEVER run queries with incomplete connection strings**
3. **If connection string is missing password, STOP and add it**
4. **Format:** `postgresql://[user]:[password]@[host]:[port]/[database]`

### Breakdown
- **User:** postgres
- **Password:** admin
- **Host:** localhost
- **Port:** 5432
- **Database:** buildflow_db

### Common Mistakes to AVOID
❌ `postgresql://postgres@localhost:5432/buildflow_db` (missing password)
❌ `postgresql://localhost:5432/buildflow_db` (missing user and password)
❌ `postgres://postgres:admin@localhost/buildflow_db` (missing port)

✅ `postgresql://postgres:admin@localhost:5432/buildflow_db` (CORRECT)

### Environment Variable Alternative
If using .env file, ensure:
```
DATABASE_URL=postgresql://postgres:admin@localhost:5432/buildflow_db
```

### Before Executing ANY Database Command
**CHECK:** Does the connection string include `:admin@`?
- **YES** → Proceed
- **NO** → Add password and fix the connection string

## Auto-Fix Instructions
If you catch yourself about to run a database command without the complete connection string:
1. Stop immediately
2. Add the password: `admin`
3. Verify the complete format
4. Then proceed

**This rule ALWAYS applies. No exceptions.**