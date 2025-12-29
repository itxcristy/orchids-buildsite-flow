/**
 * Pagination Helper Utilities
 * Provides consistent pagination across all list endpoints
 */

/**
 * Parse and validate pagination parameters from request
 * @param {Object} query - Express request query object
 * @param {Object} options - Pagination options
 * @param {number} options.defaultLimit - Default items per page (default: 50)
 * @param {number} options.maxLimit - Maximum items per page (default: 100)
 * @param {number} options.defaultPage - Default page number (default: 1)
 * @returns {Object} { page, limit, offset, isValid }
 */
function parsePagination(query, options = {}) {
  const {
    defaultLimit = 50,
    maxLimit = 100,
    defaultPage = 1,
  } = options;

  const page = Math.max(1, parseInt(query.page || defaultPage, 10) || defaultPage);
  let limit = parseInt(query.limit || defaultLimit, 10) || defaultLimit;
  
  // Enforce maximum limit
  if (limit > maxLimit) {
    limit = maxLimit;
  }
  
  // Ensure limit is positive
  if (limit < 1) {
    limit = defaultLimit;
  }

  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
    isValid: !isNaN(page) && !isNaN(limit) && page > 0 && limit > 0,
  };
}

/**
 * Build pagination response object
 * @param {Object} params - Pagination parameters
 * @param {number} params.page - Current page
 * @param {number} params.limit - Items per page
 * @param {number} params.total - Total number of items
 * @returns {Object} Pagination metadata
 */
function buildPaginationResponse({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPreviousPage: page > 1,
  };
}

/**
 * Build paginated response
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination metadata
 * @returns {Object} Standard paginated response
 */
function buildPaginatedResponse(data, pagination) {
  return {
    success: true,
    data,
    pagination: buildPaginationResponse(pagination),
  };
}

/**
 * Validate and sanitize search query
 * @param {string} search - Search query string
 * @param {number} maxLength - Maximum length (default: 100)
 * @returns {string|null} Sanitized search query or null
 */
function sanitizeSearch(search, maxLength = 100) {
  if (!search || typeof search !== 'string') {
    return null;
  }

  const trimmed = search.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return null;
  }

  // Remove potentially dangerous characters but allow basic search
  return trimmed.replace(/[<>'"]/g, '');
}

/**
 * Build WHERE clause for search across multiple columns
 * @param {Array<string>} columns - Column names to search
 * @param {string} search - Search query
 * @param {number} paramIndex - Starting parameter index
 * @returns {Object} { clause: string, params: Array, nextIndex: number }
 */
function buildSearchClause(columns, search, paramIndex = 1) {
  if (!search || columns.length === 0) {
    return { clause: '', params: [], nextIndex: paramIndex };
  }

  const sanitized = sanitizeSearch(search);
  if (!sanitized) {
    return { clause: '', params: [], nextIndex: paramIndex };
  }

  const conditions = columns.map(col => `${col} ILIKE $${paramIndex}`);
  const clause = `(${conditions.join(' OR ')})`;
  
  return {
    clause,
    params: [`%${sanitized}%`],
    nextIndex: paramIndex + 1,
  };
}

/**
 * Build ORDER BY clause with validation
 * @param {string|Object} orderBy - Order by field or object { field, direction }
 * @param {Array<string>} allowedFields - Allowed field names
 * @param {string} defaultField - Default field to order by
 * @param {string} defaultDirection - Default direction (ASC|DESC)
 * @returns {string} ORDER BY clause
 */
function buildOrderByClause(orderBy, allowedFields = [], defaultField = 'created_at', defaultDirection = 'DESC') {
  if (!orderBy) {
    return `ORDER BY ${defaultField} ${defaultDirection}`;
  }

  let field = defaultField;
  let direction = defaultDirection.toUpperCase();

  if (typeof orderBy === 'string') {
    field = orderBy;
  } else if (typeof orderBy === 'object') {
    field = orderBy.field || defaultField;
    direction = (orderBy.direction || defaultDirection).toUpperCase();
  }

  // Validate field is allowed
  if (allowedFields.length > 0 && !allowedFields.includes(field)) {
    field = defaultField;
  }

  // Validate direction
  if (direction !== 'ASC' && direction !== 'DESC') {
    direction = defaultDirection.toUpperCase();
  }

  return `ORDER BY ${field} ${direction}`;
}

module.exports = {
  parsePagination,
  buildPaginationResponse,
  buildPaginatedResponse,
  sanitizeSearch,
  buildSearchClause,
  buildOrderByClause,
};

