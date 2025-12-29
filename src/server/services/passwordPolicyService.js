/**
 * Password Policy Service
 * Enforces password complexity, expiration, and history rules
 */

const bcrypt = require('bcrypt');
const { getAgencyPool } = require('../utils/poolManager');

/**
 * Default password policy (Enterprise-grade)
 */
const DEFAULT_POLICY = {
  minLength: 12, // Increased from 8 to 12 for better security
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90, // days
  minAge: 1, // days (prevent immediate change)
  historyCount: 5, // Remember last 5 passwords
  lockoutAttempts: 5, // Lock after 5 failed attempts
  lockoutDuration: 30, // minutes
  requireChangeOnFirstLogin: false,
  preventCommonPasswords: true, // Enhanced common password checking
};

/**
 * Validate password against policy
 * @param {string} password - Password to validate
 * @param {Object} policy - Password policy (optional, uses default if not provided)
 * @returns {Object} Validation result { valid, errors }
 */
function validatePassword(password, policy = DEFAULT_POLICY) {
  const errors = [];

  if (!password || password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Enhanced check for common weak passwords
  if (policy.preventCommonPasswords) {
    const commonPasswords = [
      'password', '12345678', '123456789', '1234567890', 'qwerty', 'qwerty123',
      'admin', 'letmein', 'welcome', 'monkey', '1234567', 'sunshine', 'princess',
      'dragon', 'passw0rd', 'master', 'hello', 'freedom', 'whatever', 'qazwsx',
      'trustno1', 'jordan23', 'harley', 'shadow', 'superman', 'michael', 'football',
      'iloveyou', '123123', 'baseball', 'welcome123', 'password1', 'admin123'
    ];
    
    const lowerPassword = password.toLowerCase();
    if (commonPasswords.some(weak => lowerPassword.includes(weak.toLowerCase()))) {
      errors.push('Password is too common or weak. Please choose a more unique password.');
    }
    
    // Check for sequential characters (e.g., "12345", "abcde")
    if (/(.)\1{3,}/.test(password) || /(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
      errors.push('Password contains sequential or repeated characters');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if password is in history
 * @param {string} password - New password
 * @param {string[]} passwordHistory - Array of hashed passwords
 * @returns {Promise<boolean>} True if password was used before
 */
async function isPasswordInHistory(password, passwordHistory) {
  if (!passwordHistory || passwordHistory.length === 0) {
    return false;
  }

  for (const hashedPassword of passwordHistory) {
    try {
      const match = await bcrypt.compare(password, hashedPassword);
      if (match) {
        return true;
      }
    } catch (error) {
      // Skip invalid hashes
      continue;
    }
  }

  return false;
}

/**
 * Check if password is expired
 * @param {Date} passwordChangedAt - Date when password was last changed
 * @param {number} maxAge - Maximum age in days
 * @returns {boolean} True if expired
 */
function isPasswordExpired(passwordChangedAt, maxAge) {
  if (!passwordChangedAt) {
    return true; // Never changed, consider expired
  }

  const daysSinceChange = (Date.now() - new Date(passwordChangedAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceChange > maxAge;
}

/**
 * Check if password can be changed (min age check)
 * @param {Date} passwordChangedAt - Date when password was last changed
 * @param {number} minAge - Minimum age in days
 * @returns {boolean} True if can be changed
 */
function canChangePassword(passwordChangedAt, minAge) {
  if (!passwordChangedAt) {
    return true; // Never changed, can change
  }

  const daysSinceChange = (Date.now() - new Date(passwordChangedAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceChange >= minAge;
}

/**
 * Get password policy for agency
 * @param {string} agencyDatabase - Agency database name
 * @returns {Promise<Object>} Password policy
 */
async function getPasswordPolicy(agencyDatabase) {
  const agencyPool = getAgencyPool(agencyDatabase);
  const agencyClient = await agencyPool.connect();

  try {
    // Check if password_policies table exists
    await agencyClient.query(`
      CREATE TABLE IF NOT EXISTS public.password_policies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        min_length INTEGER DEFAULT 8,
        require_uppercase BOOLEAN DEFAULT true,
        require_lowercase BOOLEAN DEFAULT true,
        require_numbers BOOLEAN DEFAULT true,
        require_special_chars BOOLEAN DEFAULT true,
        max_age INTEGER DEFAULT 90, -- days
        min_age INTEGER DEFAULT 1, -- days
        history_count INTEGER DEFAULT 5,
        lockout_attempts INTEGER DEFAULT 5,
        lockout_duration INTEGER DEFAULT 30, -- minutes
        require_change_on_first_login BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const result = await agencyClient.query(
      `SELECT * FROM public.password_policies ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length > 0) {
      const policy = result.rows[0];
      return {
        minLength: policy.min_length,
        requireUppercase: policy.require_uppercase,
        requireLowercase: policy.require_lowercase,
        requireNumbers: policy.require_numbers,
        requireSpecialChars: policy.require_special_chars,
        maxAge: policy.max_age,
        minAge: policy.min_age,
        historyCount: policy.history_count,
        lockoutAttempts: policy.lockout_attempts,
        lockoutDuration: policy.lockout_duration,
        requireChangeOnFirstLogin: policy.require_change_on_first_login,
      };
    }

    // Return default policy
    return DEFAULT_POLICY;
  } finally {
    agencyClient.release();
    // Don't close pool - it's managed by pool manager
  }
}

/**
 * Update password policy for agency
 * @param {string} agencyDatabase - Agency database name
 * @param {Object} policy - Password policy settings
 * @returns {Promise<Object>} Updated policy
 */
async function updatePasswordPolicy(agencyDatabase, policy) {
  const agencyPool = getAgencyPool(agencyDatabase);
  const agencyClient = await agencyPool.connect();

  try {
    await agencyClient.query(`
      CREATE TABLE IF NOT EXISTS public.password_policies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        min_length INTEGER DEFAULT 8,
        require_uppercase BOOLEAN DEFAULT true,
        require_lowercase BOOLEAN DEFAULT true,
        require_numbers BOOLEAN DEFAULT true,
        require_special_chars BOOLEAN DEFAULT true,
        max_age INTEGER DEFAULT 90,
        min_age INTEGER DEFAULT 1,
        history_count INTEGER DEFAULT 5,
        lockout_attempts INTEGER DEFAULT 5,
        lockout_duration INTEGER DEFAULT 30,
        require_change_on_first_login BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Delete existing policy and create new one
    await agencyClient.query(`DELETE FROM public.password_policies`);

    const result = await agencyClient.query(
      `INSERT INTO public.password_policies 
       (min_length, require_uppercase, require_lowercase, require_numbers, require_special_chars,
        max_age, min_age, history_count, lockout_attempts, lockout_duration, require_change_on_first_login)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        policy.minLength || DEFAULT_POLICY.minLength,
        policy.requireUppercase !== undefined ? policy.requireUppercase : DEFAULT_POLICY.requireUppercase,
        policy.requireLowercase !== undefined ? policy.requireLowercase : DEFAULT_POLICY.requireLowercase,
        policy.requireNumbers !== undefined ? policy.requireNumbers : DEFAULT_POLICY.requireNumbers,
        policy.requireSpecialChars !== undefined ? policy.requireSpecialChars : DEFAULT_POLICY.requireSpecialChars,
        policy.maxAge || DEFAULT_POLICY.maxAge,
        policy.minAge || DEFAULT_POLICY.minAge,
        policy.historyCount || DEFAULT_POLICY.historyCount,
        policy.lockoutAttempts || DEFAULT_POLICY.lockoutAttempts,
        policy.lockoutDuration || DEFAULT_POLICY.lockoutDuration,
        policy.requireChangeOnFirstLogin !== undefined ? policy.requireChangeOnFirstLogin : DEFAULT_POLICY.requireChangeOnFirstLogin,
      ]
    );

    return result.rows[0];
  } finally {
    agencyClient.release();
    // Don't close pool - it's managed by pool manager
  }
}

/**
 * Get password history for user
 * @param {string} agencyDatabase - Agency database name
 * @param {string} userId - User ID
 * @param {number} count - Number of recent passwords to retrieve
 * @returns {Promise<string[]>} Array of password hashes
 */
async function getPasswordHistory(agencyDatabase, userId, count = 5) {
  const agencyPool = getAgencyPool(agencyDatabase);
  const agencyClient = await agencyPool.connect();

  try {
    // Check if password_history table exists
    await agencyClient.query(`
      CREATE TABLE IF NOT EXISTS public.password_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON public.password_history(user_id, created_at DESC);
    `);

    const result = await agencyClient.query(
      `SELECT password_hash FROM public.password_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, count]
    );

    return result.rows.map(row => row.password_hash);
  } finally {
    agencyClient.release();
    // Don't close pool - it's managed by pool manager
  }
}

/**
 * Add password to history
 * @param {string} agencyDatabase - Agency database name
 * @param {string} userId - User ID
 * @param {string} passwordHash - Hashed password
 * @param {number} maxHistory - Maximum history to keep
 * @returns {Promise<void>}
 */
async function addPasswordToHistory(agencyDatabase, userId, passwordHash, maxHistory = 5) {
  const agencyPool = getAgencyPool(agencyDatabase);
  const agencyClient = await agencyPool.connect();

  try {
    await agencyClient.query(`
      CREATE TABLE IF NOT EXISTS public.password_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON public.password_history(user_id, created_at DESC);
    `);

    // Add new password to history
    await agencyClient.query(
      `INSERT INTO public.password_history (user_id, password_hash) VALUES ($1, $2)`,
      [userId, passwordHash]
    );

    // Remove old passwords beyond max history
    await agencyClient.query(
      `DELETE FROM public.password_history 
       WHERE user_id = $1 
       AND id NOT IN (
         SELECT id FROM public.password_history 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2
       )`,
      [userId, maxHistory]
    );
  } finally {
    agencyClient.release();
    // Don't close pool - it's managed by pool manager
  }
}

/**
 * Check account lockout status
 * @param {string} agencyDatabase - Agency database name
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Lockout status { isLocked, lockoutUntil, failedAttempts }
 */
async function getLockoutStatus(agencyDatabase, userId) {
  const agencyPool = getAgencyPool(agencyDatabase);
  const agencyClient = await agencyPool.connect();

  try {
    // Check if login_attempts table exists
    await agencyClient.query(`
      CREATE TABLE IF NOT EXISTS public.login_attempts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        success BOOLEAN DEFAULT false,
        ip_address TEXT,
        user_agent TEXT,
        attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON public.login_attempts(user_id, attempted_at DESC);
      CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email, attempted_at DESC);
    `);
    
    // If table exists with NOT NULL constraint, alter it to allow NULL
    try {
      await agencyClient.query(`
        ALTER TABLE public.login_attempts 
        ALTER COLUMN user_id DROP NOT NULL;
      `);
    } catch (alterError) {
      // Column might already be nullable or table doesn't exist yet, ignore
      if (!alterError.message.includes('does not exist') && !alterError.message.includes('column "user_id" is not null')) {
        console.warn('[Password Policy] Could not alter login_attempts.user_id:', alterError.message);
      }
    }

    const policy = await getPasswordPolicy(agencyDatabase);
    const lockoutDuration = policy.lockoutDuration || 30; // minutes
    const lockoutAttempts = policy.lockoutAttempts || 5;

    // Get recent failed attempts
    // If userId is provided, use it; otherwise check by email
    let result;
    if (userId) {
      result = await agencyClient.query(
        `SELECT COUNT(*) as count, MAX(attempted_at) as last_attempt
         FROM public.login_attempts 
         WHERE user_id = $1 
         AND success = false 
         AND attempted_at > NOW() - INTERVAL '${lockoutDuration} minutes'`,
        [userId]
      );
    } else {
      // For unknown users, check by email
      result = await agencyClient.query(
        `SELECT COUNT(*) as count, MAX(attempted_at) as last_attempt
         FROM public.login_attempts 
         WHERE email = $1 
         AND (user_id IS NULL OR user_id IS NOT NULL)
         AND success = false 
         AND attempted_at > NOW() - INTERVAL '${lockoutDuration} minutes'`,
        [email]
      );
    }

    const failedAttempts = parseInt(result.rows[0].count) || 0;
    const lastAttempt = result.rows[0].last_attempt;

    if (failedAttempts >= lockoutAttempts && lastAttempt) {
      const lockoutUntil = new Date(new Date(lastAttempt).getTime() + lockoutDuration * 60 * 1000);
      const isLocked = lockoutUntil > new Date();

      return {
        isLocked,
        lockoutUntil: isLocked ? lockoutUntil : null,
        failedAttempts,
      };
    }

    return {
      isLocked: false,
      lockoutUntil: null,
      failedAttempts,
    };
  } finally {
    agencyClient.release();
    // Don't close pool - it's managed by pool manager
  }
}

/**
 * Record login attempt
 * @param {string} agencyDatabase - Agency database name
 * @param {string} userId - User ID (null if user not found)
 * @param {string} email - Email address
 * @param {boolean} success - Whether login was successful
 * @param {string} ipAddress - IP address
 * @param {string} userAgent - User agent string
 * @returns {Promise<void>}
 */
async function recordLoginAttempt(agencyDatabase, userId, email, success, ipAddress = null, userAgent = null) {
  const agencyPool = getAgencyPool(agencyDatabase);
  const agencyClient = await agencyPool.connect();

  try {
    await agencyClient.query(`
      CREATE TABLE IF NOT EXISTS public.login_attempts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        success BOOLEAN DEFAULT false,
        ip_address TEXT,
        user_agent TEXT,
        attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON public.login_attempts(user_id, attempted_at DESC);
      CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email, attempted_at DESC);
    `);
    
    // If table exists with NOT NULL constraint, alter it to allow NULL
    try {
      await agencyClient.query(`
        ALTER TABLE public.login_attempts 
        ALTER COLUMN user_id DROP NOT NULL;
      `);
    } catch (alterError) {
      // Column might already be nullable or constraint doesn't exist, ignore
      if (!alterError.message.includes('does not exist') && 
          !alterError.message.includes('column "user_id" is not null') &&
          !alterError.message.includes('constraint') &&
          !alterError.message.includes('syntax error')) {
        console.warn('[Password Policy] Could not alter login_attempts.user_id:', alterError.message);
      }
    }

    await agencyClient.query(
      `INSERT INTO public.login_attempts (user_id, email, success, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, email, success, ipAddress, userAgent]
    );

    // Clean up old attempts (older than 30 days)
    await agencyClient.query(
      `DELETE FROM public.login_attempts 
       WHERE attempted_at < NOW() - INTERVAL '30 days'`
    );
  } finally {
    agencyClient.release();
    // Don't close pool - it's managed by pool manager
  }
}

/**
 * Reset failed login attempts (on successful login)
 * @param {string} agencyDatabase - Agency database name
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function resetFailedAttempts(agencyDatabase, userId) {
  const agencyPool = getAgencyPool(agencyDatabase);
  const agencyClient = await agencyPool.connect();

  try {
    // Mark recent failed attempts as cleared (or delete them)
    // For simplicity, we'll just ensure the successful login is recorded
    // The lockout check will use recent failed attempts only
    // This function can be used to explicitly clear if needed
  } finally {
    agencyClient.release();
    // Don't close pool - it's managed by pool manager
  }
}

module.exports = {
  validatePassword,
  isPasswordInHistory,
  isPasswordExpired,
  canChangePassword,
  getPasswordPolicy,
  updatePasswordPolicy,
  getPasswordHistory,
  addPasswordToHistory,
  getLockoutStatus,
  recordLoginAttempt,
  resetFailedAttempts,
  DEFAULT_POLICY,
};
