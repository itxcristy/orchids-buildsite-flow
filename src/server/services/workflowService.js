/**
 * Workflow Management Service
 * Handles all workflow operations: workflows, steps, instances, approvals
 */

const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');
const crypto = require('crypto');
const { ensureWorkflowSchema } = require('../utils/schema/workflowSchema');

// Generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Get agency database connection
 */
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
 * Get all workflows (with optional filters)
 */
async function getWorkflows(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        w.*,
        u.email as created_by_email,
        COUNT(DISTINCT ws.id) as step_count,
        COUNT(DISTINCT wi.id) as instance_count
      FROM public.workflows w
      LEFT JOIN public.users u ON w.created_by = u.id
      LEFT JOIN public.workflow_steps ws ON w.id = ws.workflow_id
      LEFT JOIN public.workflow_instances wi ON w.id = wi.workflow_id
      WHERE w.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.workflow_type) {
      query += ` AND w.workflow_type = $${paramIndex}`;
      params.push(filters.workflow_type);
      paramIndex++;
    }

    if (filters.entity_type) {
      query += ` AND w.entity_type = $${paramIndex}`;
      params.push(filters.entity_type);
      paramIndex++;
    }

    if (filters.is_active !== undefined) {
      query += ` AND w.is_active = $${paramIndex}`;
      params.push(filters.is_active);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (w.name ILIKE $${paramIndex} OR w.description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ` GROUP BY w.id, u.email
               ORDER BY w.created_at DESC`;

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Workflow Service] Error fetching workflows:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get workflow by ID
 */
async function getWorkflowById(agencyDatabase, agencyId, workflowId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT 
        w.*,
        u.email as created_by_email
      FROM public.workflows w
      LEFT JOIN public.users u ON w.created_by = u.id
      WHERE w.id = $1 AND w.agency_id = $2`,
      [workflowId, agencyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Workflow not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Workflow Service] Error fetching workflow:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create a workflow
 */
async function createWorkflow(agencyDatabase, workflowData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.workflows (
        id, agency_id, name, description, workflow_type, entity_type,
        trigger_event, is_active, is_system, version, configuration,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        workflowData.agency_id,
        workflowData.name,
        workflowData.description || null,
        workflowData.workflow_type || 'approval',
        workflowData.entity_type,
        workflowData.trigger_event || null,
        workflowData.is_active !== false,
        workflowData.is_system || false,
        workflowData.version || 1,
        JSON.stringify(workflowData.configuration || {}),
        userId,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[Workflow Service] Error creating workflow:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update a workflow
 */
async function updateWorkflow(agencyDatabase, agencyId, workflowId, workflowData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'description', 'workflow_type', 'entity_type', 'trigger_event',
      'is_active', 'version', 'configuration'
    ];
    
    for (const field of allowedFields) {
      if (workflowData[field] !== undefined) {
        if (field === 'configuration') {
          updates.push(`${field} = $${paramIndex}::jsonb`);
          values.push(JSON.stringify(workflowData[field]));
        } else {
          updates.push(`${field} = $${paramIndex}`);
          values.push(workflowData[field]);
        }
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(workflowId, agencyId);

    const query = `
      UPDATE public.workflows 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Workflow not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Workflow Service] Error updating workflow:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Delete a workflow
 */
async function deleteWorkflow(agencyDatabase, agencyId, workflowId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Check if it's a system workflow
    const checkResult = await client.query(
      'SELECT is_system FROM public.workflows WHERE id = $1 AND agency_id = $2',
      [workflowId, agencyId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Workflow not found');
    }

    if (checkResult.rows[0].is_system) {
      throw new Error('Cannot delete system workflow');
    }

    // Check if there are active instances
    const instancesCheck = await client.query(
      `SELECT COUNT(*) as count FROM public.workflow_instances 
       WHERE workflow_id = $1 AND status IN ('pending', 'in_progress')`,
      [workflowId]
    );

    if (parseInt(instancesCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete workflow with active instances');
    }

    const result = await client.query(
      'DELETE FROM public.workflows WHERE id = $1 AND agency_id = $2 RETURNING id',
      [workflowId, agencyId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Workflow Service] Error deleting workflow:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get workflow steps
 */
async function getWorkflowSteps(agencyDatabase, agencyId, workflowId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Verify workflow exists
    const workflowCheck = await client.query(
      'SELECT id FROM public.workflows WHERE id = $1 AND agency_id = $2',
      [workflowId, agencyId]
    );

    if (workflowCheck.rows.length === 0) {
      throw new Error('Workflow not found');
    }

    const result = await client.query(
      `SELECT 
        ws.*,
        u.email as approver_email
      FROM public.workflow_steps ws
      LEFT JOIN public.users u ON ws.approver_id = u.id
      WHERE ws.workflow_id = $1
      ORDER BY ws.step_number ASC, ws.sequence_group ASC`,
      [workflowId]
    );
    return result.rows;
  } catch (error) {
    console.error('[Workflow Service] Error fetching workflow steps:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create a workflow step
 */
async function createWorkflowStep(agencyDatabase, workflowId, stepData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Verify workflow exists
    const workflowCheck = await client.query(
      'SELECT agency_id FROM public.workflows WHERE id = $1',
      [workflowId]
    );

    if (workflowCheck.rows.length === 0) {
      throw new Error('Workflow not found');
    }

    const result = await client.query(
      `INSERT INTO public.workflow_steps (
        id, workflow_id, step_number, step_name, step_type, approver_type,
        approver_id, approver_role, approver_department_id, condition_expression,
        action_config, timeout_hours, escalation_enabled, escalation_after_hours,
        escalation_to, is_required, is_parallel, sequence_group, notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        workflowId,
        stepData.step_number,
        stepData.step_name,
        stepData.step_type,
        stepData.approver_type || null,
        stepData.approver_id || null,
        stepData.approver_role || null,
        stepData.approver_department_id || null,
        stepData.condition_expression || null,
        JSON.stringify(stepData.action_config || {}),
        stepData.timeout_hours || null,
        stepData.escalation_enabled || false,
        stepData.escalation_after_hours || null,
        stepData.escalation_to || null,
        stepData.is_required !== false,
        stepData.is_parallel || false,
        stepData.sequence_group || 0,
        stepData.notes || null,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[Workflow Service] Error creating workflow step:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update a workflow step
 */
async function updateWorkflowStep(agencyDatabase, workflowId, stepId, stepData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Verify step belongs to workflow
    const stepCheck = await client.query(
      'SELECT id FROM public.workflow_steps WHERE id = $1 AND workflow_id = $2',
      [stepId, workflowId]
    );

    if (stepCheck.rows.length === 0) {
      throw new Error('Workflow step not found');
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'step_number', 'step_name', 'step_type', 'approver_type', 'approver_id',
      'approver_role', 'approver_department_id', 'condition_expression',
      'action_config', 'timeout_hours', 'escalation_enabled',
      'escalation_after_hours', 'escalation_to', 'is_required', 'is_parallel',
      'sequence_group', 'notes'
    ];
    
    for (const field of allowedFields) {
      if (stepData[field] !== undefined) {
        if (field === 'action_config') {
          updates.push(`${field} = $${paramIndex}::jsonb`);
          values.push(JSON.stringify(stepData[field]));
        } else {
          updates.push(`${field} = $${paramIndex}`);
          values.push(stepData[field]);
        }
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(stepId, workflowId);

    const query = `
      UPDATE public.workflow_steps 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND workflow_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Workflow step not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Workflow Service] Error updating workflow step:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Delete a workflow step
 */
async function deleteWorkflowStep(agencyDatabase, workflowId, stepId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Verify step belongs to workflow
    const stepCheck = await client.query(
      'SELECT id FROM public.workflow_steps WHERE id = $1 AND workflow_id = $2',
      [stepId, workflowId]
    );

    if (stepCheck.rows.length === 0) {
      throw new Error('Workflow step not found');
    }

    const result = await client.query(
      'DELETE FROM public.workflow_steps WHERE id = $1 AND workflow_id = $2 RETURNING id',
      [stepId, workflowId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Workflow Service] Error deleting workflow step:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get all workflow instances (with optional filters)
 */
async function getWorkflowInstances(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        wi.*,
        w.name as workflow_name,
        w.workflow_type,
        u1.email as started_by_email,
        u2.email as completed_by_email
      FROM public.workflow_instances wi
      LEFT JOIN public.workflows w ON wi.workflow_id = w.id
      LEFT JOIN public.users u1 ON wi.started_by = u1.id
      LEFT JOIN public.users u2 ON wi.completed_by = u2.id
      WHERE wi.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.workflow_id) {
      query += ` AND wi.workflow_id = $${paramIndex}`;
      params.push(filters.workflow_id);
      paramIndex++;
    }

    if (filters.entity_type) {
      query += ` AND wi.entity_type = $${paramIndex}`;
      params.push(filters.entity_type);
      paramIndex++;
    }

    if (filters.entity_id) {
      query += ` AND wi.entity_id = $${paramIndex}`;
      params.push(filters.entity_id);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND wi.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.started_by) {
      query += ` AND wi.started_by = $${paramIndex}`;
      params.push(filters.started_by);
      paramIndex++;
    }

    if (filters.date_from) {
      query += ` AND wi.started_at >= $${paramIndex}::date`;
      params.push(filters.date_from);
      paramIndex++;
    }

    if (filters.date_to) {
      query += ` AND wi.started_at <= $${paramIndex}::date`;
      params.push(filters.date_to);
      paramIndex++;
    }

    query += ` ORDER BY wi.started_at DESC`;

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Workflow Service] Error fetching workflow instances:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get workflow instance by ID
 */
async function getWorkflowInstanceById(agencyDatabase, agencyId, instanceId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT 
        wi.*,
        w.name as workflow_name,
        w.workflow_type,
        w.description as workflow_description,
        u1.email as started_by_email,
        u2.email as completed_by_email
      FROM public.workflow_instances wi
      LEFT JOIN public.workflows w ON wi.workflow_id = w.id
      LEFT JOIN public.users u1 ON wi.started_by = u1.id
      LEFT JOIN public.users u2 ON wi.completed_by = u2.id
      WHERE wi.id = $1 AND wi.agency_id = $2`,
      [instanceId, agencyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Workflow instance not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Workflow Service] Error fetching workflow instance:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get workflow approvals for an instance
 */
async function getWorkflowApprovals(agencyDatabase, agencyId, instanceId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT 
        wa.*,
        ws.step_name,
        ws.step_number,
        ws.step_type,
        u.email as approver_email,
        u2.email as delegated_to_email
      FROM public.workflow_approvals wa
      LEFT JOIN public.workflow_steps ws ON wa.step_id = ws.id
      LEFT JOIN public.users u ON wa.approver_id = u.id
      LEFT JOIN public.users u2 ON wa.delegated_to = u2.id
      WHERE wa.instance_id = $1 AND wa.agency_id = $2
      ORDER BY wa.step_number ASC, wa.created_at ASC`,
      [instanceId, agencyId]
    );
    return result.rows;
  } catch (error) {
    console.error('[Workflow Service] Error fetching workflow approvals:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create a workflow instance
 */
async function createWorkflowInstance(agencyDatabase, instanceData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Verify workflow exists
    const workflowCheck = await client.query(
      'SELECT id, is_active FROM public.workflows WHERE id = $1 AND agency_id = $2',
      [instanceData.workflow_id, instanceData.agency_id]
    );

    if (workflowCheck.rows.length === 0) {
      throw new Error('Workflow not found');
    }

    if (!workflowCheck.rows[0].is_active) {
      throw new Error('Cannot start instance for inactive workflow');
    }

    const result = await client.query(
      `INSERT INTO public.workflow_instances (
        id, agency_id, workflow_id, entity_type, entity_id,
        status, current_step_number, started_by, started_at,
        metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        instanceData.agency_id,
        instanceData.workflow_id,
        instanceData.entity_type,
        instanceData.entity_id,
        instanceData.status || 'pending',
        instanceData.current_step_number || 1,
        userId,
        JSON.stringify(instanceData.metadata || {}),
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[Workflow Service] Error creating workflow instance:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update workflow instance status
 */
async function updateWorkflowInstance(agencyDatabase, agencyId, instanceId, instanceData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'status', 'current_step_number', 'completed_at', 'completed_by',
      'rejection_reason', 'metadata'
    ];
    
    for (const field of allowedFields) {
      if (instanceData[field] !== undefined) {
        if (field === 'metadata') {
          updates.push(`${field} = $${paramIndex}::jsonb`);
          values.push(JSON.stringify(instanceData[field]));
        } else if (field === 'completed_at' && instanceData[field]) {
          updates.push(`${field} = NOW()`);
        } else {
          updates.push(`${field} = $${paramIndex}`);
          values.push(instanceData[field]);
        }
        if (field !== 'completed_at' || !instanceData[field]) {
          paramIndex++;
        }
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Set completed_by if status is completed/approved/rejected
    if (instanceData.status && ['approved', 'rejected', 'completed'].includes(instanceData.status)) {
      if (!instanceData.completed_at) {
        updates.push(`completed_at = NOW()`);
      }
      if (!instanceData.completed_by) {
        updates.push(`completed_by = $${paramIndex}`);
        values.push(userId);
        paramIndex++;
      }
    }

    updates.push(`updated_at = NOW()`);
    values.push(instanceId, agencyId);

    const query = `
      UPDATE public.workflow_instances 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Workflow instance not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Workflow Service] Error updating workflow instance:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Cancel a workflow instance
 */
async function cancelWorkflowInstance(agencyDatabase, agencyId, instanceId, userId, reason) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `UPDATE public.workflow_instances 
       SET status = 'cancelled',
           completed_at = NOW(),
           completed_by = $1,
           rejection_reason = $2,
           updated_at = NOW()
       WHERE id = $3 AND agency_id = $4
       RETURNING *`,
      [userId, reason || null, instanceId, agencyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Workflow instance not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Workflow Service] Error cancelling workflow instance:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update a workflow approval
 */
async function updateWorkflowApproval(agencyDatabase, agencyId, approvalId, approvalData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    // Update the approval
    const updateQuery = `
      UPDATE public.workflow_approvals 
      SET status = $1,
          action_taken_at = NOW(),
          comments = $2,
          updated_at = NOW()
      WHERE id = $3 AND agency_id = $4
        AND (approver_id = $5 OR delegated_to = $5)
        AND status = 'pending'
      RETURNING *
    `;
    const updateResult = await client.query(updateQuery, [
      approvalData.status,
      approvalData.comments || null,
      approvalId,
      agencyId,
      userId,
    ]);

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Approval not found or already processed');
    }

    const approval = updateResult.rows[0];

    // Get the instance to update
    const instanceResult = await client.query(
      'SELECT * FROM public.workflow_instances WHERE id = $1 AND agency_id = $2',
      [approval.instance_id, agencyId]
    );

    if (instanceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Workflow instance not found');
    }

    const instance = instanceResult.rows[0];

    // If rejected, update instance status
    if (approvalData.status === 'rejected') {
      await client.query(
        `UPDATE public.workflow_instances 
         SET status = 'rejected',
             completed_at = NOW(),
             completed_by = $1,
             rejection_reason = $2,
             updated_at = NOW()
         WHERE id = $3 AND agency_id = $4`,
        [userId, approvalData.comments || null, instance.id, agencyId]
      );
    } else if (approvalData.status === 'approved') {
      // Check if this is the last step
      const stepsResult = await client.query(
        'SELECT MAX(step_number) as max_step FROM public.workflow_steps WHERE workflow_id = $1',
        [instance.workflow_id]
      );
      const maxStep = stepsResult.rows[0]?.max_step || 0;

      if (instance.current_step_number >= maxStep) {
        // Last step approved, complete the workflow
        await client.query(
          `UPDATE public.workflow_instances 
           SET status = 'approved',
               completed_at = NOW(),
               completed_by = $1,
               updated_at = NOW()
           WHERE id = $2 AND agency_id = $3`,
          [userId, instance.id, agencyId]
        );
      } else {
        // Move to next step
        await client.query(
          `UPDATE public.workflow_instances 
           SET current_step_number = $1,
               updated_at = NOW()
           WHERE id = $2 AND agency_id = $3`,
          [instance.current_step_number + 1, instance.id, agencyId]
        );
      }
    }

    await client.query('COMMIT');
    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Workflow Service] Error updating workflow approval:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get all pending approvals for a user
 */
async function getAllPendingApprovals(agencyDatabase, agencyId, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT 
        wa.*,
        ws.step_name,
        ws.step_number,
        ws.step_type,
        wi.entity_type,
        wi.entity_id,
        wi.status as instance_status,
        wi.started_at,
        w.name as workflow_name,
        w.workflow_type,
        u.email as approver_email,
        u2.email as delegated_to_email,
        u3.email as started_by_email
      FROM public.workflow_approvals wa
      LEFT JOIN public.workflow_steps ws ON wa.step_id = ws.id
      LEFT JOIN public.workflow_instances wi ON wa.instance_id = wi.id
      LEFT JOIN public.workflows w ON wi.workflow_id = w.id
      LEFT JOIN public.users u ON wa.approver_id = u.id
      LEFT JOIN public.users u2 ON wa.delegated_to = u2.id
      LEFT JOIN public.users u3 ON wi.started_by = u3.id
      WHERE wa.agency_id = $1 
        AND wa.status = 'pending'
        AND (wa.approver_id = $2 OR wa.delegated_to = $2)
        AND wi.status IN ('pending', 'in_progress')
      ORDER BY wa.created_at ASC, wa.step_number ASC`,
      [agencyId, userId]
    );
    return result.rows;
  } catch (error) {
    console.error('[Workflow Service] Error fetching pending approvals:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get all automation rules
 */
async function getAutomationRules(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        ar.*,
        u.email as created_by_email
      FROM public.automation_rules ar
      LEFT JOIN public.users u ON ar.created_by = u.id
      WHERE ar.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.rule_type) {
      query += ` AND ar.rule_type = $${paramIndex}`;
      params.push(filters.rule_type);
      paramIndex++;
    }

    if (filters.entity_type) {
      query += ` AND ar.entity_type = $${paramIndex}`;
      params.push(filters.entity_type);
      paramIndex++;
    }

    if (filters.is_active !== undefined) {
      query += ` AND ar.is_active = $${paramIndex}`;
      params.push(filters.is_active);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (ar.name ILIKE $${paramIndex} OR ar.description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ' ORDER BY ar.priority DESC, ar.created_at DESC';

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Workflow Service] Error fetching automation rules:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get automation rule by ID
 */
async function getAutomationRuleById(agencyDatabase, agencyId, ruleId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT 
        ar.*,
        u.email as created_by_email
      FROM public.automation_rules ar
      LEFT JOIN public.users u ON ar.created_by = u.id
      WHERE ar.id = $1 AND ar.agency_id = $2`,
      [ruleId, agencyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Automation rule not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Workflow Service] Error fetching automation rule:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create automation rule
 */
async function createAutomationRule(agencyDatabase, ruleData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.automation_rules (
        id, agency_id, name, description, rule_type, entity_type,
        trigger_event, trigger_condition, action_type, action_config,
        is_active, priority, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        ruleData.agency_id,
        ruleData.name,
        ruleData.description || null,
        ruleData.rule_type,
        ruleData.entity_type,
        ruleData.trigger_event,
        JSON.stringify(ruleData.trigger_condition || {}),
        ruleData.action_type,
        JSON.stringify(ruleData.action_config || {}),
        ruleData.is_active !== false,
        ruleData.priority || 0,
        userId,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[Workflow Service] Error creating automation rule:', error);
    if (error.code === '23505') {
      throw new Error('Automation rule name already exists');
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update automation rule
 */
async function updateAutomationRule(agencyDatabase, agencyId, ruleId, ruleData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'description', 'rule_type', 'entity_type', 'trigger_event',
      'trigger_condition', 'action_type', 'action_config', 'is_active', 'priority'
    ];

    for (const field of allowedFields) {
      if (ruleData[field] !== undefined) {
        if (field === 'trigger_condition' || field === 'action_config') {
          updates.push(`${field} = $${paramIndex}::jsonb`);
          values.push(JSON.stringify(ruleData[field]));
        } else {
          updates.push(`${field} = $${paramIndex}`);
          values.push(ruleData[field]);
        }
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(ruleId, agencyId);

    const query = `
      UPDATE public.automation_rules 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Automation rule not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Workflow Service] Error updating automation rule:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Delete automation rule
 */
async function deleteAutomationRule(agencyDatabase, agencyId, ruleId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'DELETE FROM public.automation_rules WHERE id = $1 AND agency_id = $2 RETURNING *',
      [ruleId, agencyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Automation rule not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Workflow Service] Error deleting automation rule:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Workflow Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Workflow Service] Error ending pool:', err);
      }
    }
  }
}

module.exports = {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  getWorkflowSteps,
  createWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
  getWorkflowInstances,
  getWorkflowInstanceById,
  getWorkflowApprovals,
  getAllPendingApprovals,
  updateWorkflowApproval,
  createWorkflowInstance,
  updateWorkflowInstance,
  cancelWorkflowInstance,
  getAutomationRules,
  getAutomationRuleById,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
};

