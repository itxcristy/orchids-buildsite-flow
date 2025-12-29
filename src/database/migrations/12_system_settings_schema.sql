-- ============================================================================
-- BuildFlow ERP - System Settings Schema Migration
-- ============================================================================
-- This migration creates the system_settings table for super admin configuration
-- Database: buildflow_db
-- Created: 2025-01-15
-- ============================================================================

-- ============================================================================
-- SYSTEM SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- System Identity
    system_name TEXT NOT NULL DEFAULT 'BuildFlow ERP',
    system_tagline TEXT,
    system_description TEXT,
    
    -- Branding & Logos
    logo_url TEXT,
    favicon_url TEXT,
    login_logo_url TEXT,
    email_logo_url TEXT,
    
    -- SEO Settings
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT,
    og_image_url TEXT,
    og_title TEXT,
    og_description TEXT,
    twitter_card_type TEXT DEFAULT 'summary_large_image',
    twitter_site TEXT,
    twitter_creator TEXT,
    
    -- Tagging & Analytics
    google_analytics_id TEXT,
    google_tag_manager_id TEXT,
    facebook_pixel_id TEXT,
    custom_tracking_code TEXT,
    
    -- Advertisement Settings
    ad_network_enabled BOOLEAN DEFAULT false,
    ad_network_code TEXT,
    ad_placement_header BOOLEAN DEFAULT false,
    ad_placement_sidebar BOOLEAN DEFAULT false,
    ad_placement_footer BOOLEAN DEFAULT false,
    
    -- Contact Information
    support_email TEXT,
    support_phone TEXT,
    support_address TEXT,
    
    -- Social Media Links
    facebook_url TEXT,
    twitter_url TEXT,
    linkedin_url TEXT,
    instagram_url TEXT,
    youtube_url TEXT,
    
    -- Legal & Compliance
    terms_of_service_url TEXT,
    privacy_policy_url TEXT,
    cookie_policy_url TEXT,
    
    -- System Configuration
    maintenance_mode BOOLEAN DEFAULT false,
    maintenance_message TEXT,
    default_language TEXT DEFAULT 'en',
    default_timezone TEXT DEFAULT 'UTC',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.system_settings IS 'System-wide settings for super admin configuration';
COMMENT ON COLUMN public.system_settings.system_name IS 'Main system name displayed throughout the application';
COMMENT ON COLUMN public.system_settings.logo_url IS 'Main logo URL for the system';
COMMENT ON COLUMN public.system_settings.meta_title IS 'Default meta title for SEO';
COMMENT ON COLUMN public.system_settings.google_analytics_id IS 'Google Analytics tracking ID';
COMMENT ON COLUMN public.system_settings.ad_network_enabled IS 'Enable/disable advertisement network';

-- Create unique constraint to ensure only one system settings record exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_single ON public.system_settings((1));

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system settings if none exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_settings LIMIT 1) THEN
        INSERT INTO public.system_settings (system_name, system_tagline, system_description)
        VALUES ('BuildFlow ERP', 'Complete Business Management Solution', 'A comprehensive ERP system for managing your business operations');
    END IF;
END $$;

