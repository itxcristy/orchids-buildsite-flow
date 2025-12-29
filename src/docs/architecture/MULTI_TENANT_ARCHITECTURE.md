# Multi-Tenant Database Architecture

## Overview

BuildFlow ERP uses **complete database isolation** for multi-tenancy. Each agency gets its own isolated PostgreSQL database with a complete schema.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Main Database (buildflow_db)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  agencies table                                      │   │
│  │  - id (UUID)                                        │   │
│  │  - name                                             │   │
│  │  - database_name (e.g., "agency_company_12345678") │   │
│  │  - subscription_plan                                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  users table (global authentication)                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  subscription_plans (shared)                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ References
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Agency DB 1  │  │ Agency DB 2  │  │ Agency DB N  │
│              │  │              │  │              │
│ Complete     │  │ Complete     │  │ Complete     │
│ Schema:      │  │ Schema:      │  │ Schema:      │
│ - users      │  │ - users      │  │ - users      │
│ - profiles   │  │ - profiles   │  │ - profiles   │
│ - projects   │  │ - projects   │  │ - projects   │
│ - invoices   │  │ - invoices   │  │ - invoices   │
│ - clients    │  │ - clients    │  │ - clients    │
│ - ... (53+)  │  │ - ... (53+)  │  │ - ... (53+)  │
│              │  │              │  │              │
│ Isolated     │  │ Isolated     │  │ Isolated     │
│ Data         │  │ Data         │  │ Data         │
└──────────────┘  └──────────────┘  └──────────────┘
```

## How It Works

### 1. Agency Creation

When a new agency is created via `/api/agencies`:

```javascript
// 1. Create agency record in main database
INSERT INTO agencies (id, name, database_name, ...)
VALUES (uuid, 'Company Name', 'agency_company_12345678', ...);

// 2. Create isolated database
CREATE DATABASE agency_company_12345678;

// 3. Connect to new database
CONNECT TO agency_company_12345678;

// 4. Initialize complete schema (53+ tables)
await createAgencySchema(client);

// 5. Create admin user in agency database
INSERT INTO users (email, password_hash, ...);
INSERT INTO profiles (user_id, agency_id, ...);
```

### 2. Database Routing

Backend routes requests based on `X-Agency-Database` header:

```javascript
// Frontend sends header
headers: {
  'X-Agency-Database': 'agency_company_12345678',
  'Authorization': 'Bearer <token>'
}

// Backend middleware extracts database name
const agencyDatabase = req.headers['x-agency-database'];

// Get or create connection pool for this agency
const pool = getAgencyPool(agencyDatabase);

// Execute query on isolated database
const result = await pool.query('SELECT * FROM projects');
```

### 3. Connection Pooling

```javascript
// Cached pools per agency
const agencyPools = new Map();

