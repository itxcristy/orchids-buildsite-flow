# 🚨 Critical Security Fixes - Implementation Guide

This guide provides step-by-step instructions for fixing the most critical security vulnerabilities identified in the audit.

---

## Fix #1: SQL Injection in Report Builder (CRITICAL)

### Current Vulnerable Code
**File:** `server/services/reportBuilderService.js`

```javascript
// ❌ VULNERABLE - Lines 48-56
const conditions = filters.map(filter => {
  const value = typeof filter.value === 'string' ? `'${filter.value}'` : filter.value;
  return `${filter.table}.${filter.column} ${filter.operator} ${value}`;
}).join(' AND ');
```

### Secure Implementation

```javascript
/**
 * Build and execute custom report query (SECURE VERSION)
 */
async function buildReport(agencyDatabase, reportConfig) {
  const { getAgencyPool } = require('../utils/poolManager');
  const { quoteIdentifier } = require('../utils/securityUtils');
  
  const pool = getAgencyPool(agencyDatabase);
  const client = await pool.connect();
  
  try {
    const {
      tables,
      columns,
      joins,
      filters,
      groupBy,
      orderBy,
      limit,
    } = reportConfig;

    // Validate and quote table names
    const safeTables = tables.map(table => quoteIdentifier(table));
    const selectColumns = columns.map(col => {
      const safeTable = quoteIdentifier(col.table);
      const safeColumn = quoteIdentifier(col.column);
      if (col.aggregate) {
        return `${col.aggregate}(${safeTable}.${safeColumn}) as ${quoteIdentifier(col.alias || col.column)}`;
      }
      return `${safeTable}.${safeColumn}${col.alias ? ` as ${quoteIdentifier(col.alias)}` : ''}`;
    }).join(', ');

    // Build FROM clause with safe table names
    let fromClause = safeTables[0];
    if (safeTables.length > 1 && joins) {
      for (const join of joins) {
        const safeJoinTable = quoteIdentifier(join.table);
        // Validate join type
        const validJoinTypes = ['INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS'];
        const joinType = validJoinTypes.includes(join.type?.toUpperCase()) 
          ? join.type.toUpperCase() 
          : 'INNER';
        
        // Validate join condition format (must be: table.column = table.column)
        const joinCondition = validateJoinCondition(join.condition);
        fromClause += ` ${joinType} JOIN ${safeJoinTable} ON ${joinCondition}`;
      }
    }

    // Build WHERE clause with parameterized queries
    let whereClause = '';
    const params = [];
    let paramIndex = 1;
    
    if (filters && filters.length > 0) {
      const conditions = filters.map(filter => {
        const safeTable = quoteIdentifier(filter.table);
        const safeColumn = quoteIdentifier(filter.column);
        
        // Validate operator
        const validOperators = ['=', '!=', '<', '>', '<=', '>=', 'LIKE', 'ILIKE', 'IN', 'IS', 'IS NOT'];
        const operator = validOperators.includes(filter.operator?.toUpperCase()) 
          ? filter.operator.toUpperCase() 
          : '=';
        
        // Handle different value types
        if (operator === 'IN' && Array.isArray(filter.value)) {
          const placeholders = filter.value.map(() => `$${paramIndex++}`).join(', ');
          params.push(...filter.value);
          return `${safeTable}.${safeColumn} IN (${placeholders})`;
        } else if (operator === 'IS' || operator === 'IS NOT') {
          // IS NULL or IS NOT NULL
          return `${safeTable}.${safeColumn} ${operator} NULL`;
        } else {
          params.push(filter.value);
          return `${safeTable}.${safeColumn} ${operator} $${paramIndex++}`;
        }
      }).filter(Boolean); // Remove any null/undefined conditions
      
      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }
    }

    // Build GROUP BY with safe column names
    let groupByClause = '';
    if (groupBy && groupBy.length > 0) {
      const safeGroupBy = groupBy.map(col => quoteIdentifier(col)).join(', ');
      groupByClause = `GROUP BY ${safeGroupBy}`;
    }

    // Build ORDER BY with safe column names
    let orderByClause = '';
    if (orderBy && orderBy.length > 0) {
      const orders = orderBy.map(o => {
        const safeColumn = quoteIdentifier(o.column);
        const direction = o.direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        return `${safeColumn} ${direction}`;
      }).join(', ');
      orderByClause = `ORDER BY ${orders}`;
    }

    // Build LIMIT with validation
    let limitClause = '';
    if (limit) {
      const limitValue = parseInt(limit, 10);
      if (limitValue > 0 && limitValue <= 10000) { // Max 10k rows
        limitClause = `LIMIT ${limitValue}`;
      }
    }

    // Construct final query with parameters
    const query = `
      SELECT ${selectColumns}
      FROM ${fromClause}
      ${whereClause}
      ${groupByClause}
      ${orderByClause}
      ${limitClause}
    `;

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Validate join condition format
 * Must be: table.column = table.column (or similar)
 */
function validateJoinCondition(condition) {
  if (!condition || typeof condition !== 'string') {
    throw new Error('Join condition must be a string');
  }
  
  // Basic validation: must contain table.column format
  const pattern = /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\s*[=<>]+\s*[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/i;
  if (!pattern.test(condition.trim())) {
    throw new Error('Invalid join condition format. Must be: table.column = table.column');
  }
  
  // Quote identifiers in condition
  return condition.split(/\s*([=<>]+)\s*/).map((part, index) => {
    if (index % 2 === 0) { // Identifier parts
      const [table, column] = part.split('.');
      if (table && column) {
        const { quoteIdentifier } = require('../utils/securityUtils');
        return `${quoteIdentifier(table)}.${quoteIdentifier(column)}`;
      }
      return part;
    }
    return part; // Operator
  }).join(' ');
}
```

