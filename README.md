# Drena - Agency Management Platform

A comprehensive multi-tenant SaaS ERP platform for construction and agency management with complete business operations support.

> **📚 Documentation**: All project documentation is organized in the [`docs/`](./docs/) folder.
> - [Deployment Guides](./docs/deployment/) - Production deployment and VPS setup
> - [VPS Updates](./docs/deployment/vps/) - How to update on VPS
> - [Bug Fixes](./docs/fixes/) - Fix documentation
> - [Implementation Status](./docs/status/) - Status reports
> - [Project Structure](./docs/PROJECT_STRUCTURE.md) - Complete project structure

---

## 🎯 Project Overview

**Drena** (also known as **BuildFlow**) is a full-featured Enterprise Resource Planning (ERP) system designed for construction companies and agencies. It provides comprehensive business management capabilities including HR, Finance, Project Management, CRM, Inventory, Procurement, and more.

### Key Highlights

- ✅ **16 Major Modules** fully implemented
- ✅ **93+ Database Tables** with complete CRUD operations
- ✅ **Multi-Tenant Architecture** with isolated databases per agency
- ✅ **22 Role-Based Access Control** (RBAC) system
- ✅ **Production Ready** with Docker deployment
- ✅ **Modern Tech Stack** - React 18, TypeScript, PostgreSQL, Express.js

---

## 🚀 Quick Start

### Option 1: Docker (Recommended) 🐳

**Prerequisites:**
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose

**Start with Docker:**

```bash
# Development mode (with hot reload)
docker compose -f docker-compose.dev.yml up -d

# Or use PowerShell script (Windows)
.\scripts\docker-start.ps1 dev

# Production mode
docker compose -f docker-compose.yml up -d
```

**Access the application:**
- **Development**: Frontend at http://localhost:5173, Backend at http://localhost:3000/api
- **Production**: Frontend at http://localhost:80, Backend at http://localhost:3000/api

**View logs:**
```bash
docker compose logs -f
```

**Stop services:**
```bash
docker compose down
```

### Option 2: Local Development

**Prerequisites:**
- Node.js 18+ 
- npm or bun
- PostgreSQL 15+ (running locally)
- Redis (optional, for caching)

**Installation:**

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173` (or next available port).

---

## 🏭 Production Deployment

### Multi-Tenant Database Architecture

This system uses **isolated databases per agency** for complete data isolation:

- **Main Database** (`buildflow_db`): Stores agency metadata and configuration
- **Agency Databases** (`agency_*`): One isolated database per agency with complete schema

### Quick Production Setup

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env with your production values

# 2. Deploy to production
./scripts/production-deploy.sh

# Or manually:
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d
```

### Production Features

✅ **Complete Database Isolation** - Each agency has its own isolated database  
✅ **Automated Backups** - Scheduled backups for all databases  
✅ **Health Monitoring** - Built-in health checks for all services  
✅ **Security Hardened** - Non-root containers, secure defaults  
✅ **Resource Limits** - CPU and memory limits configured  
✅ **Multi-Tenant Ready** - Automatic agency database creation and management  

📚 **For detailed production deployment guide, see [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md)**

---

## 🔐 Test Credentials

The application comes with pre-configured test accounts:

| Email | Password | Role | Name |
|-------|----------|------|------|
| super@buildflow.local | super123 | Super Admin | Rajesh Kumar (CEO) |
| admin@buildflow.local | admin123 | Admin | Priya Sharma |
| hr@buildflow.local | hr123 | HR Manager | Anita Desai |
| finance@buildflow.local | finance123 | Finance Manager | Vikram Mehta |
| employee@buildflow.local | employee123 | Employee | Amit Patel |
| pm@buildflow.local | pm123 | Project Manager | David Rodriguez |
| sales@buildflow.local | sales123 | Sales Manager | Lisa Thompson |
| devlead@buildflow.local | devlead123 | Dev Lead | Alex Williams |

---

