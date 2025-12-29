/**
 * Session Management Routes
 * Handles session management, timeout, and revocation
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const sessionService = require('../services/sessionManagementService');

/**
 * GET /api/sessions
 * Get active sessions for current user
 * Requires authentication
 */
router.get('/', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const sessions = await sessionService.getActiveSessions(agencyDatabase, userId);

  res.json({
    success: true,
    data: sessions,
  });
}));

/**
 * DELETE /api/sessions/:sessionId
 * Revoke specific session
 * Requires authentication
 */
router.delete('/:sessionId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { sessionId } = req.params;

  const revoked = await sessionService.revokeSession(agencyDatabase, sessionId);

  if (!revoked) {
    return res.status(404).json({
      success: false,
      error: 'Session not found',
      message: 'Session not found',
    });
  }

  res.json({
    success: true,
    message: 'Session revoked successfully',
  });
}));

/**
 * DELETE /api/sessions
 * Revoke all sessions for current user (except current)
 * Requires authentication
 */
router.delete('/', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const currentToken = req.headers.authorization?.replace('Bearer ', '');

  // Get current session ID to exclude
  let excludeSessionId = null;
  if (currentToken) {
    const currentSession = await sessionService.validateSession(agencyDatabase, currentToken);
    if (currentSession) {
      excludeSessionId = currentSession.sessionId;
    }
  }

  const revokedCount = await sessionService.revokeAllUserSessions(agencyDatabase, userId, excludeSessionId);

  res.json({
    success: true,
    data: { revokedCount },
    message: `Revoked ${revokedCount} session(s)`,
  });
}));

/**
 * GET /api/sessions/config
 * Get session configuration
 * Requires authentication
 */
router.get('/config', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const config = await sessionService.getSessionConfig(agencyDatabase);

  res.json({
    success: true,
    data: config,
  });
}));

/**
 * POST /api/sessions/config
 * Update session configuration
 * Requires authentication and admin role
 */
router.post('/config', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const config = req.body;

  const updatedConfig = await sessionService.updateSessionConfig(agencyDatabase, config);

  res.json({
    success: true,
    data: {
      timeout: updatedConfig.timeout,
      maxConcurrentSessions: updatedConfig.max_concurrent_sessions,
      deviceTracking: updatedConfig.device_tracking,
      requireReauthOnSensitive: updatedConfig.require_reauth_on_sensitive,
      idleTimeout: updatedConfig.idle_timeout,
    },
    message: 'Session configuration updated successfully',
  });
}));

/**
 * POST /api/sessions/cleanup
 * Clean up expired sessions
 * Requires authentication and admin role
 */
router.post('/cleanup', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const cleanedCount = await sessionService.cleanupExpiredSessions(agencyDatabase);

  res.json({
    success: true,
    data: { cleanedCount },
    message: `Cleaned up ${cleanedCount} expired session(s)`,
  });
}));

module.exports = router;
