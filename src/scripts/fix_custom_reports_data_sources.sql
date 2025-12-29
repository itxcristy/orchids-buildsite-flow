-- Fix custom_reports table: Add missing columns that the frontend expects
-- This script adds data_sources, user_id, is_scheduled, and other missing columns

DO $$
BEGIN
  -- Add agency_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'custom_reports' 
    AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE public.custom_reports ADD COLUMN agency_id UUID;
    CREATE INDEX IF NOT EXISTS idx_custom_reports_agency_id ON public.custom_reports(agency_id);
    RAISE NOTICE 'Added agency_id column to custom_reports';
  END IF;

  -- Add user_id if it doesn't exist (for compatibility with frontend)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'custom_reports' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.custom_reports ADD COLUMN user_id UUID REFERENCES public.users(id);
    CREATE INDEX IF NOT EXISTS idx_custom_reports_user_id ON public.custom_reports(user_id);
    RAISE NOTICE 'Added user_id column to custom_reports';
  END IF;

  -- Add data_sources if it doesn't exist (TEXT[] for array of strings)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'custom_reports' 
    AND column_name = 'data_sources'
  ) THEN
    ALTER TABLE public.custom_reports ADD COLUMN data_sources TEXT[] DEFAULT '{}';
    RAISE NOTICE 'Added data_sources column to custom_reports';
  END IF;

  -- Add is_public if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'custom_reports' 
    AND column_name = 'is_public'
  ) THEN
    ALTER TABLE public.custom_reports ADD COLUMN is_public BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added is_public column to custom_reports';
  END IF;

  -- Add is_scheduled if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'custom_reports' 
    AND column_name = 'is_scheduled'
  ) THEN
    ALTER TABLE public.custom_reports ADD COLUMN is_scheduled BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added is_scheduled column to custom_reports';
  END IF;

  -- Add filters if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'custom_reports' 
    AND column_name = 'filters'
  ) THEN
    ALTER TABLE public.custom_reports ADD COLUMN filters JSONB;
    RAISE NOTICE 'Added filters column to custom_reports';
  END IF;

  -- Add aggregations if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'custom_reports' 
    AND column_name = 'aggregations'
  ) THEN
    ALTER TABLE public.custom_reports ADD COLUMN aggregations JSONB;
    RAISE NOTICE 'Added aggregations column to custom_reports';
  END IF;

  -- Add group_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'custom_reports' 
    AND column_name = 'group_by'
  ) THEN
    ALTER TABLE public.custom_reports ADD COLUMN group_by TEXT[] DEFAULT '{}';
    RAISE NOTICE 'Added group_by column to custom_reports';
  END IF;

  -- Add visualizations if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'custom_reports' 
    AND column_name = 'visualizations'
  ) THEN
    ALTER TABLE public.custom_reports ADD COLUMN visualizations JSONB;
    RAISE NOTICE 'Added visualizations column to custom_reports';
  END IF;

  -- Add schedule_config if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'custom_reports' 
    AND column_name = 'schedule_config'
  ) THEN
    ALTER TABLE public.custom_reports ADD COLUMN schedule_config JSONB;
    RAISE NOTICE 'Added schedule_config column to custom_reports';
  END IF;

  RAISE NOTICE '✅ All missing columns have been added to custom_reports table';
END $$;

