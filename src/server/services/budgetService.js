/**
 * Budget Management Service
 * Handles budget planning and tracking
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
 * Create budget
 */
async function createBudget(agencyDatabase, budgetData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    // Create budget
    const budgetResult = await client.query(
      `INSERT INTO public.budgets (
        id, agency_id, budget_name, budget_type, fiscal_year,
        period_start, period_end, department_id, project_id,
        total_budget, status, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        budgetData.agency_id,
        budgetData.budget_name,
        budgetData.budget_type,
        budgetData.fiscal_year,
        budgetData.period_start,
        budgetData.period_end,
        budgetData.department_id || null,
        budgetData.project_id || null,
        budgetData.total_budget,
        budgetData.status || 'draft',
        userId,
      ]
    );

    const budget = budgetResult.rows[0];

    // Create budget items
    if (budgetData.items && budgetData.items.length > 0) {
      for (const item of budgetData.items) {
        await client.query(
          `INSERT INTO public.budget_items (
            id, budget_id, account_id, category, description,
            budgeted_amount, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [
            generateUUID(),
            budget.id,
            item.account_id || null,
            item.category || null,
            item.description || null,
            item.budgeted_amount,
          ]
        );
      }
    }

    await client.query('COMMIT');
    return budget;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Update budget spent amounts (called when expenses are recorded)
 */
async function updateBudgetSpent(agencyDatabase, budgetId, accountId, amount) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Update budget item spent amount
    await client.query(
      `UPDATE public.budget_items 
       SET spent_amount = spent_amount + $1, updated_at = NOW()
       WHERE budget_id = $2 AND account_id = $3`,
      [amount, budgetId, accountId]
    );

    // Update budget total spent
    const totalSpentResult = await client.query(
      `SELECT SUM(spent_amount) as total 
       FROM public.budget_items 
       WHERE budget_id = $1`,
      [budgetId]
    );

    const totalSpent = parseFloat(totalSpentResult.rows[0].total || 0);
    await client.query(
      'UPDATE public.budgets SET spent_amount = $1, updated_at = NOW() WHERE id = $2',
      [totalSpent, budgetId]
    );
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get budgets with variance analysis
 */
async function getBudgetsWithVariance(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        b.*,
        (b.total_budget - b.spent_amount) as remaining,
        CASE 
          WHEN b.total_budget > 0 THEN ((b.spent_amount / b.total_budget) * 100)
          ELSE 0
        END as utilization_percentage,
        CASE
          WHEN b.spent_amount > b.total_budget THEN 'over_budget'
          WHEN b.spent_amount > (b.total_budget * 0.9) THEN 'near_limit'
          ELSE 'within_budget'
        END as status_indicator
      FROM public.budgets b
      WHERE b.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.fiscal_year) {
      query += ` AND b.fiscal_year = $${paramIndex}`;
      params.push(filters.fiscal_year);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND b.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    query += ' ORDER BY b.created_at DESC';

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

module.exports = {
  createBudget,
  updateBudgetSpent,
  getBudgetsWithVariance,
};
