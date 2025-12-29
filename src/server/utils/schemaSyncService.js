/**
 * Schema Sync Service
 * 
 * Automatically detects and creates missing columns in database tables.
 * This service compares expected schema (from CREATE TABLE statements) with
 * actual database schema and creates any missing columns.
 * 
 * Features:
 * - Detects missing columns across all tables
 * - Automatically creates missing columns with correct data types and constraints
 * - Handles default values, nullable constraints, and foreign keys
 * - Safe to run multiple times (idempotent)
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse CREATE TABLE statement to extract column definitions
 * @param {string} createTableSql - The CREATE TABLE SQL statement
 * @returns {Array} Array of column definitions with name, type, constraints
 */
function parseTableColumns(createTableSql) {
  const columns = [];
  
  // Extract the column definitions part (between the parentheses)
  const tableMatch = createTableSql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?\w+\s*\(([\s\S]+)\)/i);
  if (!tableMatch) return columns;
  
  let columnDefinitions = tableMatch[1];
  
  // Remove SQL comments (-- style comments)
  // Handle both single-line and multi-line comments
  columnDefinitions = columnDefinitions.replace(/--[^\r\n]*/g, '');
  columnDefinitions = columnDefinitions.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Split by comma, but be careful with nested parentheses (for constraints, etc.)
  const parts = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = null;
  
  for (let i = 0; i < columnDefinitions.length; i++) {
    const char = columnDefinitions[i];
    
    // Handle string literals
    if (!inString && (char === "'" || char === '"')) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar) {
      // Check for escaped quotes
      if (i === 0 || columnDefinitions[i - 1] !== '\\') {
        inString = false;
        stringChar = null;
      }
    }
    
    if (!inString) {
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (char === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  
  // Valid PostgreSQL column name pattern
  const validColumnNamePattern = /^[a-z_][a-z0-9_]*$/i;
  // Invalid column names (keywords, numbers, etc.)
  const invalidColumnNames = new Set(['etc', 'and', 'or', 'not', 'null', 'default', 'unique', 'primary', 'key', 'foreign', 'references', 'constraint', 'check']);
  
  // Parse each column definition
  for (const part of parts) {
    const trimmed = part.trim();
    
    // Skip empty parts
    if (!trimmed) continue;
    
    // Skip constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE, etc.)
    if (
      trimmed.toUpperCase().startsWith('PRIMARY KEY') ||
      trimmed.toUpperCase().startsWith('FOREIGN KEY') ||
      trimmed.toUpperCase().startsWith('UNIQUE') ||
      trimmed.toUpperCase().startsWith('CONSTRAINT') ||
      trimmed.toUpperCase().startsWith('CHECK')
    ) {
      continue;
    }
    
    // Extract column name (first word, must be valid identifier)
    const nameMatch = trimmed.match(/^([a-z_][a-z0-9_]*)/i);
    if (!nameMatch) continue;
    
    const columnName = nameMatch[1];
    
    // Validate column name - skip invalid names
    if (!validColumnNamePattern.test(columnName) || invalidColumnNames.has(columnName.toLowerCase())) {
      continue;
    }
    
    // Skip if column name starts with a number (invalid SQL identifier)
    if (/^\d/.test(columnName)) {
      continue;
    }
    
    // Extract data type - improved parsing
    let dataType = 'TEXT'; // default
    let isNullable = true;
    let defaultValue = null;
    let isUnique = false;
    let references = null;
    
    // Get the full type definition (everything after column name)
    const typePart = trimmed.substring(columnName.length).trim();
    
    // Valid PostgreSQL data types
    const validTypes = [
      'UUID', 'TEXT', 'VARCHAR', 'CHAR', 'CHARACTER',
      'INTEGER', 'INT', 'BIGINT', 'SMALLINT', 'SERIAL', 'BIGSERIAL',
      'NUMERIC', 'DECIMAL', 'REAL', 'DOUBLE', 'FLOAT',
      'BOOLEAN', 'BOOL',
      'DATE', 'TIME', 'TIMESTAMP', 'TIMESTAMPTZ', 'INTERVAL',
      'JSON', 'JSONB',
      'ARRAY', 'TEXT[]', 'INTEGER[]', 'UUID[]'
    ];
    
    // Extract type using regex - match known PostgreSQL types
    // Pattern: TYPE or TYPE(size) or TYPE(size, precision) or "TYPE WITH TIME ZONE"
    const typePatterns = [
      /(TIMESTAMP\s+WITH\s+TIME\s+ZONE)/i,
      /(TIMESTAMP\s+WITHOUT\s+TIME\s+ZONE)/i,
      /(TIME\s+WITH\s+TIME\s+ZONE)/i,
      /(TIME\s+WITHOUT\s+TIME\s+ZONE)/i,
      /(VARCHAR\s*\(\s*\d+\s*\))/i,
      /(CHAR\s*\(\s*\d+\s*\))/i,
      /(CHARACTER\s*\(\s*\d+\s*\))/i,
      /(NUMERIC\s*\(\s*\d+\s*,\s*\d+\s*\))/i,
      /(DECIMAL\s*\(\s*\d+\s*,\s*\d+\s*\))/i,
      /(TEXT\[\])/i,
      /(INTEGER\[\])/i,
      /(UUID\[\])/i,
      /(\w+)\s*\(\s*\d+\s*\)/i, // Generic type with size
      /(\w+)/i // Generic type
    ];
    
    let typeFound = false;
    for (const pattern of typePatterns) {
      const match = typePart.match(pattern);
      if (match) {
        let candidateType = match[1].toUpperCase().trim();
        
        // Validate it's a known type or starts with a known type
        const isValidType = validTypes.some(validType => 
          candidateType.startsWith(validType) || 
          candidateType === validType ||
          candidateType.includes(validType)
        );
        
        if (isValidType || /^(UUID|TEXT|VARCHAR|CHAR|INTEGER|INT|BIGINT|NUMERIC|DECIMAL|BOOLEAN|DATE|TIMESTAMP|JSON|JSONB)/i.test(candidateType)) {
          dataType = candidateType;
          typeFound = true;
          break;
        }
      }
    }
    
    // If no valid type found, try to extract from first word after column name
    if (!typeFound) {
      const typeWords = typePart.split(/\s+/);
      const typeKeywords = ['NOT', 'NULL', 'DEFAULT', 'UNIQUE', 'REFERENCES', 'PRIMARY', 'KEY', 'WITH', 'TIME', 'ZONE'];
      
      for (let i = 0; i < typeWords.length; i++) {
        const word = typeWords[i].toUpperCase();
        if (!typeKeywords.includes(word)) {
          // Check if it's a valid type
          if (validTypes.some(vt => word.startsWith(vt) || word === vt)) {
            let typeStr = typeWords[i];
            // Handle compound types like "TIMESTAMP WITH TIME ZONE"
            if (word === 'TIMESTAMP' && i + 3 < typeWords.length && 
                typeWords[i + 1].toUpperCase() === 'WITH' &&
                typeWords[i + 2].toUpperCase() === 'TIME' &&
                typeWords[i + 3].toUpperCase() === 'ZONE') {
              typeStr = typeWords.slice(i, i + 4).join(' ');
            } else if (typeStr.includes('(')) {
              // Handle types with parameters like NUMERIC(15, 2)
              let j = i;
              while (j < typeWords.length && !typeWords[j].includes(')')) {
                j++;
              }
              if (j < typeWords.length) {
                typeStr = typeWords.slice(i, j + 1).join(' ');
              }
            }
            dataType = typeStr.toUpperCase();
            typeFound = true;
            break;
          }
        }
      }
    }
    
    // Default to TEXT if still no type found
    if (!typeFound) {
      dataType = 'TEXT';
    }
    
    // Check for NOT NULL
    if (trimmed.toUpperCase().includes('NOT NULL')) {
      isNullable = false;
    }
    
    // Check for DEFAULT
    const defaultMatch = trimmed.match(/DEFAULT\s+([^,\s]+(?:\s+[^,\s]+)*)/i);
    if (defaultMatch) {
      defaultValue = defaultMatch[1].trim();
      // Clean up common defaults
      if (defaultValue.toUpperCase() === 'NOW()') {
        defaultValue = 'NOW()';
      } else if (defaultValue.toUpperCase() === 'TRUE' || defaultValue.toUpperCase() === 'FALSE') {
        defaultValue = defaultValue.toUpperCase();
      } else if (defaultValue.match(/^\d+$/)) {
        // Numeric default
      } else if (defaultValue.startsWith("'") && defaultValue.endsWith("'")) {
        defaultValue = defaultValue.slice(1, -1);
      }
    }
    
    // Check for UNIQUE
    if (trimmed.toUpperCase().includes('UNIQUE') && !trimmed.toUpperCase().includes('UNIQUE KEY')) {
      isUnique = true;
    }
    
    // Check for REFERENCES (foreign key)
    const refMatch = trimmed.match(/REFERENCES\s+[\w.]+\((\w+)\)/i);
    if (refMatch) {
      references = {
        table: trimmed.match(/REFERENCES\s+([\w.]+)\(/i)?.[1],
        column: refMatch[1]
      };
    }
    
    // Additional validation: skip if type is clearly invalid (like another column name)
    // If dataType looks like a column name (all lowercase, no parentheses), it's probably wrong
    if (dataType && !dataType.includes('(') && dataType.length < 20 && 
        /^[a-z_]+$/i.test(dataType) && !validTypes.some(vt => dataType.toUpperCase().startsWith(vt))) {
      // This looks like a column name, not a type - skip it
      continue;
    }
    
    columns.push({
      name: columnName,
      type: dataType,
      nullable: isNullable,
      default: defaultValue,
      unique: isUnique,
      references: references
    });
  }
  
  return columns;
}

/**
 * Extract column definitions from all schema files
 * @returns {Object} Map of table names to their expected columns
 */
function extractExpectedSchema() {
  const schemaDir = path.join(__dirname, 'schema');
  const expectedSchema = {};
  
  // List of schema files to process
  const schemaFiles = [
    'authSchema.js',
    'agenciesSchema.js',
    'departmentsSchema.js',
    'hrSchema.js',
    'projectsTasksSchema.js',
    'clientsFinancialSchema.js',
    'crmSchema.js',
    'crmEnhancementsSchema.js',
    'gstSchema.js',
    'reimbursementSchema.js',
    'miscSchema.js',
    'messagingSchema.js',
    'inventorySchema.js',
    'procurementSchema.js',
    'financialSchema.js',
    'reportingSchema.js',
    'webhooksSchema.js',
    'projectEnhancementsSchema.js',
    'ssoSchema.js',
    'sessionManagementSchema.js'
  ];
  
  for (const file of schemaFiles) {
    const filePath = path.join(schemaDir, file);
    if (!fs.existsSync(filePath)) continue;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Find all CREATE TABLE statements - handle both direct CREATE TABLE and those inside DO blocks
      // Match: CREATE TABLE [IF NOT EXISTS] [public.]table_name (
      // Use a simpler, more reliable regex
      const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gi;
      let match;
      const processedTables = new Set(); // Avoid processing same table multiple times
      
      while ((match = createTableRegex.exec(content)) !== null) {
        const tableName = match[1];
        
        // Skip if table name is invalid or already processed
        if (!tableName || tableName.length < 2 || processedTables.has(tableName)) continue;
        processedTables.add(tableName);
        
        const startPos = match.index;
        const tableStart = match[0];
        
        // Find the matching closing parenthesis for the CREATE TABLE statement
        let depth = 1;
        let pos = startPos + tableStart.length;
        let foundEnd = false;
        let inString = false;
        let stringChar = null;
        
        while (pos < content.length && !foundEnd) {
          const char = content[pos];
          
          // Handle string literals (skip parentheses inside strings)
          if (!inString && (char === "'" || char === '"' || char === '`')) {
            inString = true;
            stringChar = char;
          } else if (inString && char === stringChar) {
            // Check for escaped quotes
            if (pos > 0 && content[pos - 1] !== '\\') {
              inString = false;
              stringChar = null;
            }
          }
          
          if (!inString) {
            if (char === '(') depth++;
            else if (char === ')') {
              depth--;
              if (depth === 0) {
                // Found the end of the CREATE TABLE statement
                const fullMatch = content.substring(startPos, pos + 1);
                const columns = parseTableColumns(fullMatch);
                
                if (!expectedSchema[tableName]) {
                  expectedSchema[tableName] = [];
                }
                
                // Merge columns (avoid duplicates)
                for (const col of columns) {
                  if (!expectedSchema[tableName].find(c => c.name === col.name)) {
                    expectedSchema[tableName].push(col);
                  }
                }
                foundEnd = true;
              }
            }
          }
          pos++;
        }
      }
    } catch (error) {
      console.warn(`[SchemaSync] Warning: Could not parse ${file}:`, error.message);
    }
  }
  
  // Debug: Log extracted tables
  const tableNames = Object.keys(expectedSchema);
  if (tableNames.length === 0) {
    console.warn('[SchemaSync] ⚠️  No tables extracted from schema files. This might indicate a parsing issue.');
  } else {
    console.log(`[SchemaSync] Extracted ${tableNames.length} tables: ${tableNames.slice(0, 10).join(', ')}${tableNames.length > 10 ? '...' : ''}`);
  }
  
  return expectedSchema;
}

/**
 * Get actual columns from database for a specific table
 * @param {Object} client - PostgreSQL client
 * @param {string} tableName - Table name
 * @returns {Array} Array of actual column definitions
 */
async function getActualColumns(client, tableName) {
  const result = await client.query(`
    SELECT 
      column_name,
      data_type,
      udt_name,
      character_maximum_length,
      numeric_precision,
      numeric_scale,
      is_nullable,
      column_default,
      is_identity
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  
  return result.rows.map(row => ({
    name: row.column_name,
    type: mapPostgresType(row.data_type, row.udt_name, row.numeric_precision, row.numeric_scale),
    nullable: row.is_nullable === 'YES',
    default: row.column_default,
    isIdentity: row.is_identity === 'YES'
  }));
}

/**
 * Map PostgreSQL information_schema types to SQL types
 */
function mapPostgresType(dataType, udtName, precision, scale) {
  if (udtName === 'uuid') return 'UUID';
  if (udtName === 'text') return 'TEXT';
  if (udtName === 'varchar') return dataType.toUpperCase();
  if (udtName === 'numeric' || udtName === 'decimal') {
    if (precision && scale) {
      return `NUMERIC(${precision},${scale})`;
    }
    return 'NUMERIC';
  }
  if (udtName === 'int4') return 'INTEGER';
  if (udtName === 'int8') return 'BIGINT';
  if (udtName === 'bool') return 'BOOLEAN';
  if (udtName === 'date') return 'DATE';
  if (udtName === 'timestamp') return 'TIMESTAMP WITH TIME ZONE';
  if (udtName === 'timestamptz') return 'TIMESTAMP WITH TIME ZONE';
  if (udtName === 'jsonb') return 'JSONB';
  if (udtName === 'json') return 'JSON';
  
  return dataType.toUpperCase();
}

/**
 * Generate ALTER TABLE statement to add a column
 * @param {string} tableName - Table name
 * @param {Object} column - Column definition
 * @returns {string} ALTER TABLE SQL statement
 */
function generateAddColumnSQL(tableName, column) {
  let sql = `ALTER TABLE public.${tableName} ADD COLUMN ${column.name} ${column.type}`;
  
  if (!column.nullable && !column.default) {
    // For NOT NULL columns without default, we need to handle existing rows
    // Add column as nullable first, then update and set NOT NULL
    sql = `ALTER TABLE public.${tableName} ADD COLUMN ${column.name} ${column.type}`;
  } else if (!column.nullable) {
    sql += ` NOT NULL`;
  }
  
  if (column.default) {
    // Handle different default types
    let defaultVal = column.default;
    if (defaultVal === 'NOW()' || defaultVal === 'CURRENT_TIMESTAMP') {
      defaultVal = 'NOW()';
    } else if (defaultVal === 'TRUE' || defaultVal === 'FALSE') {
      // Boolean
    } else if (defaultVal.match(/^\d+$/)) {
      // Numeric
    } else if (defaultVal === 'uuid_generate_v4()' || defaultVal === 'gen_random_uuid()') {
      // UUID generation
    } else {
      // String default
      defaultVal = `'${defaultVal.replace(/'/g, "''")}'`;
    }
    sql += ` DEFAULT ${defaultVal}`;
  }
  
  return sql;
}

