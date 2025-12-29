/**
 * Two-Factor Authentication Routes
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const twoFactorService = require('../services/twoFactorService');
const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');

/**
 * Ensure 2FA columns exist in the users table
 * This function adds the columns if they don't exist
 */
async function ensureTwoFactorColumns(client) {
  try {
    // Check if columns exist
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name IN ('two_factor_secret', 'two_factor_enabled', 'recovery_codes', 'two_factor_verified_at')
    `);

    const existingColumns = columnCheck.rows.map(row => row.column_name);
    const requiredColumns = ['two_factor_secret', 'two_factor_enabled', 'recovery_codes', 'two_factor_verified_at'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('[2FA] Adding missing 2FA columns:', missingColumns);
      
      // Add missing columns
      if (missingColumns.includes('two_factor_secret')) {
        await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT');
      }
      if (missingColumns.includes('two_factor_enabled')) {
        await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE');
      }
      if (missingColumns.includes('recovery_codes')) {
        await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS recovery_codes TEXT[]');
      }
      if (missingColumns.includes('two_factor_verified_at')) {
        await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_verified_at TIMESTAMP WITH TIME ZONE');
      }

      console.log('[2FA] ✅ 2FA columns added successfully');
    }
  } catch (error) {
    console.error('[2FA] Error ensuring 2FA columns:', error);
    throw error;
  }
}

/**
 * POST /api/two-factor/setup
 * Generate 2FA secret and QR code for user
 * Requires authentication
 */
router.post('/setup', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  // Validate user and agency context
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'User not authenticated',
    });
  }

  const userId = req.user.id;
  const agencyDatabase = req.user.agencyDatabase || req.headers['x-agency-database'];

  if (!agencyDatabase) {
    console.error('[2FA] Setup error: Agency context missing', {
      userId,
      hasUser: !!req.user,
      headers: Object.keys(req.headers),
    });
    return res.status(403).json({
      success: false,
      error: 'Agency context required',
      message: 'Agency context is required for 2FA setup',
    });
  }

  let agencyPool;
  let agencyClient;

  try {
    // Connect to agency database
    let dbConfig;
    try {
      dbConfig = parseDatabaseUrl();
      if (!dbConfig || !dbConfig.host || !dbConfig.user) {
        throw new Error('Invalid database configuration');
      }
    } catch (dbConfigError) {
      console.error('[2FA] Setup error: Failed to parse database URL:', dbConfigError);
      return res.status(500).json({
        success: false,
        error: 'Database configuration error',
        message: 'Failed to connect to database',
      });
    }

    const { host, port, user, password } = dbConfig;
    const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
    
    try {
      agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
      agencyClient = await agencyPool.connect();
    } catch (connectionError) {
      console.error('[2FA] Setup error: Failed to connect to agency database:', {
        error: connectionError.message,
        stack: connectionError.stack,
        agencyDatabase,
      });
      return res.status(500).json({
        success: false,
        error: 'Database connection error',
        message: `Failed to connect to agency database: ${connectionError.message}`,
      });
    }

    try {
      // Ensure 2FA columns exist
      await ensureTwoFactorColumns(agencyClient);

      // Get user email
      const userResult = await agencyClient.query(
        'SELECT email FROM public.users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User not found',
        });
      }

      const userEmail = userResult.rows[0].email;

      // Generate secret
      const secretData = twoFactorService.generateSecret(userEmail);
      
      // Generate QR code
      const qrCodeDataUrl = await twoFactorService.generateQRCode(secretData.otpauthUrl);

      // Generate recovery codes
      const recoveryCodes = twoFactorService.generateRecoveryCodes(10);

      // Store secret and recovery codes in database (but don't enable yet)
      await agencyClient.query(
        `UPDATE public.users 
         SET two_factor_secret = $1, 
             recovery_codes = $2
         WHERE id = $3`,
        [secretData.secret, recoveryCodes, userId]
      );

      res.json({
        success: true,
        data: {
          secret: secretData.secret, // For manual entry if QR code fails
          qrCode: qrCodeDataUrl,
          recoveryCodes: recoveryCodes, // Show these to user - they won't be shown again
        },
        message: '2FA setup initiated. Scan QR code and verify with a token to enable.',
      });
    } finally {
      if (agencyClient) {
        agencyClient.release();
      }
      if (agencyPool) {
        await agencyPool.end();
      }
    }
  } catch (error) {
    console.error('[2FA] Setup error:', error);
    console.error('[2FA] Setup error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to setup 2FA',
      message: 'Failed to setup 2FA',
    });
  }
}));

/**
 * POST /api/two-factor/verify-and-enable
 * Verify token and enable 2FA
 * Requires authentication
 */
router.post('/verify-and-enable', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const agencyDatabase = req.user.agencyDatabase;
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Token is required',
      message: '2FA token is required',
    });
  }

  try {
    // Connect to agency database
    const { host, port, user, password } = parseDatabaseUrl();
    const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
    const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
    const agencyClient = await agencyPool.connect();

    try {
      // Ensure 2FA columns exist
      await ensureTwoFactorColumns(agencyClient);

      // Get user's 2FA secret
      const userResult = await agencyClient.query(
        'SELECT two_factor_secret FROM public.users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0 || !userResult.rows[0].two_factor_secret) {
        return res.status(400).json({
          success: false,
          error: '2FA not set up',
          message: 'Please set up 2FA first',
        });
      }

      const secret = userResult.rows[0].two_factor_secret;

      // Verify token
      const isValid = twoFactorService.verifyToken(token, secret);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid token',
          message: 'Invalid 2FA token. Please try again.',
        });
      }

      // Get recovery codes (they were generated during setup)
      const recoveryCodesResult = await agencyClient.query(
        'SELECT recovery_codes FROM public.users WHERE id = $1',
        [userId]
      );
      const recoveryCodes = recoveryCodesResult.rows[0]?.recovery_codes || [];

      // Enable 2FA
      await agencyClient.query(
        `UPDATE public.users 
         SET two_factor_enabled = TRUE,
             two_factor_verified_at = NOW()
         WHERE id = $1`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          recoveryCodes: recoveryCodes,
        },
        message: '2FA enabled successfully',
      });
    } finally {
      agencyClient.release();
      await agencyPool.end();
    }
  } catch (error) {
    console.error('[2FA] Verify and enable error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to enable 2FA',
      message: 'Failed to enable 2FA',
    });
  }
}));

/**
 * POST /api/two-factor/verify
 * Verify 2FA token during login
 * This endpoint is called after password verification
 */
router.post('/verify', asyncHandler(async (req, res) => {
  const { userId, agencyDatabase, token, recoveryCode } = req.body;

  if (!userId || !agencyDatabase) {
    return res.status(400).json({
      success: false,
      error: 'User ID and agency database are required',
      message: 'User ID and agency database are required',
    });
  }

  if (!token && !recoveryCode) {
    return res.status(400).json({
      success: false,
      error: 'Token or recovery code is required',
      message: '2FA token or recovery code is required',
    });
  }

    try {
      // Connect to agency database
      const { host, port, user, password } = parseDatabaseUrl();
      const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
      const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
      const agencyClient = await agencyPool.connect();

    try {
      // Ensure 2FA columns exist
      await ensureTwoFactorColumns(agencyClient);

      // Get user's 2FA data
      const userResult = await agencyClient.query(
        `SELECT two_factor_enabled, two_factor_secret, recovery_codes 
         FROM public.users 
         WHERE id = $1`,
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

      if (!user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          error: '2FA not enabled',
          message: '2FA is not enabled for this user',
        });
      }

      // Only verify token/code if 2FA is enabled
      // (We already checked above that 2FA is enabled, so this code should run)
      let isValid = false;

      // Verify TOTP token
      if (token) {
        isValid = twoFactorService.verifyToken(token, user.two_factor_secret);
      } 
      // Or verify recovery code
      else if (recoveryCode) {
        const recoveryResult = twoFactorService.verifyRecoveryCode(recoveryCode, user.recovery_codes);
        isValid = recoveryResult.valid;
        
        if (isValid) {
          // Update recovery codes (remove used one)
          await agencyClient.query(
            'UPDATE public.users SET recovery_codes = $1 WHERE id = $2',
            [recoveryResult.remainingCodes, userId]
          );
        }
      }

      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token or recovery code',
          message: 'Invalid 2FA token or recovery code',
        });
      }

      // Update last verification time
      await agencyClient.query(
        'UPDATE public.users SET two_factor_verified_at = NOW() WHERE id = $1',
        [userId]
      );

      res.json({
        success: true,
        message: '2FA verification successful',
      });
    } finally {
      agencyClient.release();
      await agencyPool.end();
    }
  } catch (error) {
    console.error('[2FA] Verify error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify 2FA',
      message: 'Failed to verify 2FA',
    });
  }
}));

/**
 * POST /api/two-factor/disable
 * Disable 2FA for user
 * Requires authentication
 */
router.post('/disable', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const agencyDatabase = req.user.agencyDatabase;
  const { password } = req.body; // Require password confirmation

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Password is required',
      message: 'Password confirmation is required to disable 2FA',
    });
  }

    try {
      // Connect to agency database
      const { host, port, user, password: dbPassword } = parseDatabaseUrl();
      const agencyDbUrl = `postgresql://${user}:${dbPassword}@${host}:${port}/${agencyDatabase}`;
      const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
      const agencyClient = await agencyPool.connect();

    try {
      // Ensure 2FA columns exist
      await ensureTwoFactorColumns(agencyClient);

      // Verify password first
      const bcrypt = require('bcrypt');
      const userResult = await agencyClient.query(
        'SELECT password_hash FROM public.users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User not found',
        });
      }

      const passwordMatch = await bcrypt.compare(password, userResult.rows[0].password_hash);
      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password',
          message: 'Invalid password',
        });
      }

      // Disable 2FA
      await agencyClient.query(
        `UPDATE public.users 
         SET two_factor_enabled = FALSE,
             two_factor_secret = NULL,
             recovery_codes = NULL,
             two_factor_verified_at = NULL
         WHERE id = $1`,
        [userId]
      );

      res.json({
        success: true,
        message: '2FA disabled successfully',
      });
    } finally {
      agencyClient.release();
      await agencyPool.end();
    }
  } catch (error) {
    console.error('[2FA] Disable error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to disable 2FA',
      message: 'Failed to disable 2FA',
    });
  }
}));

