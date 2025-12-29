/**
 * Custom Report Builder Service
 * Handles dynamic report generation based on user-defined configurations
 * SECURITY: All queries use parameterized queries to prevent SQL injection
 */

const { getAgencyPool } = require('../utils/poolManager');
const { quoteIdentifier, validateIdentifier, validateJoinCondition } = require('../utils/securityUtils');

/**
 * Build and execute custom report query
 * SECURE VERSION: Uses parameterized queries and validates all identifiers
 */
async function buildReport(agencyDatabase, reportConfig) {
  const pool = getAgencyPool(agencyDatabase);
  const client = await pool.connect();
  
  try {
    const {
      tables,
      columns,
      joins,
      filters,
      groupBy,
      orderBy,
      limit,
    } = reportConfig;

    // Validate required fields
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      throw new Error('At least one table is required');
    }
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      throw new Error('At least one column is required');
    }

    // Validate and quote table names
    const safeTables = tables.map(table => {
      validateIdentifier(table);
      return quoteIdentifier(table);
    });

    // Build SELECT clause with validated and quoted identifiers
    const selectColumns = columns.map(col => {
      if (!col.table || !col.column) {
        throw new Error('Column must have table and column properties');
      }
      
      validateIdentifier(col.table);
      validateIdentifier(col.column);
      
      const safeTable = quoteIdentifier(col.table);
      const safeColumn = quoteIdentifier(col.column);
      
      if (col.aggregate) {
        // Validate aggregate function
        const validAggregates = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'STRING_AGG'];
        const aggregate = col.aggregate.toUpperCase();
        if (!validAggregates.includes(aggregate)) {
          throw new Error(`Invalid aggregate function: ${col.aggregate}`);
        }
        
        const alias = col.alias ? quoteIdentifier(col.alias) : quoteIdentifier(col.column);
        return `${aggregate}(${safeTable}.${safeColumn}) as ${alias}`;
      }
      
      const alias = col.alias ? ` as ${quoteIdentifier(col.alias)}` : '';
      return `${safeTable}.${safeColumn}${alias}`;
    }).join(', ');

    // Build FROM clause with safe table names
    let fromClause = safeTables[0];
    if (safeTables.length > 1 && joins) {
      if (!Array.isArray(joins)) {
        throw new Error('Joins must be an array');
      }
      
      for (const join of joins) {
        if (!join.table || !join.condition) {
          throw new Error('Join must have table and condition properties');
        }
        
        validateIdentifier(join.table);
        const safeJoinTable = quoteIdentifier(join.table);
        
        // Validate join type
        const validJoinTypes = ['INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS'];
        const joinType = validJoinTypes.includes(join.type?.toUpperCase()) 
          ? join.type.toUpperCase() 
          : 'INNER';
        
        // Validate and sanitize join condition
        const safeCondition = validateJoinCondition(join.condition);
        // Quote identifiers in condition
        const quotedCondition = safeCondition.replace(/([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)/gi, (match) => {
          const [table, column] = match.split('.');
          return `${quoteIdentifier(table)}.${quoteIdentifier(column)}`;
        });
        
        fromClause += ` ${joinType} JOIN ${safeJoinTable} ON ${quotedCondition}`;
      }
    }

    // Build WHERE clause with parameterized queries
    let whereClause = '';
    const params = [];
    let paramIndex = 1;
    
    if (filters && filters.length > 0) {
      if (!Array.isArray(filters)) {
        throw new Error('Filters must be an array');
      }
      
      const conditions = filters.map(filter => {
        if (!filter.table || !filter.column || filter.value === undefined) {
          throw new Error('Filter must have table, column, and value properties');
        }
        
        validateIdentifier(filter.table);
        validateIdentifier(filter.column);
        
        const safeTable = quoteIdentifier(filter.table);
        const safeColumn = quoteIdentifier(filter.column);
        
        // Validate operator
        const validOperators = ['=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'ILIKE', 'IN', 'IS', 'IS NOT'];
        const operator = validOperators.includes(filter.operator?.toUpperCase()) 
          ? filter.operator.toUpperCase() 
          : '=';
        
        // Handle different value types with parameterization
        if (operator === 'IN') {
          if (!Array.isArray(filter.value)) {
            throw new Error('IN operator requires an array value');
          }
          if (filter.value.length === 0) {
            return null; // Skip empty IN clauses
          }
          const placeholders = filter.value.map(() => `$${paramIndex++}`).join(', ');
          params.push(...filter.value);
          return `${safeTable}.${safeColumn} IN (${placeholders})`;
        } else if (operator === 'IS' || operator === 'IS NOT') {
          // IS NULL or IS NOT NULL - no parameter needed
          if (filter.value !== null && filter.value !== 'NULL') {
            throw new Error(`${operator} operator can only be used with NULL`);
          }
          return `${safeTable}.${safeColumn} ${operator} NULL`;
        } else {
          // Parameterize all other values
          params.push(filter.value);
          return `${safeTable}.${safeColumn} ${operator} $${paramIndex++}`;
        }
      }).filter(Boolean); // Remove any null/undefined conditions
      
      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }
    }

    // Build GROUP BY with safe column names
    let groupByClause = '';
    if (groupBy && groupBy.length > 0) {
      if (!Array.isArray(groupBy)) {
        throw new Error('groupBy must be an array');
      }
      const safeGroupBy = groupBy.map(col => {
        validateIdentifier(col);
        return quoteIdentifier(col);
      }).join(', ');
      groupByClause = `GROUP BY ${safeGroupBy}`;
    }

    // Build ORDER BY with safe column names
    let orderByClause = '';
    if (orderBy && orderBy.length > 0) {
      if (!Array.isArray(orderBy)) {
        throw new Error('orderBy must be an array');
      }
      const orders = orderBy.map(o => {
        if (typeof o === 'string') {
          validateIdentifier(o);
          return `${quoteIdentifier(o)} ASC`;
        }
        if (!o.column) {
          throw new Error('OrderBy item must have column property');
        }
        validateIdentifier(o.column);
        const safeColumn = quoteIdentifier(o.column);
        const direction = o.direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        return `${safeColumn} ${direction}`;
      }).join(', ');
      orderByClause = `ORDER BY ${orders}`;
    }

    // Build LIMIT with validation
    let limitClause = '';
    if (limit !== undefined && limit !== null) {
      const limitValue = parseInt(limit, 10);
      if (isNaN(limitValue) || limitValue <= 0) {
        throw new Error('Limit must be a positive integer');
      }
      if (limitValue > 10000) {
        throw new Error('Limit cannot exceed 10000');
      }
      limitClause = `LIMIT ${limitValue}`;
    }

    // Construct final query with parameters
    const query = `
      SELECT ${selectColumns}
      FROM ${fromClause}
      ${whereClause}
      ${groupByClause}
      ${orderByClause}
      ${limitClause}
    `;

    // Execute with parameterized query
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    // ✅ Release connection back to pool (don't close the pool!)
    client.release();
  }
}

/**
 * Generate report in specified format
 */
async function generateReportFile(agencyDatabase, reportData, format = 'json') {
  // In production, use libraries like:
  // - PDF: pdfkit, puppeteer
  // - Excel: exceljs, xlsx
  // - CSV: csv-stringify
  
  switch (format) {
    case 'pdf':
      // Generate PDF (would use pdfkit or puppeteer)
      return { format: 'pdf', data: 'PDF binary data' };
    case 'excel':
      // Generate Excel (would use exceljs)
      return { format: 'xlsx', data: 'Excel binary data' };
    case 'csv':
      // Generate CSV
      const headers = Object.keys(reportData[0] || {});
      const csv = [
        headers.join(','),
        ...reportData.map(row => headers.map(h => row[h]).join(','))
      ].join('\n');
      return { format: 'csv', data: csv };
    default:
      return { format: 'json', data: JSON.stringify(reportData, null, 2) };
  }
}

module.exports = {
  buildReport,
  generateReportFile,
};
