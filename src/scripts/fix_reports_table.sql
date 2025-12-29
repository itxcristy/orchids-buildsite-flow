-- Fix reports table schema to match code expectations
-- This script adds missing columns and renames 'type' to 'report_type'

-- Rename 'type' to 'report_type' if 'type' exists and 'report_type' doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reports' 
    AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reports' 
    AND column_name = 'report_type'
  ) THEN
    ALTER TABLE public.reports RENAME COLUMN type TO report_type;
  END IF;
END $$;

-- Add report_type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reports' 
    AND column_name = 'report_type'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN report_type TEXT NOT NULL DEFAULT 'custom';
  END IF;
END $$;

-- Add file_name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reports' 
    AND column_name = 'file_name'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN file_name TEXT;
  END IF;
END $$;

-- Add file_size if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reports' 
    AND column_name = 'file_size'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN file_size BIGINT;
  END IF;
END $$;

-- Add expires_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reports' 
    AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add is_public if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reports' 
    AND column_name = 'is_public'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN is_public BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add agency_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reports' 
    AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN agency_id UUID;
    CREATE INDEX IF NOT EXISTS idx_reports_agency_id ON public.reports(agency_id);
  END IF;
END $$;

-- Verify the schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'reports' 
ORDER BY ordinal_position;
