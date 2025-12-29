/**
 * Webhooks Schema
 * 
 * Manages:
 * - webhooks: Webhook subscriptions
 * - webhook_deliveries: Webhook delivery history
 */

/**
 * Ensure webhooks table exists
 */
async function ensureWebhooksTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.webhooks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      event_type VARCHAR(100) NOT NULL, -- invoice.created, project.completed, etc.
      url TEXT NOT NULL,
      secret TEXT NOT NULL, -- For signature verification
      method VARCHAR(10) DEFAULT 'POST',
      is_active BOOLEAN DEFAULT true,
      headers JSONB, -- Custom headers
      filters JSONB, -- Event filters
      retry_count INTEGER DEFAULT 3,
      timeout_seconds INTEGER DEFAULT 30,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_webhooks_agency_id ON public.webhooks(agency_id);
    CREATE INDEX IF NOT EXISTS idx_webhooks_event_type ON public.webhooks(event_type);
    CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON public.webhooks(is_active);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_webhooks_updated_at ON public.webhooks;
    CREATE TRIGGER update_webhooks_updated_at
      BEFORE UPDATE ON public.webhooks
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure webhook_deliveries table exists
 */
async function ensureWebhookDeliveriesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
      event_type VARCHAR(100) NOT NULL,
      payload JSONB NOT NULL,
      status VARCHAR(50) DEFAULT 'pending', -- pending, delivered, failed, retrying
      response_status INTEGER,
      response_body TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      delivered_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON public.webhook_deliveries(webhook_id);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.webhook_deliveries(status);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON public.webhook_deliveries(created_at);
  `);
}

/**
 * Ensure all webhook tables
 */
async function ensureWebhooksSchema(client) {
  console.log('[SQL] Ensuring webhooks schema...');
  
  try {
    await ensureWebhooksTable(client);
    await ensureWebhookDeliveriesTable(client);
    
    console.log('[SQL] ✅ Webhooks schema ensured');
  } catch (error) {
    console.error('[SQL] ❌ Error ensuring webhooks schema:', error.message);
    throw error;
  }
}

module.exports = {
  ensureWebhooksSchema,
  ensureWebhooksTable,
  ensureWebhookDeliveriesTable,
};
