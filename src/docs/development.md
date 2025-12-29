# Development Guide

## Getting Started

### Prerequisites

- **Node.js:** 18+ 
- **PostgreSQL:** 14+ (running locally)
- **npm** or **bun** package manager

### Installation

```bash
# Clone repository
git clone <repository-url>
cd buildsite-flow

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

The application will be available at `http://localhost:8080` (or next available port).

## Environment Setup

### Required Environment Variables

Create a `.env` file in the root directory:

```env
# Database Connection
DATABASE_URL=postgresql://postgres:admin@localhost:5432/buildflow_db
VITE_DATABASE_URL=postgresql://postgres:admin@localhost:5432/buildflow_db

# API Configuration
VITE_API_URL=http://localhost:3000/api

# JWT Secret (change in production)
VITE_JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Application Metadata
VITE_APP_NAME=BuildFlow Agency Management
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=development
```

### Database Setup

1. **Create Database:**
```sql
CREATE DATABASE buildflow_db;
```

2. **Run Migrations:**
Check `database/migrations/` for SQL migration files.

3. **Verify Connection:**
```bash
psql -U postgres -d buildflow_db -c "SELECT version();"
```

## Project Structure

```
buildsite-flow/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Shadcn UI components
│   │   ├── layout/         # Layout components
│   │   └── ...             # Feature components
│   ├── pages/              # Page components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API services
│   │   └── api/           # PostgreSQL service layer
│   ├── stores/            # Zustand state stores
│   ├── lib/               # Utilities
│   │   ├── database.ts    # Query builder
│   │   └── utils.ts       # Helper functions
│   ├── integrations/      # External integrations
│   │   └── postgresql/    # Database client
│   └── config/           # Configuration
├── server/                # Backend Express server
│   └── index.js          # Main server file
├── docs/                  # Documentation
├── public/               # Static assets
└── database/
    └── migrations/       # Database migrations
```

## Development Workflow

### Running the Application

```bash
# Start frontend dev server
npm run dev

# Start backend server (separate terminal)
cd server
node index.js
```

### Building for Production

```bash
# Build frontend
npm run build

# Preview production build
npm run preview
```

### Code Quality

```bash
# Lint code
npm run lint

# Type check
npm run type-check
```

## Key Development Concepts

### Multi-Tenancy

Every business data table requires `agency_id`:

```typescript
// ✅ Correct - agency_id automatically added
await insertRecord('clients', {
  name: 'Client Name',
  email: 'client@example.com'
  // agency_id added automatically
});

// ✅ Correct - Explicit agency_id
await insertRecord('clients', {
  name: 'Client Name',
  agency_id: agencyId
});
```

### Agency ID Utility

Always use `getAgencyId()` helper:

```typescript
import { getAgencyId } from '@/utils/agencyUtils';

const agencyId = await getAgencyId(profile, user?.id);
if (!agencyId) {
  throw new Error('Agency ID required');
}
```

### Database Queries

Use the service layer for all database operations:

```typescript
// ✅ Preferred - Service layer
import { selectRecords, insertRecord } from '@/services/api/postgresql-service';

// ✅ Alternative - Query builder
import { db } from '@/lib/database';
const { data } = await db.from('table').select('*');
```

## Adding New Features

### 1. Create Database Table

Add migration in `database/migrations/`:

```sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  agency_id UUID REFERENCES agencies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Add to Multi-Tenant List

Update `src/services/api/postgresql-service.ts`:

```typescript
const AGENCY_REQUIRED_TABLES = [
  // ... existing tables
  'new_table'  // Add here
];
```

### 3. Create Service Functions

```typescript
// src/services/api/new-feature-service.ts
export async function getNewFeatureItems(agencyId: string) {
  return selectRecords('new_table', {
    where: { agency_id: agencyId }
  });
}
```

### 4. Create React Components

```typescript
// src/components/NewFeature.tsx
export function NewFeature() {
  const { profile } = useAuth();
  const agencyId = getAgencyId(profile, user?.id);
  
  // Component logic
}
```

## Testing

### Manual Testing

1. **Login:** Use test credentials from README.md
2. **Create Data:** Test CRUD operations
3. **Verify Isolation:** Check data is agency-specific
4. **Check Permissions:** Verify role-based access

### Database Testing

```bash
# Connect to database
psql -U postgres -d buildflow_db

# Check tables
\dt

# Query data
SELECT * FROM agencies;
SELECT * FROM profiles WHERE agency_id = '...';
```

## Common Issues

### Agency ID Not Found

**Problem:** `agency_id` is null or undefined

**Solution:**
```typescript
const agencyId = await getAgencyId(profile, user?.id);
if (!agencyId) {
  // Handle error or redirect to login
}
```

### Database Connection Error

**Problem:** Cannot connect to PostgreSQL

**Solution:**
1. Verify PostgreSQL is running
2. Check connection string in `.env`
3. Verify database exists: `psql -U postgres -l`

### CORS Errors

**Problem:** Frontend cannot call backend API

**Solution:**
- Verify `VITE_API_URL` is correct
- Check backend CORS configuration in `server/index.js`

## Best Practices

1. **Always use `getAgencyId()`** - Never hardcode agency IDs
2. **Use service layer** - Don't write raw SQL in components
3. **Handle errors** - Always wrap API calls in try-catch
4. **Validate data** - Use Zod schemas for form validation
5. **Type safety** - Use TypeScript types for all data
6. **Test multi-tenancy** - Verify data isolation works

## Debugging

### Frontend Debugging

```typescript
// Check localStorage
console.log(localStorage.getItem('agency_id'));
console.log(localStorage.getItem('agency_database'));

// Check auth state
import { useAuthStore } from '@/stores/authStore';
console.log(useAuthStore.getState());
```

### Backend Debugging

```javascript
// server/index.js - Add logging
console.log('Request headers:', req.headers);
console.log('Agency database:', req.headers['x-agency-database']);
```

### Database Debugging

```sql
-- Check agency data
SELECT * FROM agencies;

-- Check user profiles
SELECT p.*, a.name as agency_name 
FROM profiles p 
JOIN agencies a ON p.agency_id = a.id;

-- Check data isolation
SELECT COUNT(*) FROM clients WHERE agency_id = 'specific-uuid';
```

## Deployment

### Production Checklist

- [ ] Update `VITE_JWT_SECRET` to secure value
- [ ] Set `VITE_APP_ENVIRONMENT=production`
- [ ] Configure production database URL
- [ ] Set up SSL/TLS certificates
- [ ] Configure CORS for production domain
- [ ] Set up database backups
- [ ] Configure environment variables on server
- [ ] Test multi-tenant isolation
- [ ] Verify all API endpoints work
- [ ] Test authentication flow

## Resources

- **Database Schema:** See `docs/database.md`
- **API Reference:** See `docs/api.md`
- **Architecture:** See `docs/architecture.md`
- **Main README:** See `README.md`
