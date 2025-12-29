/**
 * Database Optimization Service
 * Query analysis, index recommendations, and performance monitoring
 */

const { Pool } = require('pg');
const { parseDatabaseUrl } = require('../utils/poolManager');

/**
 * Analyze slow queries
 * @param {string} agencyDatabase - Agency database name
 * @param {number} minDuration - Minimum query duration in milliseconds
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Slow query analysis
 */
async function analyzeSlowQueries(agencyDatabase, minDuration = 1000, limit = 50) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    // Enable pg_stat_statements extension if available
    await agencyClient.query(`CREATE EXTENSION IF NOT EXISTS pg_stat_statements`);

    const result = await agencyClient.query(`
      SELECT 
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        max_exec_time,
        min_exec_time,
        stddev_exec_time,
        rows,
        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
      FROM pg_stat_statements
      WHERE mean_exec_time > $1
      ORDER BY mean_exec_time DESC
      LIMIT $2
    `, [minDuration, limit]);

    return result.rows.map(row => ({
      query: row.query.substring(0, 200), // Truncate long queries
      calls: parseInt(row.calls),
      totalTime: parseFloat(row.total_exec_time),
      meanTime: parseFloat(row.mean_exec_time),
      maxTime: parseFloat(row.max_exec_time),
      minTime: parseFloat(row.min_exec_time),
      stdDevTime: parseFloat(row.stddev_exec_time),
      rows: parseInt(row.rows) || 0,
      cacheHitPercent: parseFloat(row.hit_percent) || 0,
    }));
  } catch (error) {
    // pg_stat_statements might not be available
    if (error.message.includes('pg_stat_statements')) {
      console.warn('[DB Optimization] pg_stat_statements extension not available');
      return [];
    }
    throw error;
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Get table statistics and sizes
 * @param {string} agencyDatabase - Agency database name
 * @returns {Promise<Array>} Table statistics
 */
async function getTableStatistics(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    const result = await agencyClient.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
        (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) AS row_count,
        (SELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = tablename) AS dead_rows,
        (SELECT last_vacuum FROM pg_stat_user_tables WHERE relname = tablename) AS last_vacuum,
        (SELECT last_autovacuum FROM pg_stat_user_tables WHERE relname = tablename) AS last_autovacuum,
        (SELECT last_analyze FROM pg_stat_user_tables WHERE relname = tablename) AS last_analyze,
        (SELECT last_autoanalyze FROM pg_stat_user_tables WHERE relname = tablename) AS last_autoanalyze
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);

    return result.rows.map(row => ({
      schema: row.schemaname,
      table: row.tablename,
      size: row.size,
      sizeBytes: parseInt(row.size_bytes),
      rowCount: parseInt(row.row_count) || 0,
      deadRows: parseInt(row.dead_rows) || 0,
      lastVacuum: row.last_vacuum,
      lastAutovacuum: row.last_autovacuum,
      lastAnalyze: row.last_analyze,
      lastAutoanalyze: row.last_autoanalyze,
    }));
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Get index usage statistics
 * @param {string} agencyDatabase - Agency database name
 * @returns {Promise<Array>} Index statistics
 */
async function getIndexStatistics(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    const result = await agencyClient.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
        idx_scan AS index_scans,
        idx_tup_read AS tuples_read,
        idx_tup_fetch AS tuples_fetched,
        CASE 
          WHEN idx_scan = 0 THEN 'UNUSED'
          WHEN idx_scan < 10 THEN 'RARELY_USED'
          WHEN idx_scan < 100 THEN 'OCCASIONALLY_USED'
          ELSE 'FREQUENTLY_USED'
        END AS usage_status
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC
    `);

    return result.rows.map(row => ({
      schema: row.schemaname,
      table: row.tablename,
      index: row.indexname,
      size: row.index_size,
      scans: parseInt(row.index_scans) || 0,
      tuplesRead: parseInt(row.tuples_read) || 0,
      tuplesFetched: parseInt(row.tuples_fetched) || 0,
      usageStatus: row.usage_status,
    }));
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Recommend missing indexes based on query patterns
 * @param {string} agencyDatabase - Agency database name
 * @returns {Promise<Array>} Index recommendations
 */
async function recommendIndexes(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    // Analyze sequential scans that could benefit from indexes
    const result = await agencyClient.query(`
      SELECT 
        schemaname,
        tablename,
        seq_scan,
        seq_tup_read,
        idx_scan,
        seq_tup_read / NULLIF(seq_scan, 0) AS avg_seq_tup_read
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      AND seq_scan > 100
      AND seq_tup_read > 1000
      AND idx_scan < seq_scan * 0.1
      ORDER BY seq_tup_read DESC
      LIMIT 20
    `);

    const recommendations = [];

    for (const row of result.rows) {
      // Get table columns to suggest indexes
      const columnsResult = await agencyClient.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name IN ('agency_id', 'user_id', 'created_at', 'updated_at', 'status', 'is_active')
        ORDER BY ordinal_position
      `, [row.tablename]);

      const suggestedColumns = columnsResult.rows.map(c => c.column_name);

      if (suggestedColumns.length > 0) {
        recommendations.push({
          table: row.tablename,
          currentScans: parseInt(row.seq_scan),
          currentIndexScans: parseInt(row.idx_scan),
          avgTuplesRead: parseFloat(row.avg_seq_tup_read),
          suggestedIndexes: suggestedColumns.map(col => ({
            column: col,
            indexName: `idx_${row.tablename}_${col}`,
            sql: `CREATE INDEX IF NOT EXISTS idx_${row.tablename}_${col} ON public.${row.tablename}(${col});`,
          })),
          priority: row.seq_scan > 1000 ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    return recommendations;
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Get database connection statistics
 * @param {string} agencyDatabase - Agency database name
 * @returns {Promise<Object>} Connection statistics
 */
async function getConnectionStatistics(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    const result = await agencyClient.query(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
        count(*) FILTER (WHERE wait_event_type IS NOT NULL) as waiting_connections
      FROM pg_stat_activity
      WHERE datname = $1
    `, [agencyDatabase]);

    const stats = result.rows[0];

    return {
      totalConnections: parseInt(stats.total_connections),
      activeConnections: parseInt(stats.active_connections),
      idleConnections: parseInt(stats.idle_connections),
      idleInTransaction: parseInt(stats.idle_in_transaction),
      waitingConnections: parseInt(stats.waiting_connections),
    };
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Analyze table bloat
 * @param {string} agencyDatabase - Agency database name
 * @returns {Promise<Array>} Table bloat analysis
 */
async function analyzeTableBloat(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    const result = await agencyClient.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
        n_live_tup AS live_rows,
        n_dead_tup AS dead_rows,
        CASE 
          WHEN n_live_tup = 0 THEN 0
          ELSE ROUND((n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0)) * 100, 2)
        END AS bloat_percent,
        last_vacuum,
        last_autovacuum
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      AND n_dead_tup > 0
      ORDER BY (n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0)) DESC
      LIMIT 20
    `);

    return result.rows.map(row => ({
      schema: row.schemaname,
      table: row.tablename,
      totalSize: row.total_size,
      tableSize: row.table_size,
      liveRows: parseInt(row.live_rows) || 0,
      deadRows: parseInt(row.dead_rows) || 0,
      bloatPercent: parseFloat(row.bloat_percent) || 0,
      lastVacuum: row.last_vacuum,
      lastAutovacuum: row.last_autovacuum,
      needsVacuum: parseFloat(row.bloat_percent) > 10,
    }));
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Get query execution plan
 * @param {string} agencyDatabase - Agency database name
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Execution plan
 */
async function explainQuery(agencyDatabase, query, params = []) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    const result = await agencyClient.query(explainQuery, params);

    return {
      plan: result.rows[0]['QUERY PLAN'],
      formatted: JSON.stringify(result.rows[0]['QUERY PLAN'], null, 2),
    };
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Vacuum and analyze tables
 * @param {string} agencyDatabase - Agency database name
 * @param {string[]} tables - Specific tables to vacuum (null for all)
 * @returns {Promise<Object>} Vacuum results
 */
async function vacuumTables(agencyDatabase, tables = null) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    if (tables && tables.length > 0) {
      for (const table of tables) {
        await agencyClient.query(`VACUUM ANALYZE public.${table}`);
      }
      return {
        success: true,
        message: `Vacuumed ${tables.length} table(s)`,
        tables,
      };
    } else {
      // Vacuum all tables
      await agencyClient.query(`VACUUM ANALYZE`);
      return {
        success: true,
        message: 'Vacuumed all tables',
      };
    }
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Create recommended indexes
 * @param {string} agencyDatabase - Agency database name
 * @param {Array} indexRecommendations - Array of index recommendations
 * @returns {Promise<Object>} Creation results
 */
async function createRecommendedIndexes(agencyDatabase, indexRecommendations) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  const results = {
    created: [],
    failed: [],
    skipped: [],
  };

  try {
    for (const rec of indexRecommendations) {
      for (const index of rec.suggestedIndexes) {
        try {
          await agencyClient.query(index.sql);
          results.created.push({
            table: rec.table,
            index: index.indexName,
            column: index.column,
          });
        } catch (error) {
          if (error.message.includes('already exists')) {
            results.skipped.push({
              table: rec.table,
              index: index.indexName,
              reason: 'Index already exists',
            });
          } else {
            results.failed.push({
              table: rec.table,
              index: index.indexName,
              error: error.message,
            });
          }
        }
      }
    }

    return results;
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

module.exports = {
  analyzeSlowQueries,
  getTableStatistics,
  getIndexStatistics,
  recommendIndexes,
  getConnectionStatistics,
  analyzeTableBloat,
  explainQuery,
  vacuumTables,
  createRecommendedIndexes,
};
