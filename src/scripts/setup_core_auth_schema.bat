@echo off
REM ============================================================================
REM Core Authentication Schema Setup Script (Windows)
REM 
REM This script sets up the core authentication and user management schema
REM for the BuildFlow Agency Management System
REM
REM Usage: setup_core_auth_schema.bat [options]
REM Options:
REM   -h HOST           PostgreSQL host (default: localhost)
REM   -p PORT           PostgreSQL port (default: 5432)
REM   -u USER           PostgreSQL user (default: postgres)
REM   -d DATABASE       Database name (default: buildflow_db)
REM   -f FILE           Migration file path (default: database\migrations\01_core_schema.sql)
REM   --verify-only     Only verify schema, don't create
REM   --help            Show this help message
REM ============================================================================

setlocal enabledelayedexpansion

REM Default values
set "PG_HOST=localhost"
set "PG_PORT=5432"
set "PG_USER=postgres"
set "PG_DATABASE=buildflow_db"
set "MIGRATION_FILE=database\migrations\01_core_schema.sql"
set "VERIFY_ONLY=false"

REM Parse command line arguments
:parse_args
if "%1"=="" goto args_done
if "%1"=="-h" (
    set "PG_HOST=%2"
    shift
    shift
    goto parse_args
)
if "%1"=="-p" (
    set "PG_PORT=%2"
    shift
    shift
    goto parse_args
)
if "%1"=="-u" (
    set "PG_USER=%2"
    shift
    shift
    goto parse_args
)
if "%1"=="-d" (
    set "PG_DATABASE=%2"
    shift
    shift
    goto parse_args
)
if "%1"=="-f" (
    set "MIGRATION_FILE=%2"
    shift
    shift
    goto parse_args
)
if "%1"=="--verify-only" (
    set "VERIFY_ONLY=true"
    shift
    goto parse_args
)
if "%1"=="--help" (
    call :print_help
    exit /b 0
)
shift
goto parse_args

:args_done

REM Print header
echo.
echo ==========================================
echo Core Authentication Schema Setup
echo ==========================================
echo.

echo Configuration:
echo   Host: %PG_HOST%
echo   Port: %PG_PORT%
echo   User: %PG_USER%
echo   Database: %PG_DATABASE%
echo   Migration File: %MIGRATION_FILE%
echo.

REM Check PostgreSQL connection
call :check_connection
if errorlevel 1 exit /b 1
echo.

REM Check migration file
call :check_migration_file
if errorlevel 1 exit /b 1
echo.

if "%VERIFY_ONLY%"=="true" (
    echo Running in verify-only mode
    call :verify_schema
) else (
    REM Create schema
    call :create_schema
    if errorlevel 1 exit /b 1
    echo.
    
    REM Verify schema
    call :verify_schema
    echo.
    
    REM Ask to create test user
    set /p CREATE_TEST="Create test admin user? (y/n): "
    if /i "!CREATE_TEST!"=="y" (
        call :create_test_user
        echo.
    )
)

echo.
echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Review the schema documentation: CORE_AUTH_SCHEMA_DOCUMENTATION.md
echo 2. Create remaining tables from the migration plan
echo 3. Set up remaining database tables
echo 4. Update application configuration
echo 5. Test thoroughly before production deployment
echo.

exit /b 0

REM ============================================================================
REM Functions
REM ============================================================================

:print_help
echo Core Authentication Schema Setup Script
echo.
echo Usage: setup_core_auth_schema.bat [options]
echo.
echo Options:
echo   -h HOST           PostgreSQL host (default: localhost)
echo   -p PORT           PostgreSQL port (default: 5432)
echo   -u USER           PostgreSQL user (default: postgres)
echo   -d DATABASE       Database name (default: buildflow_db)
echo   -f FILE           Migration file path (default: database\migrations\01_core_schema.sql)
echo   --verify-only     Only verify schema, don't create
echo   --help            Show this help message
echo.
echo Examples:
echo   REM Setup with default settings
echo   setup_core_auth_schema.bat
echo.
echo   REM Setup with custom host and database
echo   setup_core_auth_schema.bat -h db.example.com -d production_db
echo.
echo   REM Verify existing schema
echo   setup_core_auth_schema.bat --verify-only
echo.
exit /b 0

:check_connection
echo [INFO] Checking PostgreSQL connection...

REM Try to connect to PostgreSQL
psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DATABASE% -c "SELECT 1" >nul 2>&1

if errorlevel 1 (
    echo [ERROR] Failed to connect to PostgreSQL
    echo [ERROR] Host: %PG_HOST%
    echo [ERROR] Port: %PG_PORT%
    echo [ERROR] User: %PG_USER%
    echo [ERROR] Database: %PG_DATABASE%
    exit /b 1
)

echo [SUCCESS] PostgreSQL connection successful
exit /b 0

:check_migration_file
echo [INFO] Checking migration file...

if not exist "%MIGRATION_FILE%" (
    echo [ERROR] Migration file not found: %MIGRATION_FILE%
    exit /b 1
)

echo [SUCCESS] Migration file found: %MIGRATION_FILE%
exit /b 0

:verify_schema
echo [INFO] Verifying schema...

REM Check tables
echo [INFO] Checking tables...
for /f %%i in ('psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DATABASE% -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'profiles', 'user_roles', 'employee_details', 'employee_salary_details', 'employee_files', 'audit_logs')"') do set TABLES=%%i

if "%TABLES%"=="7" (
    echo [SUCCESS] All 7 tables exist
) else (
    echo [WARNING] Expected 7 tables, found %TABLES%
)

REM Check functions
echo [INFO] Checking functions...
for /f %%i in ('psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DATABASE% -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'"') do set FUNCTIONS=%%i

echo [SUCCESS] Found %FUNCTIONS% functions

REM Check triggers
echo [INFO] Checking triggers...
for /f %%i in ('psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DATABASE% -t -c "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public'"') do set TRIGGERS=%%i

echo [SUCCESS] Found %TRIGGERS% triggers

REM Check RLS policies
echo [INFO] Checking RLS policies...
for /f %%i in ('psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DATABASE% -t -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'"') do set RLS_POLICIES=%%i

echo [SUCCESS] Found %RLS_POLICIES% RLS policies

REM Check indexes
echo [INFO] Checking indexes...
for /f %%i in ('psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DATABASE% -t -c "SELECT COUNT(*) FROM pg_stat_user_indexes WHERE schemaname = 'public'"') do set INDEXES=%%i

echo [SUCCESS] Found %INDEXES% indexes

exit /b 0

:create_schema
echo [INFO] Creating core authentication schema...

psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DATABASE% -f "%MIGRATION_FILE%"

if errorlevel 1 (
    echo [ERROR] Failed to create schema
    exit /b 1
)

echo [SUCCESS] Schema created successfully
exit /b 0

:create_test_user
echo [INFO] Creating test admin user...

psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DATABASE% << EOF
-- Create test admin user
INSERT INTO public.users (email, password_hash, email_confirmed, email_confirmed_at, is_active)
VALUES (
  'admin@buildflow.local',
  crypt('admin123', gen_salt('bf')),
  true,
  now(),
  true
) ON CONFLICT (email) DO NOTHING;

-- Get admin user ID and create profile
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM public.users WHERE email = 'admin@buildflow.local';
  
  IF admin_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, full_name, is_active)
    VALUES (admin_id, 'System Administrator', true)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_id, 'super_admin'::public.app_role)
    ON CONFLICT (user_id, role, agency_id) DO NOTHING;
  END IF;
END $$;
EOF

echo [SUCCESS] Test admin user created (email: admin@buildflow.local, password: admin123)
exit /b 0
