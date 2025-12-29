/**
 * Workflow Engine Schema
 * 
 * Manages:
 * - workflows: Workflow definitions
 * - workflow_steps: Workflow step definitions
 * - workflow_instances: Active workflow instances
 * - workflow_approvals: Approval records
 * - automation_rules: Automation rule definitions
 * 
 * Dependencies:
 * - Requires update_updated_at_column() function
 * - Requires log_audit_change() function
 * - Requires users table (for user references)
 */

/**
 * Ensure workflows table exists
 */
async function ensureWorkflowsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.workflows (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      workflow_type VARCHAR(50) NOT NULL, -- approval, notification, automation, custom
      entity_type VARCHAR(100) NOT NULL, -- purchase_order, leave_request, expense, etc.
      trigger_event VARCHAR(100), -- created, updated, status_changed, etc.
      is_active BOOLEAN DEFAULT true,
      is_system BOOLEAN DEFAULT false, -- System workflows cannot be deleted
      version INTEGER DEFAULT 1,
      configuration JSONB DEFAULT '{}'::jsonb, -- Workflow configuration
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(agency_id, name, version)
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_workflows_agency_id ON public.workflows(agency_id);
    CREATE INDEX IF NOT EXISTS idx_workflows_workflow_type ON public.workflows(workflow_type);
    CREATE INDEX IF NOT EXISTS idx_workflows_entity_type ON public.workflows(entity_type);
    CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON public.workflows(is_active);
    CREATE INDEX IF NOT EXISTS idx_workflows_trigger_event ON public.workflows(trigger_event);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_workflows_updated_at ON public.workflows;
    CREATE TRIGGER update_workflows_updated_at
      BEFORE UPDATE ON public.workflows
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);

  // Create audit trigger
  await client.query(`
    DROP TRIGGER IF EXISTS audit_workflows_changes ON public.workflows;
    CREATE TRIGGER audit_workflows_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.workflows
      FOR EACH ROW
      EXECUTE FUNCTION public.log_audit_change();
  `);
}

/**
 * Ensure workflow_steps table exists
 */
