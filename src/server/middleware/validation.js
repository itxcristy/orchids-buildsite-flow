/**
 * Input Validation Middleware
 * Uses express-validator to validate and sanitize request data
 */

const { validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 * Returns 400 with error details if validation fails
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Invalid input data',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
}

/**
 * Common validation rules
 */
const commonRules = {
  email: require('express-validator').body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail()
    .trim()
    .toLowerCase(),

  password: require('express-validator').body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  optionalString: (field) => require('express-validator').body(field)
    .optional()
    .trim()
    .escape()
    .isLength({ max: 1000 })
    .withMessage(`${field} must be less than 1000 characters`),

  string: (field, maxLength = 255) => require('express-validator').body(field)
    .trim()
    .escape()
    .isLength({ min: 1, max: maxLength })
    .withMessage(`${field} must be between 1 and ${maxLength} characters`),

  uuid: (field) => require('express-validator').body(field)
    .isUUID()
    .withMessage(`${field} must be a valid UUID`),

  optionalUUID: (field) => require('express-validator').body(field)
    .optional()
    .isUUID()
    .withMessage(`${field} must be a valid UUID`),

  number: (field, min = null, max = null) => {
    let rule = require('express-validator').body(field)
      .toInt()
      .isInt();
    
    if (min !== null) {
      rule = rule.custom((value) => {
        if (value < min) {
          throw new Error(`${field} must be at least ${min}`);
        }
        return true;
      });
    }
    
    if (max !== null) {
      rule = rule.custom((value) => {
        if (value > max) {
          throw new Error(`${field} must be at most ${max}`);
        }
        return true;
      });
    }
    
    return rule;
  },

  optionalNumber: (field, min = null, max = null) => {
    let rule = require('express-validator').body(field)
      .optional()
      .toInt()
      .isInt();
    
    if (min !== null) {
      rule = rule.custom((value) => {
        if (value !== undefined && value < min) {
          throw new Error(`${field} must be at least ${min}`);
        }
        return true;
      });
    }
    
    if (max !== null) {
      rule = rule.custom((value) => {
        if (value !== undefined && value > max) {
          throw new Error(`${field} must be at most ${max}`);
        }
        return true;
      });
    }
    
    return rule;
  },

  boolean: (field) => require('express-validator').body(field)
    .toBoolean()
    .isBoolean()
    .withMessage(`${field} must be a boolean`),

  optionalBoolean: (field) => require('express-validator').body(field)
    .optional()
    .toBoolean()
    .isBoolean()
    .withMessage(`${field} must be a boolean`),

  array: (field, minLength = 0, maxLength = 100) => require('express-validator').body(field)
    .isArray({ min: minLength, max: maxLength })
    .withMessage(`${field} must be an array with ${minLength} to ${maxLength} items`),

  optionalArray: (field, minLength = 0, maxLength = 100) => require('express-validator').body(field)
    .optional()
    .isArray({ min: minLength, max: maxLength })
    .withMessage(`${field} must be an array with ${minLength} to ${maxLength} items`),
};

module.exports = {
  validateRequest,
  commonRules,
};