## 📦 Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 7
- **UI Library**: Radix UI, Shadcn/ui
- **Styling**: TailwindCSS 3.4
- **State Management**: Zustand, React Query (TanStack Query)
- **Forms**: React Hook Form, Zod validation
- **Charts**: Recharts
- **Routing**: React Router DOM 6
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcrypt, express-rate-limit
- **File Upload**: Multer
- **Email**: Nodemailer, Mailtrap
- **Real-time**: Socket.io
- **Logging**: Winston
- **Scheduling**: node-cron
- **GraphQL**: graphql, graphql-http

### Infrastructure
- **Containerization**: Docker, Docker Compose
- **Web Server**: Nginx (production)
- **Database**: PostgreSQL with multi-tenant architecture
- **Cache**: Redis for session and data caching

---

## 🔐 Features & Modules

### ✅ Core Modules (16 Major Modules Implemented)

1. **Multi-Tenant Architecture** - Complete isolation per agency
2. **Role-Based Access Control** - 22 roles with granular permissions
3. **User Authentication & Sessions** - JWT-based with session management
4. **Two-Factor Authentication (2FA/MFA)** - TOTP-based security
5. **Field-Level Encryption** - Sensitive data protection
6. **Comprehensive Audit Logging** - Complete activity tracking
7. **System Health Dashboard** - Real-time monitoring
8. **Automated Backup System** - Scheduled database backups
9. **Redis Caching Layer** - Performance optimization
10. **Performance Monitoring** - APM and metrics
11. **GraphQL API** - Flexible data querying
12. **Webhook System** - External integrations
13. **Advanced Reporting** - Custom report builder + scheduled reports
14. **Multi-Currency Support** - International transactions
15. **Bank Reconciliation** - Financial reconciliation
16. **Budget Planning & Tracking** - Financial planning

### ✅ HR Management Module

- Employee records & profiles with complete details
- Attendance tracking (clock in/out with geolocation)
- Leave management with balances and approvals
- Payroll processing with multiple periods
- Department & team management
- Reimbursement workflow with categories
- Employee salary details and history
- Team assignments and hierarchies

### ✅ Project Management Module

- Project tracking with budgets and timelines
- Task management (Kanban board view)
- Job costing with categories
- Resource allocation and tracking
- Progress tracking and milestones
- Project dependencies and risks
- Gantt chart visualization
- Issue and risk management

### ✅ Financial Management Module

- Client management with complete profiles
- Invoicing & billing system
- Quotation system with approval workflow
- Payment tracking and reconciliation
- Chart of accounts
- GST compliance (India) with HSN/SAC codes
- Multi-currency transactions
- Bank reconciliation
- Budget planning and tracking
- Journal entries

### ✅ CRM Module

- Lead tracking with sources and scoring
- Sales pipeline management
- Opportunity management
- Client communication tracking
- Email tracking and integration
- Lead segmentation
- Activity tracking

### ✅ Inventory Management Module

- Multi-warehouse management
- Product catalog with variants
- Real-time inventory tracking
- Stock movement transactions
- Low stock alerts
- Barcode/QR code generation
- Inventory valuation (weighted average)
- Product categories

### ✅ Procurement & Supply Chain Module

- Purchase requisition workflow
- Purchase order creation and tracking
- Goods receipt (GRN) with 3-way matching
- RFQ/RFP management
- Supplier management
- Automatic inventory updates on GRN
- PO status tracking
- Vendor evaluation

### ✅ Calendar & Events

- Holiday management (Indian holidays)
- Company events
- Leave calendar integration
- Event notifications

### ✅ Additional Features

- **Slack Integration** - Team notifications
- **Email System** - Transactional emails
- **File Management** - Document storage and retrieval
- **API Keys Management** - Secure API access
- **Workflow Engine** - Custom business workflows
- **Advanced Reports** - Custom report builder
- **Scheduled Reports** - Automated report generation
- **System Settings** - Comprehensive configuration
- **Password Policies** - Security enforcement
- **Session Management** - Active session tracking

---

## 🗃️ Database Structure

### Database Connection

- **Database:** `buildflow_db`
- **User:** `postgres`
- **Password:** `admin`
- **Connection:** `postgresql://postgres:admin@localhost:5432/buildflow_db`

### Verify Database

```bash
psql -U postgres -d buildflow_db -c "\dt"
```

### Database Tables (93+ Tables)

