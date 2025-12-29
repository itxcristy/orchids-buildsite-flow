/**
 * Settings Service
 * Handles module-specific settings management
 */

const { getAgencyDb } = require('../utils/poolManager');

/**
 * Get inventory settings
 */
async function getInventorySettings(agencyDatabase, agencyId) {
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT settings FROM public.module_settings 
       WHERE agency_id = $1 AND module = 'inventory'`,
      [agencyId]
    );

    if (result.rows.length === 0) {
      // Return default settings
      return {
        default_valuation_method: 'weighted_average',
        auto_reorder_enabled: false,
        low_stock_alert_enabled: true,
        low_stock_threshold_percentage: 20,
        default_unit_of_measure: 'pcs',
        enable_serial_tracking: false,
        enable_batch_tracking: false,
        require_serial_on_sale: false,
        auto_calculate_cost: true,
        include_shipping_in_cost: false,
        notify_on_low_stock: true,
        notify_on_reorder: true,
        notify_on_stock_adjustment: false,
      };
    }

    return result.rows[0].settings || {};
  } catch (error) {
    console.error('[Settings Service] Error fetching inventory settings:', error);
    if (error.code === '42P01') {
      // Table doesn't exist, return defaults
      return {
        default_valuation_method: 'weighted_average',
        auto_reorder_enabled: false,
        low_stock_alert_enabled: true,
        low_stock_threshold_percentage: 20,
        default_unit_of_measure: 'pcs',
        enable_serial_tracking: false,
        enable_batch_tracking: false,
        require_serial_on_sale: false,
        auto_calculate_cost: true,
        include_shipping_in_cost: false,
        notify_on_low_stock: true,
        notify_on_reorder: true,
        notify_on_stock_adjustment: false,
      };
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Settings Service] Error releasing client:', err);
      }
    }
    if (pool) {
      try {
        await pool.end();
      } catch (err) {
        console.error('[Settings Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update inventory settings
 */
async function updateInventorySettings(agencyDatabase, agencyId, settings, userId) {
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if settings exist
    const checkResult = await client.query(
      `SELECT id FROM public.module_settings 
       WHERE agency_id = $1 AND module = 'inventory'`,
      [agencyId]
    );

    if (checkResult.rows.length === 0) {
      // Insert new settings
      await client.query(
        `INSERT INTO public.module_settings (id, agency_id, module, settings, created_by, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'inventory', $2::jsonb, $3, NOW(), NOW())`,
        [agencyId, JSON.stringify(settings), userId]
      );
    } else {
      // Update existing settings
      await client.query(
        `UPDATE public.module_settings 
         SET settings = $1::jsonb, updated_at = NOW()
         WHERE agency_id = $2 AND module = 'inventory'`,
        [JSON.stringify(settings), agencyId]
      );
    }

    await client.query('COMMIT');
    return settings;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Settings Service] Error updating inventory settings:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Settings Service] Error releasing client:', err);
      }
    }
    if (pool) {
      try {
        await pool.end();
      } catch (err) {
        console.error('[Settings Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get procurement settings
 */
async function getProcurementSettings(agencyDatabase, agencyId) {
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT settings FROM public.module_settings 
       WHERE agency_id = $1 AND module = 'procurement'`,
      [agencyId]
    );

    if (result.rows.length === 0) {
      return {
        default_currency: 'USD',
        default_payment_terms: 'net_30',
        require_approval_for_po: true,
        auto_create_po_from_requisition: false,
        rfq_validity_days: 30,
        require_multiple_quotes: false,
        notify_on_po_created: true,
        notify_on_po_approved: true,
        notify_on_grn_received: true,
        notify_on_payment_due: true,
      };
    }

    return result.rows[0].settings || {};
  } catch (error) {
    console.error('[Settings Service] Error fetching procurement settings:', error);
    if (error.code === '42P01') {
      return {
        default_currency: 'USD',
        default_payment_terms: 'net_30',
        require_approval_for_po: true,
        auto_create_po_from_requisition: false,
        rfq_validity_days: 30,
        require_multiple_quotes: false,
        notify_on_po_created: true,
        notify_on_po_approved: true,
        notify_on_grn_received: true,
        notify_on_payment_due: true,
      };
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Settings Service] Error releasing client:', err);
      }
    }
    if (pool) {
      try {
        await pool.end();
      } catch (err) {
        console.error('[Settings Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update procurement settings
 */
async function updateProcurementSettings(agencyDatabase, agencyId, settings, userId) {
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const checkResult = await client.query(
      `SELECT id FROM public.module_settings 
       WHERE agency_id = $1 AND module = 'procurement'`,
      [agencyId]
    );

    if (checkResult.rows.length === 0) {
      await client.query(
        `INSERT INTO public.module_settings (id, agency_id, module, settings, created_by, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'procurement', $2::jsonb, $3, NOW(), NOW())`,
        [agencyId, JSON.stringify(settings), userId]
      );
    } else {
      await client.query(
        `UPDATE public.module_settings 
         SET settings = $1::jsonb, updated_at = NOW()
         WHERE agency_id = $2 AND module = 'procurement'`,
        [JSON.stringify(settings), agencyId]
      );
    }

    await client.query('COMMIT');
    return settings;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Settings Service] Error updating procurement settings:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Settings Service] Error releasing client:', err);
      }
    }
    if (pool) {
      try {
        await pool.end();
      } catch (err) {
        console.error('[Settings Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get asset settings
 */
async function getAssetSettings(agencyDatabase, agencyId) {
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT settings FROM public.module_settings 
       WHERE agency_id = $1 AND module = 'assets'`,
      [agencyId]
    );

    if (result.rows.length === 0) {
      return {
        default_depreciation_method: 'straight_line',
        default_useful_life_years: 5,
        auto_generate_asset_numbers: true,
        asset_number_prefix: 'AST',
        require_serial_numbers: false,
        require_purchase_dates: true,
        depreciation_calculation_frequency: 'monthly',
        auto_post_depreciation: false,
        depreciation_rounding: 2,
        allow_manual_depreciation: true,
        auto_schedule_maintenance: false,
        maintenance_reminder_days: 30,
        require_maintenance_approval: false,
        track_maintenance_costs: true,
        require_location_assignment: false,
        allow_multiple_locations: false,
        track_location_history: true,
        require_disposal_approval: true,
        auto_calculate_disposal_gain_loss: true,
        disposal_approval_workflow: '',
        notify_low_value_assets: false,
        low_value_threshold: 1000,
        notify_upcoming_maintenance: true,
        notify_disposal_requests: true,
        notify_depreciation_posted: false,
        sync_with_accounting: false,
        accounting_integration: '',
        auto_create_journal_entries: false,
      };
    }

    return result.rows[0].settings || {};
  } catch (error) {
    console.error('[Settings Service] Error fetching asset settings:', error);
    if (error.code === '42P01') {
      return {
        default_depreciation_method: 'straight_line',
        default_useful_life_years: 5,
        auto_generate_asset_numbers: true,
        asset_number_prefix: 'AST',
        require_serial_numbers: false,
        require_purchase_dates: true,
        depreciation_calculation_frequency: 'monthly',
        auto_post_depreciation: false,
        depreciation_rounding: 2,
        allow_manual_depreciation: true,
        auto_schedule_maintenance: false,
        maintenance_reminder_days: 30,
        require_maintenance_approval: false,
        track_maintenance_costs: true,
        require_location_assignment: false,
        allow_multiple_locations: false,
        track_location_history: true,
        require_disposal_approval: true,
        auto_calculate_disposal_gain_loss: true,
        disposal_approval_workflow: '',
        notify_low_value_assets: false,
        low_value_threshold: 1000,
        notify_upcoming_maintenance: true,
        notify_disposal_requests: true,
        notify_depreciation_posted: false,
        sync_with_accounting: false,
        accounting_integration: '',
        auto_create_journal_entries: false,
      };
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Settings Service] Error releasing client:', err);
      }
    }
    if (pool) {
      try {
        await pool.end();
      } catch (err) {
        console.error('[Settings Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update asset settings
 */
async function updateAssetSettings(agencyDatabase, agencyId, settings, userId) {
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const checkResult = await client.query(
      `SELECT id FROM public.module_settings 
       WHERE agency_id = $1 AND module = 'assets'`,
      [agencyId]
    );

    if (checkResult.rows.length === 0) {
      await client.query(
        `INSERT INTO public.module_settings (id, agency_id, module, settings, created_by, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'assets', $2::jsonb, $3, NOW(), NOW())`,
        [agencyId, JSON.stringify(settings), userId]
      );
    } else {
      await client.query(
        `UPDATE public.module_settings 
         SET settings = $1::jsonb, updated_at = NOW()
         WHERE agency_id = $2 AND module = 'assets'`,
        [JSON.stringify(settings), agencyId]
      );
    }

    await client.query('COMMIT');
    return settings;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Settings Service] Error updating asset settings:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Settings Service] Error releasing client:', err);
      }
    }
    if (pool) {
      try {
        await pool.end();
      } catch (err) {
        console.error('[Settings Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get workflow settings
 */
async function getWorkflowSettings(agencyDatabase, agencyId) {
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT settings FROM public.module_settings 
       WHERE agency_id = $1 AND module = 'workflow'`,
      [agencyId]
    );

    if (result.rows.length === 0) {
      return {
        enable_workflows: true,
        default_workflow_type: 'approval',
        auto_start_workflows: true,
        allow_parallel_approvals: true,
        max_workflow_steps: 10,
        approval_timeout_days: 7,
        require_comments_on_rejection: true,
        allow_delegation: true,
        enable_auto_escalation: false,
        escalation_notification: true,
        notify_on_workflow_start: true,
        notify_on_approval_required: true,
        notify_on_workflow_completion: true,
        notify_on_workflow_rejection: true,
        notify_on_escalation: true,
        notify_on_timeout: true,
        enable_automation_rules: true,
        auto_execute_rules: true,
        execution_priority: 'normal',
        max_concurrent_executions: 5,
        protect_system_workflows: true,
        allow_workflow_deletion: true,
        require_approval_for_changes: false,
        audit_workflow_changes: true,
        workflow_timeout_minutes: 60,
        enable_caching: true,
        cache_ttl_minutes: 10,
        max_retry_attempts: 3,
        enable_external_sync: false,
        webhook_on_completion: false,
        webhook_url: '',
      };
    }

    return result.rows[0].settings || {};
  } catch (error) {
    console.error('[Settings Service] Error fetching workflow settings:', error);
    if (error.code === '42P01') {
      return {
        enable_workflows: true,
        default_workflow_type: 'approval',
        auto_start_workflows: true,
        allow_parallel_approvals: true,
        max_workflow_steps: 10,
        approval_timeout_days: 7,
        require_comments_on_rejection: true,
        allow_delegation: true,
        enable_auto_escalation: false,
        escalation_notification: true,
        notify_on_workflow_start: true,
        notify_on_approval_required: true,
        notify_on_workflow_completion: true,
        notify_on_workflow_rejection: true,
        notify_on_escalation: true,
        notify_on_timeout: true,
        enable_automation_rules: true,
        auto_execute_rules: true,
        execution_priority: 'normal',
        max_concurrent_executions: 5,
        protect_system_workflows: true,
        allow_workflow_deletion: true,
        require_approval_for_changes: false,
        audit_workflow_changes: true,
        workflow_timeout_minutes: 60,
        enable_caching: true,
        cache_ttl_minutes: 10,
        max_retry_attempts: 3,
        enable_external_sync: false,
        webhook_on_completion: false,
        webhook_url: '',
      };
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Settings Service] Error releasing client:', err);
      }
    }
    if (pool) {
      try {
        await pool.end();
      } catch (err) {
        console.error('[Settings Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update workflow settings
 */
async function updateWorkflowSettings(agencyDatabase, agencyId, settings, userId) {
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const checkResult = await client.query(
      `SELECT id FROM public.module_settings 
       WHERE agency_id = $1 AND module = 'workflow'`,
      [agencyId]
    );

    if (checkResult.rows.length === 0) {
      await client.query(
        `INSERT INTO public.module_settings (id, agency_id, module, settings, created_by, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'workflow', $2::jsonb, $3, NOW(), NOW())`,
        [agencyId, JSON.stringify(settings), userId]
      );
    } else {
      await client.query(
        `UPDATE public.module_settings 
         SET settings = $1::jsonb, updated_at = NOW()
         WHERE agency_id = $2 AND module = 'workflow'`,
        [JSON.stringify(settings), agencyId]
      );
    }

    await client.query('COMMIT');
    return settings;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Settings Service] Error updating workflow settings:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Settings Service] Error releasing client:', err);
      }
    }
    if (pool) {
      try {
        await pool.end();
      } catch (err) {
        console.error('[Settings Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get integration settings
 */
async function getIntegrationSettings(agencyDatabase, agencyId) {
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT settings FROM public.module_settings 
       WHERE agency_id = $1 AND module = 'integration'`,
      [agencyId]
    );

    if (result.rows.length === 0) {
      return {
        enable_integrations: true,
        allow_custom_integrations: true,
        require_integration_approval: false,
        max_integrations_per_agency: 50,
        enable_api_keys: true,
        api_key_expiration_days: 365,
        require_api_key_rotation: false,
        api_key_rotation_days: 90,
        api_key_rate_limit: 1000,
        api_key_rate_limit_window: 60,
        enable_webhooks: true,
        webhook_timeout_seconds: 30,
        webhook_retry_attempts: 3,
        webhook_retry_delay_seconds: 5,
        require_webhook_verification: true,
        webhook_secret_rotation_days: 90,
        encrypt_credentials: true,
        require_ssl: true,
        allow_self_signed_certs: false,
        audit_integration_access: true,
        log_all_api_calls: false,
        notify_on_integration_failure: true,
        notify_on_api_limit_reached: true,
        notify_on_webhook_failure: true,
        notify_on_credential_expiry: true,
        notification_email: '',
        enable_auto_sync: false,
        sync_frequency: 'hourly',
        max_sync_records: 1000,
        sync_timeout_minutes: 15,
        enable_caching: true,
        cache_ttl_minutes: 10,
        max_concurrent_requests: 10,
        request_timeout_seconds: 60,
      };
    }

    return result.rows[0].settings || {};
  } catch (error) {
    console.error('[Settings Service] Error fetching integration settings:', error);
    if (error.code === '42P01') {
      return {
        enable_integrations: true,
        allow_custom_integrations: true,
        require_integration_approval: false,
        max_integrations_per_agency: 50,
        enable_api_keys: true,
        api_key_expiration_days: 365,
        require_api_key_rotation: false,
        api_key_rotation_days: 90,
        api_key_rate_limit: 1000,
        api_key_rate_limit_window: 60,
        enable_webhooks: true,
        webhook_timeout_seconds: 30,
        webhook_retry_attempts: 3,
        webhook_retry_delay_seconds: 5,
        require_webhook_verification: true,
        webhook_secret_rotation_days: 90,
        encrypt_credentials: true,
        require_ssl: true,
        allow_self_signed_certs: false,
        audit_integration_access: true,
        log_all_api_calls: false,
        notify_on_integration_failure: true,
        notify_on_api_limit_reached: true,
        notify_on_webhook_failure: true,
        notify_on_credential_expiry: true,
        notification_email: '',
        enable_auto_sync: false,
        sync_frequency: 'hourly',
        max_sync_records: 1000,
        sync_timeout_minutes: 15,
        enable_caching: true,
        cache_ttl_minutes: 10,
        max_concurrent_requests: 10,
        request_timeout_seconds: 60,
      };
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Settings Service] Error releasing client:', err);
      }
    }
    if (pool) {
      try {
        await pool.end();
      } catch (err) {
        console.error('[Settings Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update integration settings
 */
async function updateIntegrationSettings(agencyDatabase, agencyId, settings, userId) {
  const pool = await getAgencyDb(agencyDatabase);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const checkResult = await client.query(
      `SELECT id FROM public.module_settings 
       WHERE agency_id = $1 AND module = 'integration'`,
      [agencyId]
    );

    if (checkResult.rows.length === 0) {
      await client.query(
        `INSERT INTO public.module_settings (id, agency_id, module, settings, created_by, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'integration', $2::jsonb, $3, NOW(), NOW())`,
        [agencyId, JSON.stringify(settings), userId]
      );
    } else {
      await client.query(
        `UPDATE public.module_settings 
         SET settings = $1::jsonb, updated_at = NOW()
         WHERE agency_id = $2 AND module = 'integration'`,
        [JSON.stringify(settings), agencyId]
      );
    }

    await client.query('COMMIT');
    return settings;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Settings Service] Error updating integration settings:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Settings Service] Error releasing client:', err);
      }
    }
    if (pool) {
      try {
        await pool.end();
      } catch (err) {
        console.error('[Settings Service] Error ending pool:', err);
      }
    }
  }
}

module.exports = {
  getInventorySettings,
  updateInventorySettings,
  getProcurementSettings,
  updateProcurementSettings,
  getAssetSettings,
  updateAssetSettings,
  getWorkflowSettings,
  updateWorkflowSettings,
  getIntegrationSettings,
  updateIntegrationSettings,
};

