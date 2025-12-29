@echo off
REM ============================================================================
REM BuildFlow ERP - Super Admin Creation Script (Windows)
REM ============================================================================
REM This script creates a super admin user in the buildflow_db database
REM Database: buildflow_db
REM User: postgres
REM Password: admin
REM ============================================================================

setlocal enabledelayedexpansion

REM Database connection details
if "%PG_HOST%"=="" set PG_HOST=localhost
if "%PG_PORT%"=="" set PG_PORT=5432
if "%PG_USER%"=="" set PG_USER=postgres
if "%PG_PASSWORD%"=="" set PG_PASSWORD=admin
if "%PG_DATABASE%"=="" set PG_DATABASE=buildflow_db

REM Super admin credentials
if "%SUPER_ADMIN_EMAIL%"=="" set SUPER_ADMIN_EMAIL=super@buildflow.local
if "%SUPER_ADMIN_PASSWORD%"=="" set SUPER_ADMIN_PASSWORD=super123
if "%SUPER_ADMIN_NAME%"=="" set SUPER_ADMIN_NAME=Super Administrator

echo ============================================================================
echo BuildFlow ERP - Super Admin Creation
echo ============================================================================
echo Database: %PG_DATABASE%
echo Host: %PG_HOST%:%PG_PORT%
echo User: %PG_USER%
echo Super Admin Email: %SUPER_ADMIN_EMAIL%
echo ============================================================================
echo.

REM Check if PostgreSQL is accessible
echo [INFO] Checking database connection...
set PGPASSWORD=%PG_PASSWORD%
psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DATABASE% -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Cannot connect to database. Please check your connection settings.
    exit /b 1
)
echo [SUCCESS] Database connection successful

REM Ensure required extensions
echo [INFO] Ensuring required extensions...
psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DATABASE% -c "CREATE EXTENSION IF NOT EXISTS ""uuid-ossp""; CREATE EXTENSION IF NOT EXISTS ""pgcrypto"";" >nul 2>&1
echo [SUCCESS] Extensions verified

REM Create super admin user
echo [INFO] Creating super admin user...
psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DATABASE% -c "INSERT INTO public.users (email, password_hash, email_confirmed, email_confirmed_at, is_active) VALUES ('%SUPER_ADMIN_EMAIL%', crypt('%SUPER_ADMIN_PASSWORD%', gen_salt('bf')), true, now(), true) ON CONFLICT (email) DO UPDATE SET password_hash = crypt('%SUPER_ADMIN_PASSWORD%', gen_salt('bf')), email_confirmed = true, email_confirmed_at = now(), is_active = true, updated_at = now();" >nul 2>&1

REM Create profile and role
psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DATABASE% << EOF
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM public.users WHERE email = '%SUPER_ADMIN_EMAIL%';
  
  IF admin_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, user_id, full_name, is_active)
    VALUES (gen_random_uuid(), admin_id, '%SUPER_ADMIN_NAME%', true)
    ON CONFLICT (user_id) DO UPDATE SET full_name = '%SUPER_ADMIN_NAME%', is_active = true, updated_at = now();
    
    INSERT INTO public.user_roles (user_id, role, agency_id)
    VALUES (admin_id, 'super_admin'::public.app_role, NULL)
    ON CONFLICT (user_id, role, agency_id) DO NOTHING;
  END IF;
END $$;
EOF

if errorlevel 1 (
    echo [ERROR] Failed to create super admin user
    exit /b 1
)

echo [SUCCESS] Super admin user created successfully!
echo.
echo ============================================================================
echo Super Admin Credentials
echo ============================================================================
echo Email:    %SUPER_ADMIN_EMAIL%
echo Password: %SUPER_ADMIN_PASSWORD%
echo.
echo Login URL: http://localhost:8080/auth
echo System Dashboard: http://localhost:8080/system
echo ============================================================================

endlocal