#### Core Tables
- `agencies`, `agency_settings`, `users`, `profiles`, `user_roles`, `sessions`, `api_keys`

#### HR Tables
- `employee_details`, `employee_salary_details`, `departments`, `team_assignments`, `attendance`, `leave_types`, `leave_balances`, `leave_requests`, `payroll_periods`, `payroll`, `reimbursement_categories`, `reimbursement_requests`

#### Project Management Tables
- `projects`, `tasks`, `job_categories`, `jobs`, `project_milestones`, `project_risks`, `project_issues`, `project_dependencies`

#### Financial Tables
- `clients`, `invoices`, `invoice_items`, `quotations`, `quotation_items`, `chart_of_accounts`, `journal_entries`, `payments`, `gst_settings`, `hsn_sac_codes`, `currencies`, `exchange_rates`, `bank_accounts`, `bank_reconciliations`, `budgets`, `budget_items`

#### CRM Tables
- `leads`, `lead_sources`, `opportunities`, `lead_scores`, `email_tracking`, `lead_segments`

#### Inventory Tables
- `warehouses`, `products`, `product_variants`, `product_categories`, `inventory`, `inventory_transactions`, `suppliers`

#### Procurement Tables
- `purchase_requisitions`, `purchase_requisition_items`, `purchase_orders`, `purchase_order_items`, `goods_receipts`, `grn_items`, `rfq_rfp`, `rfq_items`, `rfq_responses`, `rfq_response_items`

#### Calendar Tables
- `holidays`, `company_events`

#### System Tables
- `notifications`, `audit_logs`, `system_settings`, `two_factor_auth`, `encrypted_fields`, `backups`, `system_health`, `reports`, `scheduled_reports`, `webhooks`, `workflows`

### Run Migrations

Check `database/migrations/` for SQL migration files to set up the database schema.

---

## 📁 Project Structure

```
buildsite-flow/
├── README.md                    # Main project README
├── package.json                 # Frontend dependencies
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript config
├── tailwind.config.ts           # Tailwind CSS config
├── Dockerfile                   # Frontend Dockerfile
├── docker-compose.yml           # Docker Compose configuration
├── nginx.conf                   # Nginx configuration
│
├── src/                         # Frontend source code
│   ├── components/              # React components (177 files)
│   │   ├── ui/                  # Shadcn UI components (50+)
│   │   ├── layout/              # Layout components
│   │   ├── analytics/           # Dashboard components
│   │   └── ...                  # Feature components
│   ├── pages/                   # Page components (99 pages)
│   ├── hooks/                   # Custom React hooks (19 hooks)
│   ├── services/                # API services (37 services)
│   │   └── api/                 # PostgreSQL service layer
│   ├── stores/                  # Zustand stores (3 stores)
│   ├── lib/                     # Utilities
│   │   ├── database.ts          # PostgreSQL query builder
│   │   ├── seedDatabase.ts     # Comprehensive data seeder
│   │   └── utils.ts             # Helper functions
│   ├── integrations/            # External integrations
│   │   └── postgresql/          # PostgreSQL database client
│   ├── config/                  # App configuration (6 files)
│   ├── constants/               # App constants
│   └── types/                   # TypeScript types
│
├── server/                      # Backend source code
│   ├── index.js                 # Express server entry point
│   ├── package.json             # Backend dependencies
│   ├── routes/                  # API routes (38 route files)
│   │   ├── auth.js              # Authentication routes
│   │   ├── agencies.js          # Agency management
│   │   ├── system.js            # System operations
│   │   ├── financial.js         # Financial operations
│   │   ├── inventory.js         # Inventory management
│   │   ├── procurement.js       # Procurement operations
│   │   ├── twoFactor.js         # 2FA routes
│   │   ├── backups.js           # Backup operations
│   │   ├── systemHealth.js      # Health monitoring
│   │   ├── graphql.js           # GraphQL endpoint
│   │   ├── webhooks.js          # Webhook management
│   │   └── ...                  # More routes
│   ├── services/                # Business logic (36 services)
│   │   ├── authService.js
│   │   ├── inventoryService.js
│   │   ├── procurementService.js
│   │   ├── twoFactorService.js
│   │   ├── backupService.js
│   │   └── ...                  # More services
│   ├── middleware/              # Express middleware (7 files)
│   │   ├── auth.js              # Authentication middleware
│   │   ├── errorHandler.js     # Error handling
│   │   ├── requestLogger.js    # Request logging
│   │   └── ...                  # More middleware
│   ├── config/                  # Configuration files (5 files)
│   │   ├── database.js          # Database connection
│   │   ├── redis.js             # Redis configuration
│   │   └── constants.js         # App constants
│   ├── utils/                   # Utility functions (35 files)
│   └── tests/                   # Test files
│
├── database/                    # Database files
│   ├── migrations/              # SQL migration files (15 files)
│   └── backups/                 # Database backups
│
├── scripts/                     # Utility scripts
│   ├── docker-start.ps1         # Docker start script
│   ├── docker-stop.ps1          # Docker stop script
│   ├── production-deploy.sh     # Production deployment
│   ├── create_super_admin.bat   # Super admin creation
│   ├── backup-database.sh       # Database backup
│   └── ...                      # More scripts
│
├── docs/                        # 📚 All documentation
│   ├── deployment/              # Deployment guides (51 files)
│   │   └── vps/                 # VPS-specific guides
│   ├── fixes/                   # Bug fix documentation (16 files)
│   ├── status/                  # Implementation status (11 files)
│   ├── features/                # Feature documentation (25 files)
│   ├── implementation/          # Implementation docs (17 files)
│   ├── guides/                  # Development guides (14 files)
│   ├── testing/                 # Testing documentation (21 files)
│   └── architecture/            # Architecture docs
│
├── public/                      # Public assets
│   ├── favicon.ico
│   ├── manifest.json
│   └── ...
│
├── data/                        # Runtime data
│   ├── logs/                    # Application logs
│   ├── postgres/                 # PostgreSQL data
│   └── storage/                  # File storage
│
└── dist/                         # Build output (gitignored)
```

