/**
 * Agencies Schema
 * 
 * Manages:
 * - agency_settings: Agency-specific configuration and branding
 * 
 * Note: The 'agencies' table is in the main database, not in agency databases.
 * This module only handles agency_settings which exists in each agency database.
 * 
 * Dependencies:
 * - None (foundational table)
 */

/**
 * Ensure agency_settings table exists
 */
async function ensureAgencySettingsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.agency_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_name TEXT,
      logo_url TEXT,
      setup_complete BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Ensure extended branding/config columns exist on agency_settings
  await client.query(`
    DO $$
    BEGIN
      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS domain TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS default_currency TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS primary_color TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS secondary_color TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS working_hours_start TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS working_hours_end TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS working_days TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS company_tagline TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS industry TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS business_type TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS legal_name TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS phone TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS email TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS website TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS currency TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS timezone TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS address_street TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS address_city TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS address_state TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS address_zip TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS address_country TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS employee_count TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS founded_year TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS description TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;

      BEGIN
        ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS enable_gst BOOLEAN DEFAULT false;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;
    END $$;
  `);

  // Insert default agency settings if none exist
  await client.query(`
    INSERT INTO public.agency_settings (id, agency_name, setup_complete)
    VALUES (gen_random_uuid(), 'My Agency', false)
    ON CONFLICT DO NOTHING
  `);
}

/**
 * Ensure all agency-related tables
 */
async function ensureAgenciesSchema(client) {
  console.log('[SQL] Ensuring agencies schema...');
  
  await ensureAgencySettingsTable(client);
  
  console.log('[SQL] ✅ Agencies schema ensured');
}

module.exports = {
  ensureAgenciesSchema,
  ensureAgencySettingsTable,
};
