/**
 * Backup Management Routes
 * Handles database backup operations
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  createBackup,
  restoreBackup,
  listBackups,
  cleanupOldBackups,
  getBackupStats,
} = require('../services/backupService');

/**
 * GET /api/backups
 * List all backups
 * Requires admin role
 */
router.get('/', authenticate, requireRole(['admin', 'super_admin']), asyncHandler(async (req, res) => {
  const backups = await listBackups();
  res.json({
    success: true,
    data: backups,
  });
}));

/**
 * POST /api/backups/create
 * Create a new backup
 * Requires admin role
 */
router.post('/create', authenticate, requireRole(['admin', 'super_admin']), asyncHandler(async (req, res) => {
  const { databaseName, backupType } = req.body;
  
  if (!databaseName) {
    return res.status(400).json({
      success: false,
      error: 'Database name is required',
    });
  }

  const backupPath = await createBackup(databaseName, backupType || 'full');
  
  res.json({
    success: true,
    data: {
      backupPath,
      message: 'Backup created successfully',
    },
  });
}));

/**
 * POST /api/backups/restore
 * Restore from a backup
 * Requires admin role
 */
router.post('/restore', authenticate, requireRole(['admin', 'super_admin']), asyncHandler(async (req, res) => {
  const { backupPath, databaseName } = req.body;
  
  if (!backupPath || !databaseName) {
    return res.status(400).json({
      success: false,
      error: 'Backup path and database name are required',
    });
  }

  await restoreBackup(backupPath, databaseName);
  
  res.json({
    success: true,
    message: 'Backup restored successfully',
  });
}));

/**
 * POST /api/backups/cleanup
 * Clean up old backups based on retention policy
 * Requires admin role
 */
router.post('/cleanup', authenticate, requireRole(['admin', 'super_admin']), asyncHandler(async (req, res) => {
  const deleted = await cleanupOldBackups();
  
  res.json({
    success: true,
    data: {
      deleted,
      message: `Deleted ${deleted} old backup(s)`,
    },
  });
}));

/**
 * GET /api/backups/stats
 * Get backup statistics
 * Requires admin role
 */
router.get('/stats', authenticate, requireRole(['admin', 'super_admin']), asyncHandler(async (req, res) => {
  const stats = await getBackupStats();
  res.json({
    success: true,
    data: stats,
  });
}));

module.exports = router;