---

## 🔧 API Routes

### Authentication & Authorization
- `/api/auth/*` - Login, logout, registration, password reset
- `/api/twoFactor/*` - Two-factor authentication
- `/api/sso/*` - Single Sign-On (SAML/OAuth)
- `/api/sessionManagement/*` - Session management
- `/api/passwordPolicy/*` - Password policy enforcement

### Agency Management
- `/api/agencies/*` - Agency CRUD operations
- `/api/schema/*` - Schema management
- `/api/schemaAdmin/*` - Schema administration

### System Operations
- `/api/system/*` - System operations (2882 lines)
- `/api/systemHealth/*` - Health monitoring
- `/api/backups/*` - Backup operations
- `/api/settings/*` - System settings
- `/api/permissions/*` - Permission management
- `/api/audit/*` - Audit logs

### HR Management
- `/api/system/*` - HR operations (employee, attendance, leave, payroll)

### Financial Management
- `/api/financial/*` - Financial operations (invoices, quotations, payments)
- `/api/currency/*` - Currency management

### Project Management
- `/api/system/*` - Project and task operations
- `/api/projectEnhancements/*` - Advanced project features

### Inventory & Procurement
- `/api/inventory/*` - Inventory management
- `/api/procurement/*` - Procurement operations

### CRM
- `/api/system/*` - CRM operations
- `/api/crmEnhancements/*` - Advanced CRM features

### Reports & Analytics
- `/api/reports/*` - Standard reports
- `/api/advancedReports/*` - Advanced reporting
- `/api/databaseOptimization/*` - Database optimization

### Integrations
- `/api/integrations/*` - External integrations
- `/api/slack/*` - Slack integration
- `/api/webhooks/*` - Webhook management
- `/api/graphql` - GraphQL endpoint

### Files & Assets
- `/api/files/*` - File upload/download
- `/api/assets/*` - Asset management

### Utilities
- `/api/health` - Health check
- `/api/health-simple` - Simple health check
- `/api/database/*` - Database operations
- `/api/email/*` - Email operations
- `/api/messaging/*` - Messaging
- `/api/apiKeys/*` - API key management
- `/api/workflows/*` - Workflow engine
- `/api/pageCatalog/*` - Page catalog

