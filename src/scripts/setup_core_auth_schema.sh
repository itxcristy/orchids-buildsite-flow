#!/bin/bash

################################################################################
# Core Authentication Schema Setup Script
# 
# This script sets up the core authentication and user management schema
# for the BuildFlow Agency Management System
#
# Usage: ./setup_core_auth_schema.sh [options]
# Options:
#   -h, --host HOST           PostgreSQL host (default: localhost)
#   -p, --port PORT           PostgreSQL port (default: 5432)
#   -u, --user USER           PostgreSQL user (default: postgres)
#   -d, --database DATABASE   Database name (default: buildflow_db)
#   -f, --file FILE           Migration file path (default: database/migrations/01_core_schema.sql)
#   --verify-only             Only verify schema, don't create
#   --help                    Show this help message
#
################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PG_HOST="localhost"
PG_PORT="5432"
PG_USER="postgres"
PG_DATABASE="buildflow_db"
MIGRATION_FILE="database/migrations/01_core_schema.sql"
VERIFY_ONLY=false

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to print help
print_help() {
    cat << EOF
Core Authentication Schema Setup Script

Usage: ./setup_core_auth_schema.sh [options]

Options:
  -h, --host HOST           PostgreSQL host (default: localhost)
  -p, --port PORT           PostgreSQL port (default: 5432)
  -u, --user USER           PostgreSQL user (default: postgres)
  -d, --database DATABASE   Database name (default: buildflow_db)
  -f, --file FILE           Migration file path (default: database/migrations/01_core_schema.sql)
  --verify-only             Only verify schema, don't create
  --help                    Show this help message

Examples:
  # Setup with default settings
  ./setup_core_auth_schema.sh

  # Setup with custom host and database
  ./setup_core_auth_schema.sh -h db.example.com -d production_db

  # Verify existing schema
  ./setup_core_auth_schema.sh --verify-only

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            PG_HOST="$2"
            shift 2
            ;;
        -p|--port)
            PG_PORT="$2"
            shift 2
            ;;
        -u|--user)
            PG_USER="$2"
            shift 2
            ;;
        -d|--database)
            PG_DATABASE="$2"
            shift 2
            ;;
        -f|--file)
            MIGRATION_FILE="$2"
            shift 2
            ;;
        --verify-only)
            VERIFY_ONLY=true
            shift
            ;;
        --help)
            print_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            print_help
            exit 1
            ;;
    esac
done

# Function to check PostgreSQL connection
check_connection() {
    print_info "Checking PostgreSQL connection..."
    
    if ! PGPASSWORD="${PG_PASSWORD}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "SELECT 1" > /dev/null 2>&1; then
        print_error "Failed to connect to PostgreSQL"
        print_error "Host: $PG_HOST"
        print_error "Port: $PG_PORT"
        print_error "User: $PG_USER"
        print_error "Database: $PG_DATABASE"
        exit 1
    fi
    
    print_success "PostgreSQL connection successful"
}

# Function to check if migration file exists
check_migration_file() {
    print_info "Checking migration file..."
    
    if [ ! -f "$MIGRATION_FILE" ]; then
        print_error "Migration file not found: $MIGRATION_FILE"
        exit 1
    fi
    
    print_success "Migration file found: $MIGRATION_FILE"
}

# Function to verify schema
verify_schema() {
    print_info "Verifying schema..."
    
    # Check tables
    print_info "Checking tables..."
    TABLES=$(PGPASSWORD="${PG_PASSWORD}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'profiles', 'user_roles', 'employee_details', 'employee_salary_details', 'employee_files', 'audit_logs')
    ")
    
    if [ "$TABLES" -eq 7 ]; then
        print_success "All 7 tables exist"
    else
        print_warning "Expected 7 tables, found $TABLES"
    fi
    
    # Check functions
    print_info "Checking functions..."
    FUNCTIONS=$(PGPASSWORD="${PG_PASSWORD}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -t -c "
        SELECT COUNT(*) FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_type = 'FUNCTION'
    ")
    
    print_success "Found $FUNCTIONS functions"
    
    # Check triggers
    print_info "Checking triggers..."
    TRIGGERS=$(PGPASSWORD="${PG_PASSWORD}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -t -c "
        SELECT COUNT(*) FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    ")
    
    print_success "Found $TRIGGERS triggers"
    
    # Check RLS
    print_info "Checking RLS policies..."
    RLS_POLICIES=$(PGPASSWORD="${PG_PASSWORD}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -t -c "
        SELECT COUNT(*) FROM pg_policies 
        WHERE schemaname = 'public'
    ")
    
    print_success "Found $RLS_POLICIES RLS policies"
    
    # Check indexes
    print_info "Checking indexes..."
    INDEXES=$(PGPASSWORD="${PG_PASSWORD}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -t -c "
        SELECT COUNT(*) FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
    ")
    
    print_success "Found $INDEXES indexes"
}

# Function to create schema
create_schema() {
    print_info "Creating core authentication schema..."
    
    if PGPASSWORD="${PG_PASSWORD}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -f "$MIGRATION_FILE"; then
        print_success "Schema created successfully"
    else
        print_error "Failed to create schema"
        exit 1
    fi
}

# Function to create test user
create_test_user() {
    print_info "Creating test admin user..."
    
    PGPASSWORD="${PG_PASSWORD}" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" << EOF
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
DO \$\$
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
END \$\$;
EOF
    
    print_success "Test admin user created (email: admin@buildflow.local, password: admin123)"
}

# Main execution
main() {
    echo ""
    print_info "=========================================="
    print_info "Core Authentication Schema Setup"
    print_info "=========================================="
    echo ""
    
    print_info "Configuration:"
    print_info "  Host: $PG_HOST"
    print_info "  Port: $PG_PORT"
    print_info "  User: $PG_USER"
    print_info "  Database: $PG_DATABASE"
    print_info "  Migration File: $MIGRATION_FILE"
    echo ""
    
    # Check connection
    check_connection
    echo ""
    
    # Check migration file
    check_migration_file
    echo ""
    
    if [ "$VERIFY_ONLY" = true ]; then
        print_info "Running in verify-only mode"
        verify_schema
    else
        # Create schema
        create_schema
        echo ""
        
        # Verify schema
        verify_schema
        echo ""
        
        # Ask to create test user
        read -p "Create test admin user? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            create_test_user
            echo ""
        fi
    fi
    
    echo ""
    print_success "=========================================="
    print_success "Setup Complete!"
    print_success "=========================================="
    echo ""
    print_info "Next steps:"
    print_info "1. Review the schema documentation: CORE_AUTH_SCHEMA_DOCUMENTATION.md"
    print_info "2. Create remaining tables from the migration plan"
    print_info "3. Set up remaining database tables"
    print_info "4. Update application configuration"
    print_info "5. Test thoroughly before production deployment"
    echo ""
}

# Run main function
main
