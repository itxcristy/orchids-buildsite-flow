-- ============================================================================
-- BuildFlow ERP - Super Admin User Creation Migration
-- ============================================================================
-- This migration creates a super admin user in the buildflow_db database
-- Database: buildflow_db
-- Created: 2025-01-15
-- ============================================================================

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure users table exists
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

-- Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone_number TEXT,
    address TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure app_role enum exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM (
            'super_admin', 'admin', 'hr', 'finance_manager', 'cfo', 'ceo', 
            'project_manager', 'employee', 'contractor', 'intern'
        );
    END IF;
END $$;

-- Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    agency_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, role, agency_id)
);

-- Create super admin user (if not exists)
INSERT INTO public.users (email, password_hash, email_confirmed, email_confirmed_at, is_active)
VALUES (
  'super@buildflow.local',
  crypt('super123', gen_salt('bf')),
  true,
  now(),
  true
) ON CONFLICT (email) 
DO UPDATE SET 
  password_hash = crypt('super123', gen_salt('bf')),
  email_confirmed = true,
  email_confirmed_at = now(),
  is_active = true,
  updated_at = now();

-- Create profile and assign super_admin role
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM public.users WHERE email = 'super@buildflow.local';
  
  IF admin_id IS NOT NULL THEN
    -- Create or update profile
    INSERT INTO public.profiles (id, user_id, full_name, is_active)
    VALUES (gen_random_uuid(), admin_id, 'Super Administrator', true)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      full_name = 'Super Administrator',
      is_active = true,
      updated_at = now();
    
    -- Assign super_admin role (with NULL agency_id for system-level admin)
    INSERT INTO public.user_roles (user_id, role, agency_id)
    VALUES (admin_id, 'super_admin'::public.app_role, NULL)
    ON CONFLICT (user_id, role, agency_id) DO NOTHING;
  END IF;
END $$;

COMMENT ON TABLE public.users IS 'Main database users table for system-level authentication';
COMMENT ON TABLE public.profiles IS 'User profiles linked to users table';
COMMENT ON TABLE public.user_roles IS 'User role assignments - NULL agency_id means system-level role';

