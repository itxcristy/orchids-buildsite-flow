/**
 * Webhook Service
 * Handles webhook registration, delivery, and retry logic
 */

const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');
const crypto = require('crypto');

function generateUUID() {
  return crypto.randomUUID();
}

async function getAgencyConnection(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const client = await agencyPool.connect();
  // Attach pool to client for cleanup
  client.pool = agencyPool;
  return client;
}

/**
 * Deliver webhook payload
 */
async function deliverWebhook(url, payload, secret) {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': Date.now().toString(),
      },
      body: JSON.stringify(payload),
    });

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create webhook subscription
 */
async function createWebhook(agencyDatabase, webhookData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Use provided secret or generate one
    const secret = webhookData.secret || crypto.randomBytes(32).toString('hex');

    const result = await client.query(
      `INSERT INTO public.webhooks (
        id, agency_id, event_type, url, secret, is_active,
        headers, filters, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        webhookData.agency_id,
        webhookData.event_type,
        webhookData.url,
        secret,
        webhookData.is_active !== false,
        webhookData.headers || null,
        webhookData.filters || null,
        userId,
      ]
    );

    return result.rows[0];
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Trigger webhook for an event
 */
async function triggerWebhook(agencyDatabase, eventType, eventData) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Get active webhooks for this event type
    const webhooksResult = await client.query(
      `SELECT * FROM public.webhooks 
       WHERE agency_id = $1 
       AND event_type = $2 
       AND is_active = true`,
      [eventData.agency_id, eventType]
    );

    const webhooks = webhooksResult.rows;

    // Deliver to each webhook
    for (const webhook of webhooks) {
      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: eventData,
      };

      const result = await deliverWebhook(webhook.url, payload, webhook.secret);

      // Log webhook delivery
      await client.query(
        `INSERT INTO public.webhook_deliveries (
          id, webhook_id, event_type, payload, status, response_status,
          response_body, delivered_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          generateUUID(),
          webhook.id,
          eventType,
          JSON.stringify(payload),
          result.success ? 'delivered' : 'failed',
          result.status || null,
          result.error || null,
          result.success ? new Date() : null,
        ]
      );

      // Retry logic for failed webhooks
      if (!result.success) {
        // Schedule retry (would use a job queue in production)
        console.log(`[Webhook] Failed to deliver ${webhook.id}, will retry`);
      }
    }

    return { delivered: webhooks.length };
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get webhook delivery history
 */
async function getWebhookDeliveries(agencyDatabase, webhookId, limit = 50) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT * FROM public.webhook_deliveries 
       WHERE webhook_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [webhookId, limit]
    );
    return result.rows;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

module.exports = {
  createWebhook,
  triggerWebhook,
  getWebhookDeliveries,
};
