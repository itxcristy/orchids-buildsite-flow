/**
 * Password Policy Routes
 * Manages password policies and enforcement
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const passwordPolicyService = require('../services/passwordPolicyService');
const { getAgencyPool } = require('../utils/poolManager');
const bcrypt = require('bcrypt');

/**
 * GET /api/password-policy
 * Get password policy for current agency
 * Requires authentication
 */
router.get('/', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const policy = await passwordPolicyService.getPasswordPolicy(agencyDatabase);

  res.json({
    success: true,
    data: policy,
  });
}));

/**
 * POST /api/password-policy
 * Update password policy for agency
 * Requires authentication and admin role
 */
router.post('/', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const policy = req.body;

  const updatedPolicy = await passwordPolicyService.updatePasswordPolicy(agencyDatabase, policy);

  res.json({
    success: true,
    data: {
      minLength: updatedPolicy.min_length,
      requireUppercase: updatedPolicy.require_uppercase,
      requireLowercase: updatedPolicy.require_lowercase,
      requireNumbers: updatedPolicy.require_numbers,
      requireSpecialChars: updatedPolicy.require_special_chars,
      maxAge: updatedPolicy.max_age,
      minAge: updatedPolicy.min_age,
      historyCount: updatedPolicy.history_count,
      lockoutAttempts: updatedPolicy.lockout_attempts,
      lockoutDuration: updatedPolicy.lockout_duration,
      requireChangeOnFirstLogin: updatedPolicy.require_change_on_first_login,
    },
    message: 'Password policy updated successfully',
  });
}));

/**
 * POST /api/password-policy/validate
 * Validate password against policy
 */
router.post('/validate', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Password is required',
      message: 'Password is required',
    });
  }

  const policy = await passwordPolicyService.getPasswordPolicy(agencyDatabase);
  const validation = passwordPolicyService.validatePassword(password, policy);

  res.json({
    success: true,
    data: {
      valid: validation.valid,
      errors: validation.errors,
    },
  });
}));

/**
 * POST /api/password-policy/change
 * Change user password with policy enforcement
 * Requires authentication
 */
router.post('/change', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const agencyDatabase = req.user.agencyDatabase;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Current password and new password are required',
      message: 'Current password and new password are required',
    });
  }

  // Get password policy
  const policy = await passwordPolicyService.getPasswordPolicy(agencyDatabase);

  // Validate new password
  const validation = passwordPolicyService.validatePassword(newPassword, policy);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: 'Password does not meet policy requirements',
      message: validation.errors.join(', '),
      errors: validation.errors,
    });
  }

  // Connect to agency database using pool manager
  const agencyPool = getAgencyPool(agencyDatabase);
  const agencyClient = await agencyPool.connect();

  try {
    // Get current user and password
    const userResult = await agencyClient.query(
      `SELECT id, password_hash, password_changed_at FROM public.users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found',
      });
    }

    const user = userResult.rows[0];

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
        message: 'Current password is incorrect',
      });
    }

    // Check if password can be changed (min age)
    if (!passwordPolicyService.canChangePassword(user.password_changed_at, policy.minAge)) {
      const daysSinceChange = (Date.now() - new Date(user.password_changed_at).getTime()) / (1000 * 60 * 60 * 24);
      const daysRemaining = policy.minAge - daysSinceChange;
      return res.status(400).json({
        success: false,
        error: 'Password cannot be changed yet',
        message: `Password can only be changed after ${policy.minAge} days. ${daysRemaining.toFixed(1)} days remaining.`,
      });
    }

    // Check password history
    const passwordHistory = await passwordPolicyService.getPasswordHistory(agencyDatabase, userId, policy.historyCount);
    const isInHistory = await passwordPolicyService.isPasswordInHistory(newPassword, passwordHistory);
    if (isInHistory) {
      return res.status(400).json({
        success: false,
        error: 'Password was recently used',
        message: `Password cannot be one of the last ${policy.historyCount} passwords`,
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await agencyClient.query(
      `UPDATE public.users 
       SET password_hash = $1, 
           password_changed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, userId]
    );

    // Add to password history
    await passwordPolicyService.addPasswordToHistory(agencyDatabase, userId, newPasswordHash, policy.historyCount);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } finally {
    agencyClient.release();
    // Don't close pool - it's managed by pool manager
  }
}));

/**
 * GET /api/password-policy/status
 * Get password status for current user
 * Requires authentication
 */
router.get('/status', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const agencyDatabase = req.user.agencyDatabase;

  // Connect to agency database using pool manager
  const agencyPool = getAgencyPool(agencyDatabase);
  const agencyClient = await agencyPool.connect();

  try {
    const userResult = await agencyClient.query(
      `SELECT password_changed_at FROM public.users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found',
      });
    }

    const policy = await passwordPolicyService.getPasswordPolicy(agencyDatabase);
    const passwordChangedAt = userResult.rows[0].password_changed_at;
    const isExpired = passwordPolicyService.isPasswordExpired(passwordChangedAt, policy.maxAge);
    const canChange = passwordPolicyService.canChangePassword(passwordChangedAt, policy.minAge);

    // Calculate days until expiration
    let daysUntilExpiration = null;
    if (passwordChangedAt) {
      const daysSinceChange = (Date.now() - new Date(passwordChangedAt).getTime()) / (1000 * 60 * 60 * 24);
      daysUntilExpiration = Math.max(0, policy.maxAge - daysSinceChange);
    }

    res.json({
      success: true,
      data: {
        isExpired,
        canChange,
        passwordChangedAt,
        daysUntilExpiration: daysUntilExpiration !== null ? Math.floor(daysUntilExpiration) : null,
        maxAge: policy.maxAge,
        minAge: policy.minAge,
      },
    });
  } finally {
    agencyClient.release();
    // Don't close pool - it's managed by pool manager
  }
}));

module.exports = router;
