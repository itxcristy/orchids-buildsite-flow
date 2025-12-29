# 📍 Migration SQL Files Location

## Current Location

All PostgreSQL migration SQL files are located in:

```
database/migrations/
```

## Files Created

The migration files are being recreated based on your actual database schema. They will be:

1. **01_core_schema.sql** - Core tables (agencies, users, profiles, user_roles, audit_logs) ✅ Created
2. **02_hr_schema.sql** - HR tables (employee_details, departments, etc.)
3. **03_attendance_payroll_schema.sql** - Attendance and payroll tables
4. **04_projects_tasks_schema.sql** - Projects and tasks tables
5. **05_financial_schema.sql** - Financial tables (clients, invoices, etc.)
6. **06_crm_schema.sql** - CRM tables (leads, crm_activities, etc.)
7. **07_gst_calendar_schema.sql** - GST and calendar tables
8. **08_system_schema.sql** - System tables (agency_settings, notifications, etc.)

## Status

✅ **01_core_schema.sql** - Created and matches your database schema
⏳ **Remaining files** - Being created based on actual database structure

## How to Use

Run migrations in order:

```bash
psql -U postgres -d buildflow_db -f database/migrations/01_core_schema.sql
psql -U postgres -d buildflow_db -f database/migrations/02_hr_schema.sql
# ... and so on
```

Or use PowerShell:

```powershell
$env:PGPASSWORD='admin'
Get-Content database/migrations/01_core_schema.sql | psql -U postgres -d buildflow_db
```

## Note

These migration files are being generated based on your **actual database schema** to ensure they match exactly what you have in your PostgreSQL database.