async function ensureWorkflowStepsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.workflow_steps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL,
      step_name VARCHAR(255) NOT NULL,
      step_type VARCHAR(50) NOT NULL, -- approval, notification, condition, action, delay
      approver_type VARCHAR(50), -- user, role, department, manager, custom
      approver_id UUID REFERENCES public.users(id), -- Specific user approver
      approver_role VARCHAR(50), -- Role-based approver
      approver_department_id UUID, -- Department-based approver
      condition_expression TEXT, -- Condition logic for conditional steps
      action_config JSONB DEFAULT '{}'::jsonb, -- Action configuration
      timeout_hours INTEGER, -- Timeout in hours
      escalation_enabled BOOLEAN DEFAULT false,
      escalation_after_hours INTEGER,
      escalation_to UUID REFERENCES public.users(id),
      is_required BOOLEAN DEFAULT true,
      is_parallel BOOLEAN DEFAULT false, -- For parallel approval steps
      sequence_group INTEGER DEFAULT 0, -- For grouping parallel steps
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(workflow_id, step_number)
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON public.workflow_steps(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_steps_step_number ON public.workflow_steps(step_number);
    CREATE INDEX IF NOT EXISTS idx_workflow_steps_step_type ON public.workflow_steps(step_type);
    CREATE INDEX IF NOT EXISTS idx_workflow_steps_approver_id ON public.workflow_steps(approver_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_steps_sequence_group ON public.workflow_steps(sequence_group);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_workflow_steps_updated_at ON public.workflow_steps;
    CREATE TRIGGER update_workflow_steps_updated_at
      BEFORE UPDATE ON public.workflow_steps
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure workflow_instances table exists
 */
async function ensureWorkflowInstancesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.workflow_instances (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
      entity_type VARCHAR(100) NOT NULL,
      entity_id UUID NOT NULL, -- Reference to the entity (PO, leave request, etc.)
      status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, approved, rejected, cancelled, completed
      current_step_number INTEGER DEFAULT 1,
      started_by UUID REFERENCES public.users(id),
      started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      completed_by UUID REFERENCES public.users(id),
      rejection_reason TEXT,
      metadata JSONB DEFAULT '{}'::jsonb, -- Additional metadata
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_workflow_instances_agency_id ON public.workflow_instances(agency_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow_id ON public.workflow_instances(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON public.workflow_instances(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON public.workflow_instances(status);
    CREATE INDEX IF NOT EXISTS idx_workflow_instances_started_by ON public.workflow_instances(started_by);
    CREATE INDEX IF NOT EXISTS idx_workflow_instances_started_at ON public.workflow_instances(started_at);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_workflow_instances_updated_at ON public.workflow_instances;
    CREATE TRIGGER update_workflow_instances_updated_at
      BEFORE UPDATE ON public.workflow_instances
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure workflow_approvals table exists
 */
async function ensureWorkflowApprovalsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.workflow_approvals (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      instance_id UUID NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
      step_id UUID NOT NULL REFERENCES public.workflow_steps(id),
      step_number INTEGER NOT NULL,
      approver_id UUID NOT NULL REFERENCES public.users(id),
      status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, skipped, delegated
      action_taken_at TIMESTAMP WITH TIME ZONE,
      comments TEXT,
      delegated_to UUID REFERENCES public.users(id),
      is_timeout BOOLEAN DEFAULT false,
      timeout_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(instance_id, step_id, approver_id)
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_workflow_approvals_agency_id ON public.workflow_approvals(agency_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_approvals_instance_id ON public.workflow_approvals(instance_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_approvals_step_id ON public.workflow_approvals(step_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_approvals_approver_id ON public.workflow_approvals(approver_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_approvals_status ON public.workflow_approvals(status);
    CREATE INDEX IF NOT EXISTS idx_workflow_approvals_action_taken_at ON public.workflow_approvals(action_taken_at);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_workflow_approvals_updated_at ON public.workflow_approvals;
    CREATE TRIGGER update_workflow_approvals_updated_at
      BEFORE UPDATE ON public.workflow_approvals
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure automation_rules table exists
 */
async function ensureAutomationRulesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.automation_rules (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      rule_type VARCHAR(50) NOT NULL, -- trigger, condition, action, schedule
      entity_type VARCHAR(100) NOT NULL,
      trigger_event VARCHAR(100) NOT NULL,
      trigger_condition JSONB DEFAULT '{}'::jsonb, -- Condition to evaluate
      action_type VARCHAR(50) NOT NULL, -- create, update, notify, email, webhook, etc.
      action_config JSONB DEFAULT '{}'::jsonb, -- Action configuration
      is_active BOOLEAN DEFAULT true,
      priority INTEGER DEFAULT 0, -- Higher priority runs first
      execution_count INTEGER DEFAULT 0,
      last_executed_at TIMESTAMP WITH TIME ZONE,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(agency_id, name)
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_automation_rules_agency_id ON public.automation_rules(agency_id);
    CREATE INDEX IF NOT EXISTS idx_automation_rules_rule_type ON public.automation_rules(rule_type);
    CREATE INDEX IF NOT EXISTS idx_automation_rules_entity_type ON public.automation_rules(entity_type);
    CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger_event ON public.automation_rules(trigger_event);
    CREATE INDEX IF NOT EXISTS idx_automation_rules_is_active ON public.automation_rules(is_active);
    CREATE INDEX IF NOT EXISTS idx_automation_rules_priority ON public.automation_rules(priority);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_automation_rules_updated_at ON public.automation_rules;
    CREATE TRIGGER update_automation_rules_updated_at
      BEFORE UPDATE ON public.automation_rules
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);

  // Create audit trigger
  await client.query(`
    DROP TRIGGER IF EXISTS audit_automation_rules_changes ON public.automation_rules;
    CREATE TRIGGER audit_automation_rules_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.automation_rules
      FOR EACH ROW
      EXECUTE FUNCTION public.log_audit_change();
  `);
}

/**
 * Ensure all workflow engine tables
 */
async function ensureWorkflowSchema(client) {
  console.log('[SQL] Ensuring workflow engine schema...');
  
  try {
    await ensureWorkflowsTable(client);
    await ensureWorkflowStepsTable(client);
    await ensureWorkflowInstancesTable(client);
    await ensureWorkflowApprovalsTable(client);
    await ensureAutomationRulesTable(client);
    
    console.log('[SQL] ✅ Workflow engine schema ensured');
  } catch (error) {
    console.error('[SQL] ❌ Error ensuring workflow schema:', error.message);
    throw error;
  }
}

module.exports = {
  ensureWorkflowSchema,
  ensureWorkflowsTable,
  ensureWorkflowStepsTable,
  ensureWorkflowInstancesTable,
  ensureWorkflowApprovalsTable,
  ensureAutomationRulesTable,
};

