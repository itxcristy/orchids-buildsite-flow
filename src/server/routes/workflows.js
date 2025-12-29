/**
 * Workflow Management Routes
 * Handles all workflow operations
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const workflowService = require('../services/workflowService');
const { cacheMiddleware } = require('../services/cacheService');

/**
 * Validate UUID format
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * GET /api/workflows
 * Get all workflows (with optional filters)
 */
router.get('/', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const filters = {
    workflow_type: req.query.workflow_type,
    entity_type: req.query.entity_type,
    is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
    search: req.query.search,
  };

  const workflows = await workflowService.getWorkflows(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: workflows,
  });
}));

/**
 * POST /api/workflows
 * Create a new workflow
 */
router.post('/', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const workflow = await workflowService.createWorkflow(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: workflow,
    message: 'Workflow created successfully',
  });
}));

/**
 * GET /api/workflows/instances
 * Get all workflow instances (with optional filters)
 * NOTE: This must come before /:workflowId route to avoid route conflicts
 */
router.get('/instances', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const filters = {
    workflow_id: req.query.workflow_id,
    entity_type: req.query.entity_type,
    entity_id: req.query.entity_id,
    status: req.query.status,
    started_by: req.query.started_by,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
  };

  const instances = await workflowService.getWorkflowInstances(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: instances,
  });
}));

/**
 * GET /api/workflows/instances/:instanceId
 * Get a single workflow instance by ID
 */
router.get('/instances/:instanceId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { instanceId } = req.params;

  const instance = await workflowService.getWorkflowInstanceById(agencyDatabase, agencyId, instanceId);

  res.json({
    success: true,
    data: instance,
  });
}));

/**
 * GET /api/workflows/instances/:instanceId/approvals
 * Get approvals for a workflow instance
 */
router.get('/instances/:instanceId/approvals', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { instanceId } = req.params;

  const approvals = await workflowService.getWorkflowApprovals(agencyDatabase, agencyId, instanceId);

  res.json({
    success: true,
    data: approvals,
  });
}));

/**
 * POST /api/workflows/instances
 * Create a new workflow instance
 */
router.post('/instances', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const instance = await workflowService.createWorkflowInstance(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: instance,
    message: 'Workflow instance created successfully',
  });
}));

/**
 * PUT /api/workflows/instances/:instanceId
 * Update a workflow instance
 */
router.put('/instances/:instanceId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { instanceId } = req.params;
  const userId = req.user.id;

  const instance = await workflowService.updateWorkflowInstance(
    agencyDatabase,
    agencyId,
    instanceId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: instance,
    message: 'Workflow instance updated successfully',
  });
}));

/**
 * POST /api/workflows/instances/:instanceId/cancel
 * Cancel a workflow instance
 */
router.post('/instances/:instanceId/cancel', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { instanceId } = req.params;
  const userId = req.user.id;
  const { reason } = req.body;

  const instance = await workflowService.cancelWorkflowInstance(
    agencyDatabase,
    agencyId,
    instanceId,
    userId,
    reason
  );

  res.json({
    success: true,
    data: instance,
    message: 'Workflow instance cancelled successfully',
  });
}));

/**
 * GET /api/workflows/approvals/pending
 * Get all pending approvals for the current user
 * NOTE: This must come before /:workflowId route to avoid route conflicts
 */
router.get('/approvals/pending', authenticate, requireAgencyContext, cacheMiddleware(60), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const approvals = await workflowService.getAllPendingApprovals(agencyDatabase, agencyId, userId);

  res.json({
    success: true,
    data: approvals,
  });
}));

/**
 * PUT /api/workflows/approvals/:approvalId
 * Update a workflow approval (approve/reject)
 */
router.put('/approvals/:approvalId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { approvalId } = req.params;
  const userId = req.user.id;

  const approval = await workflowService.updateWorkflowApproval(
    agencyDatabase,
    agencyId,
    approvalId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: approval,
    message: 'Approval updated successfully',
  });
}));

/**
 * GET /api/workflows/automation
 * Get all automation rules
 * NOTE: This must come before /:workflowId route to avoid route conflicts
 */
router.get('/automation', authenticate, requireAgencyContext, cacheMiddleware(300), asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const filters = {
    rule_type: req.query.rule_type,
    entity_type: req.query.entity_type,
    is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
    search: req.query.search,
  };

  const rules = await workflowService.getAutomationRules(agencyDatabase, agencyId, filters);

  res.json({
    success: true,
    data: rules,
  });
}));

/**
 * GET /api/workflows/automation/:ruleId
 * Get automation rule by ID
 */
router.get('/automation/:ruleId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { ruleId } = req.params;

  const rule = await workflowService.getAutomationRuleById(agencyDatabase, agencyId, ruleId);

  res.json({
    success: true,
    data: rule,
  });
}));

/**
 * POST /api/workflows/automation
 * Create automation rule
 */
router.post('/automation', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const rule = await workflowService.createAutomationRule(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.status(201).json({
    success: true,
    data: rule,
    message: 'Automation rule created successfully',
  });
}));

