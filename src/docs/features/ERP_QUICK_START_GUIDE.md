# ERP Enhancement Quick Start Guide

**For Development Team**

This guide provides quick reference for implementing the ERP enhancements outlined in the audit plan.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (for caching)
- Access to cloud services (AWS/Azure/GCP)

### Environment Setup

```bash
# Clone repository
git clone <repo-url>
cd buildsite-flow

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

---

## 📋 Implementation Checklist by Priority

### 🔴 CRITICAL (Do First)

#### 1. Security Audit
```bash
# Run security audit
npm audit
npm run security:scan

# Check OWASP Top 10
# Review authentication/authorization
# Check for SQL injection vulnerabilities
# Verify input validation
```

#### 2. 2FA/MFA Implementation

**Backend (Node.js/Express):**
```javascript
// Install packages
npm install speakeasy qrcode

// Create 2FA service
// server/services/twoFactorService.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Generate secret
const secret = speakeasy.generateSecret({
  name: `BuildFlow (${user.email})`,
  issuer: 'BuildFlow'
});

// Verify token
const verified = speakeasy.totp.verify({
  secret: user.twoFactorSecret,
  encoding: 'base32',
  token: userProvidedToken
});
```

**Frontend (React):**
```typescript
// components/TwoFactorSetup.tsx
import { useState } from 'react';
import QRCode from 'qrcode.react';

// Setup 2FA component
// Verify 2FA component
// Recovery codes component
```

**Database Schema:**
```sql
ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN recovery_codes TEXT[];
```

#### 3. Field-Level Encryption

```javascript
// server/services/encryptionService.js
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return { encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
}

function decrypt(encryptedData) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(encryptedData.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

#### 4. Redis Caching

```javascript
// server/config/redis.js
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

// Cache middleware
async function cacheMiddleware(req, res, next) {
  const key = `cache:${req.path}:${JSON.stringify(req.query)}`;
  const cached = await client.get(key);
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  res.sendResponse = res.json;
  res.json = (data) => {
    client.setex(key, 3600, JSON.stringify(data)); // 1 hour cache
    res.sendResponse(data);
  };
  next();
}
```

#### 5. Automated Backups

```javascript
// server/services/backupService.js
const { exec } = require('child_process');
const cron = require('node-cron');

// Daily backup at 2 AM
cron.schedule('0 2 * * *', () => {
  const backupFile = `backup_${Date.now()}.sql`;
  const command = `pg_dump -U postgres -d buildflow_db > backups/${backupFile}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Backup failed:', error);
      return;
    }
    console.log('Backup completed:', backupFile);
    // Upload to S3 or cloud storage
  });
});
```

---

### 🟡 HIGH Priority

#### 1. Inventory Management Module

**Database Schema:**
```sql
-- Create inventory tables
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID,
  unit_of_measure VARCHAR(50),
  barcode VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  quantity DECIMAL(10,2) DEFAULT 0,
  reserved_quantity DECIMAL(10,2) DEFAULT 0,
  reorder_point DECIMAL(10,2),
  max_stock DECIMAL(10,2),
  valuation_method VARCHAR(50), -- FIFO, LIFO, Weighted Average
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id)
);

CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  inventory_id UUID NOT NULL REFERENCES inventory(id),
  transaction_type VARCHAR(50), -- IN, OUT, ADJUSTMENT, TRANSFER
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2),
  reference_type VARCHAR(50), -- PURCHASE_ORDER, SALE, ADJUSTMENT
  reference_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**API Endpoints:**
```javascript
// server/routes/inventory.js
router.get('/warehouses', authenticate, getWarehouses);
router.post('/warehouses', authenticate, createWarehouse);
router.get('/products', authenticate, getProducts);
router.post('/products', authenticate, createProduct);
router.get('/inventory', authenticate, getInventory);
router.post('/inventory/transactions', authenticate, createTransaction);
```

#### 2. Procurement Module

**Database Schema:**
```sql
CREATE TABLE purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  requisition_number VARCHAR(100) UNIQUE NOT NULL,
  requested_by UUID NOT NULL,
  department_id UUID,
  status VARCHAR(50) DEFAULT 'draft', -- draft, pending, approved, rejected
  total_amount DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  po_number VARCHAR(100) UNIQUE NOT NULL,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  requisition_id UUID REFERENCES purchase_requisitions(id),
  status VARCHAR(50) DEFAULT 'draft',
  order_date DATE,
  expected_delivery_date DATE,
  total_amount DECIMAL(10,2),
  created_by UUID,
  approved_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100),
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tax_id VARCHAR(100),
  payment_terms VARCHAR(255),
  rating DECIMAL(3,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. Multi-Currency Support

```sql
CREATE TABLE currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(3) UNIQUE NOT NULL, -- USD, EUR, INR
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  exchange_rate DECIMAL(10,4),
  is_base BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add currency_id to relevant tables