---

## 🛠️ Development

### Available Scripts

**Frontend:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run build:dev    # Build in development mode
npm run preview      # Preview production build
npm run lint         # Lint code
npm run seed:db      # Seed database
npm run seed:journal # Seed journal entries
```

**Backend:**
```bash
cd server
npm start            # Start production server
npm run dev          # Start with nodemon (hot reload)
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Build for Production

```bash
# Frontend
npm run build

# Backend (in server directory)
npm start
```

### Preview Production Build

```bash
npm run preview
```

### Lint Code

```bash
npm run lint
```

---

## 📝 Architecture Notes

### Database Layer

The application uses PostgreSQL with a query builder API:

```typescript
// Query builder (PostgreSQL)
const { data, error } = await db
  .from('clients')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false });

// Direct service calls
import { selectRecords, insertRecord } from '@/services/api/postgresql-service';
const clients = await selectRecords('clients', { where: { status: 'active' } });
```

### Multi-Tenancy

- Each agency has isolated data via `agency_id` column
- Backend routes requests to agency-specific databases
- Frontend automatically includes `agency_id` in all operations
- Complete database isolation per agency (separate databases)

### Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Two-factor authentication (TOTP)
- Field-level encryption for sensitive data
- Role-based access control (22 roles)
- API rate limiting
- Session management
- Audit logging
- Password policies

### Performance Optimizations

- Redis caching layer
- Database query optimization
- Connection pooling
- Lazy loading
- Code splitting
- CDN-ready static assets

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Application
VITE_APP_NAME=Drena - Agency Management Platform
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=development

# Database
VITE_DATABASE_URL=postgresql://postgres:admin@localhost:5432/buildflow_db
DATABASE_URL=postgresql://postgres:admin@localhost:5432/buildflow_db
POSTGRES_PASSWORD=admin
POSTGRES_PORT=5432

# API
VITE_API_URL=http://localhost:3000/api
PORT=3000
BACKEND_PORT=3000

# Authentication
VITE_JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Email (optional)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@example.com

# File Storage
VITE_FILE_STORAGE_PATH=./storage
FILE_STORAGE_PATH=./storage

