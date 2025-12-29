-- Migration: Add Two-Factor Authentication (2FA) Support
-- Date: January 2025
-- Description: Adds 2FA fields to users table for enhanced security

-- Add 2FA columns to users table
DO $$ 
BEGIN
  -- Add two_factor_secret column (stores the TOTP secret in base32 format)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'two_factor_secret'
  ) THEN
    ALTER TABLE public.users ADD COLUMN two_factor_secret TEXT;
    RAISE NOTICE 'Added two_factor_secret column';
  END IF;

  -- Add two_factor_enabled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'two_factor_enabled'
  ) THEN
    ALTER TABLE public.users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added two_factor_enabled column';
  END IF;

  -- Add recovery_codes column (stores JSON array of backup codes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'recovery_codes'
  ) THEN
    ALTER TABLE public.users ADD COLUMN recovery_codes TEXT[];
    RAISE NOTICE 'Added recovery_codes column';
  END IF;

  -- Add two_factor_verified_at column (tracks when 2FA was last verified)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'two_factor_verified_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN two_factor_verified_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added two_factor_verified_at column';
  END IF;

  -- Create index on two_factor_enabled for faster queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND indexname = 'idx_users_two_factor_enabled'
  ) THEN
    CREATE INDEX idx_users_two_factor_enabled ON public.users(two_factor_enabled);
    RAISE NOTICE 'Created index on two_factor_enabled';
  END IF;
END $$;

-- Verify the migration
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT array_agg(required.column_name)
  INTO missing_columns
  FROM (
    SELECT unnest(ARRAY['two_factor_secret', 'two_factor_enabled', 'recovery_codes', 'two_factor_verified_at']) AS column_name
  ) AS required
  LEFT JOIN (
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name IN ('two_factor_secret', 'two_factor_enabled', 'recovery_codes', 'two_factor_verified_at')
  ) AS existing ON existing.column_name = required.column_name
  WHERE existing.column_name IS NULL;

  IF missing_columns IS NOT NULL AND array_length(missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'Migration incomplete. Missing columns: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ 2FA migration completed successfully';
  END IF;
END $$;
