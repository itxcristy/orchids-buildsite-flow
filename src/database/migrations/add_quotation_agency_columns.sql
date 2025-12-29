-- ============================================================================
-- Add Missing Columns to Quotations and Quotation Templates
-- ============================================================================
-- This migration adds agency_id and other missing columns to quotations
-- and quotation_templates tables for proper multi-tenant support
-- Database: buildflow_db
-- Created: 2025-01-XX
-- ============================================================================

-- Add missing columns to quotations table
DO $$ 
BEGIN
  -- Add agency_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotations' 
    AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE public.quotations ADD COLUMN agency_id UUID;
    CREATE INDEX IF NOT EXISTS idx_quotations_agency_id ON public.quotations(agency_id);
    RAISE NOTICE 'Added agency_id column to quotations table';
  END IF;

  -- Add quote_number column (alias for quotation_number)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotations' 
    AND column_name = 'quote_number'
  ) THEN
    ALTER TABLE public.quotations ADD COLUMN quote_number TEXT;
    RAISE NOTICE 'Added quote_number column to quotations table';
  END IF;

  -- Add template_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotations' 
    AND column_name = 'template_id'
  ) THEN
    ALTER TABLE public.quotations ADD COLUMN template_id UUID;
    -- Add foreign key constraint if quotation_templates table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotation_templates') THEN
      ALTER TABLE public.quotations 
      ADD CONSTRAINT quotations_template_id_fkey 
      FOREIGN KEY (template_id) REFERENCES public.quotation_templates(id);
    END IF;
    RAISE NOTICE 'Added template_id column to quotations table';
  END IF;

  -- Add valid_until column (alias for expiry_date)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotations' 
    AND column_name = 'valid_until'
  ) THEN
    ALTER TABLE public.quotations ADD COLUMN valid_until DATE;
    RAISE NOTICE 'Added valid_until column to quotations table';
  END IF;

  -- Add tax_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotations' 
    AND column_name = 'tax_amount'
  ) THEN
    ALTER TABLE public.quotations ADD COLUMN tax_amount NUMERIC(15, 2) DEFAULT 0;
    RAISE NOTICE 'Added tax_amount column to quotations table';
  END IF;

  -- Add terms_conditions column (alias for terms_and_conditions)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotations' 
    AND column_name = 'terms_conditions'
  ) THEN
    ALTER TABLE public.quotations ADD COLUMN terms_conditions TEXT;
    RAISE NOTICE 'Added terms_conditions column to quotations table';
  END IF;
END $$;

-- Add missing columns to quotation_templates table
DO $$ 
BEGIN
  -- Add agency_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation_templates' 
    AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE public.quotation_templates ADD COLUMN agency_id UUID;
    CREATE INDEX IF NOT EXISTS idx_quotation_templates_agency_id ON public.quotation_templates(agency_id);
    RAISE NOTICE 'Added agency_id column to quotation_templates table';
  END IF;

  -- Add is_active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation_templates' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.quotation_templates ADD COLUMN is_active BOOLEAN DEFAULT true;
    CREATE INDEX IF NOT EXISTS idx_quotation_templates_is_active ON public.quotation_templates(is_active);
    -- Set existing templates to active
    UPDATE public.quotation_templates SET is_active = true WHERE is_active IS NULL;
    RAISE NOTICE 'Added is_active column to quotation_templates table';
  END IF;

  -- Add last_used column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation_templates' 
    AND column_name = 'last_used'
  ) THEN
    ALTER TABLE public.quotation_templates ADD COLUMN last_used TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added last_used column to quotation_templates table';
  END IF;
END $$;

-- Add missing columns to quotation_line_items table
DO $$ 
BEGIN
  -- Add discount_percentage column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotation_line_items' 
    AND column_name = 'discount_percentage'
  ) THEN
    ALTER TABLE public.quotation_line_items ADD COLUMN discount_percentage NUMERIC(5, 2) DEFAULT 0;
    RAISE NOTICE 'Added discount_percentage column to quotation_line_items table';
  END IF;
END $$;

-- Verify columns were added
SELECT 
  'quotations' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'quotations'
  AND column_name IN ('agency_id', 'quote_number', 'template_id', 'valid_until', 'tax_amount', 'terms_conditions')
ORDER BY column_name;

SELECT 
  'quotation_templates' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'quotation_templates'
  AND column_name IN ('agency_id', 'is_active', 'last_used')
ORDER BY column_name;

SELECT 
  'quotation_line_items' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'quotation_line_items'
  AND column_name = 'discount_percentage'
ORDER BY column_name;
