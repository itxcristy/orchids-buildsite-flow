/**
 * Advanced CRM Routes
 * Handles lead scoring, opportunities, email tracking, segmentation
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const leadScoringService = require('../services/leadScoringService');
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
 * POST /api/crm/leads/:leadId/score
 * Calculate and update lead score
 */
router.post('/leads/:leadId/score', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { leadId } = req.params;

  const result = await leadScoringService.calculateLeadScore(agencyDatabase, leadId);

  res.json({
    success: true,
    data: result,
    message: 'Lead score calculated',
  });
}));

/**
 * GET /api/crm/leads/high-scoring
 * Get high-scoring leads
 */
router.get('/leads/high-scoring', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const minScore = parseInt(req.query.min_score || '50', 10);

  const leads = await leadScoringService.getHighScoringLeads(agencyDatabase, agencyId, minScore);

  res.json({
    success: true,
    data: leads,
  });
}));

/**
 * POST /api/crm/opportunities
 * Create opportunity
 */
router.post('/opportunities', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const userId = req.user.id;

  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.opportunities (
        id, agency_id, lead_id, client_id, opportunity_name, description,
        stage, probability, expected_value, expected_close_date, currency,
        source, owner_id, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        agencyId,
        req.body.lead_id || null,
        req.body.client_id || null,
        req.body.opportunity_name,
        req.body.description || null,
        req.body.stage || 'prospecting',
        req.body.probability || 0,
        req.body.expected_value || null,
        req.body.expected_close_date || null,
        req.body.currency || 'INR',
        req.body.source || null,
        req.body.owner_id || userId,
        userId,
      ]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Opportunity created',
    });
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}));

/**
 * GET /api/crm/opportunities
 * Get opportunities
 */
router.get('/opportunities', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;

  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        o.*,
        l.name as lead_name,
        c.name as client_name,
        owner.email as owner_email,
        owner_profile.full_name as owner_name
      FROM public.opportunities o
      LEFT JOIN public.leads l ON o.lead_id = l.id
      LEFT JOIN public.clients c ON o.client_id = c.id
      LEFT JOIN public.users owner ON o.owner_id = owner.id
      LEFT JOIN public.profiles owner_profile ON o.owner_id = owner_profile.user_id
      WHERE o.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (req.query.stage) {
      query += ` AND o.stage = $${paramIndex}`;
      params.push(req.query.stage);
      paramIndex++;
    }

    query += ' ORDER BY o.expected_close_date ASC, o.created_at DESC';

    const result = await client.query(query, params);
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
 * POST /api/crm/segments
 * Create customer segment
 */
router.post('/segments', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const userId = req.user.id;

  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.customer_segments (
        id, agency_id, segment_name, description, criteria, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        agencyId,
        req.body.segment_name,
        req.body.description || null,
        JSON.stringify(req.body.criteria || {}),
        userId,
      ]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Customer segment created',
    });
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}));

module.exports = router;
