# Quick Reference Guide

## System Overview

**BuildFlow** is a multi-tenant SaaS ERP platform for construction and agency management.

- **53 database tables** with complete CRUD operations
- **Multi-tenant architecture** with data isolation via `agency_id`
- **PostgreSQL backend** with Express.js API
- **React frontend** with TypeScript

## Key Concepts

### Multi-Tenancy

Every business data record includes `agency_id`:
- Data is automatically filtered by agency
- Complete isolation between companies
- `agency_id` is auto-injected from localStorage

### Agency ID Usage

```typescript
import { getAgencyId } from '@/utils/agencyUtils';

// Get agency ID
const agencyId = await getAgencyId(profile, user?.id);

// Use in queries
const clients = await selectRecords('clients', {
  where: { agency_id: agencyId }
});
```

### Database Operations

```typescript
// Select
const records = await selectRecords('table', {
  where: { agency_id: agencyId }
});

// Insert (agency_id auto-added)
await insertRecord('table', { name: 'Value' });

// Update
await updateRecord('table', { name: 'New' }, { id: recordId });

// Delete
await deleteRecord('table', { id: recordId });
```

## Common Tables

| Table | Purpose | Requires agency_id |
|-------|---------|-------------------|
| `agencies` | Company records | No |
| `users` | User accounts | No |
| `profiles` | User profiles | Yes |
| `clients` | Customer records | Yes |
| `projects` | Project records | Yes |
| `tasks` | Task management | Yes |
| `invoices` | Invoice records | Yes |
| `leads` | Lead tracking | Yes |
| `attendance` | Attendance tracking | Yes |
| `payroll` | Payroll records | Yes |

## File Locations

### Key Files

- **Backend Server:** `server/index.js`
- **Database Service:** `src/services/api/postgresql-service.ts`
- **Query Builder:** `src/lib/database.ts`
- **Agency Utils:** `src/utils/agencyUtils.ts`
- **Auth Hook:** `src/hooks/useAuth.tsx`

### Configuration

- **Environment:** `.env`
- **Database Config:** `server/index.js` (DATABASE_URL)
- **API URL:** `VITE_API_URL` in `.env`

## Common Tasks

### Add New Table

1. Create migration in `database/migrations/`
2. Add table name to `AGENCY_REQUIRED_TABLES` in `postgresql-service.ts`
3. Create service functions
4. Create React components

### Debug Agency ID Issues

```typescript
// Check localStorage
console.log(localStorage.getItem('agency_id'));

// Check profile
const { profile } = useAuth();
console.log(profile?.agency_id);

// Get agency ID
const agencyId = await getAgencyId(profile, user?.id);
console.log('Agency ID:', agencyId);
```

### Test Database Connection

```bash
psql -U postgres -d buildflow_db -c "SELECT COUNT(*) FROM agencies;"
```

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:admin@localhost:5432/buildflow_db
VITE_API_URL=http://localhost:3000/api
VITE_JWT_SECRET=your-secret-key
```

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/database/query` - Execute SQL query

## Test Credentials

| Email | Password | Role |
|-------|----------|------|
| super@buildflow.local | super123 | Super Admin |
| admin@buildflow.local | admin123 | Admin |
| hr@buildflow.local | hr123 | HR Manager |

## Quick Commands

```bash
# Start frontend
npm run dev

# Start backend
cd server && node index.js

# Connect to database
psql -U postgres -d buildflow_db

# List tables
psql -U postgres -d buildflow_db -c "\dt"

# Check agency data
psql -U postgres -d buildflow_db -c "SELECT * FROM agencies;"
```

## Troubleshooting

### Agency ID Missing
- Check user is logged in
- Verify profile has `agency_id`
- Check localStorage for `agency_id`

### Database Connection Failed
- Verify PostgreSQL is running
- Check connection string in `.env`
- Verify database exists

### CORS Errors
- Check `VITE_API_URL` is correct
- Verify backend CORS configuration
- Check backend server is running

## Documentation Links

- [Architecture](architecture.md) - System design
- [Database](database.md) - Database structure
- [API](api.md) - API reference
- [Development](development.md) - Dev guide
