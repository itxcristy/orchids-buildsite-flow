/**
 * SSO Configuration Schema
 * Creates tables for SSO (OAuth 2.0 and SAML 2.0) configurations
 */

/**
 * Ensure SSO configurations table exists
 */
async function ensureSSOConfigurationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.sso_configurations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      provider VARCHAR(50) NOT NULL, -- 'oauth2' or 'saml2'
      provider_name VARCHAR(100) NOT NULL, -- 'google', 'microsoft', 'okta', etc.
      is_enabled BOOLEAN DEFAULT false,
      client_id TEXT,
      client_secret TEXT, -- Should be encrypted in production
      redirect_uri TEXT,
      scopes TEXT[],
      idp_entity_id TEXT, -- For SAML
      idp_login_url TEXT, -- For SAML
      idp_signing_cert TEXT, -- For SAML
      sp_entity_id TEXT, -- For SAML
      sp_private_key TEXT, -- For SAML (should be encrypted)
      acs_url TEXT, -- Assertion Consumer Service URL for SAML
      metadata_url TEXT, -- For SAML metadata
      config_data JSONB DEFAULT '{}', -- Additional provider-specific config
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(provider, provider_name)
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_sso_configurations_provider ON public.sso_configurations(provider, provider_name);
    CREATE INDEX IF NOT EXISTS idx_sso_configurations_is_enabled ON public.sso_configurations(is_enabled);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_sso_configurations_updated_at ON public.sso_configurations;
    CREATE TRIGGER update_sso_configurations_updated_at
      BEFORE UPDATE ON public.sso_configurations
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure all SSO schema tables
 */
async function ensureSSOSchema(client) {
  console.log('[SQL] Ensuring SSO schema...');
  
  await ensureSSOConfigurationsTable(client);
  
  console.log('[SQL] ✅ SSO schema ensured');
}

module.exports = {
  ensureSSOSchema,
  ensureSSOConfigurationsTable,
};
