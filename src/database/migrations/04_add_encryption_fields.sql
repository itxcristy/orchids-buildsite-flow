-- Migration: Add Encrypted Fields Support
-- Date: January 2025
-- Description: Adds encrypted columns for sensitive data (SSN, bank accounts, etc.)

-- Note: This migration identifies tables that should have encrypted fields
-- The actual encryption is handled at the application level

-- Add encrypted SSN field to employee_details if it doesn't exist
DO $$ 
BEGIN
  -- Check if employee_details table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'employee_details'
  ) THEN
    -- Add ssn_encrypted column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'employee_details' 
      AND column_name = 'ssn_encrypted'
    ) THEN
      ALTER TABLE public.employee_details ADD COLUMN ssn_encrypted TEXT;
      RAISE NOTICE 'Added ssn_encrypted column to employee_details';
    END IF;

    -- Add bank_account_encrypted column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'employee_details' 
      AND column_name = 'bank_account_encrypted'
    ) THEN
      ALTER TABLE public.employee_details ADD COLUMN bank_account_encrypted TEXT;
      RAISE NOTICE 'Added bank_account_encrypted column to employee_details';
    END IF;

    -- Add bank_ifsc_encrypted column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'employee_details' 
      AND column_name = 'bank_ifsc_encrypted'
    ) THEN
      ALTER TABLE public.employee_details ADD COLUMN bank_ifsc_encrypted TEXT;
      RAISE NOTICE 'Added bank_ifsc_encrypted column to employee_details';
    END IF;
  END IF;
END $$;

-- Add encrypted salary field to employee_salary_details if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'employee_salary_details'
  ) THEN
    -- Add base_salary_encrypted column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'employee_salary_details' 
      AND column_name = 'base_salary_encrypted'
    ) THEN
      ALTER TABLE public.employee_salary_details ADD COLUMN base_salary_encrypted TEXT;
      RAISE NOTICE 'Added base_salary_encrypted column to employee_salary_details';
    END IF;
  END IF;
END $$;

-- Create index for encrypted fields (for searching by hash if needed)
-- Note: We can't index encrypted values directly, but we can index hashes
DO $$
BEGIN
  -- Add ssn_hash column for searching (optional, for lookup purposes)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'employee_details'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'employee_details' 
      AND column_name = 'ssn_hash'
    ) THEN
      ALTER TABLE public.employee_details ADD COLUMN ssn_hash TEXT;
      CREATE INDEX IF NOT EXISTS idx_employee_details_ssn_hash ON public.employee_details(ssn_hash);
      RAISE NOTICE 'Added ssn_hash column and index for searching';
    END IF;
  END IF;
END $$;

-- Verify migration
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  -- Check for employee_details encrypted columns
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'employee_details'
  ) THEN
    SELECT array_agg(required.column_name)
    INTO missing_columns
    FROM (
      SELECT unnest(ARRAY['ssn_encrypted', 'bank_account_encrypted', 'bank_ifsc_encrypted']) AS column_name
    ) AS required
    LEFT JOIN (
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'employee_details'
      AND column_name IN ('ssn_encrypted', 'bank_account_encrypted', 'bank_ifsc_encrypted')
    ) AS existing ON existing.column_name = required.column_name
    WHERE existing.column_name IS NULL;

    IF missing_columns IS NOT NULL AND array_length(missing_columns, 1) > 0 THEN
      RAISE WARNING 'Some encrypted columns missing in employee_details: %', array_to_string(missing_columns, ', ');
    ELSE
      RAISE NOTICE '✅ Encryption migration completed successfully for employee_details';
    END IF;
  END IF;
END $$;