/**
 * GET /api/two-factor/status
 * Get 2FA status for current user
 * Requires authentication
 */
router.get('/status', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  // Validate user and agency context
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'User not authenticated',
    });
  }

  const userId = req.user.id;
  const agencyDatabase = req.user.agencyDatabase || req.headers['x-agency-database'];

  if (!agencyDatabase) {
    console.error('[2FA] Status error: Agency context missing', {
      userId,
      hasUser: !!req.user,
      headers: Object.keys(req.headers),
    });
    return res.status(403).json({
      success: false,
      error: 'Agency context required',
      message: 'Agency context is required for 2FA status',
    });
  }

  let agencyPool;
  let agencyClient;

  try {
    // Connect to agency database
    const { host, port, user, password } = parseDatabaseUrl();
    const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
    agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
    agencyClient = await agencyPool.connect();

    try {
      // Ensure 2FA columns exist
      await ensureTwoFactorColumns(agencyClient);

      const userResult = await agencyClient.query(
        `SELECT two_factor_enabled, two_factor_verified_at 
         FROM public.users 
         WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        data: {
          enabled: userResult.rows[0].two_factor_enabled || false,
          verifiedAt: userResult.rows[0].two_factor_verified_at,
        },
      });
    } finally {
      if (agencyClient) {
        agencyClient.release();
      }
      if (agencyPool) {
        await agencyPool.end();
      }
    }
  } catch (error) {
    console.error('[2FA] Status error:', error);
    console.error('[2FA] Status error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get 2FA status',
      message: 'Failed to get 2FA status',
    });
  }
}));

module.exports = router;