# CORS
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000
```

### Docker Configuration

The `docker-compose.yml` file includes:
- PostgreSQL database with health checks
- Redis cache
- Backend API server
- Frontend web server (Nginx)
- Resource limits and health monitoring

---

## 📊 Sample Data Summary

The application comes pre-loaded with comprehensive seed data:

| Entity | Count |
|--------|-------|
| Agencies | 2 |
| Users | 10 |
| Departments | 8 |
| Clients | 6 (Major Indian Companies) |
| Projects | 6 |
| Tasks | 12+ |
| Invoices | 6 |
| Quotations | 3 |
| Jobs | 3 |
| Leads | 4 |
| Holidays | 10 (Indian holidays 2025) |
| Attendance Records | 150+ |
| Leave Types | 6 |

### Seed Data Details

**Companies & Organization:**
- **TechBuild Solutions** - Main demo company (Enterprise plan)
- **ConstructPro Inc** - Secondary company (Professional plan)
- 8 Departments (Management, HR, Finance, Development, Sales, PM, Marketing, Support)
- 10 Employees with complete profiles

**Clients (6 Major Indian Companies):**
- Tata Consultancy Services (TCS)
- Infosys Limited
- Reliance Industries
- HDFC Bank
- Wipro Limited
- Flipkart Internet

**Projects & Tasks:**
- 6 Active projects with various statuses
- 12+ Tasks with assignments and progress tracking
- Project budgets ranging from ₹25L to ₹85L

**Financial Data:**
- 6 Invoices (paid, sent, draft)
- 3 Quotations
- Job costing records
- GST settings and HSN/SAC codes
- Chart of accounts

**HR & Payroll:**
- Complete employee details with salaries
- 30 days of attendance records
- Leave types and balances
- Payroll periods and processed payments
- Reimbursement categories and requests

---

## 📚 Documentation

All documentation is organized in the [`docs/`](./docs/) folder:

### Quick Links
- **[Deployment Guides](./docs/deployment/)** - Production deployment, VPS setup, Docker (51 files)
- **[VPS Updates](./docs/deployment/vps/)** - Update instructions for VPS
- **[Bug Fixes](./docs/fixes/)** - All bug fix documentation (16 files)
- **[Implementation Status](./docs/status/)** - Progress and status reports (11 files)
- **[Project Structure](./docs/PROJECT_STRUCTURE.md)** - Complete project structure
- **[Role Permissions](./docs/ROLE_PERMISSIONS_MATRIX.md)** - Complete RBAC documentation

### Detailed Documentation
- **[Architecture](docs/architecture/)** - System architecture and design
- **[Database](docs/database.md)** - Database structure and schema
- **[API](docs/api.md)** - API documentation and usage
- **[Development](docs/development.md)** - Development guide and best practices
- **[Features](docs/features/)** - Feature documentation (25 files)
- **[Implementation](docs/implementation/)** - Implementation docs (17 files)
- **[Testing](docs/testing/)** - Testing documentation (21 files)
- **[Guides](docs/guides/)** - Development guides (14 files)

---

## 🎯 Role-Based Access Control

The system includes **22 predefined roles** with granular permissions:

1. **super_admin** - System administrator with full access
2. **ceo** - Chief Executive Officer
3. **cto** - Chief Technology Officer
4. **cfo** - Chief Financial Officer
5. **coo** - Chief Operations Officer
6. **admin** - Administrator
7. **operations_manager** - Operations Manager
8. **department_head** - Department Head
9. **team_lead** - Team Lead
10. **project_manager** - Project Manager
11. **hr** - Human Resources
12. **finance_manager** - Finance Manager
13. **sales_manager** - Sales Manager
14. **marketing_manager** - Marketing Manager
15. **quality_assurance** - Quality Assurance
16. **it_support** - IT Support
17. **legal_counsel** - Legal Counsel
18. **business_analyst** - Business Analyst
19. **customer_success** - Customer Success
20. **employee** - Employee
21. **contractor** - Contractor
22. **intern** - Intern

See [Role Permissions Matrix](./docs/ROLE_PERMISSIONS_MATRIX.md) for complete details.

---

## 🔒 Security Features

- ✅ JWT-based authentication
- ✅ Password hashing (bcrypt)
- ✅ Two-factor authentication (2FA/MFA)
- ✅ Field-level encryption
- ✅ Role-based access control (RBAC)
- ✅ API rate limiting
- ✅ Session management
- ✅ Comprehensive audit logging
- ✅ Password policies
- ✅ CORS protection
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection

---

## 🚀 Deployment Options

### Docker Deployment
- Development mode with hot reload
- Production mode with optimized builds
- Health checks for all services
- Resource limits configured
- Automated backups

### VPS Deployment
- Complete VPS setup guides
- Domain and DNS configuration
- SSL certificate setup
- Production optimization

### Cloud Deployment
- Docker-ready for any cloud provider
- Environment-based configuration
- Scalable architecture

---

## 📈 Performance

- **Redis Caching** - Reduces database load
- **Connection Pooling** - Efficient database connections
- **Code Splitting** - Optimized bundle sizes
- **Lazy Loading** - On-demand component loading
- **Database Indexing** - Optimized queries
- **CDN Ready** - Static asset optimization

---

## 🧪 Testing

- Unit tests with Jest
- Integration tests
- API endpoint testing
- Database migration testing
- See [Testing Documentation](./docs/testing/) for details

---

## 🤝 Contributing

This is a private project. For internal contributions, please follow the development guidelines in `docs/development.md`.

---

## 📄 License

Private - All rights reserved.

---

## 📞 Support

For issues, questions, or contributions:
- Check the [Documentation](./docs/) folder
- Review [Bug Fixes](./docs/fixes/) for known issues
- See [Implementation Status](./docs/status/) for current progress

---

**Status:** 🟢 Production Ready - PostgreSQL Multi-Tenant ERP  
**Last Updated:** January 2025  
**Version:** 1.0.0  
**Modules Implemented:** 16/16 ✅  
**Database Tables:** 93+  
**API Routes:** 38 route files  
**Frontend Components:** 177 files  
**Backend Services:** 36 services