### Testing

```javascript
// Test with malicious input
const maliciousConfig = {
  tables: ['users'],
  columns: [{ table: 'users', column: 'email' }],
  filters: [{
    table: 'users',
    column: 'id',
    operator: '=',
    value: "1' OR '1'='1" // SQL injection attempt
  }]
};

// Should safely handle this - value will be parameterized
const result = await buildReport('test_db', maliciousConfig);
```

---

## Fix #2: Remove Default Secrets (CRITICAL)

### Step 1: Generate Strong Secrets

```bash
# Generate PostgreSQL password
openssl rand -base64 32

# Generate JWT secret
openssl rand -base64 32
```

### Step 2: Update docker-compose.yml

```yaml
# ❌ REMOVE DEFAULT VALUES
# OLD:
# POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-admin}
# VITE_JWT_SECRET: ${VITE_JWT_SECRET:-your-super-secret-jwt-key-change-this-in-production}

# ✅ NEW (require explicit values):
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
VITE_JWT_SECRET: ${VITE_JWT_SECRET}
```

### Step 3: Add Validation Script

Create `scripts/validate-secrets.sh`:

```bash
#!/bin/bash
set -e

echo "🔒 Validating required secrets..."

if [ -z "$POSTGRES_PASSWORD" ]; then
  echo "❌ ERROR: POSTGRES_PASSWORD is required"
  exit 1
fi

if [ ${#POSTGRES_PASSWORD} -lt 32 ]; then
  echo "❌ ERROR: POSTGRES_PASSWORD must be at least 32 characters"
  exit 1
fi

if [ -z "$VITE_JWT_SECRET" ]; then
  echo "❌ ERROR: VITE_JWT_SECRET is required"
  exit 1
fi

if [ ${#VITE_JWT_SECRET} -lt 32 ]; then
  echo "❌ ERROR: VITE_JWT_SECRET must be at least 32 characters"
  exit 1
fi

echo "✅ All secrets validated"
```

### Step 4: Update .env File

```bash
# .env (DO NOT COMMIT THIS FILE)
POSTGRES_PASSWORD=<generated-password-here>
VITE_JWT_SECRET=<generated-secret-here>
```

### Step 5: Add Startup Validation

Update `server/index.js`:

```javascript
// Add at the top of index.js
function validateRequiredSecrets() {
  const required = {
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    VITE_JWT_SECRET: process.env.VITE_JWT_SECRET || process.env.JWT_SECRET,
  };

  const missing = [];
  const weak = [];

  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      missing.push(key);
    } else if (value.length < 32) {
      weak.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('❌ CRITICAL: Missing required secrets:', missing.join(', '));
    console.error('   Please set these in your .env file');
    process.exit(1);
  }

  if (weak.length > 0) {
    console.warn('⚠️  WARNING: Weak secrets detected:', weak.join(', '));
    console.warn('   Secrets should be at least 32 characters');
  }

  console.log('✅ All required secrets validated');
}

// Call before starting server
validateRequiredSecrets();
```

---

## Fix #3: Add Rate Limiting (CRITICAL)

### Step 1: Install Package

```bash
cd server
npm install express-rate-limit
```

### Step 2: Create Rate Limiting Middleware

Create `server/middleware/rateLimiter.js`:

```javascript
const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');

// Redis store for rate limiting (if Redis available)
const RedisStore = require('rate-limit-redis');
let store = undefined;

// Try to use Redis if available
(async () => {
  try {
    const redis = await getRedisClient();
    if (redis) {
      const RedisStore = require('rate-limit-redis');
      store = new RedisStore({
        client: redis,
        prefix: 'rl:',
      });
    }
  } catch (error) {
    console.warn('[RateLimit] Redis not available, using memory store');
  }
})();

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  store,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
  store,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many login attempts',
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Password reset rate limiter
 */
const passwordResetLimiter = rateLimit({
  store,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: {
    success: false,
    error: 'Too many password reset requests',
    message: 'Too many password reset requests, please try again later',
  },
});

/**
 * File upload rate limiter
 */
const uploadLimiter = rateLimit({
  store,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    success: false,
    error: 'Upload rate limit exceeded',
    message: 'Too many file uploads, please try again later',
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
};
```

