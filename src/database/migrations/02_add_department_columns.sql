-- ============================================================================
-- BuildFlow ERP - Add Missing Department Columns Migration
-- ============================================================================
-- This migration adds missing columns to the departments table:
-- - manager_id: Reference to profiles.user_id for department manager
-- - parent_department_id: Reference to departments.id for hierarchy
-- - budget: Department budget amount
-- - agency_id: Multi-tenant agency reference
-- ============================================================================

-- Add manager_id column (references profiles.user_id)
ALTER TABLE public.departments
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Add parent_department_id column (self-referencing for hierarchy)
ALTER TABLE public.departments
ADD COLUMN IF NOT EXISTS parent_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Add budget column
ALTER TABLE public.departments
ADD COLUMN IF NOT EXISTS budget NUMERIC(15, 2) DEFAULT 0;

-- Add agency_id column (for multi-tenant isolation)
ALTER TABLE public.departments
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON public.departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent_department_id ON public.departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_agency_id ON public.departments(agency_id);

-- Add comments for documentation
COMMENT ON COLUMN public.departments.manager_id IS 'Reference to profiles.user_id - the department manager';
COMMENT ON COLUMN public.departments.parent_department_id IS 'Reference to departments.id - parent department for hierarchy';
COMMENT ON COLUMN public.departments.budget IS 'Department budget amount in numeric format';
COMMENT ON COLUMN public.departments.agency_id IS 'Multi-tenant agency reference for data isolation';
