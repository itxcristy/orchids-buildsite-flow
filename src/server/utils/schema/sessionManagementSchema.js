/**
 * Session Management Schema
 * Creates tables for advanced session management
 */

/**
 * Ensure session management tables exist
 */
async function ensureSessionManagementSchema(client) {
  console.log('[SQL] Ensuring session management schema...');

  // User sessions table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.user_sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      ip_address TEXT,
      user_agent TEXT,
      device_info JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      revoked_at TIMESTAMP WITH TIME ZONE
    );
    
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id, is_active, expires_at);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON public.user_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions(last_activity_at);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);
  `);

  // Session configuration table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.session_config (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      timeout INTEGER DEFAULT 86400, -- 24 hours in seconds
      max_concurrent_sessions INTEGER DEFAULT 5,
      device_tracking BOOLEAN DEFAULT true,
      require_reauth_on_sensitive BOOLEAN DEFAULT true,
      idle_timeout INTEGER DEFAULT 1800, -- 30 minutes in seconds
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_session_config_updated_at ON public.session_config;
    CREATE TRIGGER update_session_config_updated_at
      BEFORE UPDATE ON public.session_config
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);

  console.log('[SQL] ✅ Session management schema ensured');
}

module.exports = {
  ensureSessionManagementSchema,
};
