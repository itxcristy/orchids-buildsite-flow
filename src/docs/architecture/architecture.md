# System Architecture

## Overview

BuildFlow is a **multi-tenant SaaS ERP platform** designed for construction and agency management. The system supports multiple companies (agencies) with complete data isolation.

## Architecture Layers

### 1. Frontend (React + TypeScript)
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **UI Library:** TailwindCSS + Shadcn/ui components
- **State Management:** Zustand + React Query
- **Forms:** React Hook Form with Zod validation

### 2. Backend API (Express.js)
- **Server:** Node.js with Express
- **Database:** PostgreSQL (buildflow_db)
- **Authentication:** JWT tokens with bcrypt password hashing
- **API Routing:** RESTful endpoints with agency-specific database routing

### 3. Database Layer
- **Primary Database:** PostgreSQL (buildflow_db)
- **Multi-Tenancy:** Each agency has isolated data via `agency_id` column
- **Connection:** Direct PostgreSQL connection with connection pooling

## Multi-Tenancy Architecture

### How It Works

1. **Main Database (buildflow_db)**
   - Stores agency metadata in `agencies` table
   - Each agency has a unique `id` (UUID) and `database_name`
   - Tracks subscription plans and settings

2. **Agency-Specific Data**
   - All business data tables include `agency_id` column
   - Data is filtered by `agency_id` automatically
   - Complete isolation between agencies

3. **Authentication Flow**
   - User logs in with email/password
   - Backend searches across all agency databases
   - Returns user profile with `agency_id` and `agency_database`
   - Frontend stores `agency_id` in localStorage

4. **API Requests**
   - Frontend sends `X-Agency-Database` header with each request
   - Backend routes to correct database based on header
   - All queries automatically filter by `agency_id`

## Database Structure

### Core Tables (53 Total)

**Authentication & Users:**
- `users` - User accounts
- `profiles` - User profiles with agency_id
- `user_roles` - Role assignments per agency
- `employee_details` - Employee information
- `audit_logs` - System audit trail

**Agencies:**
- `agencies` - Agency/company records
- `agency_settings` - Agency-specific configuration

**HR & Attendance:**
- `departments` - Organizational departments
- `team_assignments` - User-department relationships
- `attendance` - Daily attendance tracking
- `leave_requests` - Leave management
- `payroll` - Payroll processing

**Projects & Tasks:**
- `projects` - Project records
- `tasks` - Task management
- `job_categories` - Job costing categories
- `jobs` - Job records

**Financial:**
- `clients` - Client records
- `invoices` - Invoice management
- `quotations` - Quotation system
- `chart_of_accounts` - Accounting structure
- `journal_entries` - Financial transactions

**CRM:**
- `leads` - Lead tracking
- `crm_activities` - Activity logging
- `sales_pipeline` - Sales stages

**GST & Compliance:**
- `gst_settings` - GST configuration
- `gst_returns` - GST filings
- `gst_transactions` - Tax records

## Data Flow

```
User Login
    ↓
Backend searches all agency databases
    ↓
Returns user + agency_id + agency_database
    ↓
Frontend stores in localStorage
    ↓
All API requests include X-Agency-Database header
    ↓
Backend routes to correct database
    ↓
Queries filtered by agency_id
```

## Security

- **Password Hashing:** bcrypt with salt rounds
- **JWT Tokens:** Secure token-based authentication
- **Row-Level Security:** Database-level data isolation
- **API Authentication:** Token validation on every request
- **CORS:** Configured for frontend-backend communication

## Technology Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- TailwindCSS
- Zustand
- React Query

**Backend:**
- Node.js
- Express.js
- PostgreSQL
- JWT
- bcrypt

**Database:**
- PostgreSQL 14+
- Connection pooling
- Row-level security policies
