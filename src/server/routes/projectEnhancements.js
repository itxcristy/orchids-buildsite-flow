/**
 * Advanced Project Management Routes
 * Handles Gantt charts, risk register, issues, milestones
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const ganttService = require('../services/ganttService');
const riskManagementService = require('../services/riskManagementService');

/**
 * GET /api/projects/:projectId/gantt
 * Get Gantt chart data
 */
router.get('/:projectId/gantt', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { projectId } = req.params;

  const ganttData = await ganttService.getGanttData(agencyDatabase, projectId);

  res.json({
    success: true,
    data: ganttData,
  });
}));

/**
 * POST /api/projects/:projectId/dependencies
 * Create task dependency
 */
router.post('/:projectId/dependencies', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const { projectId } = req.params;

  const dependency = await ganttService.createDependency(
    agencyDatabase,
    { ...req.body, project_id: projectId, agency_id: agencyId }
  );

  res.json({
    success: true,
    data: dependency,
    message: 'Task dependency created',
  });
}));

/**
 * POST /api/projects/:projectId/risks
 * Create project risk
 */
router.post('/:projectId/risks', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const userId = req.user.id;
  const { projectId } = req.params;

  const risk = await riskManagementService.createRisk(
    agencyDatabase,
    { ...req.body, project_id: projectId, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: risk,
    message: 'Risk created',
  });
}));

/**
 * GET /api/projects/:projectId/risks
 * Get project risks
 */
router.get('/:projectId/risks', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { projectId } = req.params;
  const filters = {
    status: req.query.status,
    category: req.query.category,
  };

  const risks = await riskManagementService.getRisks(agencyDatabase, projectId, filters);

  res.json({
    success: true,
    data: risks,
  });
}));

/**
 * POST /api/projects/:projectId/issues
 * Create project issue
 */
router.post('/:projectId/issues', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const userId = req.user.id;
  const { projectId } = req.params;

  const issue = await riskManagementService.createIssue(
    agencyDatabase,
    { ...req.body, project_id: projectId, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: issue,
    message: 'Issue created',
  });
}));

/**
 * GET /api/projects/:projectId/issues
 * Get project issues
 */
router.get('/:projectId/issues', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { projectId } = req.params;
  const filters = {
    status: req.query.status,
    priority: req.query.priority,
  };

  const issues = await riskManagementService.getIssues(agencyDatabase, projectId, filters);

  res.json({
    success: true,
    data: issues,
  });
}));

/**
 * POST /api/projects/:projectId/milestones
 * Create project milestone
 */
router.post('/:projectId/milestones', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const userId = req.user.id;
  const { projectId } = req.params;

  const milestone = await riskManagementService.createMilestone(
    agencyDatabase,
    { ...req.body, project_id: projectId, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: milestone,
    message: 'Milestone created',
  });
}));

module.exports = router;