/**
 * Sync schema for a specific table
 * @param {Object} client - PostgreSQL client
 * @param {string} tableName - Table name
 * @param {Array} expectedColumns - Expected column definitions
 * @returns {Object} Sync result with created columns
 */
async function syncTableColumns(client, tableName, expectedColumns) {
  const result = {
    table: tableName,
    created: [],
    errors: []
  };
  
  try {
    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName]);
    
    if (!tableExists.rows[0].exists) {
      result.errors.push(`Table ${tableName} does not exist`);
      return result;
    }
    
    // Get actual columns
    const actualColumns = await getActualColumns(client, tableName);
    const actualColumnNames = new Set(actualColumns.map(c => c.name));
    
    // Find missing columns
    for (const expectedCol of expectedColumns) {
      if (!actualColumnNames.has(expectedCol.name)) {
        try {
          // Generate and execute ALTER TABLE
          const alterSQL = generateAddColumnSQL(tableName, expectedCol);
          
          // For NOT NULL columns without default, handle existing rows
          if (!expectedCol.nullable && !expectedCol.default) {
            // Add as nullable first
            await client.query(`
              ALTER TABLE public.${tableName} 
              ADD COLUMN ${expectedCol.name} ${expectedCol.type}
            `);
            
            // Set a safe default for existing rows (based on type)
            let safeDefault = 'NULL';
            if (expectedCol.type.includes('TEXT') || expectedCol.type.includes('VARCHAR')) {
              safeDefault = "''";
            } else if (expectedCol.type.includes('NUMERIC') || expectedCol.type.includes('INTEGER')) {
              safeDefault = '0';
            } else if (expectedCol.type === 'BOOLEAN') {
              safeDefault = 'false';
            } else if (expectedCol.type === 'UUID') {
              safeDefault = 'gen_random_uuid()';
            }
            
            await client.query(`
              UPDATE public.${tableName} 
              SET ${expectedCol.name} = ${safeDefault}
              WHERE ${expectedCol.name} IS NULL
            `);
            
            // Now set NOT NULL
            await client.query(`
              ALTER TABLE public.${tableName} 
              ALTER COLUMN ${expectedCol.name} SET NOT NULL
            `);
          } else {
            await client.query(alterSQL);
          }
          
          // Add foreign key constraint if needed
          if (expectedCol.references) {
            try {
              await client.query(`
                ALTER TABLE public.${tableName}
                ADD CONSTRAINT ${tableName}_${expectedCol.name}_fkey
                FOREIGN KEY (${expectedCol.name})
                REFERENCES public.${expectedCol.references.table}(${expectedCol.references.column})
              `);
            } catch (fkError) {
              // Foreign key might already exist or reference table doesn't exist yet
              console.warn(`[SchemaSync] Could not add FK for ${tableName}.${expectedCol.name}:`, fkError.message);
            }
          }
          
          result.created.push(expectedCol.name);
          console.log(`[SchemaSync] ✅ Created column ${tableName}.${expectedCol.name} (${expectedCol.type})`);
        } catch (error) {
          result.errors.push(`Failed to create ${expectedCol.name}: ${error.message}`);
          console.error(`[SchemaSync] ❌ Error creating column ${tableName}.${expectedCol.name}:`, error.message);
        }
      }
    }
  } catch (error) {
    result.errors.push(`Table sync error: ${error.message}`);
    console.error(`[SchemaSync] ❌ Error syncing table ${tableName}:`, error.message);
  }
  
  return result;
}

