/**
 * Field-Level Encryption Service
 * Encrypts sensitive data at rest using AES-256-GCM
 * 
 * This service provides encryption/decryption for sensitive fields like:
 * - SSN (Social Security Numbers)
 * - Bank account numbers
 * - Credit card numbers
 * - Salaries
 * - Other PII (Personally Identifiable Information)
 */

const crypto = require('crypto');

// Get encryption key from environment variable
// In production, this should be a 32-byte (256-bit) key stored securely
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits

/**
 * Derive a key from the master encryption key and a salt
 * Uses PBKDF2 for key derivation
 */
function deriveKey(salt) {
  return crypto.pbkdf2Sync(
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    salt,
    100000, // 100k iterations
    32, // 32 bytes = 256 bits
    'sha512'
  );
}

/**
 * Encrypt sensitive data
 * @param {string} text - Plain text to encrypt
 * @param {string} fieldName - Name of the field being encrypted (for salt generation)
 * @returns {string} Encrypted data in format: salt:iv:authTag:encryptedData (all base64)
 */
function encrypt(text, fieldName = 'default') {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    // Generate random salt for this encryption
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Derive key from master key and salt
    const key = deriveKey(salt);
    
    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine salt:iv:authTag:encryptedData (all base64 encoded)
    const result = [
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted
    ].join(':');
    
    return result;
  } catch (error) {
    console.error('[Encryption] Error encrypting data:', error);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - Encrypted data in format: salt:iv:authTag:encryptedData
 * @returns {string} Decrypted plain text
 */
function decrypt(encryptedData) {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Encrypted data must be a non-empty string');
    }

    // Split the encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const [saltBase64, ivBase64, authTagBase64, encrypted] = parts;
    
    // Decode from base64
    const salt = Buffer.from(saltBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    // Derive the same key using the salt
    const key = deriveKey(salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Encryption] Error decrypting data:', error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Encrypt multiple fields at once
 * @param {Object} data - Object with fields to encrypt
 * @param {string[]} fieldsToEncrypt - Array of field names to encrypt
 * @returns {Object} Object with encrypted fields
 */
function encryptFields(data, fieldsToEncrypt) {
  const encrypted = { ...data };
  
  for (const field of fieldsToEncrypt) {
    if (data[field] && typeof data[field] === 'string') {
      encrypted[field] = encrypt(data[field], field);
    }
  }
  
  return encrypted;
}

/**
 * Decrypt multiple fields at once
 * @param {Object} data - Object with encrypted fields
 * @param {string[]} fieldsToDecrypt - Array of field names to decrypt
 * @returns {Object} Object with decrypted fields
 */
function decryptFields(data, fieldsToDecrypt) {
  const decrypted = { ...data };
  
  for (const field of fieldsToDecrypt) {
    if (data[field] && typeof data[field] === 'string' && data[field].includes(':')) {
      try {
        decrypted[field] = decrypt(data[field]);
      } catch (error) {
        console.error(`[Encryption] Failed to decrypt field ${field}:`, error);
        // Keep encrypted value if decryption fails
        decrypted[field] = data[field];
      }
    }
  }
  
  return decrypted;
}

/**
 * Check if a string is encrypted (has the encrypted format)
 * @param {string} value - Value to check
 * @returns {boolean} True if value appears to be encrypted
 */
function isEncrypted(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  // Encrypted values have format: salt:iv:authTag:encryptedData
  const parts = value.split(':');
  return parts.length === 4;
}

/**
 * Hash sensitive data (one-way, for searching/comparison)
 * Uses SHA-256 for hashing
 * @param {string} text - Text to hash
 * @returns {string} SHA-256 hash in hex format
 */
function hash(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string');
  }
  
  return crypto.createHash('sha256').update(text).digest('hex');
}

module.exports = {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  isEncrypted,
  hash,
};
