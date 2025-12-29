/**
 * Two-Factor Authentication Service
 * Handles TOTP-based 2FA using speakeasy
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

/**
 * Generate a new 2FA secret for a user
 * @param {string} email - User email
 * @param {string} issuer - Application name (default: 'BuildFlow')
 * @returns {Object} Secret object with base32 secret and otpauth_url
 */
function generateSecret(email, issuer = 'BuildFlow') {
  const secret = speakeasy.generateSecret({
    name: `${issuer} (${email})`,
    issuer: issuer,
    length: 32, // 256 bits
  });

  return {
    secret: secret.base32, // Store this in database
    otpauthUrl: secret.otpauth_url, // Use this to generate QR code
  };
}

/**
 * Generate QR code data URL for 2FA setup
 * @param {string} otpauthUrl - OTP auth URL from generateSecret
 * @returns {Promise<string>} Data URL of QR code image
 */
async function generateQRCode(otpauthUrl) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('[2FA] Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify a TOTP token against a secret
 * @param {string} token - 6-digit TOTP token from authenticator app
 * @param {string} secret - Base32 secret stored in database
 * @param {number} window - Time window in steps (default: 2, allows ±1 step = ±30 seconds)
 * @returns {boolean} True if token is valid
 */
function verifyToken(token, secret, window = 2) {
  try {
    // Remove any spaces or dashes from token
    const cleanToken = token.replace(/\s|-/g, '');

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: cleanToken,
      window: window, // Allow ±1 time step (30 seconds)
    });

    return verified;
  } catch (error) {
    console.error('[2FA] Error verifying token:', error);
    return false;
  }
}

/**
 * Generate recovery codes for 2FA
 * @param {number} count - Number of recovery codes to generate (default: 10)
 * @returns {string[]} Array of recovery codes
 */
function generateRecoveryCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Verify a recovery code
 * @param {string} code - Recovery code to verify
 * @param {string[]} recoveryCodes - Array of valid recovery codes
 * @returns {Object} { valid: boolean, remainingCodes: string[] }
 */
function verifyRecoveryCode(code, recoveryCodes) {
  if (!recoveryCodes || !Array.isArray(recoveryCodes)) {
    return { valid: false, remainingCodes: [] };
  }

  const cleanCode = code.replace(/\s|-/g, '').toUpperCase();
  const index = recoveryCodes.findIndex(c => c.toUpperCase() === cleanCode);

  if (index === -1) {
    return { valid: false, remainingCodes: recoveryCodes };
  }

  // Remove used code
  const remainingCodes = recoveryCodes.filter((_, i) => i !== index);
  return { valid: true, remainingCodes };
}

module.exports = {
  generateSecret,
  generateQRCode,
  verifyToken,
  generateRecoveryCodes,
  verifyRecoveryCode,
};