/**
 * Sync all tables in the database
 * @param {Object} client - PostgreSQL client
 * @param {Object} expectedSchema - Expected schema (from extractExpectedSchema)
 * @returns {Object} Overall sync result
 */
async function syncAllTables(client, expectedSchema = null) {
  if (!expectedSchema) {
    expectedSchema = extractExpectedSchema();
  }
  
  const overallResult = {
    tablesProcessed: 0,
    columnsCreated: 0,
    errors: [],
    details: []
  };
  
  console.log('[SchemaSync] Starting schema synchronization...');
  console.log(`[SchemaSync] Found ${Object.keys(expectedSchema).length} tables to check`);
  
  // Get all actual tables from database
  const actualTablesResult = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  const actualTables = new Set(actualTablesResult.rows.map(r => r.table_name));
  
  // Sync each table
  for (const [tableName, expectedColumns] of Object.entries(expectedSchema)) {
    if (!actualTables.has(tableName)) {
      console.log(`[SchemaSync] ⚠️  Table ${tableName} not found in database, skipping`);
      continue;
    }
    
    const syncResult = await syncTableColumns(client, tableName, expectedColumns);
    overallResult.tablesProcessed++;
    overallResult.columnsCreated += syncResult.created.length;
    
    if (syncResult.created.length > 0 || syncResult.errors.length > 0) {
      overallResult.details.push(syncResult);
    }
    
    if (syncResult.errors.length > 0) {
      overallResult.errors.push(...syncResult.errors);
    }
  }
  
  console.log(`[SchemaSync] ✅ Schema sync completed:`);
  console.log(`[SchemaSync]   - Tables processed: ${overallResult.tablesProcessed}`);
  console.log(`[SchemaSync]   - Columns created: ${overallResult.columnsCreated}`);
  if (overallResult.errors.length > 0) {
    console.log(`[SchemaSync]   - Errors: ${overallResult.errors.length}`);
  }
  
  return overallResult;
}

/**
 * Quick sync - checks and creates missing columns for all tables
 * This is the main function to call for automatic schema synchronization
 * @param {Object} client - PostgreSQL client
 * @returns {Object} Sync result
 */
async function quickSyncSchema(client) {
  try {
    const expectedSchema = extractExpectedSchema();
    return await syncAllTables(client, expectedSchema);
  } catch (error) {
    console.error('[SchemaSync] ❌ Fatal error during schema sync:', error);
    throw error;
  }
}

module.exports = {
  quickSyncSchema,
  syncAllTables,
  syncTableColumns,
  extractExpectedSchema,
  getActualColumns
};

