# PostgreSQL Integration

This directory contains the PostgreSQL database integration for BuildFlow Agency Management System.

## Overview

The PostgreSQL integration provides:
- Database connection pooling
- Query helpers for common operations
- TypeScript types for all tables
- Transaction support
- Error handling and logging

## Files

### `client.ts`
Database connection and query helpers.

**Exports:**
- `pool` - Connection pool instance
- `query<T>()` - Execute query and return results
- `queryOne<T>()` - Execute query and return single row
- `queryMany<T>()` - Execute query and return multiple rows
- `execute()` - Execute query without returning rows
- `transaction<T>()` - Execute transaction
- `closePool()` - Close connection pool

**Usage:**
```typescript
import { query, queryOne, queryMany } from '@/integrations/postgresql/client';

// Query with results
const result = await query('SELECT * FROM users WHERE id = $1', [userId]);

// Get single row
const user = await queryOne('SELECT * FROM users WHERE id = $1', [userId]);

// Get multiple rows
const users = await queryMany('SELECT * FROM users WHERE agency_id = $1', [agencyId]);
```

### `types.ts`
TypeScript types for all database tables.

**Exports:**
- `User` - User account
- `Profile` - User profile
- `UserRole` - Role assignment
- `EmployeeDetails` - Employee information
- `EmployeeSalaryDetails` - Salary information
- `EmployeeFiles` - Employee documents
- `Agency` - Agency record
- `AgencySettings` - Agency configuration
- `Department` - Department record
- `TeamAssignment` - Team assignment
- `Client` - Client record
- `Project` - Project record
- `Task` - Task record
- `Invoice` - Invoice record
- `Quotation` - Quotation record
- `Job` - Job record
- `Lead` - Lead record
- `ReimbursementRequest` - Reimbursement request
- `ReimbursementAttachment` - Receipt file
- `Attendance` - Attendance record
- `LeaveRequest` - Leave request
- `Payroll` - Payroll record
- `AuditLog` - Audit log entry
- `FileStorage` - File metadata

**Usage:**
```typescript
import type { User, Profile, Client } from '@/integrations/postgresql/types';

const user: User = {
  id: '123',
  email: 'user@example.com',
  // ... other fields
};
```

## Configuration

### Environment Variables

Required:
```env
VITE_DATABASE_URL=postgresql://user:password@host:port/database
```

Optional:
```env
VITE_FILE_STORAGE_PATH=/var/lib/buildflow/storage
```

### Connection Pool Settings

Default settings in `client.ts`:
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

Modify in `client.ts` if needed:
```typescript
const pool = new Pool({
  connectionString: config.database.url,
  max: 20,                    // Maximum connections
  idleTimeoutMillis: 30000,   // 30 seconds
  connectionTimeoutMillis: 2000, // 2 seconds
});
```

## Usage Examples

### Basic Queries

```typescript
import { query, queryOne, queryMany } from '@/integrations/postgresql/client';
import type { User, Profile } from './types';

// Get single user
const user = await queryOne<User>(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// Get multiple users
const users = await queryMany<User>(
  'SELECT * FROM users WHERE agency_id = $1 ORDER BY created_at DESC',
  [agencyId]
);

// Execute without results
await execute(
  'UPDATE users SET last_sign_in_at = NOW() WHERE id = $1',
  [userId]
);
```

### Transactions

```typescript
import { transaction } from '@/integrations/postgresql/client';

const result = await transaction(async (client) => {
  // All queries in this block are part of the transaction
  await client.query('INSERT INTO users ...');
  await client.query('INSERT INTO profiles ...');
  return { success: true };
});
```

### Error Handling

```typescript
import { query } from '@/integrations/postgresql/client';

try {
  const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
  console.log('Query successful:', result.rows);
} catch (error) {
  console.error('Query failed:', error);
  // Handle error appropriately
}
```

## Database Schema

### Core Tables

**users**
- id (UUID, primary key)
- email (TEXT, unique)
- password_hash (TEXT)
- email_confirmed (BOOLEAN)
- email_confirmed_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- last_sign_in_at (TIMESTAMP)
- is_active (BOOLEAN)

**profiles**
- id (UUID, primary key)
- user_id (UUID, foreign key)
- full_name (TEXT)
- phone (TEXT)
- department (TEXT)
- position (TEXT)
- hire_date (DATE)
- avatar_url (TEXT)
- is_active (BOOLEAN)
- agency_id (UUID)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**user_roles**
- id (UUID, primary key)
- user_id (UUID, foreign key)
- role (app_role enum)
- assigned_at (TIMESTAMP)
- assigned_by (UUID)
- agency_id (UUID)

### Business Tables

See `CORE_AUTH_SCHEMA_DOCUMENTATION.md` for complete schema documentation.

## Performance Optimization

### Indexes

All tables have appropriate indexes:
- Primary keys
- Foreign keys
- Frequently queried columns
- Multi-column indexes for common queries

### Query Optimization

1. **Use WHERE clauses** to filter early
2. **Select only needed columns** instead of SELECT *
3. **Use pagination** for large result sets
4. **Use transactions** for related operations
5. **Monitor slow queries** with logging

### Connection Pooling

The connection pool automatically:
- Reuses connections
- Closes idle connections
- Limits concurrent connections
- Handles connection errors

## Monitoring

### Query Logging

Queries are logged with:
- Query text
- Execution duration
- Number of rows affected

Enable in `client.ts`:
```typescript
console.log('Executed query', { text, duration, rows: result.rowCount });
```

### Performance Metrics

Monitor in PostgreSQL:
```sql
-- Slow queries
SELECT query, calls, mean_time FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Connection count
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Troubleshooting

### Connection Issues

```typescript
// Test connection
import { query } from '@/integrations/postgresql/client';

try {
  const result = await query('SELECT NOW()');
  console.log('Connected:', result.rows[0]);
} catch (error) {
  console.error('Connection failed:', error);
}
```

### Query Errors

```typescript
// Check query syntax
const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
// Error will be thrown if query is invalid
```

### Performance Issues

```sql
-- Analyze query plan
EXPLAIN ANALYZE SELECT * FROM users WHERE agency_id = $1;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

## Security

### SQL Injection Prevention

Always use parameterized queries:
```typescript
// ✅ Safe
await query('SELECT * FROM users WHERE id = $1', [userId]);

// ❌ Unsafe
await query(`SELECT * FROM users WHERE id = '${userId}'`);
```

### Connection Security

In production:
- Use SSL/TLS for database connections
- Use strong passwords
- Restrict database access
- Use environment variables for credentials

### Data Protection

- Passwords are hashed with bcrypt
- Sensitive fields are encrypted
- Audit logging is enabled
- Row-level security is available

## Related Services

- **Authentication:** `src/services/api/auth-postgresql.ts`
- **Database Operations:** `src/services/api/postgresql-service.ts`
- **File Storage:** `src/services/file-storage.ts`

## Documentation

- **Database Schema:** `database/migrations/README.md`
- **API Documentation:** `docs/api.md`
- **Development Guide:** `docs/development.md`

## Support

For issues or questions:
1. Check the documentation files
2. Review the troubleshooting section
3. Check PostgreSQL logs
4. Consult PostgreSQL documentation

---

**Last Updated:** 2025-01-15  
**Status:** Production Ready
