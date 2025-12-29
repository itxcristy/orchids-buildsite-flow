/**
 * Schema Creator - Main Orchestrator
 * 
 * Creates complete agency database schema with 53 tables by orchestrating
 * modular schema creation functions.
 * 
 * This refactored version splits the monolithic schema creation into
 * domain-specific modules for better maintainability and safety.
 */

const { ensureSharedFunctions, ensureUpdatedAtTriggers } = require('./schema/sharedFunctions');
const { ensureAuthSchema } = require('./schema/authSchema');
const { ensureAgenciesSchema } = require('./schema/agenciesSchema');
const { ensureDepartmentsSchema } = require('./schema/departmentsSchema');
const { ensureHrSchema } = require('./schema/hrSchema');
const { ensureProjectsTasksSchema } = require('./schema/projectsTasksSchema');
const { ensureClientsFinancialSchema } = require('./schema/clientsFinancialSchema');
const { ensureCrmSchema } = require('./schema/crmSchema');
const { ensureCrmEnhancementsSchema } = require('./schema/crmEnhancementsSchema');
const { ensureGstSchema } = require('./schema/gstSchema');
const { ensureReimbursementSchema } = require('./schema/reimbursementSchema');
const { ensureMiscSchema } = require('./schema/miscSchema');
const { ensureMessagingSchema } = require('./schema/messagingSchema');
const { ensureSlackIntegrationSchema } = require('./schema/slackIntegrationSchema');
const { ensureInventorySchema } = require('./schema/inventorySchema');
const { ensureProcurementSchema } = require('./schema/procurementSchema');
const { ensureFinancialSchema } = require('./schema/financialSchema');
const { ensureReportingSchema } = require('./schema/reportingSchema');
const { ensureWebhooksSchema } = require('./schema/webhooksSchema');
const { ensureProjectEnhancementsSchema } = require('./schema/projectEnhancementsSchema');
const { ensureSSOSchema } = require('./schema/ssoSchema');
const { ensureAssetManagementSchema } = require('./schema/assetManagementSchema');
const { ensureWorkflowSchema } = require('./schema/workflowSchema');
const { ensureIntegrationHubSchema } = require('./schema/integrationHubSchema');
const { ensureIndexesAndFixes } = require('./schema/indexesAndFixes');
const { quickSyncSchema } = require('./schemaSyncService');
// Lazy load SchemaLogger to avoid potential circular dependency issues
let SchemaLogger;
function getSchemaLogger() {
  if (!SchemaLogger) {
    SchemaLogger = require('./schemaValidator').SchemaLogger;
  }
  return SchemaLogger;
}

/**
 * Initialize schema versioning tables
 * Moved here to break circular dependency with schemaValidator
 * @param {Object} client - PostgreSQL client
 */
