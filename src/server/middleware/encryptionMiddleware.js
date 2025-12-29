/**
 * Encryption Middleware
 * Automatically encrypts/decrypts sensitive fields in requests/responses
 */

const encryptionService = require('../services/encryptionService');

// Define which fields should be encrypted for each table
const ENCRYPTED_FIELDS = {
  employee_details: ['ssn_encrypted', 'bank_account_encrypted', 'bank_ifsc_encrypted'],
  employee_salary_details: ['base_salary_encrypted'],
  // Add more tables as needed
};

// Define plain text field names that should be encrypted
const PLAIN_TEXT_FIELDS = {
  employee_details: {
    ssn: 'ssn_encrypted',
    ssn_hash: 'ssn_hash',
    bank_account: 'bank_account_encrypted',
    bank_ifsc: 'bank_ifsc_encrypted',
  },
  employee_salary_details: {
    base_salary: 'base_salary_encrypted',
  },
};

/**
 * Middleware to encrypt sensitive fields before saving to database
 */
function encryptBeforeSave(tableName) {
  return (req, res, next) => {
    if (req.body && PLAIN_TEXT_FIELDS[tableName]) {
      const fieldsToEncrypt = PLAIN_TEXT_FIELDS[tableName];
      
      // Encrypt plain text fields and store in encrypted columns
      for (const [plainField, encryptedField] of Object.entries(fieldsToEncrypt)) {
        if (req.body[plainField] && typeof req.body[plainField] === 'string') {
          // Encrypt the value
          req.body[encryptedField] = encryptionService.encrypt(req.body[plainField], plainField);
          
          // For SSN, also create a hash for searching
          if (plainField === 'ssn' && fieldsToEncrypt.ssn_hash) {
            req.body[fieldsToEncrypt.ssn_hash] = encryptionService.hash(req.body[plainField]);
          }
          
          // Remove plain text field (don't save it)
          delete req.body[plainField];
        }
      }
    }
    
    next();
  };
}

/**
 * Middleware to decrypt sensitive fields after reading from database
 */
function decryptAfterRead(tableName) {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to decrypt before sending
    res.json = function(data) {
      if (data && typeof data === 'object') {
        // Handle array of records
        if (Array.isArray(data.data) || Array.isArray(data)) {
          const records = Array.isArray(data.data) ? data.data : data;
          const decrypted = records.map(record => decryptRecord(record, tableName));
          
          if (Array.isArray(data.data)) {
            data.data = decrypted;
          } else {
            return originalJson(decrypted);
          }
        } 
        // Handle single record
        else if (data.data && typeof data.data === 'object') {
          data.data = decryptRecord(data.data, tableName);
        }
        // Handle direct object
        else if (typeof data === 'object' && !Array.isArray(data)) {
          const decrypted = decryptRecord(data, tableName);
          return originalJson(decrypted);
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Decrypt a single record
 */
function decryptRecord(record, tableName) {
  if (!record || typeof record !== 'object') {
    return record;
  }
  
  const decrypted = { ...record };
  const encryptedFields = ENCRYPTED_FIELDS[tableName] || [];
  const plainTextFields = PLAIN_TEXT_FIELDS[tableName] || {};
  
  // Decrypt encrypted fields and expose as plain text fields
  for (const encryptedField of encryptedFields) {
    if (decrypted[encryptedField] && encryptionService.isEncrypted(decrypted[encryptedField])) {
      try {
        // Find the corresponding plain text field name
        const plainField = Object.keys(plainTextFields).find(
          key => plainTextFields[key] === encryptedField
        );
        
        if (plainField) {
          // Decrypt and expose as plain text field
          decrypted[plainField] = encryptionService.decrypt(decrypted[encryptedField]);
        }
      } catch (error) {
        console.error(`[Encryption] Failed to decrypt ${encryptedField}:`, error);
        // Keep encrypted value if decryption fails
      }
    }
  }
  
  return decrypted;
}

module.exports = {
  encryptBeforeSave,
  decryptAfterRead,
  decryptRecord,
};
