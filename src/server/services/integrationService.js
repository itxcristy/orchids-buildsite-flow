/**
 * Integration Management Service
 * Handles all integration operations: integrations, API keys, integration logs
 */

const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');
const crypto = require('crypto');
const { ensureIntegrationHubSchema } = require('../utils/schema/integrationHubSchema');

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
 * Get all integrations (with optional filters)
 */
async function getIntegrations(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Ensure schema exists
    await ensureIntegrationHubSchema(client);

    let query = `
      SELECT 
        i.*,
        u.email as created_by_email
      FROM public.integrations i
      LEFT JOIN public.users u ON i.created_by = u.id
      WHERE i.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.integration_type) {
      query += ` AND i.integration_type = $${paramIndex}`;
      params.push(filters.integration_type);
      paramIndex++;
    }

    if (filters.provider) {
      query += ` AND i.provider = $${paramIndex}`;
      params.push(filters.provider);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND i.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (i.name ILIKE $${paramIndex} OR i.description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ` ORDER BY i.created_at DESC`;

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Integration Service] Error fetching integrations:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Integration Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Integration Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get integration by ID
 */
async function getIntegrationById(agencyDatabase, agencyId, integrationId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await ensureIntegrationHubSchema(client);

    const result = await client.query(
      `SELECT 
        i.*,
        u.email as created_by_email
      FROM public.integrations i
      LEFT JOIN public.users u ON i.created_by = u.id
      WHERE i.id = $1 AND i.agency_id = $2`,
      [integrationId, agencyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Integration not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Integration Service] Error fetching integration:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Integration Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Integration Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create an integration
 */
async function createIntegration(agencyDatabase, integrationData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await ensureIntegrationHubSchema(client);

    const result = await client.query(
      `INSERT INTO public.integrations (
        agency_id, name, integration_type, provider, description, status,
        configuration, credentials_encrypted, webhook_url, api_endpoint,
        authentication_type, is_system, sync_enabled, sync_frequency,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        integrationData.agency_id,
        integrationData.name,
        integrationData.integration_type,
        integrationData.provider || null,
        integrationData.description || null,
        integrationData.status || 'inactive',
        JSON.stringify(integrationData.configuration || {}),
        integrationData.credentials_encrypted || null,
        integrationData.webhook_url || null,
        integrationData.api_endpoint || null,
        integrationData.authentication_type || null,
        integrationData.is_system || false,
        integrationData.sync_enabled || false,
        integrationData.sync_frequency || null,
        userId
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('[Integration Service] Error creating integration:', error);
    if (error.code === '23505') {
      throw new Error('Integration with this name already exists');
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Integration Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Integration Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update an integration
 */
async function updateIntegration(agencyDatabase, agencyId, integrationId, integrationData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await ensureIntegrationHubSchema(client);

    // Check if integration exists and belongs to agency
    const checkResult = await client.query(
      'SELECT id, is_system FROM public.integrations WHERE id = $1 AND agency_id = $2',
      [integrationId, agencyId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Integration not found');
    }

    // Build update query dynamically
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (integrationData.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      values.push(integrationData.name);
      paramIndex++;
    }
    if (integrationData.integration_type !== undefined) {
      updateFields.push(`integration_type = $${paramIndex}`);
      values.push(integrationData.integration_type);
      paramIndex++;
    }
    if (integrationData.provider !== undefined) {
      updateFields.push(`provider = $${paramIndex}`);
      values.push(integrationData.provider);
      paramIndex++;
    }
    if (integrationData.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(integrationData.description);
      paramIndex++;
    }
    if (integrationData.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(integrationData.status);
      paramIndex++;
    }
    if (integrationData.configuration !== undefined) {
      updateFields.push(`configuration = $${paramIndex}`);
      values.push(JSON.stringify(integrationData.configuration));
      paramIndex++;
    }
    if (integrationData.credentials_encrypted !== undefined) {
      updateFields.push(`credentials_encrypted = $${paramIndex}`);
      values.push(integrationData.credentials_encrypted);
      paramIndex++;
    }
    if (integrationData.webhook_url !== undefined) {
      updateFields.push(`webhook_url = $${paramIndex}`);
      values.push(integrationData.webhook_url);
      paramIndex++;
    }
    if (integrationData.api_endpoint !== undefined) {
      updateFields.push(`api_endpoint = $${paramIndex}`);
      values.push(integrationData.api_endpoint);
      paramIndex++;
    }
    if (integrationData.authentication_type !== undefined) {
      updateFields.push(`authentication_type = $${paramIndex}`);
      values.push(integrationData.authentication_type);
      paramIndex++;
    }
    if (integrationData.sync_enabled !== undefined) {
      updateFields.push(`sync_enabled = $${paramIndex}`);
      values.push(integrationData.sync_enabled);
      paramIndex++;
    }
    if (integrationData.sync_frequency !== undefined) {
      updateFields.push(`sync_frequency = $${paramIndex}`);
      values.push(integrationData.sync_frequency);
      paramIndex++;
    }
    if (integrationData.metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex}`);
      values.push(JSON.stringify(integrationData.metadata));
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return await getIntegrationById(agencyDatabase, agencyId, integrationId);
    }

    values.push(integrationId, agencyId);
    const result = await client.query(
      `UPDATE public.integrations 
       SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Integration not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Integration Service] Error updating integration:', error);
    if (error.code === '23505') {
      throw new Error('Integration with this name already exists');
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Integration Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Integration Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Delete an integration
 */
async function deleteIntegration(agencyDatabase, agencyId, integrationId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await ensureIntegrationHubSchema(client);

    // Check if integration exists and is not a system integration
    const checkResult = await client.query(
      'SELECT id, is_system FROM public.integrations WHERE id = $1 AND agency_id = $2',
      [integrationId, agencyId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Integration not found');
    }

    if (checkResult.rows[0].is_system) {
      throw new Error('Cannot delete system integration');
    }

    const result = await client.query(
      'DELETE FROM public.integrations WHERE id = $1 AND agency_id = $2 RETURNING id',
      [integrationId, agencyId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('[Integration Service] Error deleting integration:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Integration Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Integration Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get integration logs (with optional filters)
 */
async function getIntegrationLogs(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await ensureIntegrationHubSchema(client);

    let query = `
      SELECT 
        il.*,
        i.name as integration_name,
        i.integration_type
      FROM public.integration_logs il
      LEFT JOIN public.integrations i ON il.integration_id = i.id
      WHERE il.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.integration_id) {
      query += ` AND il.integration_id = $${paramIndex}`;
      params.push(filters.integration_id);
      paramIndex++;
    }

    if (filters.log_type) {
      query += ` AND il.log_type = $${paramIndex}`;
      params.push(filters.log_type);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND il.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.direction) {
      query += ` AND il.direction = $${paramIndex}`;
      params.push(filters.direction);
      paramIndex++;
    }

    if (filters.start_date) {
      query += ` AND il.created_at >= $${paramIndex}`;
      params.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      query += ` AND il.created_at <= $${paramIndex}`;
      params.push(filters.end_date);
      paramIndex++;
    }

    query += ` ORDER BY il.created_at DESC LIMIT ${filters.limit || 100}`;

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Integration Service] Error fetching integration logs:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Integration Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Integration Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create integration log
 */
async function createIntegrationLog(agencyDatabase, logData) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await ensureIntegrationHubSchema(client);

    const result = await client.query(
      `INSERT INTO public.integration_logs (
        agency_id, integration_id, log_type, event_type, status, direction,
        request_data, response_data, error_message, error_stack,
        execution_time_ms, records_processed, records_success, records_failed, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        logData.agency_id,
        logData.integration_id,
        logData.log_type,
        logData.event_type || null,
        logData.status || 'pending',
        logData.direction || null,
        logData.request_data ? JSON.stringify(logData.request_data) : null,
        logData.response_data ? JSON.stringify(logData.response_data) : null,
        logData.error_message || null,
        logData.error_stack || null,
        logData.execution_time_ms || null,
        logData.records_processed || 0,
        logData.records_success || 0,
        logData.records_failed || 0,
        logData.metadata ? JSON.stringify(logData.metadata) : null
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('[Integration Service] Error creating integration log:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Integration Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Integration Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get integration statistics
 */
async function getIntegrationStats(agencyDatabase, agencyId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await ensureIntegrationHubSchema(client);

    const statsResult = await client.query(
      `SELECT 
        COUNT(*) as total_integrations,
        COUNT(*) FILTER (WHERE status = 'active') as active_integrations,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_integrations,
        COUNT(*) FILTER (WHERE status = 'error') as error_integrations,
        COUNT(*) FILTER (WHERE sync_enabled = true) as sync_enabled_count
      FROM public.integrations
      WHERE agency_id = $1`,
      [agencyId]
    );

    const logsResult = await client.query(
      `SELECT 
        COUNT(*) as total_logs,
        COUNT(*) FILTER (WHERE status = 'success') as success_logs,
        COUNT(*) FILTER (WHERE status = 'error') as error_logs,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as logs_last_24h
      FROM public.integration_logs
      WHERE agency_id = $1`,
      [agencyId]
    );

    return {
      integrations: statsResult.rows[0] || {},
      logs: logsResult.rows[0] || {}
    };
  } catch (error) {
    console.error('[Integration Service] Error fetching integration stats:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return { integrations: {}, logs: {} };
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Integration Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Integration Service] Error ending pool:', err);
      }
    }
  }
}

module.exports = {
  getIntegrations,
  getIntegrationById,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  getIntegrationLogs,
  createIntegrationLog,
  getIntegrationStats,
};

