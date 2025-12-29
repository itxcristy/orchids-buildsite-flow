-- ============================================================================
-- BuildFlow ERP - Page Catalog Schema Migration
-- ============================================================================
-- This migration creates tables for dynamic page catalog management
-- Database: buildflow_db
-- Created: 2025-01-XX
-- ============================================================================

-- Enable UUID extension (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PAGE_CATALOG TABLE
-- ============================================================================
-- Master catalog of all available pages in the system
CREATE TABLE IF NOT EXISTS public.page_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'dashboard', 'management', 'finance', 'hr', 'projects', 'reports', 
        'personal', 'settings', 'system', 'inventory', 'procurement', 
        'assets', 'workflows', 'automation'
    )),
    base_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.page_catalog IS 'Master catalog of all available pages in the system';
COMMENT ON COLUMN public.page_catalog.path IS 'Route path (e.g., /projects)';
COMMENT ON COLUMN public.page_catalog.base_cost IS 'Default cost per page per month';
COMMENT ON COLUMN public.page_catalog.requires_approval IS 'Whether super admin approval is needed for this page';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_page_catalog_category ON public.page_catalog(category);
CREATE INDEX IF NOT EXISTS idx_page_catalog_is_active ON public.page_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_page_catalog_path ON public.page_catalog(path);

-- ============================================================================
-- PAGE_RECOMMENDATION_RULES TABLE
-- ============================================================================
-- Rules for automatic page recommendations based on agency characteristics
CREATE TABLE IF NOT EXISTS public.page_recommendation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.page_catalog(id) ON DELETE CASCADE,
    industry TEXT[],
    company_size TEXT[],
    primary_focus TEXT[],
    business_goals TEXT[],
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    is_required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.page_recommendation_rules IS 'Rules for automatic page recommendations based on agency characteristics';
COMMENT ON COLUMN public.page_recommendation_rules.priority IS 'Recommendation priority (1-10, higher is more important)';
COMMENT ON COLUMN public.page_recommendation_rules.is_required IS 'If true, page is mandatory for matching criteria';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_page_recommendation_rules_page_id ON public.page_recommendation_rules(page_id);
CREATE INDEX IF NOT EXISTS idx_page_recommendation_rules_priority ON public.page_recommendation_rules(priority);

-- ============================================================================
-- AGENCY_PAGE_ASSIGNMENTS TABLE
-- ============================================================================
-- Pages assigned to each agency
CREATE TABLE IF NOT EXISTS public.agency_page_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES public.page_catalog(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES public.users(id),
    cost_override NUMERIC(12,2),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_approval', 'suspended')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(agency_id, page_id)
);

COMMENT ON TABLE public.agency_page_assignments IS 'Pages assigned to each agency';
COMMENT ON COLUMN public.agency_page_assignments.cost_override IS 'Custom pricing if different from base cost';
COMMENT ON COLUMN public.agency_page_assignments.status IS 'Assignment status: active, pending_approval, or suspended';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agency_page_assignments_agency_id ON public.agency_page_assignments(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_page_assignments_page_id ON public.agency_page_assignments(page_id);
CREATE INDEX IF NOT EXISTS idx_agency_page_assignments_status ON public.agency_page_assignments(status);

-- ============================================================================
-- PAGE_PRICING_TIERS TABLE
-- ============================================================================
-- Pricing tiers for pages (different costs for different subscription tiers)
CREATE TABLE IF NOT EXISTS public.page_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.page_catalog(id) ON DELETE CASCADE,
    tier_name TEXT NOT NULL,
    cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(page_id, tier_name)
);

COMMENT ON TABLE public.page_pricing_tiers IS 'Pricing tiers for pages (e.g., starter, professional, enterprise)';
COMMENT ON COLUMN public.page_pricing_tiers.tier_name IS 'Subscription tier name (e.g., starter, professional, enterprise)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_page_pricing_tiers_page_id ON public.page_pricing_tiers(page_id);
CREATE INDEX IF NOT EXISTS idx_page_pricing_tiers_tier_name ON public.page_pricing_tiers(tier_name);

-- ============================================================================
-- AGENCY_PAGE_REQUESTS TABLE
-- ============================================================================
-- Requests from agencies for additional pages
CREATE TABLE IF NOT EXISTS public.agency_page_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES public.page_catalog(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reason TEXT,
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agency_page_requests IS 'Requests from agencies for additional pages';
COMMENT ON COLUMN public.agency_page_requests.reason IS 'Why the agency needs this page';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agency_page_requests_agency_id ON public.agency_page_requests(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_page_requests_page_id ON public.agency_page_requests(page_id);
CREATE INDEX IF NOT EXISTS idx_agency_page_requests_status ON public.agency_page_requests(status);
CREATE INDEX IF NOT EXISTS idx_agency_page_requests_requested_by ON public.agency_page_requests(requested_by);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_page_catalog_updated_at
    BEFORE UPDATE ON public.page_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_recommendation_rules_updated_at
    BEFORE UPDATE ON public.page_recommendation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agency_page_assignments_updated_at
    BEFORE UPDATE ON public.agency_page_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_pricing_tiers_updated_at
    BEFORE UPDATE ON public.page_pricing_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agency_page_requests_updated_at
    BEFORE UPDATE ON public.agency_page_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