ALTER TABLE invoices ADD COLUMN currency_id UUID REFERENCES currencies(id);
ALTER TABLE purchase_orders ADD COLUMN currency_id UUID REFERENCES currencies(id);
```

```javascript
// server/services/currencyService.js
// Fetch exchange rates from API
// Update currency rates daily
// Convert amounts between currencies
```

---

### 🟡 MEDIUM Priority

#### 1. GraphQL API

```javascript
// server/graphql/schema.js
const { buildSchema } = require('graphql');

const schema = buildSchema(`
  type Query {
    products(agencyId: ID!): [Product]
    inventory(warehouseId: ID!): [Inventory]
  }
  
  type Product {
    id: ID!
    name: String!
    sku: String!
    description: String
  }
  
  type Inventory {
    id: ID!
    product: Product!
    quantity: Float!
    warehouse: Warehouse!
  }
`);

// server/graphql/resolvers.js
const resolvers = {
  Query: {
    products: async (parent, args) => {
      // Fetch products from database
    },
    inventory: async (parent, args) => {
      // Fetch inventory from database
    }
  }
};
```

#### 2. Webhook System

```javascript
// server/services/webhookService.js
async function triggerWebhook(event, data) {
  const webhooks = await getWebhooksForEvent(event);
  for (const webhook of webhooks) {
    try {
      await axios.post(webhook.url, {
        event,
        data,
        timestamp: new Date().toISOString(),
        signature: generateSignature(data, webhook.secret)
      });
    } catch (error) {
      // Retry logic
      await retryWebhook(webhook, event, data);
    }
  }
}
```

#### 3. Custom Report Builder

```typescript
// components/ReportBuilder.tsx
interface ReportConfig {
  dataSource: string;
  fields: string[];
  filters: Filter[];
  grouping: Grouping[];
  sorting: Sorting[];
}

// Drag-and-drop interface
// Field selection
// Filter builder
// Grouping options
// Export functionality
```

---

## 🛠️ Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/inventory-management

# Make changes
# Test locally
npm run test

# Commit changes
git commit -m "feat: Add inventory management module"

# Push and create PR
git push origin feature/inventory-management
```

### 2. Database Migrations

```bash
# Create migration file
touch database/migrations/XX_add_inventory_tables.sql

# Write migration
# Test migration
psql -U postgres -d buildflow_db -f database/migrations/XX_add_inventory_tables.sql

# Rollback if needed
```

### 3. API Development

```javascript
// Follow RESTful conventions
// Use authentication middleware
// Validate input
// Handle errors properly
// Return consistent JSON responses

// Example:
router.post('/api/inventory/products', 
  authenticate,
  validateProductInput,
  asyncHandler(async (req, res) => {
    const product = await createProduct(req.body);
    res.json({ success: true, data: product });
  })
);
```

### 4. Frontend Development

```typescript
// Use TypeScript
// Follow component structure
// Use React Query for data fetching
// Implement loading and error states
// Use Shadcn/ui components

// Example:
const { data, isLoading, error } = useQuery({
  queryKey: ['products'],
  queryFn: () => fetchProducts()
});
```

---

## 📊 Testing Checklist

### Unit Tests
- [ ] Service functions
- [ ] Utility functions
- [ ] Business logic

### Integration Tests
- [ ] API endpoints
- [ ] Database operations
- [ ] Third-party integrations

### E2E Tests
- [ ] User workflows
- [ ] Critical paths
- [ ] Cross-browser testing

### Security Tests
- [ ] Authentication
- [ ] Authorization
- [ ] Input validation
- [ ] SQL injection prevention

---

## 🔍 Code Review Checklist

- [ ] Code follows project conventions
- [ ] TypeScript types are correct
- [ ] Error handling is implemented
- [ ] Database queries are optimized
- [ ] Security best practices followed
- [ ] Tests are written
- [ ] Documentation is updated
- [ ] No console.logs in production code
- [ ] Environment variables are used correctly

---

## 📚 Useful Resources

### Documentation
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

### Performance
- [PostgreSQL Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

---

## 🆘 Getting Help

- **Technical Issues:** Create an issue in the repository
- **Security Concerns:** Contact security team immediately
- **Database Questions:** Check `docs/database.md`
- **API Questions:** Check `docs/api.md`

---

**Last Updated:** January 2025
