# API Documentation

## Base URL

- **Development:** `http://localhost:3000/api`
- **Production:** Set via `VITE_API_URL` environment variable

## Authentication

All API requests (except login) require authentication via JWT token.

### Headers Required

```
Authorization: Bearer <jwt_token>
X-Agency-Database: <agency_database_name>
```

The `X-Agency-Database` header tells the backend which agency's database to query.

## Authentication Endpoints

### POST /api/auth/login

Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "profile": {
      "id": "uuid",
      "full_name": "John Doe",
      "agency_id": "uuid"
    },
    "token": "jwt_token_here",
    "agency_database": "agency_db_name"
  }
}
```

### POST /api/auth/register

Register a new user (requires agency context).

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "full_name": "New User",
  "agency_id": "uuid"
}
```

## Database Query Endpoint

### POST /api/database/query

Execute a database query on the agency's database.

**Headers:**
- `X-Agency-Database`: Required - The agency's database name
- `Authorization`: Required - JWT token

**Request:**
```json
{
  "query": "SELECT * FROM profiles WHERE agency_id = $1",
  "params": ["agency-uuid"]
}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "rowCount": 10
}
```

## Frontend Service Layer

The frontend uses a service layer that abstracts database operations.

### Using PostgreSQL Service

```typescript
import { selectRecords, insertRecord, updateRecord, deleteRecord } from '@/services/api/postgresql-service';

// Select records
const clients = await selectRecords('clients', {
  where: { status: 'active' },
  orderBy: 'created_at DESC',
  limit: 10
});

// Insert record
const newClient = await insertRecord('clients', {
  name: 'New Client',
  email: 'client@example.com',
  agency_id: agencyId // Auto-added if table requires it
});

// Update record
const updated = await updateRecord('clients', 
  { name: 'Updated Name' },
  { id: clientId }
);

// Delete record
await deleteRecord('clients', { id: clientId });
```

### Using Database Query Builder

```typescript
import { db } from '@/lib/database';

// PostgreSQL query builder
const { data, error } = await db
  .from('clients')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(10);

// Insert with auto agency_id
await db
  .from('clients')
  .insert({
    name: 'New Client',
    email: 'client@example.com'
    // agency_id automatically added from localStorage
  });
```

## Agency ID Handling

### Automatic Injection

The service layer automatically adds `agency_id` to records when:
1. The table is in the `AGENCY_REQUIRED_TABLES` list
2. `agency_id` is not already provided
3. `agencyId` is available from localStorage or function parameter

### Manual Handling

```typescript
import { getAgencyId } from '@/utils/agencyUtils';

const agencyId = await getAgencyId(profile, user?.id);
if (!agencyId) {
  throw new Error('Agency ID required');
}

await insertRecord('clients', {
  name: 'Client',
  agency_id: agencyId
});
```

## Error Handling

All API calls return consistent error format:

```typescript
{
  success: false,
  error: "Error message",
  status: 400
}
```

### Common Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Request/Response Examples

### Get All Clients

```typescript
const clients = await selectRecords('clients', {
  where: { agency_id: agencyId },
  orderBy: 'created_at DESC'
});
```

### Create Project

```typescript
const project = await insertRecord('projects', {
  name: 'New Project',
  budget: 500000,
  start_date: '2025-01-01',
  agency_id: agencyId
});
```

### Update Task Status

```typescript
await updateRecord('tasks',
  { status: 'completed', completed_at: new Date().toISOString() },
  { id: taskId }
);
```

### Delete Record

```typescript
await deleteRecord('leads', { id: leadId });
```

## Filtering & Querying

### Simple Where Clause

```typescript
const records = await selectRecords('table', {
  where: {
    status: 'active',
    agency_id: agencyId
  }
});
```

### Advanced Filters

```typescript
const records = await selectRecords('table', {
  filters: [
    { column: 'status', operator: 'eq', value: 'active' },
    { column: 'amount', operator: 'gt', value: 1000 },
    { column: 'name', operator: 'ilike', value: '%search%' }
  ],
  orderBy: 'created_at DESC',
  limit: 20,
  offset: 0
});
```

### Supported Operators

- `eq` - Equals
- `neq` - Not equals
- `gt` - Greater than
- `gte` - Greater than or equal
- `lt` - Less than
- `lte` - Less than or equal
- `like` - Pattern match (case-sensitive)
- `ilike` - Pattern match (case-insensitive)
- `is` - IS NULL / IS NOT NULL
- `in` - Value in array

## Pagination

```typescript
const page = 1;
const pageSize = 20;

const records = await selectRecords('table', {
  where: { agency_id: agencyId },
  limit: pageSize,
  offset: (page - 1) * pageSize,
  orderBy: 'created_at DESC'
});
```

## Transactions

For multi-table operations:

```typescript
import { transaction } from '@/integrations/postgresql/client';

await transaction(async (client) => {
  const invoice = await insertRecord('invoices', {...});
  await insertRecord('journal_entries', {
    invoice_id: invoice.id,
    ...
  });
});
```