function getAgencyPool(databaseName) {
  if (agencyPools.has(databaseName)) {
    return agencyPools.get(databaseName);
  }
  
  // Create new pool for agency
  const pool = new Pool({
    connectionString: `postgresql://.../${databaseName}`,
    max: 10
  });
  
  agencyPools.set(databaseName, pool);
  return pool;
}
```

## Database Schema

Each agency database contains:

### Core Tables (53+)
- **Authentication**: users, profiles, user_roles
- **HR**: employee_details, attendance, leave_requests, payroll
- **Projects**: projects, tasks, job_categories
- **Finance**: clients, invoices, quotations, chart_of_accounts
- **CRM**: leads, lead_sources, crm_activities
- **GST**: gst_settings, gst_returns, hsn_sac_codes
- **Inventory**: inventory_items, warehouses, suppliers
- **Procurement**: purchase_orders, purchase_requests
- **And more...**

### Schema Creation

The `createAgencySchema()` function orchestrates creation of all tables:

```javascript
async function createAgencySchema(client) {
  // 1. Shared functions and extensions
  await ensureSharedFunctions(client);
  
  // 2. Authentication schema
  await ensureAuthSchema(client);
  
  // 3. HR schema
  await ensureHrSchema(client);
  
  // 4. Projects schema
  await ensureProjectsTasksSchema(client);
  
  // ... (20+ schema modules)
  
  // 5. Indexes and triggers
  await ensureIndexesAndFixes(client);
}
```

## Security & Isolation

### Complete Data Isolation

- ✅ Each agency has its own database
- ✅ No shared tables between agencies
- ✅ No cross-agency data access possible
- ✅ Database-level isolation (strongest form)

### Authentication Flow

1. User logs in with email/password
2. Backend searches across all agency databases
3. Returns token with `agencyDatabase` in payload
4. Frontend stores `agencyDatabase` in localStorage
5. All subsequent requests include `X-Agency-Database` header

### Access Control

```javascript
// Backend middleware verifies agency access
const token = decodeToken(req.headers.authorization);
if (token.agencyDatabase !== req.headers['x-agency-database']) {
  return res.status(403).json({ error: 'Agency mismatch' });
}
```

## Backup & Recovery

### Backup All Databases

```bash
# Main database
pg_dump buildflow_db > backup_main.sql

# All agency databases
for db in $(psql -l -t | grep '^agency_' | awk '{print $1}'); do
  pg_dump $db > backup_${db}.sql
done
```

### Restore

```bash
# Restore main database
psql buildflow_db < backup_main.sql

# Restore agency database
psql agency_company_12345678 < backup_agency_company_12345678.sql
```

## Performance Considerations

### Connection Pooling

- Main database: Shared pool (20 connections)
- Agency databases: Per-agency pools (10 connections each)
- Pools are cached to avoid recreation

### Scaling

For high-traffic scenarios:

1. **Read Replicas**: Create read replicas for agency databases
2. **Connection Pooling**: Use PgBouncer for connection pooling
3. **Database Sharding**: Shard by region or agency size
4. **Caching**: Use Redis for frequently accessed data

## Monitoring

### Database Metrics

```sql
-- Count agency databases
SELECT COUNT(*) FROM pg_database WHERE datname LIKE 'agency_%';

-- List all agencies
SELECT id, name, database_name FROM agencies;

-- Check database sizes
SELECT 
  datname,
  pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
WHERE datname LIKE 'agency_%'
ORDER BY pg_database_size(datname) DESC;
```

### Connection Monitoring

```sql
-- Active connections per database
SELECT 
  datname,
  COUNT(*) as connections
FROM pg_stat_activity
WHERE datname IS NOT NULL
GROUP BY datname
ORDER BY connections DESC;
```

## Best Practices

1. **Database Naming**: Use consistent naming (`agency_<domain>_<uuid>`)
2. **Schema Versioning**: Track schema versions per agency
3. **Backup Strategy**: Backup all databases regularly
4. **Monitoring**: Monitor database sizes and connections
5. **Cleanup**: Archive or delete inactive agency databases
6. **Security**: Use strong passwords and limit database access

## Troubleshooting

### Agency Database Not Created

```bash
# Check logs
docker compose logs backend | grep -i agency

# Verify PostgreSQL permissions
docker compose exec postgres psql -U postgres -c "\du"

# Check database exists
docker compose exec postgres psql -U postgres -c "\l" | grep agency
```

### Connection Pool Exhaustion

```sql
-- Check active connections
SELECT COUNT(*) FROM pg_stat_activity;

-- Check per-database connections
SELECT datname, COUNT(*) 
FROM pg_stat_activity 
GROUP BY datname;
```

### Database Size Growth

```sql
-- Check database sizes
SELECT 
  datname,
  pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
WHERE datname LIKE 'agency_%'
ORDER BY pg_database_size(datname) DESC;
```

---

**This architecture provides the strongest possible data isolation for multi-tenant SaaS applications! 🔒**