/**
 * PUT /api/workflows/automation/:ruleId
 * Update automation rule
 */
router.put('/automation/:ruleId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { ruleId } = req.params;
  const userId = req.user.id;

  const rule = await workflowService.updateAutomationRule(
    agencyDatabase,
    agencyId,
    ruleId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: rule,
    message: 'Automation rule updated successfully',
  });
}));

/**
 * DELETE /api/workflows/automation/:ruleId
 * Delete automation rule
 */
router.delete('/automation/:ruleId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { ruleId } = req.params;

  await workflowService.deleteAutomationRule(agencyDatabase, agencyId, ruleId);

  res.json({
    success: true,
    message: 'Automation rule deleted successfully',
  });
}));

/**
 * GET /api/workflows/:workflowId/steps
 * Get all steps for a workflow
 * NOTE: This must come before /:workflowId route to avoid route conflicts
 */
router.get('/:workflowId/steps', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { workflowId } = req.params;

  // Validate UUID format to prevent route conflicts with specific routes
  if (!isValidUUID(workflowId)) {
    return res.status(404).json({
      success: false,
      error: 'Workflow not found',
      message: 'Invalid workflow ID format',
    });
  }

  const steps = await workflowService.getWorkflowSteps(agencyDatabase, agencyId, workflowId);

  res.json({
    success: true,
    data: steps,
  });
}));

/**
 * POST /api/workflows/:workflowId/steps
 * Create a new workflow step
 */
router.post('/:workflowId/steps', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { workflowId } = req.params;
  const userId = req.user.id;

  // Validate UUID format to prevent route conflicts with specific routes
  if (!isValidUUID(workflowId)) {
    return res.status(404).json({
      success: false,
      error: 'Workflow not found',
      message: 'Invalid workflow ID format',
    });
  }

  const step = await workflowService.createWorkflowStep(
    agencyDatabase,
    workflowId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: step,
    message: 'Workflow step created successfully',
  });
}));

/**
 * PUT /api/workflows/:workflowId/steps/:stepId
 * Update a workflow step
 */
router.put('/:workflowId/steps/:stepId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { workflowId, stepId } = req.params;
  const userId = req.user.id;

  // Validate UUID format to prevent route conflicts with specific routes
  if (!isValidUUID(workflowId) || !isValidUUID(stepId)) {
    return res.status(404).json({
      success: false,
      error: 'Workflow or step not found',
      message: 'Invalid ID format',
    });
  }

  const step = await workflowService.updateWorkflowStep(
    agencyDatabase,
    workflowId,
    stepId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: step,
    message: 'Workflow step updated successfully',
  });
}));

/**
 * DELETE /api/workflows/:workflowId/steps/:stepId
 * Delete a workflow step
 */
router.delete('/:workflowId/steps/:stepId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { workflowId, stepId } = req.params;

  // Validate UUID format to prevent route conflicts with specific routes
  if (!isValidUUID(workflowId) || !isValidUUID(stepId)) {
    return res.status(404).json({
      success: false,
      error: 'Workflow or step not found',
      message: 'Invalid ID format',
    });
  }

  await workflowService.deleteWorkflowStep(agencyDatabase, workflowId, stepId);

  res.json({
    success: true,
    message: 'Workflow step deleted successfully',
  });
}));

/**
 * GET /api/workflows/:workflowId
 * Get a single workflow by ID
 * NOTE: This must come LAST after all specific routes to avoid route conflicts
 */
router.get('/:workflowId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { workflowId } = req.params;

  // Validate UUID format to prevent route conflicts with specific routes
  if (!isValidUUID(workflowId)) {
    return res.status(404).json({
      success: false,
      error: 'Workflow not found',
      message: 'Invalid workflow ID format',
    });
  }

  const workflow = await workflowService.getWorkflowById(agencyDatabase, agencyId, workflowId);

  res.json({
    success: true,
    data: workflow,
  });
}));

/**
 * PUT /api/workflows/:workflowId
 * Update a workflow
 */
router.put('/:workflowId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { workflowId } = req.params;
  const userId = req.user.id;

  // Validate UUID format to prevent route conflicts with specific routes
  if (!isValidUUID(workflowId)) {
    return res.status(404).json({
      success: false,
      error: 'Workflow not found',
      message: 'Invalid workflow ID format',
    });
  }

  const workflow = await workflowService.updateWorkflow(
    agencyDatabase,
    agencyId,
    workflowId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: workflow,
    message: 'Workflow updated successfully',
  });
}));

/**
 * DELETE /api/workflows/:workflowId
 * Delete a workflow
 */
router.delete('/:workflowId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const { workflowId } = req.params;

  // Validate UUID format to prevent route conflicts with specific routes
  if (!isValidUUID(workflowId)) {
    return res.status(404).json({
      success: false,
      error: 'Workflow not found',
      message: 'Invalid workflow ID format',
    });
  }

  await workflowService.deleteWorkflow(agencyDatabase, agencyId, workflowId);

  res.json({
    success: true,
    message: 'Workflow deleted successfully',
  });
}));

module.exports = router;

