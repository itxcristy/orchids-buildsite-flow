/**
 * Webhook Management Routes
 * Handles webhook subscriptions and delivery
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const webhookService = require('../services/webhookService');
const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');

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
 * POST /api/webhooks
 * Create a new webhook subscription
 */
router.post('/', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const userId = req.user.id;

  const webhook = await webhookService.createWebhook(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: webhook,
    message: 'Webhook created successfully',
  });
}));

/**
 * GET /api/webhooks
 * Get all webhook subscriptions
 */
router.get('/', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;

  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT id, agency_id, event_type, url, is_active, created_at, updated_at
       FROM public.webhooks 
       WHERE agency_id = $1 
       ORDER BY created_at DESC`,
      [agencyId]
    );
    res.json({
      success: true,
      data: result.rows,
    });
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}));

/**
 * GET /api/webhooks/:id/deliveries
 * Get webhook delivery history
 */
router.get('/:id/deliveries', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { id } = req.params;

  const deliveries = await webhookService.getWebhookDeliveries(agencyDatabase, id);

  res.json({
    success: true,
    data: deliveries,
  });
}));

/**
 * POST /api/webhooks/trigger
 * Manually trigger a webhook (for testing)
 */
router.post('/trigger', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { event_type, event_data } = req.body;

  const result = await webhookService.triggerWebhook(
    agencyDatabase,
    event_type,
    { ...event_data, agency_id: req.user.agencyId }
  );

  res.json({
    success: true,
    data: result,
    message: 'Webhook triggered',
  });
}));

module.exports = router;
