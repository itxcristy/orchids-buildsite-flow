# BuildFlow API Server

Modular Express.js API server for BuildFlow - Multi-tenant SaaS ERP platform.

## Project Structure

```
server/
├── index.js                 # Main entry point (~50 lines)
├── config/                  # Configuration files
│   ├── constants.js         # Environment variables and constants
│   ├── database.js          # Database pool configuration
│   └── middleware.js        # Express middleware setup
├── middleware/              # Express middleware
│   └── errorHandler.js      # Centralized error handling
├── routes/                  # API route handlers
│   ├── health.js            # Health check routes
│   ├── files.js             # File serving routes
│   ├── database.js          # Database query/transaction routes
│   ├── auth.js              # Authentication routes
│   └── agencies.js          # Agency management routes
├── services/                # Business logic services
│   ├── databaseService.js   # Database operations
│   ├── agencyService.js     # Agency-related business logic
│   └── authService.js       # Authentication business logic
└── utils/                   # Utility functions
    ├── schemaCreator.js      # Schema creation orchestrator
    ├── schema/               # Modular schema modules
    │   ├── sharedFunctions.js      # Database extensions, types, functions
    │   ├── authSchema.js           # Authentication and authorization
    │   ├── agenciesSchema.js       # Agency settings
    │   ├── departmentsSchema.js    # Departments and teams
    │   ├── hrSchema.js             # HR and employee management
    │   ├── projectsTasksSchema.js  # Projects and tasks
    │   ├── clientsFinancialSchema.js # Clients and financial
    │   ├── crmSchema.js            # CRM
    │   ├── gstSchema.js            # GST compliance
    │   ├── reimbursementSchema.js   # Expense and reimbursement
    │   ├── miscSchema.js           # Miscellaneous tables
    │   └── indexesAndFixes.js      # Indexes and backward compatibility
    ├── schemaValidator.js    # Schema validation and repair
    └── poolManager.js       # Database pool management utilities
```

## Architecture

### Multi-Tenant Database Architecture

- **Main Database**: `buildflow_db` - Stores agency metadata
- **Agency Databases**: Isolated databases per agency (e.g., `agency_example_12345678`)
- **Database Pool Caching**: Per-agency pools are cached to avoid recreation
- **Agency Routing**: Uses `X-Agency-Database` header to route queries to correct database

### Key Features

1. **Modular Structure**: Each module has a single responsibility
2. **Separation of Concerns**: Routes, services, and utilities are separated
3. **Error Handling**: Centralized error handling middleware
4. **Schema Management**: Automatic schema validation and repair
5. **Connection Pooling**: Efficient database connection management

## API Endpoints

### Health Check
- `GET /health` - Verify database connectivity

### Files
- `GET /api/files/:bucket/:path(*)` - File serving endpoint

### Database
- `POST /api/database/query` - Execute a single database query
- `POST /api/database/transaction` - Execute multiple queries in a transaction

### Authentication
- `POST /api/auth/login` - Login (searches across all agency databases)

### Agencies
- `GET /api/agencies/check-domain` - Check domain availability
- `GET /api/agencies/check-setup` - Check agency setup status
- `POST /api/agencies/complete-setup` - Complete agency setup
- `POST /api/agencies/create` - Create new agency with isolated database
- `POST /api/agencies/repair-database` - Repair agency database schema

## Database Configuration

Default connection:
- Database: `buildflow_db`
- User: `postgres`
- Password: `admin`
- Host: `localhost`
- Port: `5432`

Can be overridden with environment variables:
- `DATABASE_URL` or `VITE_DATABASE_URL`

## Running the Server

```bash
# Development
npm run dev

# Production
npm start
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `VITE_DATABASE_URL` - Alternative database URL

## Code Organization Principles

1. **Single Responsibility**: Each file has one clear purpose
2. **Dependency Injection**: Services receive dependencies as parameters
3. **Error Handling**: All async routes use `asyncHandler` wrapper
4. **Code Reusability**: Common patterns extracted to utilities
5. **Maintainability**: Each file is ideally < 500 lines

## Schema Creation

The `createAgencySchema` function creates 53 tables by orchestrating modular schema modules:

### Modular Schema Structure

The schema creation has been refactored from a monolithic 2,152-line function into 12 domain-specific modules:

- **sharedFunctions.js** - Database extensions, types, functions, triggers, views
- **authSchema.js** - Users, profiles, roles, audit logs, permissions
- **agenciesSchema.js** - Agency settings
- **departmentsSchema.js** - Departments, team assignments, hierarchy
- **hrSchema.js** - Employee management, attendance, leave, payroll
- **projectsTasksSchema.js** - Projects, tasks, assignments, time tracking
- **clientsFinancialSchema.js** - Clients, invoices, quotations, chart of accounts, journal entries, jobs
- **crmSchema.js** - Leads, CRM activities, sales pipeline
- **gstSchema.js** - GST settings, returns, transactions
- **reimbursementSchema.js** - Expense categories, reimbursement requests, receipts
- **miscSchema.js** - Notifications, holidays, events, reports
- **indexesAndFixes.js** - All indexes and backward compatibility fixes

### Benefits

1. **Easier to Understand**: Each module focuses on a specific domain
2. **Safer Changes**: Financial changes only touch `clientsFinancialSchema.js`
3. **Better for AI Tools**: Smaller, focused files are easier to modify safely
4. **Maintainable**: Future schema changes are localized to relevant modules
5. **Testable**: Each module can be tested independently

See `server/utils/schema/README.md` for detailed documentation.

## Migration from Monolithic Structure

The original `index.js` (3947 lines) has been refactored into:
- Main entry point: ~50 lines
- Route files: < 300 lines each
- Service files: < 500 lines each
- Schema creation: Modular structure (12 focused modules)

All functionality has been preserved while improving maintainability and testability.
