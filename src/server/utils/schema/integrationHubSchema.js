/**
 * Integration Hub Schema
 * 
 * Manages:
 * - integrations: Integration definitions and configurations
 * - integration_logs: Integration activity and execution logs
 * - api_keys: API key management (if not exists elsewhere)
 * 
 * Dependencies:
 * - Requires update_updated_at_column() function
 * - Requires log_audit_change() function
 * - Requires users table (for user references)
 * - Note: api_keys and webhooks may exist in other schemas
 */

/**
 * Ensure api_keys table exists (if not already created)
 */
async function ensureApiKeysTable(client) {
  // Check if table already exists
  const tableCheck = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'api_keys'
    );
  `);

  if (tableCheck.rows[0].exists) {
    console.log('[SQL] api_keys table already exists, skipping creation');
    return;
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.api_keys (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      key_hash TEXT NOT NULL, -- Hashed API key
      key_prefix VARCHAR(20) NOT NULL, -- First few characters for display
      permissions JSONB DEFAULT '[]'::jsonb, -- Array of permissions
      scopes JSONB DEFAULT '[]'::jsonb, -- Array of scopes
      rate_limit_per_minute INTEGER DEFAULT 60,
      rate_limit_per_hour INTEGER DEFAULT 1000,
      rate_limit_per_day INTEGER DEFAULT 10000,
      expires_at TIMESTAMP WITH TIME ZONE,
      last_used_at TIMESTAMP WITH TIME ZONE,
      usage_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      ip_whitelist TEXT[], -- Allowed IP addresses
      notes TEXT,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_api_keys_agency_id ON public.api_keys(agency_id);
    CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON public.api_keys(key_prefix);
    CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON public.api_keys(is_active);
    CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON public.api_keys(expires_at);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;
    CREATE TRIGGER update_api_keys_updated_at
      BEFORE UPDATE ON public.api_keys
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);

  // Create audit trigger
  await client.query(`
    DROP TRIGGER IF EXISTS audit_api_keys_changes ON public.api_keys;
    CREATE TRIGGER audit_api_keys_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.api_keys
      FOR EACH ROW
      EXECUTE FUNCTION public.log_audit_change();
  `);
}

/**
 * Ensure integrations table exists
 */
async function ensureIntegrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.integrations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      integration_type VARCHAR(100) NOT NULL, -- zapier, make, custom, api, webhook, etc.
      provider VARCHAR(100), -- google, microsoft, salesforce, etc.
      description TEXT,
      status VARCHAR(50) DEFAULT 'inactive', -- active, inactive, error, testing
      configuration JSONB DEFAULT '{}'::jsonb, -- Integration-specific configuration
      credentials_encrypted TEXT, -- Encrypted credentials
      webhook_url TEXT, -- For incoming webhooks
      api_endpoint TEXT, -- For API-based integrations
      authentication_type VARCHAR(50), -- oauth, api_key, basic, bearer, custom
      is_system BOOLEAN DEFAULT false, -- System integrations cannot be deleted
      sync_enabled BOOLEAN DEFAULT false,
      sync_frequency VARCHAR(50), -- real_time, hourly, daily, weekly, manual
      last_sync_at TIMESTAMP WITH TIME ZONE,
      last_sync_status VARCHAR(50), -- success, error, partial
      last_sync_error TEXT,
      error_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb, -- Additional metadata
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(agency_id, name)
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_integrations_agency_id ON public.integrations(agency_id);
    CREATE INDEX IF NOT EXISTS idx_integrations_integration_type ON public.integrations(integration_type);
    CREATE INDEX IF NOT EXISTS idx_integrations_provider ON public.integrations(provider);
    CREATE INDEX IF NOT EXISTS idx_integrations_status ON public.integrations(status);
    CREATE INDEX IF NOT EXISTS idx_integrations_is_system ON public.integrations(is_system);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_integrations_updated_at ON public.integrations;
    CREATE TRIGGER update_integrations_updated_at
      BEFORE UPDATE ON public.integrations
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);

  // Create audit trigger
  await client.query(`
    DROP TRIGGER IF EXISTS audit_integrations_changes ON public.integrations;
    CREATE TRIGGER audit_integrations_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.integrations
      FOR EACH ROW
      EXECUTE FUNCTION public.log_audit_change();
  `);
}

/**
 * Ensure integration_logs table exists
 */
async function ensureIntegrationLogsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.integration_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
      log_type VARCHAR(50) NOT NULL, -- sync, webhook, api_call, error, info
      event_type VARCHAR(100), -- data_synced, webhook_received, api_request, etc.
      status VARCHAR(50) DEFAULT 'pending', -- pending, success, error, warning
      direction VARCHAR(20), -- inbound, outbound
      request_data JSONB, -- Request payload/data
      response_data JSONB, -- Response payload/data
      error_message TEXT,
      error_stack TEXT,
      execution_time_ms INTEGER, -- Execution time in milliseconds
      records_processed INTEGER DEFAULT 0,
      records_success INTEGER DEFAULT 0,
      records_failed INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb, -- Additional metadata
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_integration_logs_agency_id ON public.integration_logs(agency_id);
    CREATE INDEX IF NOT EXISTS idx_integration_logs_integration_id ON public.integration_logs(integration_id);
    CREATE INDEX IF NOT EXISTS idx_integration_logs_log_type ON public.integration_logs(log_type);
    CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON public.integration_logs(status);
    CREATE INDEX IF NOT EXISTS idx_integration_logs_event_type ON public.integration_logs(event_type);
    CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON public.integration_logs(created_at);
  `);
}

/**
 * Ensure all integration hub tables
 */
async function ensureIntegrationHubSchema(client) {
  console.log('[SQL] Ensuring integration hub schema...');
  
  try {
    await ensureApiKeysTable(client);
    await ensureIntegrationsTable(client);
    await ensureIntegrationLogsTable(client);
    
    console.log('[SQL] ✅ Integration hub schema ensured');
  } catch (error) {
    console.error('[SQL] ❌ Error ensuring integration hub schema:', error.message);
    throw error;
  }
}

module.exports = {
  ensureIntegrationHubSchema,
  ensureApiKeysTable,
  ensureIntegrationsTable,
  ensureIntegrationLogsTable,
};

