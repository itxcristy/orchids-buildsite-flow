#!/bin/bash

# ============================================================================
# BuildFlow ERP - Super Admin Creation Script
# ============================================================================
# This script creates a super admin user in the buildflow_db database
# Database: buildflow_db
# User: postgres
# Password: admin
# ============================================================================

set -e

# Database connection details
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-postgres}"
PG_PASSWORD="${PG_PASSWORD:-admin}"
PG_DATABASE="${PG_DATABASE:-buildflow_db}"

# Super admin credentials (can be overridden via environment variables)
SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:-super@buildflow.local}"
SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-super123}"
SUPER_ADMIN_NAME="${SUPER_ADMIN_NAME:-Super Administrator}"

echo "============================================================================"
echo "BuildFlow ERP - Super Admin Creation"
echo "============================================================================"
echo "Database: $PG_DATABASE"
echo "Host: $PG_HOST:$PG_PORT"
echo "User: $PG_USER"
echo "Super Admin Email: $SUPER_ADMIN_EMAIL"
echo "============================================================================"
echo ""

# Function to print colored output
print_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# Check if PostgreSQL is accessible
print_info "Checking database connection..."
if ! PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "SELECT 1;" > /dev/null 2>&1; then
    print_error "Cannot connect to database. Please check your connection settings."
    exit 1
fi
print_success "Database connection successful"

# Ensure required extensions exist
print_info "Ensuring required extensions..."
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" << EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOF
print_success "Extensions verified"

# Ensure users table exists
print_info "Checking users table..."
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" << EOF
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email_confirmed BOOLEAN DEFAULT false,
    email_confirmed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
EOF
print_success "Users table verified"

# Ensure profiles table exists
print_info "Checking profiles table..."
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" << EOF
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone_number TEXT,
    address TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
EOF
print_success "Profiles table verified"

# Ensure user_roles table exists (for main database)
print_info "Checking user_roles table..."
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" << EOF
-- Create app_role enum if it doesn't exist
DO \$\$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM (
            'super_admin', 'admin', 'hr', 'finance_manager', 'cfo', 'ceo', 
            'project_manager', 'employee', 'contractor', 'intern'
        );
    END IF;
END \$\$;

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    agency_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, role, agency_id)
);
EOF
print_success "User roles table verified"

# Create super admin user
print_info "Creating super admin user..."
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" << EOF
-- Create or update super admin user
INSERT INTO public.users (email, password_hash, email_confirmed, email_confirmed_at, is_active)
VALUES (
  '$SUPER_ADMIN_EMAIL',
  crypt('$SUPER_ADMIN_PASSWORD', gen_salt('bf')),
  true,
  now(),
  true
) ON CONFLICT (email) 
DO UPDATE SET 
  password_hash = crypt('$SUPER_ADMIN_PASSWORD', gen_salt('bf')),
  email_confirmed = true,
  email_confirmed_at = now(),
  is_active = true,
  updated_at = now();

-- Get admin user ID and create/update profile
DO \$\$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM public.users WHERE email = '$SUPER_ADMIN_EMAIL';
  
  IF admin_id IS NOT NULL THEN
    -- Create or update profile
    INSERT INTO public.profiles (id, user_id, full_name, is_active)
    VALUES (gen_random_uuid(), admin_id, '$SUPER_ADMIN_NAME', true)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      full_name = '$SUPER_ADMIN_NAME',
      is_active = true,
      updated_at = now();
    
    -- Create or update super_admin role (with NULL agency_id for system-level admin)
    INSERT INTO public.user_roles (user_id, role, agency_id)
    VALUES (admin_id, 'super_admin'::public.app_role, NULL)
    ON CONFLICT (user_id, role, agency_id) DO NOTHING;
    
    RAISE NOTICE 'Super admin user created/updated: %', admin_id;
  END IF;
END \$\$;
EOF

if [ $? -eq 0 ]; then
    print_success "Super admin user created successfully!"
    echo ""
    echo "============================================================================"
    echo "Super Admin Credentials"
    echo "============================================================================"
    echo "Email:    $SUPER_ADMIN_EMAIL"
    echo "Password: $SUPER_ADMIN_PASSWORD"
    echo ""
    echo "Login URL: http://localhost:8080/auth"
    echo "System Dashboard: http://localhost:8080/system"
    echo "============================================================================"
else
    print_error "Failed to create super admin user"
    exit 1
fi

