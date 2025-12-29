/**
 * Gantt Chart Service
 * Generates Gantt chart data with dependencies
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
 * Get Gantt chart data for a project
 */
async function getGanttData(agencyDatabase, projectId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Get all tasks with dependencies (return empty array if no tasks)
    let tasksResult;
    try {
      tasksResult = await client.query(
        `SELECT 
          t.id,
          t.name,
          t.description,
          t.status,
          t.priority,
          t.start_date,
          t.due_date,
          t.estimated_hours,
          t.actual_hours,
          t.progress_percentage,
          t.project_id
        FROM public.tasks t
        WHERE t.project_id = $1
        ORDER BY t.start_date ASC NULLS LAST, t.created_at ASC`,
        [projectId]
      );
    } catch (error) {
      console.warn('[Gantt] Error fetching tasks:', error.message);
      tasksResult = { rows: [] };
    }

    // Get dependencies (return empty array if no dependencies)
    let dependenciesResult;
    try {
      dependenciesResult = await client.query(
        `SELECT 
          d.id,
          d.predecessor_task_id,
          d.successor_task_id,
          d.dependency_type,
          d.lag_days
        FROM public.project_dependencies d
        WHERE d.project_id = $1`,
        [projectId]
      );
    } catch (error) {
      console.warn('[Gantt] Error fetching dependencies:', error.message);
      dependenciesResult = { rows: [] };
    }

    // Get milestones (return empty array if no milestones)
    let milestonesResult;
    try {
      milestonesResult = await client.query(
        `SELECT 
          m.id,
          m.name,
          m.target_date,
          m.status,
          m.is_critical
        FROM public.project_milestones m
        WHERE m.project_id = $1
        ORDER BY m.target_date ASC NULLS LAST`,
        [projectId]
      );
    } catch (error) {
      console.warn('[Gantt] Error fetching milestones:', error.message);
      milestonesResult = { rows: [] };
    }

    return {
      tasks: tasksResult.rows || [],
      dependencies: dependenciesResult.rows || [],
      milestones: milestonesResult.rows || [],
    };
  } catch (error) {
    console.error('[Gantt] Error in getGanttData:', error);
    // Return empty structure on error
    return {
      tasks: [],
      dependencies: [],
      milestones: [],
    };
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Create task dependency
 */
async function createDependency(agencyDatabase, dependencyData) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const crypto = require('crypto');
    const result = await client.query(
      `INSERT INTO public.project_dependencies (
        id, project_id, agency_id, predecessor_task_id,
        successor_task_id, dependency_type, lag_days, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *`,
      [
        crypto.randomUUID(),
        dependencyData.project_id,
        dependencyData.agency_id,
        dependencyData.predecessor_task_id,
        dependencyData.successor_task_id,
        dependencyData.dependency_type || 'finish_to_start',
        dependencyData.lag_days || 0,
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
  getGanttData,
  createDependency,
};
