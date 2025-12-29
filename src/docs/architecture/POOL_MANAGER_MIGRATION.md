# Connection Pool Manager Migration Guide

## Overview

The new Global Pool Manager (`server/utils/poolManager.js`) centralizes connection pool management with:
- **LRU cache** for pool eviction (max 50 pools)
- **Reduced connections per pool** (5 instead of 20)
- **Automatic cleanup** of idle pools (5 minutes)
- **Connection monitoring** and statistics

## Key Changes

### Before (Unlimited Pools)
```javascript
// Each service created its own pool
const agencyPool = new Pool({ 
  connectionString: agencyDbUrl, 
  max: 10 
});
const client = await agencyPool.connect();
// ... use client
client.release();
await agencyPool.end(); // Must manually close
```

### After (Managed Pools)
```javascript
// Use pool manager
const { getAgencyPool } = require('../utils/poolManager');
const agencyPool = getAgencyPool(agencyDatabase);
const client = await agencyPool.connect();
// ... use client
client.release();
// DON'T call pool.end() - pool manager handles it
```

## Migration Checklist

### ✅ Completed
- [x] Created `server/utils/poolManager.js`
- [x] Updated `server/config/database.js` to use pool manager
- [x] Updated `server/services/agencyService.js` (critical paths)

### ⏳ Remaining Services to Migrate

These services still create pools directly and should be migrated:

1. **server/services/assetManagementService.js**
2. **server/services/integrationService.js**
3. **server/services/procurementService.js**
4. **server/services/currencyService.js**
5. **server/services/budgetService.js**
6. **server/services/workflowService.js**
7. **server/services/inventoryService.js**
8. **server/services/riskManagementService.js**
9. **server/services/reportingDashboardService.js**
10. **server/services/webhookService.js**
11. **server/services/leadScoringService.js**
12. **server/middleware/authMiddleware.js** (getUserRolesFromAgencyDb)
13. **server/services/authService.js** (findUserAcrossAgencies)
14. **server/routes/database.js** (multiple places)
15. **server/utils/schemaValidator.js**
16. **server/graphql/schema.js**

## Migration Pattern

### Step 1: Replace Pool Creation
```javascript
// OLD
const { Pool } = require('pg');
const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });

// NEW
const { getAgencyPool } = require('../utils/poolManager');
const agencyPool = getAgencyPool(agencyDatabase);
```

### Step 2: Remove pool.end() Calls
```javascript
// OLD
finally {
  client.release();
  await agencyPool.end();
}

// NEW
finally {
  client.release();
  // Don't close pool - it's managed by pool manager
}
```

### Step 3: Validate Database Name
The pool manager automatically validates database names for security.

## Configuration

### Environment Variables

```bash
# Maximum number of agency pools to cache (default: 50)
MAX_AGENCY_POOLS=50

# Maximum connections per agency pool (default: 5)
MAX_CONNECTIONS_PER_POOL=5

# Idle pool timeout in milliseconds (default: 300000 = 5 minutes)
POOL_IDLE_TIMEOUT=300000
```

### Pool Statistics

Monitor pool usage:
```javascript
const { getPoolStats } = require('./utils/poolManager');
const stats = getPoolStats();
console.log(stats);
// {
//   mainPool: { totalCount: 5, idleCount: 3, waitingCount: 0 },
//   agencyPools: { count: 12, maxPools: 50, maxConnectionsPerPool: 5 },
//   totalAgencyConnections: 35
// }
```

## Benefits

1. **Connection Limit Control**
   - Before: Unlimited pools × 10-20 connections = potential 1000+ connections
   - After: Max 50 pools × 5 connections = max 250 connections (plus main pool)

2. **Memory Efficiency**
   - Automatic cleanup of idle pools
   - LRU eviction prevents memory leaks

3. **Better Monitoring**
   - Centralized pool statistics
   - Connection tracking

4. **Security**
   - Automatic database name validation
   - Prevents SQL injection via database names

## Special Cases

### Postgres Database Connection
Connections to the `postgres` database (for CREATE/DROP DATABASE) should remain as temporary pools:
```javascript
// This is OK - special case for admin operations
const postgresPool = new Pool({
  host, port, user, password,
  database: 'postgres',
});
```

### Temporary Pools
If you need a temporary pool that's not managed, create it but ensure you close it:
```javascript
const tempPool = new Pool({ connectionString: tempDbUrl, max: 1 });
try {
  // use pool
} finally {
  await tempPool.end(); // Must close temporary pools
}
```

## Testing

After migration, test:
1. ✅ Agency creation works
2. ✅ Database queries work
3. ✅ Pool statistics are accurate
4. ✅ Idle pools are cleaned up
5. ✅ LRU eviction works when limit reached
6. ✅ No connection leaks

## Rollback Plan

If issues occur, you can temporarily revert by:
1. Restore old `server/config/database.js`
2. Services will continue using direct pool creation
3. Pool manager can coexist with old code

---

**Status:** Core implementation complete, migration in progress  
**Last Updated:** January 2025

