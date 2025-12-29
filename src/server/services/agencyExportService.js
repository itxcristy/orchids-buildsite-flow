/**
 * Agency Export Service
 * Exports all agency database tables to CSV files and creates a ZIP archive
 */

const { Pool } = require('pg');
const archiver = require('archiver');
const { stringify } = require('csv-stringify/sync');
const { parseDatabaseUrl } = require('../utils/poolManager');
const { pool } = require('../config/database');

/**
 * Escape CSV field value
 * Handles quotes, commas, newlines, and special data types properly
 */
function escapeCSVField(value) {
  if (value === null || value === undefined) {
    return '';
  }

  // Handle different data types
  let stringValue;
  
  if (Buffer.isBuffer(value)) {
    // Binary data - encode as base64
    stringValue = value.toString('base64');
  } else if (typeof value === 'object') {
    // JSON/JSONB objects and arrays - stringify
    try {
      stringValue = JSON.stringify(value);
    } catch (error) {
      stringValue = String(value);
    }
  } else if (value instanceof Date) {
    // Date objects - convert to ISO string
    stringValue = value.toISOString();
  } else {
    stringValue = String(value);
  }
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Convert PostgreSQL row to CSV row
 */
function rowToCSV(row, columns) {
  return columns.map(col => escapeCSVField(row[col])).join(',');
}

/**
 * Export a single table to CSV string
 */
async function exportTableToCSV(client, tableName) {
  try {
    // Get column names
    const columnResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1 
      ORDER BY ordinal_position
    `, [tableName]);

    if (columnResult.rows.length === 0) {
      return { headers: [], rows: [] };
    }

    const columns = columnResult.rows.map(row => row.column_name);
    
    // Get all data from table - use parameterized query with table name escaping
    // Note: PostgreSQL doesn't support parameterized table names, so we need to escape it
    // Use pg_quote_ident for safe identifier quoting
    const escapedTableName = `"${tableName.replace(/"/g, '""')}"`;
    let dataResult;
    try {
      dataResult = await client.query(`SELECT * FROM public.${escapedTableName}`);
    } catch (queryError) {
      // If table doesn't exist or has issues, log and return empty
      console.warn(`[Export] Error querying table ${tableName}:`, queryError.message);
      return {
        headers: columns,
        rows: [columns.map(col => escapeCSVField(col)).join(',')], // Just headers
        rowCount: 0
      };
    }
    
    // Convert to CSV format
    const csvRows = [];
    
    // Add header row
    csvRows.push(columns.map(col => escapeCSVField(col)).join(','));
    
    // Add data rows
    for (const row of dataResult.rows) {
      csvRows.push(rowToCSV(row, columns));
    }
    
    return {
      headers: columns,
      rows: csvRows,
      rowCount: dataResult.rows.length
    };
  } catch (error) {
    console.error(`[Export] Error exporting table ${tableName}:`, error);
    throw new Error(`Failed to export table ${tableName}: ${error.message}`);
  }
}

/**
 * Export all agency database tables to CSV and create ZIP archive
 * @param {string} agencyId - Agency ID from main database
 * @param {string} databaseName - Agency database name
 * @returns {Promise<Buffer>} ZIP file buffer
 */
async function exportAgencyToCSV(agencyId, databaseName) {
  if (!databaseName) {
    throw new Error('Database name is required for export');
  }

  // Get agency info from main database
  const mainClient = await pool.connect();
  let agencyName = 'unknown';
  try {
    const agencyResult = await mainClient.query(
      'SELECT name FROM public.agencies WHERE id = $1',
      [agencyId]
    );
    if (agencyResult.rows.length > 0) {
      agencyName = agencyResult.rows[0].name;
    }
  } finally {
    mainClient.release();
  }

  // Connect to agency database
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${databaseName}`;
  const agencyPool = new Pool({ 
    connectionString: agencyDbUrl, 
    max: 1,
    connectionTimeoutMillis: 10000, // 10 second timeout
  });
  
  let agencyClient;
  try {
    agencyClient = await agencyPool.connect();
  } catch (connectionError) {
    console.error(`[Export] Failed to connect to database ${databaseName}:`, connectionError);
    throw new Error(`Cannot connect to database "${databaseName}": ${connectionError.message}. The database may not exist or may be inaccessible.`);
  }

  try {
    // Get all tables in public schema
    const tablesResult = await agencyClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      console.warn(`[Export] No tables found in database ${databaseName} - creating empty export`);
      // Don't throw error, just export empty metadata
    }

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`[Export] Found ${tables.length} tables to export from database: ${databaseName}`);

    // If no tables, create a minimal export with just metadata
    if (tables.length === 0) {
      const metadata = {
        agency_id: agencyId,
        agency_name: agencyName,
        database_name: databaseName,
        export_timestamp: new Date().toISOString(),
        tables_exported: 0,
        tables: [],
        note: 'Database exists but contains no tables'
      };
      
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks = [];
      
      archive.on('data', (chunk) => chunks.push(chunk));
      
      return new Promise((resolve, reject) => {
        archive.on('error', (err) => {
          reject(new Error(`ZIP archive error: ${err.message}`));
        });

        archive.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`[Export] Empty ZIP archive created: ${buffer.length} bytes`);
          resolve(buffer);
        });

        archive.append(JSON.stringify(metadata, null, 2), { name: 'export_metadata.json' });
        archive.finalize();
      });
    }

    // Create ZIP archive in memory
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    const chunks = [];
    let archiveError = null;
    
    // Collect data chunks
    archive.on('data', (chunk) => {
      chunks.push(chunk);
    });

    // Handle archive errors
    archive.on('error', (err) => {
      archiveError = err;
      console.error('[Export] Archive error:', err);
    });

    // Export each table
    const exportResults = [];
    for (const tableName of tables) {
      try {
        console.log(`[Export] Exporting table: ${tableName}`);
        const csvData = await exportTableToCSV(agencyClient, tableName);
        
        // Add CSV file to ZIP
        const csvContent = csvData.rows.join('\n');
        archive.append(csvContent, { name: `${tableName}.csv` });
        
        exportResults.push({
          table: tableName,
          rows: csvData.rowCount,
          columns: csvData.headers.length,
          success: true
        });
      } catch (error) {
        console.error(`[Export] Failed to export table ${tableName}:`, error);
        exportResults.push({
          table: tableName,
          success: false,
          error: error.message
        });
        // Continue with other tables even if one fails
      }
    }

    // Add metadata file
    const metadata = {
      agency_id: agencyId,
      agency_name: agencyName,
      database_name: databaseName,
      export_timestamp: new Date().toISOString(),
      tables_exported: exportResults.length,
      tables: exportResults
    };
    archive.append(JSON.stringify(metadata, null, 2), { name: 'export_metadata.json' });

    // Finalize archive and wait for completion
    return new Promise((resolve, reject) => {
      // Set up error handler
      archive.on('error', (err) => {
        reject(new Error(`ZIP archive error: ${err.message}`));
      });

      archive.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`[Export] ZIP archive created: ${buffer.length} bytes, ${exportResults.length} tables`);
        resolve(buffer);
      });

      // Finalize the archive (triggers 'end' event)
      archive.finalize();
    });
  } catch (error) {
    console.error('[Export] Error during export:', error);
    throw error;
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

module.exports = {
  exportAgencyToCSV,
};