### Step 3: Apply to Routes

Update `server/routes/auth.js`:

```javascript
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

// Apply to login endpoint
router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  // ... existing login code
}));

// Apply to password reset
router.post('/reset-password', passwordResetLimiter, asyncHandler(async (req, res) => {
  // ... existing reset code
}));
```

Update `server/index.js`:

```javascript
const { apiLimiter } = require('./middleware/rateLimiter');

// Apply to all API routes
app.use('/api', apiLimiter);
```

---

## Fix #4: Add Input Validation (CRITICAL)

### Step 1: Install Package

```bash
cd server
npm install express-validator
```

### Step 2: Create Validation Middleware

Create `server/middleware/validation.js`:

```javascript
const { validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Invalid input data',
      errors: errors.array(),
    });
  }
  next();
}

module.exports = { validateRequest };
```

### Step 3: Add Validation Rules

Update `server/routes/auth.js`:

```javascript
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation');

router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  validateRequest,
], authLimiter, asyncHandler(async (req, res) => {
  // ... existing login code
}));
```

### Step 4: Sanitize All Inputs

Create `server/middleware/sanitize.js`:

```javascript
const { body, query, param } = require('express-validator');

/**
 * Sanitize common inputs
 */
const sanitizeInput = {
  email: body('email').trim().normalizeEmail().toLowerCase(),
  string: (field) => body(field).trim().escape(),
  number: (field) => body(field).toInt().isInt(),
  uuid: (field) => body(field).isUUID(),
  optionalString: (field) => body(field).optional().trim().escape(),
  optionalNumber: (field) => body(field).optional().toInt().isInt(),
};

module.exports = { sanitizeInput };
```

---

## Fix #5: Fix Connection Pool Leaks (CRITICAL)

### Update reportBuilderService.js

```javascript
// ❌ REMOVE THIS:
async function getAgencyConnection(agencyDatabase) {
  const { parseDatabaseUrl } = require('../utils/poolManager');
  const { Pool } = require('pg');
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  return await agencyPool.connect();
}

// ✅ USE THIS INSTEAD:
const { getAgencyPool } = require('../utils/poolManager');

async function buildReport(agencyDatabase, reportConfig) {
  const pool = getAgencyPool(agencyDatabase); // Use centralized pool manager
  const client = await pool.connect(); // Get connection from pool
  
  try {
    // ... query logic
  } finally {
    client.release(); // ✅ Release connection back to pool
  }
}
```

### Remove Pool Closing Code

```javascript
// ❌ REMOVE THIS:
await client.client.pool.end(); // This closes the entire pool!

// ✅ NOT NEEDED - pool manager handles cleanup
```

---

## Testing Checklist

After implementing each fix:

- [ ] **SQL Injection Fix:**
  - [ ] Test with malicious SQL in filter values
  - [ ] Test with special characters
  - [ ] Test with very long strings
  - [ ] Verify queries use parameters

- [ ] **Secrets Fix:**
  - [ ] Verify server fails to start without secrets
  - [ ] Verify secrets are not in logs
  - [ ] Test with weak secrets (should warn)
  - [ ] Verify .env is in .gitignore

- [ ] **Rate Limiting:**
  - [ ] Send 6 login requests rapidly (5th should succeed, 6th should fail)
  - [ ] Wait 15 minutes, verify limit resets
  - [ ] Test from different IPs
  - [ ] Verify Redis store works (if available)

- [ ] **Input Validation:**
  - [ ] Test with invalid email formats
  - [ ] Test with SQL injection in inputs
  - [ ] Test with XSS payloads
  - [ ] Verify validation errors are clear

- [ ] **Connection Pool:**
  - [ ] Monitor pool connections during load
  - [ ] Verify connections are released
  - [ ] Test with concurrent requests
  - [ ] Check for connection leaks in logs

---

## Deployment Steps

1. **Backup Everything**
   ```bash
   docker compose exec postgres pg_dump -U postgres buildflow_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Update Code**
   ```bash
   git checkout -b security-fixes
   # Make changes
   git commit -m "Fix critical security vulnerabilities"
   ```

3. **Test Locally**
   ```bash
   docker compose down
   docker compose build
   docker compose up -d
   # Run tests
   ```

4. **Deploy to Staging**
   ```bash
   # Deploy to staging environment
   # Run full test suite
   ```

5. **Deploy to Production**
   ```bash
   # After staging tests pass
   # Deploy during maintenance window
   # Monitor closely for 24 hours
   ```

---

## Rollback Plan

If issues occur:

```bash
# 1. Stop services
docker compose down

# 2. Restore code
git checkout <previous-commit>

# 3. Restore database (if needed)
docker compose exec postgres psql -U postgres buildflow_db < backup.sql

# 4. Restart
docker compose up -d
```

---

**Priority:** Fix these 5 issues within 24 hours before any production deployment.

