/**
 * Slack Integration Schema
 * 
 * Manages:
 * - slack_integrations: Slack workspace connections per agency
 * - slack_channel_mappings: Mapping between internal channels and Slack channels
 * - slack_message_sync: Message synchronization tracking
 * 
 * Dependencies:
 * - message_channels (for channel mappings)
 * - users (for user_id references)
 * - Requires update_updated_at_column() function (from sharedFunctions)
 */

/**
 * Ensure slack_integrations table exists
 */
async function ensureSlackIntegrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.slack_integrations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      workspace_id TEXT NOT NULL,
      workspace_name TEXT NOT NULL,
      team_id TEXT NOT NULL,
      bot_token TEXT NOT NULL,
      bot_user_id TEXT,
      bot_scopes TEXT[],
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TIMESTAMP WITH TIME ZONE,
      webhook_url TEXT,
      signing_secret TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sync_enabled BOOLEAN NOT NULL DEFAULT true,
      sync_direction TEXT NOT NULL DEFAULT 'bidirectional' CHECK (sync_direction IN ('bidirectional', 'to_slack', 'from_slack', 'disabled')),
      created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      last_sync_at TIMESTAMP WITH TIME ZONE,
      settings JSONB DEFAULT '{}'::jsonb
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_slack_integrations_workspace_id ON public.slack_integrations(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_slack_integrations_team_id ON public.slack_integrations(team_id);
    CREATE INDEX IF NOT EXISTS idx_slack_integrations_is_active ON public.slack_integrations(is_active);
    CREATE INDEX IF NOT EXISTS idx_slack_integrations_created_by ON public.slack_integrations(created_by);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_slack_integrations_updated_at ON public.slack_integrations;
    CREATE TRIGGER update_slack_integrations_updated_at
      BEFORE UPDATE ON public.slack_integrations
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure slack_channel_mappings table exists
 */
async function ensureSlackChannelMappingsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.slack_channel_mappings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      integration_id UUID NOT NULL REFERENCES public.slack_integrations(id) ON DELETE CASCADE,
      internal_channel_id UUID NOT NULL REFERENCES public.message_channels(id) ON DELETE CASCADE,
      slack_channel_id TEXT NOT NULL,
      slack_channel_name TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sync_enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE(integration_id, internal_channel_id),
      UNIQUE(integration_id, slack_channel_id)
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_slack_channel_mappings_integration_id ON public.slack_channel_mappings(integration_id);
    CREATE INDEX IF NOT EXISTS idx_slack_channel_mappings_internal_channel_id ON public.slack_channel_mappings(internal_channel_id);
    CREATE INDEX IF NOT EXISTS idx_slack_channel_mappings_slack_channel_id ON public.slack_channel_mappings(slack_channel_id);
    CREATE INDEX IF NOT EXISTS idx_slack_channel_mappings_is_active ON public.slack_channel_mappings(is_active);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_slack_channel_mappings_updated_at ON public.slack_channel_mappings;
    CREATE TRIGGER update_slack_channel_mappings_updated_at
      BEFORE UPDATE ON public.slack_channel_mappings
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure slack_message_sync table exists
 */
async function ensureSlackMessageSyncTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.slack_message_sync (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      integration_id UUID NOT NULL REFERENCES public.slack_integrations(id) ON DELETE CASCADE,
      internal_message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
      slack_message_ts TEXT NOT NULL,
      slack_channel_id TEXT NOT NULL,
      sync_direction TEXT NOT NULL CHECK (sync_direction IN ('to_slack', 'from_slack')),
      synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE(integration_id, internal_message_id),
      UNIQUE(integration_id, slack_message_ts, slack_channel_id)
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_slack_message_sync_integration_id ON public.slack_message_sync(integration_id);
    CREATE INDEX IF NOT EXISTS idx_slack_message_sync_internal_message_id ON public.slack_message_sync(internal_message_id);
    CREATE INDEX IF NOT EXISTS idx_slack_message_sync_slack_message_ts ON public.slack_message_sync(slack_message_ts);
    CREATE INDEX IF NOT EXISTS idx_slack_message_sync_synced_at ON public.slack_message_sync(synced_at DESC);
  `);
}

/**
 * Ensure slack_user_mappings table exists
 */
async function ensureSlackUserMappingsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.slack_user_mappings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      integration_id UUID NOT NULL REFERENCES public.slack_integrations(id) ON DELETE CASCADE,
      internal_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      slack_user_id TEXT NOT NULL,
      slack_user_name TEXT,
      slack_user_email TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE(integration_id, internal_user_id),
      UNIQUE(integration_id, slack_user_id)
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_slack_user_mappings_integration_id ON public.slack_user_mappings(integration_id);
    CREATE INDEX IF NOT EXISTS idx_slack_user_mappings_internal_user_id ON public.slack_user_mappings(internal_user_id);
    CREATE INDEX IF NOT EXISTS idx_slack_user_mappings_slack_user_id ON public.slack_user_mappings(slack_user_id);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_slack_user_mappings_updated_at ON public.slack_user_mappings;
    CREATE TRIGGER update_slack_user_mappings_updated_at
      BEFORE UPDATE ON public.slack_user_mappings
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure all Slack integration tables
 */
async function ensureSlackIntegrationSchema(client) {
  console.log('[SQL] Ensuring Slack integration schema...');
  
  await ensureSlackIntegrationsTable(client);
  await ensureSlackChannelMappingsTable(client);
  await ensureSlackMessageSyncTable(client);
  await ensureSlackUserMappingsTable(client);
  
  console.log('[SQL] ✅ Slack integration schema ensured');
}

module.exports = {
  ensureSlackIntegrationSchema,
  ensureSlackIntegrationsTable,
  ensureSlackChannelMappingsTable,
  ensureSlackMessageSyncTable,
  ensureSlackUserMappingsTable,
};

