/**
 * Lead Scoring Service
 * Automatically scores leads based on various factors
 */

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
 * Calculate lead score based on various factors
 */
async function calculateLeadScore(agencyDatabase, leadId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Get lead data
    const leadResult = await client.query(
      `SELECT * FROM public.leads WHERE id = $1`,
      [leadId]
    );

    if (leadResult.rows.length === 0) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    const lead = leadResult.rows[0];
    
    // Ensure agency_id is set
    if (!lead.agency_id) {
      throw new Error(`Lead ${leadId} does not have agency_id set`);
    }
    const breakdown = {};
    let totalScore = 0;

    // Source scoring (10-30 points)
    const sourceScores = {
      'website': 20,
      'referral': 25,
      'social_media': 15,
      'cold_call': 10,
      'email_campaign': 18,
      'trade_show': 22,
    };
    const sourceScore = (lead.source && sourceScores[lead.source]) ? sourceScores[lead.source] : 10;
    breakdown.source = sourceScore;
    totalScore += sourceScore;

    // Engagement scoring (0-30 points)
    let activityCount = 0;
    try {
      const activitiesResult = await client.query(
        `SELECT COUNT(*) as count, MAX(created_at) as last_activity
         FROM public.crm_activities
         WHERE lead_id = $1`,
        [leadId]
      );
      activityCount = parseInt(activitiesResult.rows[0]?.count || 0);
    } catch (error) {
      // Table might not exist or have no data, default to 0
      console.warn('[LeadScoring] Error fetching activities:', error.message);
      activityCount = 0;
    }
    const engagementScore = Math.min(activityCount * 5, 30);
    breakdown.engagement = engagementScore;
    totalScore += engagementScore;

    // Company size scoring (0-20 points)
    if (lead.company_size) {
      const sizeScores = {
        'startup': 5,
        'small': 10,
        'medium': 15,
        'large': 20,
        'enterprise': 25,
      };
      const sizeScore = sizeScores[lead.company_size.toLowerCase()] || 0;
      breakdown.company_size = sizeScore;
      totalScore += sizeScore;
    }

    // Budget scoring (0-20 points)
    if (lead.budget) {
      const budget = parseFloat(lead.budget);
      if (budget > 1000000) breakdown.budget = 20;
      else if (budget > 500000) breakdown.budget = 15;
      else if (budget > 100000) breakdown.budget = 10;
      else breakdown.budget = 5;
      totalScore += breakdown.budget;
    }

    // Timeline scoring (0-10 points)
    if (lead.timeline) {
      const timelineScores = {
        'immediate': 10,
        'within_month': 8,
        'within_quarter': 5,
        'within_year': 3,
        'exploring': 1,
      };
      const timelineScore = timelineScores[lead.timeline.toLowerCase()] || 0;
      breakdown.timeline = timelineScore;
      totalScore += timelineScore;
    }

    // Use lead.agency_id (already verified above)
    const agencyId = lead.agency_id;
    
    // Check if score already exists
    const existingScore = await client.query('SELECT id FROM public.lead_scores WHERE lead_id = $1', [leadId]);
    
    if (existingScore.rows.length > 0) {
      // Update existing score
      await client.query(
        `UPDATE public.lead_scores 
         SET score = $1, score_breakdown = $2, last_calculated_at = NOW(), updated_at = NOW()
         WHERE lead_id = $3`,
        [totalScore, JSON.stringify(breakdown), leadId]
      );
    } else {
      // Insert new score
      await client.query(
        `INSERT INTO public.lead_scores (
          id, lead_id, agency_id, score, score_breakdown, last_calculated_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())`,
        [
          require('crypto').randomUUID(),
          leadId,
          agencyId,
          totalScore,
          JSON.stringify(breakdown),
        ]
      );
    }

    return { score: totalScore, breakdown };
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get high-scoring leads
 */
async function getHighScoringLeads(agencyDatabase, agencyId, minScore = 50) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Use LEFT JOIN in case some leads don't have scores yet
    const result = await client.query(
      `SELECT 
        ls.*,
        l.name as lead_name,
        l.contact_name,
        l.email,
        l.company_name,
        l.phone,
        l.source,
        l.status
      FROM public.lead_scores ls
      INNER JOIN public.leads l ON ls.lead_id = l.id
      WHERE ls.agency_id = $1 AND ls.score >= $2
      ORDER BY ls.score DESC, ls.last_calculated_at DESC`,
      [agencyId, minScore]
    );
    return result.rows || [];
  } catch (error) {
    console.error('[LeadScoring] Error in getHighScoringLeads:', error);
    // Return empty array on error
    return [];
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

module.exports = {
  calculateLeadScore,
  getHighScoringLeads,
};
