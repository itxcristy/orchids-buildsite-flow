/**
 * Security Utilities
 * Provides secure database name validation and sanitization
 */

/**
 * Validate and sanitize database name
 * PostgreSQL identifiers must:
 * - Be 1-63 characters
 * - Start with letter or underscore
 * - Contain only letters, digits, underscores, hyphens
 * - Not be a reserved keyword
 */
function validateDatabaseName(dbName) {
  if (!dbName || typeof dbName !== 'string') {
    throw new Error('Database name must be a non-empty string');
  }

  // Remove whitespace
  const trimmed = dbName.trim();

  // Check length (PostgreSQL limit is 63 bytes)
  if (trimmed.length === 0 || trimmed.length > 63) {
    throw new Error('Database name must be between 1 and 63 characters');
  }

  // Check format: must start with letter or underscore, then alphanumeric, underscore, or hyphen
  const validPattern = /^[a-z_][a-z0-9_-]*$/i;
  if (!validPattern.test(trimmed)) {
    throw new Error('Database name contains invalid characters. Only letters, numbers, underscores, and hyphens are allowed, and it must start with a letter or underscore.');
  }

  // Check for reserved keywords (common ones)
  const reservedKeywords = [
    'all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc', 'asymmetric',
    'authorization', 'binary', 'both', 'case', 'cast', 'check', 'collate', 'column',
    'constraint', 'create', 'cross', 'current_catalog', 'current_date', 'current_role',
    'current_schema', 'current_time', 'current_timestamp', 'current_user', 'default',
    'deferrable', 'desc', 'distinct', 'do', 'else', 'end', 'except', 'false', 'fetch',
    'for', 'foreign', 'from', 'grant', 'group', 'having', 'in', 'initially', 'intersect',
    'into', 'lateral', 'leading', 'left', 'like', 'limit', 'localtime', 'localtimestamp',
    'not', 'null', 'offset', 'on', 'only', 'or', 'order', 'outer', 'over', 'overlaps',
    'placing', 'primary', 'references', 'returning', 'right', 'select', 'session_user',
    'similar', 'some', 'symmetric', 'table', 'then', 'to', 'trailing', 'true', 'union',
    'unique', 'user', 'using', 'variadic', 'verbose', 'when', 'where', 'window', 'with'
  ];

  const lowerName = trimmed.toLowerCase();
  if (reservedKeywords.includes(lowerName)) {
    throw new Error(`Database name cannot be a reserved PostgreSQL keyword: ${trimmed}`);
  }

  return trimmed;
}

/**
 * Validate table or column name (less strict than database name)
 * PostgreSQL identifiers must:
 * - Be 1-63 characters
 * - Start with letter or underscore
 * - Contain only letters, digits, underscores, hyphens
 */
function validateIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    throw new Error('Identifier must be a non-empty string');
  }

  const trimmed = identifier.trim();

  if (trimmed.length === 0 || trimmed.length > 63) {
    throw new Error('Identifier must be between 1 and 63 characters');
  }

  // Check format: must start with letter or underscore, then alphanumeric, underscore, or hyphen
  const validPattern = /^[a-z_][a-z0-9_-]*$/i;
  if (!validPattern.test(trimmed)) {
    throw new Error('Identifier contains invalid characters. Only letters, numbers, underscores, and hyphens are allowed, and it must start with a letter or underscore.');
  }

  return trimmed;
}

/**
 * Safely quote a PostgreSQL identifier
 * This is safe because we've already validated the name
 */
function quoteIdentifier(identifier) {
  const validated = validateIdentifier(identifier);
  // Double quotes for case sensitivity and special characters
  return `"${validated.replace(/"/g, '""')}"`;
}

/**
 * Validate UUID format
 */
function validateUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    throw new Error('UUID must be a non-empty string');
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new Error('Invalid UUID format');
  }

  return uuid;
}

/**
 * Safely set PostgreSQL session variable
 * Validates input and uses PostgreSQL's quote_literal for safety
 * Note: SET LOCAL must be called within a transaction
 */
async function setSessionVariable(client, variableName, value) {
  // Validate variable name (must be alphanumeric, dots, and underscores)
  // Format: schema.variable or just variable
  if (!/^[a-z_][a-z0-9_.]*$/i.test(variableName)) {
    throw new Error('Invalid session variable name');
  }

  // Validate value is a string (for UUIDs, we validate separately)
  if (typeof value !== 'string') {
    throw new Error('Session variable value must be a string');
  }

  // Use PostgreSQL's quote_literal function for safe escaping
  // This is safe because we're using a built-in PostgreSQL function
  const result = await client.query(
    `SELECT quote_literal($1) as quoted_value`,
    [value]
  );
  const quotedValue = result.rows[0].quoted_value;

  // Split variable name by dots and quote each part
  const parts = variableName.split('.');
  const quotedParts = parts.map(part => {
    // Validate each part
    if (!/^[a-z_][a-z0-9_]*$/i.test(part)) {
      throw new Error(`Invalid variable name part: ${part}`);
    }
    return `"${part.replace(/"/g, '""')}"`;
  });
  const quotedVariableName = quotedParts.join('.');

  // Execute SET LOCAL with properly quoted values
  await client.query(`SET LOCAL ${quotedVariableName} = ${quotedValue}`);
}

/**
 * Validate join condition format
 * Must be: table.column = table.column (or similar)
 */
function validateJoinCondition(condition) {
  if (!condition || typeof condition !== 'string') {
    throw new Error('Join condition must be a string');
  }
  
  const trimmed = condition.trim();
  
  // Basic validation: must contain table.column format with operator
  const pattern = /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\s*[=<>!]+=?s*[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/i;
  if (!pattern.test(trimmed)) {
    throw new Error('Invalid join condition format. Must be: table.column = table.column');
  }
  
  return trimmed;
}

module.exports = {
  validateDatabaseName,
  validateIdentifier,
  quoteIdentifier,
  validateUUID,
  setSessionVariable,
  validateJoinCondition,
};