async function initializeSchemaVersioning(client) {
  const logger = getSchemaLogger();
  try {
    // Create schema_migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(20) PRIMARY KEY,
        description TEXT,
        applied_at TIMESTAMP DEFAULT NOW(),
        checksum VARCHAR(64),
        success BOOLEAN DEFAULT true
      )
    `);

    // Create schema_info table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_info (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Set initial schema version if not exists
    await client.query(`
      INSERT INTO schema_info (key, value) 
      VALUES ('schema_version', '1.0.0') 
      ON CONFLICT (key) DO NOTHING
    `);

    logger.info('Schema versioning initialized');
  } catch (error) {
    logger.error('Failed to initialize schema versioning', error);
    throw error;
  }
}

/**
 * Create complete agency database schema
 * 
 * This function orchestrates the creation of all tables, indexes, functions,
 * triggers, and views in the correct dependency order.
 * 
 * Execution order:
 * 1. Shared functions, types, and extensions (foundational)
 * 2. Authentication and authorization (users, profiles, roles)
 * 3. Agencies (agency_settings)
 * 4. Departments (depends on profiles)
 * 5. HR (depends on users)
 * 6. Projects and Tasks (depends on clients)
 * 7. Clients and Financial (depends on users)
 * 8. CRM (depends on users)
 * 9. GST (depends on invoices)
 * 10. Reimbursement (depends on users)
 * 11. Miscellaneous (depends on users)
 * 12. Indexes and backward compatibility fixes
 * 13. Updated_at triggers for all tables
 * 
 * @param {Object} client - PostgreSQL client connection
 */
async function createAgencySchema(client) {
  console.log('[SQL] Creating complete agency schema...');

  // Use advisory lock to prevent concurrent schema creation
  const lockKey = 'agency_schema_creation';
  let lockAcquired = false;
  
  try {
    // Try to acquire advisory lock (non-blocking)
    const lockResult = await client.query(`
      SELECT pg_try_advisory_lock(hashtext($1)::bigint) as acquired
    `, [lockKey]);
    
    lockAcquired = lockResult.rows[0].acquired;
    
    if (!lockAcquired) {
      // Another process is creating the schema, wait and check if it's done
      console.log('[SQL] Another process is creating schema, waiting...');
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Check if critical tables exist
        const checkResult = await client.query(`
          SELECT COUNT(*) as count
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('users', 'profiles', 'attendance')
        `);
        if (checkResult.rows[0].count >= 3) {
          console.log('[SQL] ✅ Schema creation completed by another process');
          return; // Schema was created by another process
        }
      }
      throw new Error('Schema creation timeout - another process may be stuck');
    }

    try {
      // Step 1: Ensure shared functions, types, and extensions
      console.log('[SQL] Step 1/21: Ensuring shared functions, types, and extensions...');
      await ensureSharedFunctions(client);
    
    // Verify critical functions exist
    const functionCheck = await client.query(`
      SELECT proname FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
      AND proname IN ('update_updated_at_column', 'log_audit_change', 'current_user_id')
    `);
    console.log('[SQL] ✅ Shared functions verified:', functionCheck.rows.map(r => r.proname).join(', '));

    // Step 1.5: Initialize schema versioning (must be early so migrations can be tracked)
    console.log('[SQL] Step 1.5/21: Initializing schema versioning...');
    
    // Verify function exists before calling (safeguard against module loading issues)
    if (typeof initializeSchemaVersioning !== 'function') {
      throw new Error('initializeSchemaVersioning is not a function. This may indicate a module loading issue. Please restart the server.');
    }
    
    await initializeSchemaVersioning(client);
    console.log('[SQL] ✅ Schema versioning initialized');

    // Step 2: Authentication and authorization (foundational - must come first)
    console.log('[SQL] Step 2/19: Ensuring authentication schema...');
    await ensureAuthSchema(client);
    
    // Verify users table exists
    const usersTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    if (!usersTableCheck.rows[0].exists) {
      throw new Error('Users table was not created successfully');
    }
    console.log('[SQL] ✅ Users table verified');

    // Step 3: Agencies (foundational)
    console.log('[SQL] Step 3/20: Ensuring agencies schema...');
    await ensureAgenciesSchema(client);

    // Step 4: Departments (depends on profiles)
    console.log('[SQL] Step 4/20: Ensuring departments schema...');
    await ensureDepartmentsSchema(client);

    // Step 5: HR (depends on users)
    console.log('[SQL] Step 5/20: Ensuring HR schema...');
    await ensureHrSchema(client);
    
    // Verify attendance table exists
    const attendanceTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'attendance'
      );
    `);
    if (!attendanceTableCheck.rows[0].exists) {
      throw new Error('Attendance table was not created successfully');
    }
    console.log('[SQL] ✅ Attendance table verified');

    // Step 6: Clients and Financial (depends on users, must come before projects)
    console.log('[SQL] Step 6/20: Ensuring clients and financial schema...');
    await ensureClientsFinancialSchema(client);

    // Step 7: Projects and Tasks (depends on clients)
    console.log('[SQL] Step 7/20: Ensuring projects and tasks schema...');
    await ensureProjectsTasksSchema(client);

    // Step 8: CRM (depends on users)
    console.log('[SQL] Step 8/20: Ensuring CRM schema...');
    await ensureCrmSchema(client);
    
    // Step 8.5: CRM Enhancements (depends on CRM base schema)
    console.log('[SQL] Step 8.5/20: Ensuring CRM enhancements schema...');
    await ensureCrmEnhancementsSchema(client);

    // Step 9: GST (depends on invoices)
    console.log('[SQL] Step 9/19: Ensuring GST schema...');
    await ensureGstSchema(client);

    // Step 10: Reimbursement (depends on users)
    console.log('[SQL] Step 10/19: Ensuring reimbursement schema...');
    await ensureReimbursementSchema(client);

    // Step 11: Inventory Management (standalone module)
    console.log('[SQL] Step 11/19: Ensuring inventory management schema...');
    await ensureInventorySchema(client);

    // Step 12: Procurement Management (depends on inventory - suppliers, warehouses)
    console.log('[SQL] Step 12/19: Ensuring procurement management schema...');
    await ensureProcurementSchema(client);

    // Step 12.5: Add foreign key constraints that depend on procurement tables
    console.log('[SQL] Step 12.5/19: Adding procurement foreign key constraints to inventory tables...');
    try {
      // Add purchase_orders FK to serial_numbers if not exists
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'purchase_orders'
          ) AND EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'serial_numbers'
          ) THEN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.table_constraints 
              WHERE constraint_schema = 'public' 
              AND table_name = 'serial_numbers' 
              AND constraint_name = 'serial_numbers_purchase_order_id_fkey'
            ) THEN
              ALTER TABLE public.serial_numbers 
              ADD CONSTRAINT serial_numbers_purchase_order_id_fkey 
              FOREIGN KEY (purchase_order_id) 
              REFERENCES public.purchase_orders(id);
            END IF;
          END IF;
        END $$;
      `);

      // Add purchase_orders FK to batches if not exists
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'purchase_orders'
          ) AND EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'batches'
          ) THEN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.table_constraints 
              WHERE constraint_schema = 'public' 
              AND table_name = 'batches' 
              AND constraint_name = 'batches_purchase_order_id_fkey'
            ) THEN
              ALTER TABLE public.batches 
              ADD CONSTRAINT batches_purchase_order_id_fkey 
              FOREIGN KEY (purchase_order_id) 
              REFERENCES public.purchase_orders(id);
            END IF;
          END IF;
        END $$;
      `);
      console.log('[SQL] ✅ Procurement foreign key constraints added to inventory tables');
    } catch (error) {
      console.warn('[SQL] ⚠️  Warning adding procurement FKs (non-fatal):', error.message);
    }

    // Step 13: Financial Enhancements (depends on chart_of_accounts)
    console.log('[SQL] Step 13/19: Ensuring financial enhancements schema...');
    await ensureFinancialSchema(client);

    // Step 14: Advanced Reporting (depends on custom_reports)
    console.log('[SQL] Step 14/18: Ensuring advanced reporting schema...');
    await ensureReportingSchema(client);

    // Step 15: Webhooks (standalone)
    console.log('[SQL] Step 15/19: Ensuring webhooks schema...');
    await ensureWebhooksSchema(client);

    // Step 16: Project Management Enhancements (depends on projects, tasks)
    console.log('[SQL] Step 16/20: Ensuring project management enhancements schema...');
    await ensureProjectEnhancementsSchema(client);

    // Step 17: SSO Configuration (standalone)
    console.log('[SQL] Step 17/20: Ensuring SSO schema...');
    await ensureSSOSchema(client);

    // Step 17.5: Session Management (depends on users)
    console.log('[SQL] Step 17.5/20: Ensuring session management schema...');
    const { ensureSessionManagementSchema } = require('./schema/sessionManagementSchema');
    await ensureSessionManagementSchema(client);

    // Step 18: Miscellaneous (depends on users)
    console.log('[SQL] Step 18/21: Ensuring miscellaneous schema...');
    await ensureMiscSchema(client);

    // Step 18.5: Messaging (depends on users, agencies)
    console.log('[SQL] Step 18.5/22: Ensuring messaging schema...');
    await ensureMessagingSchema(client);

    // Step 18.5.5: Slack Integration (depends on messaging, users)
    console.log('[SQL] Step 18.5.5/22: Ensuring Slack integration schema...');
    await ensureSlackIntegrationSchema(client);

    // Step 18.6: Asset Management (depends on suppliers, users, departments)
    console.log('[SQL] Step 18.6/22: Ensuring asset management schema...');
    await ensureAssetManagementSchema(client);

    // Step 18.7: Workflow Engine (depends on users)
    console.log('[SQL] Step 18.7/22: Ensuring workflow engine schema...');
    await ensureWorkflowSchema(client);

    // Step 18.8: Integration Hub (depends on users, webhooks)
    console.log('[SQL] Step 18.8/22: Ensuring integration hub schema...');
    await ensureIntegrationHubSchema(client);

    // Step 18.9: Create unified_employees view (depends on users, profiles, employee_details, user_roles)
    console.log('[SQL] Step 18.9/22: Ensuring unified_employees view...');
    const { ensureUnifiedEmployeesView } = require('./schema/sharedFunctions');
    await ensureUnifiedEmployeesView(client);
    console.log('[SQL] ✅ unified_employees view verified');

    // Step 19: Indexes and backward compatibility fixes
    console.log('[SQL] Step 19/22: Ensuring indexes and backward compatibility fixes...');
    await ensureIndexesAndFixes(client);

    // Step 20: Updated_at triggers for all tables with updated_at column
    console.log('[SQL] Step 20/22: Ensuring updated_at triggers...');
    const tablesWithUpdatedAt = [
      'chart_of_accounts', 'quotations', 'quotation_templates', 'quotation_line_items',
      'tasks', 'task_assignments', 'task_comments', 'task_time_tracking',
      'leave_types', 'leave_requests', 'payroll_periods', 'payroll',
      'employee_salary_details', 'employee_files',
      'job_categories', 'jobs', 'job_cost_items',
      'lead_sources', 'leads', 'crm_activities', 'sales_pipeline',
      'gst_settings', 'gst_returns', 'gst_transactions',
      'expense_categories', 'reimbursement_requests', 'receipts',
      'company_events', 'holidays', 'calendar_settings',
      'team_members', 'custom_reports', 'role_change_requests', 'feature_flags',
      'permissions', 'role_permissions', 'user_preferences',
      'message_channels', 'message_threads', 'messages', 'message_drafts',
      'asset_categories', 'asset_locations', 'assets', 'asset_depreciation', 'asset_maintenance', 'asset_disposals',
      'workflows', 'workflow_steps', 'workflow_instances', 'workflow_approvals', 'automation_rules',
      'integrations', 'integration_logs', 'api_keys'
    ];

    await ensureUpdatedAtTriggers(client, tablesWithUpdatedAt);

    // Step 21: Auto-sync missing columns (automatic schema synchronization)
    console.log('[SQL] Step 21/21: Auto-syncing missing columns...');
    try {
      const syncResult = await quickSyncSchema(client);
      if (syncResult.columnsCreated > 0) {
        console.log(`[SQL] ✅ Auto-sync created ${syncResult.columnsCreated} missing columns`);
        if (syncResult.errors && syncResult.errors.length > 0) {
          console.warn(`[SQL] ⚠️  Auto-sync had ${syncResult.errors.length} non-fatal errors`);
        }
      } else {
        console.log('[SQL] ✅ Auto-sync: All columns are up to date');
      }
    } catch (syncError) {
      // Log but don't fail - schema creation should succeed even if sync has issues
      console.warn('[SQL] ⚠️  Auto-sync encountered errors (non-fatal, continuing):', syncError.message);
      if (syncError.stack) {
        console.warn('[SQL] Auto-sync error stack:', syncError.stack.split('\n').slice(0, 3).join('\n'));
      }
    }

    // Update schema version to current version after successful creation
    const CURRENT_SCHEMA_VERSION = '1.0.0';
    await client.query(`
      INSERT INTO schema_info (key, value, updated_at) 
      VALUES ('schema_version', $1, NOW()) 
      ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
    `, [CURRENT_SCHEMA_VERSION]);
    console.log(`[SQL] ✅ Schema version set to ${CURRENT_SCHEMA_VERSION}`);

    // Final verification: Count all tables
    const tableCount = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
      console.log(`[SQL] ✅ Agency schema created successfully with ${tableCount.rows[0].count} tables, unified_employees view, and migrations applied`);
    } finally {
      // Release advisory lock
      if (lockAcquired) {
        await client.query(`SELECT pg_advisory_unlock(hashtext($1)::bigint)`, [lockKey]);
      }
    }
  } catch (error) {
    console.error('[SQL] ❌ Error creating agency schema:', error.message);
    console.error('[SQL] Error stack:', error.stack);
    
    // Release lock if we had it
    if (lockAcquired) {
      try {
        await client.query(`SELECT pg_advisory_unlock(hashtext($1)::bigint)`, [lockKey]);
      } catch (unlockError) {
        // Ignore unlock errors
      }
    }
    
    throw error;
  }
}

module.exports = {
  createAgencySchema,
};
