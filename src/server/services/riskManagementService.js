/**
 * Risk Management Service
 * Handles project risk register and issue tracking
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
 * Create project risk
 */
async function createRisk(agencyDatabase, riskData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.project_risks (
        id, project_id, agency_id, risk_title, description,
        category, probability, impact, status, mitigation_plan,
        owner_id, identified_date, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        riskData.project_id,
        riskData.agency_id,
        riskData.risk_title,
        riskData.description || null,
        riskData.category || null,
        riskData.probability || 'medium',
        riskData.impact || 'medium',
        riskData.status || 'open',
        riskData.mitigation_plan || null,
        riskData.owner_id || null,
        riskData.identified_date || new Date().toISOString().split('T')[0],
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
 * Get risks for a project
 */
async function getRisks(agencyDatabase, projectId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        r.*,
        u.email as owner_email,
        p.full_name as owner_name
      FROM public.project_risks r
      LEFT JOIN public.users u ON r.owner_id = u.id
      LEFT JOIN public.profiles p ON r.owner_id = p.user_id
      WHERE r.project_id = $1
    `;
    const params = [projectId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND r.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.category) {
      query += ` AND r.category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    query += ' ORDER BY r.risk_score DESC, r.created_at DESC';

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Create project issue
 */
async function createIssue(agencyDatabase, issueData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.project_issues (
        id, project_id, agency_id, issue_title, description,
        priority, status, issue_type, assigned_to, reported_by,
        due_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        issueData.project_id,
        issueData.agency_id,
        issueData.issue_title,
        issueData.description || null,
        issueData.priority || 'medium',
        issueData.status || 'open',
        issueData.issue_type || null,
        issueData.assigned_to || null,
        userId,
        issueData.due_date || null,
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
 * Get issues for a project
 */
async function getIssues(agencyDatabase, projectId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        i.*,
        reporter.email as reporter_email,
        reporter_profile.full_name as reporter_name,
        assignee.email as assignee_email,
        assignee_profile.full_name as assignee_name
      FROM public.project_issues i
      LEFT JOIN public.users reporter ON i.reported_by = reporter.id
      LEFT JOIN public.profiles reporter_profile ON i.reported_by = reporter_profile.user_id
      LEFT JOIN public.users assignee ON i.assigned_to = assignee.id
      LEFT JOIN public.profiles assignee_profile ON i.assigned_to = assignee_profile.user_id
      WHERE i.project_id = $1
    `;
    const params = [projectId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND i.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.priority) {
      query += ` AND i.priority = $${paramIndex}`;
      params.push(filters.priority);
      paramIndex++;
    }

    query += ` ORDER BY 
      CASE i.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      i.created_at DESC`;

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Create project milestone
 */
async function createMilestone(agencyDatabase, milestoneData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.project_milestones (
        id, project_id, agency_id, name, description,
        target_date, status, is_critical, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        milestoneData.project_id,
        milestoneData.agency_id,
        milestoneData.name,
        milestoneData.description || null,
        milestoneData.target_date,
        milestoneData.status || 'pending',
        milestoneData.is_critical || false,
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

module.exports = {
  createRisk,
  getRisks,
  createIssue,
  getIssues,
  createMilestone,
};
