/**
 * System Health Monitoring Routes
 * Provides comprehensive system health metrics and monitoring with high performance
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const { pool } = require('../config/database');
const { isRedisAvailable, getRedisClient } = require('../config/redis');
const { getStats } = require('../services/cacheService');
const os = require('os');
const fs = require('fs').promises;

// Cache health data for 5 seconds to reduce database load
let healthCache = null;
let healthCacheTime = 0;
const CACHE_TTL = 5000; // 5 seconds

/**
 * OPTIONS /api/system-health
 * Handle CORS preflight requests
 */
router.options('/', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agency-Database, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.sendStatus(204);
});

/**
 * GET /api/system-health
 * Get comprehensive system health metrics with high performance
 * Requires admin role
 */
router.get('/', authenticate, requireRole(['admin', 'super_admin']), asyncHandler(async (req, res) => {
  try {
    // Set CORS headers explicitly
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agency-Database, Accept');
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    // Return cached data if available and fresh
    const now = Date.now();
    if (healthCache && (now - healthCacheTime) < CACHE_TTL) {
      return res.json({
        success: true,
        data: { ...healthCache, cached: true },
      });
    }

    const health = {
      timestamp: new Date().toISOString(),
      status: 'ok',
      services: {},
      system: {},
      performance: {},
      database: {},
      trends: {},
    };

    // Run all health checks in parallel for better performance
    const [
      dbHealth,
      redisHealth,
      systemResources,
      performanceMetrics,
      dbDetailedMetrics,
      diskUsage,
    ] = await Promise.allSettled([
      getDatabaseHealth(),
      getRedisHealth(),
      getSystemResources(),
      getPerformanceMetrics(),
      getDetailedDatabaseMetrics(),
      getDiskUsage(),
    ]);

  // Process Database Health
  if (dbHealth.status === 'fulfilled') {
    health.services.database = dbHealth.value;
    if (dbHealth.value && dbHealth.value.status !== 'connected') {
      health.status = 'degraded';
    }
  } else {
    health.status = 'degraded';
    health.services.database = {
      status: 'error',
      error: dbHealth.reason?.message || 'Unknown error',
    };
    console.error('[System Health] Database health check failed:', dbHealth.reason);
  }

  // Process Detailed Database Metrics
  if (dbDetailedMetrics.status === 'fulfilled') {
    health.database = dbDetailedMetrics.value;
  } else {
    console.error('[System Health] Detailed database metrics failed:', dbDetailedMetrics.reason);
    health.database = { error: dbDetailedMetrics.reason?.message || 'Failed to get detailed metrics' };
  }

  // Process Redis Health
  if (redisHealth.status === 'fulfilled') {
    health.services.redis = redisHealth.value;
    if (redisHealth.value.status === 'unavailable' || redisHealth.value.status === 'error') {
      if (health.status === 'ok') health.status = 'degraded';
    }
  } else {
    if (health.status === 'ok') health.status = 'degraded';
    health.services.redis = {
      status: 'error',
      error: redisHealth.reason?.message || 'Unknown error',
      fallback: 'in-memory',
    };
  }

  // Process System Resources
  if (systemResources.status === 'fulfilled') {
    health.system = systemResources.value || {};
    health.system.disk = diskUsage.status === 'fulfilled' ? diskUsage.value : null;
  } else {
    console.error('[System Health] System resources check failed:', systemResources.reason);
    health.system = {
      error: systemResources.reason?.message || 'Unknown error',
    };
  }

  // Process Performance Metrics
  if (performanceMetrics.status === 'fulfilled') {
    health.performance = performanceMetrics.value || {};
  } else {
    console.error('[System Health] Performance metrics check failed:', performanceMetrics.reason);
    health.performance = {
      error: performanceMetrics.reason?.message || 'Unknown error',
    };
  }

  // Get trends from database
  try {
    const trends = await getHealthTrends();
    health.trends = trends;
  } catch (error) {
    console.error('Error fetching trends:', error);
    health.trends = { available: false, error: error.message };
  }

  // Store health metrics in database (async, don't wait)
  storeHealthMetrics(health).catch(err => {
    console.error('Error storing health metrics:', err);
  });

    // Update cache
    healthCache = health;
    healthCacheTime = now;

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error('[System Health] Error in health check:', error);
    console.error('[System Health] Error stack:', error.stack);
    console.error('[System Health] Error code:', error.code);
    // Return partial health data even on error
    // Set CORS headers even on error
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agency-Database, Accept');
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch system health',
      data: {
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });
  }
}));

/**
 * Get comprehensive database health metrics
 */
async function getDatabaseHealth() {
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    const dbTime = Date.now() - dbStart;

    const [dbInfo, poolStats] = await Promise.all([
      pool.query(`
        SELECT 
          pg_database_size(current_database()) as size,
          (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as connections,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
      `),
      pool.query(`
        SELECT 
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
          count(*) FILTER (WHERE wait_event_type IS NOT NULL) as waiting
        FROM pg_stat_activity
        WHERE datname = current_database()
      `),
    ]);

    const connections = parseInt(dbInfo.rows[0]?.connections || 0);
    const maxConnections = parseInt(dbInfo.rows[0]?.max_connections || 100);
    const usagePercent = maxConnections > 0 ? ((connections / maxConnections) * 100).toFixed(1) : '0.0';

    return {
      status: 'connected',
      responseTime: dbTime,
      size: parseInt(dbInfo.rows[0]?.size || 0),
      connections: {
        current: connections,
        max: maxConnections,
        usage: usagePercent + '%',
      },
      pool: {
        active: parseInt(poolStats.rows[0]?.active || 0),
        idle: parseInt(poolStats.rows[0]?.idle || 0),
        idleInTransaction: parseInt(poolStats.rows[0]?.idle_in_transaction || 0),
        waiting: parseInt(poolStats.rows[0]?.waiting || 0),
      },
    };
  } catch (error) {
    console.error('[System Health] Error in getDatabaseHealth:', error);
    return {
      status: 'error',
      error: error.message,
      responseTime: null,
    };
  }
}

/**
 * Get detailed database metrics (tables, indexes, queries, etc.)
 */
async function getDetailedDatabaseMetrics() {
  try {
    const [
      tableStats,
      indexStats,
      queryStats,
      lockStats,
      cacheStats,
      replicationStats,
    ] = await Promise.allSettled([
      // Table statistics - Note: pg_stat_user_tables uses 'relname', not 'tablename'
      pool.query(`
        SELECT 
          COUNT(*) as table_count,
          SUM(n_live_tup) as total_rows,
          SUM(pg_total_relation_size(schemaname||'.'||relname)) as total_size
        FROM pg_stat_user_tables
      `),
      // Index statistics - Note: seq_scan is in pg_stat_user_tables, not pg_stat_user_indexes
      pool.query(`
        SELECT 
          COUNT(*) as index_count,
          SUM(pg_relation_size(indexrelid)) as total_index_size,
          SUM(idx_scan) as total_index_scans,
          COUNT(*) FILTER (WHERE idx_scan > 0) as used_indexes,
          COUNT(*) FILTER (WHERE idx_scan = 0) as unused_indexes
        FROM pg_stat_user_indexes
      `),
      // Query statistics
      pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE state = 'active') as active_queries,
          COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_transactions,
          MAX(EXTRACT(EPOCH FROM (NOW() - query_start)))::INTEGER as longest_query_seconds
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid != pg_backend_pid()
      `),
      // Lock statistics
      pool.query(`
        SELECT COUNT(*) as lock_count
        FROM pg_locks
        WHERE NOT granted
      `),
      // Cache hit ratio
      pool.query(`
        SELECT 
          ROUND(
            100.0 * SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0),
            2
          ) as cache_hit_ratio
        FROM pg_statio_user_tables
      `),
      // Replication status (if applicable)
      pool.query(`
        SELECT 
          CASE WHEN pg_is_in_recovery() THEN 'replica' ELSE 'primary' END as replication_role,
          pg_last_wal_replay_lsn() as last_replay_lsn
      `),
    ]);

    const metrics = {
      tables: tableStats.status === 'fulfilled' ? {
        count: parseInt(tableStats.value.rows[0]?.table_count || 0),
        totalRows: parseInt(tableStats.value.rows[0]?.total_rows || 0),
        totalSize: parseInt(tableStats.value.rows[0]?.total_size || 0),
      } : null,
      indexes: indexStats.status === 'fulfilled' && indexStats.value.rows[0] ? {
        count: parseInt(indexStats.value.rows[0].index_count || 0),
        totalSize: parseInt(indexStats.value.rows[0].total_index_size || 0),
        usagePercent: indexStats.value.rows[0].index_count > 0 
          ? ((parseInt(indexStats.value.rows[0].used_indexes || 0) / parseInt(indexStats.value.rows[0].index_count)) * 100)
          : 0,
        usedIndexes: parseInt(indexStats.value.rows[0].used_indexes || 0),
        unusedIndexes: parseInt(indexStats.value.rows[0].unused_indexes || 0),
      } : null,
      queries: queryStats.status === 'fulfilled' ? {
        active: parseInt(queryStats.value.rows[0]?.active_queries || 0),
        idleInTransaction: parseInt(queryStats.value.rows[0]?.idle_transactions || 0),
        longestQuerySeconds: parseInt(queryStats.value.rows[0]?.longest_query_seconds || 0),
      } : null,
      locks: lockStats.status === 'fulfilled' ? {
        waiting: parseInt(lockStats.value.rows[0]?.lock_count || 0),
      } : null,
      cache: cacheStats.status === 'fulfilled' ? {
        hitRatio: parseFloat(cacheStats.value.rows[0]?.cache_hit_ratio || 0),
      } : null,
      replication: replicationStats.status === 'fulfilled' ? {
        role: replicationStats.value.rows[0]?.replication_role || 'primary',
      } : null,
    };

    return metrics;
  } catch (error) {
    console.error('Error getting detailed database metrics:', error);
    return { error: error.message };
  }
}

/**
 * Get Redis health metrics
 */
async function getRedisHealth() {
  const redisStart = Date.now();
  const redisAvailable = await isRedisAvailable();
  const redisTime = Date.now() - redisStart;

  if (!redisAvailable) {
    return {
      status: 'unavailable',
      fallback: 'in-memory',
    };
  }

  try {
    const client = await getRedisClient();
    const [info, dbSize, memory, stats, clients] = await Promise.all([
      client.info('stats'),
      client.dbSize(),
      client.info('memory'),
      client.info('stats'),
      client.info('clients'),
    ]);

    const memoryData = parseRedisMemory(memory);
    const statsData = parseRedisStats(stats);
    const clientsData = parseRedisClients(clients);

    return {
      status: 'connected',
      responseTime: redisTime,
      cacheSize: dbSize,
      memory: memoryData,
      stats: statsData,
      clients: clientsData,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      fallback: 'in-memory',
    };
  }
}

/**
 * Get system resources
 */
async function getSystemResources() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const usagePercent = ((usedMem / totalMem) * 100).toFixed(1);

  return {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usage: usagePercent + '%',
      usagePercent: parseFloat(usagePercent),
    },
    cpu: {
      count: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown',
      speed: os.cpus()[0]?.speed || 0,
    },
    loadAverage: os.loadavg(),
  };
}

/**
 * Get disk usage
 */
async function getDiskUsage() {
  try {
    // Disk usage is platform-specific and requires additional packages
    // For now, return null - can be enhanced with 'node-disk-info' or similar
    // This is optional and won't break the health endpoint
    return null;
  } catch (error) {
    // Disk stats not available on all systems
    return null;
  }
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics() {
  try {
    const cacheStats = await getStats();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      cache: {
        type: cacheStats.type,
        size: cacheStats.size,
      },
      process: {
        memoryUsage: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers,
        },
        cpuUsage: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
      },
    };
  } catch (error) {
    return {
      error: error.message,
    };
  }
}

/**
 * Get health trends from database
 */
async function getHealthTrends() {
  try {
    // Check if system_health_metrics table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_health_metrics'
      )
    `);

    if (!tableExists.rows[0].exists) {
      return { available: false };
    }

    // Check if the view exists before querying
    const viewExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'system_health_trends_hourly'
      )
    `);

    if (!viewExists.rows[0].exists) {
      return { available: false, message: 'Trends view not available' };
    }

    // Get last 24 hours of hourly trends
    const trends = await pool.query(`
      SELECT * FROM system_health_trends_hourly
      ORDER BY hour DESC
      LIMIT 24
    `);

    return {
      available: true,
      hourly: trends.rows,
    };
  } catch (error) {
    console.error('Error getting trends:', error);
    return { available: false, error: error.message };
  }
}

/**
 * Store health metrics in database (async, fire and forget)
 */
async function storeHealthMetrics(health) {
  try {
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_health_metrics'
      )
    `);

    if (!tableExists.rows[0].exists) {
      return; // Table doesn't exist yet, skip
    }

    const db = health.services.database || {};
    const redis = health.services.redis || {};
    const system = health.system || {};
    const perf = health.performance || {};
    const dbDetailed = health.database || {};

    await pool.query(`
      INSERT INTO system_health_metrics (
        overall_status,
        db_status, db_response_time_ms, db_size_bytes,
        db_connections_current, db_connections_max, db_connections_usage_percent,
        db_active_queries, db_idle_connections, db_waiting_queries,
        db_locks_count, db_cache_hit_ratio, db_index_usage_percent,
        db_table_count, db_total_rows,
        redis_status, redis_response_time_ms, redis_cache_size,
        redis_memory_used_bytes, redis_memory_peak_bytes,
        redis_connected_clients, redis_commands_processed,
        redis_keyspace_hits, redis_keyspace_misses,
        system_platform, system_arch, system_node_version, system_uptime_seconds,
        system_memory_total_bytes, system_memory_used_bytes, system_memory_free_bytes, system_memory_usage_percent,
        system_cpu_count, system_cpu_model,
        system_load_avg_1min, system_load_avg_5min, system_load_avg_15min,
        process_memory_rss_bytes, process_memory_heap_total_bytes,
        process_memory_heap_used_bytes, process_memory_external_bytes,
        process_cpu_user_microseconds, process_cpu_system_microseconds,
        cache_type, cache_size
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37,
        $38, $39, $40, $41, $42, $43, $44, $45
      )
      ON CONFLICT (timestamp) DO NOTHING
    `, [
      health.status,
      db.status, db.responseTime, db.size,
      db.connections?.current, db.connections?.max, parseFloat(db.connections?.usage || '0'),
      db.pool?.active || 0, db.pool?.idle || 0, db.pool?.waiting || 0,
      dbDetailed.locks?.waiting || 0, dbDetailed.cache?.hitRatio || 0, dbDetailed.indexes?.usagePercent || 0,
      dbDetailed.tables?.count || 0, dbDetailed.tables?.totalRows || 0,
      redis.status, redis.responseTime, redis.cacheSize,
      redis.memory?.used, redis.memory?.peak,
      redis.clients?.connected || 0, redis.stats?.totalCommands || 0,
      redis.stats?.keyspaceHits || 0, redis.stats?.keyspaceMisses || 0,
      system.platform, system.arch, system.nodeVersion, system.uptime,
      system.memory?.total, system.memory?.used, system.memory?.free, system.memory?.usagePercent || 0,
      system.cpu?.count, system.cpu?.model,
      system.loadAverage?.[0] || 0, system.loadAverage?.[1] || 0, system.loadAverage?.[2] || 0,
      perf.process?.memoryUsage?.rss, perf.process?.memoryUsage?.heapTotal,
      perf.process?.memoryUsage?.heapUsed, perf.process?.memoryUsage?.external,
      perf.process?.cpuUsage?.user, perf.process?.cpuUsage?.system,
      perf.cache?.type, perf.cache?.size,
    ]);
  } catch (error) {
    // Silently fail - don't break health endpoint if storage fails
    console.error('Error storing health metrics:', error);
  }
}

/**
 * Parse Redis memory info
 */
function parseRedisMemory(memoryInfo) {
  const lines = memoryInfo.split('\r\n');
  const memory = {};
  
  for (const line of lines) {
    if (line.startsWith('used_memory:')) {
      memory.used = parseInt(line.split(':')[1]);
    }
    if (line.startsWith('used_memory_human:')) {
      memory.usedHuman = line.split(':')[1];
    }
    if (line.startsWith('used_memory_peak:')) {
      memory.peak = parseInt(line.split(':')[1]);
    }
    if (line.startsWith('used_memory_peak_human:')) {
      memory.peakHuman = line.split(':')[1];
    }
  }
  
  return memory;
}

/**
 * Parse Redis stats info
 */
function parseRedisStats(statsInfo) {
  const lines = statsInfo.split('\r\n');
  const stats = {};
  
  for (const line of lines) {
    if (line.startsWith('total_commands_processed:')) {
      stats.totalCommands = parseInt(line.split(':')[1]);
    }
    if (line.startsWith('keyspace_hits:')) {
      stats.keyspaceHits = parseInt(line.split(':')[1]);
    }
    if (line.startsWith('keyspace_misses:')) {
      stats.keyspaceMisses = parseInt(line.split(':')[1]);
    }
    if (line.startsWith('instantaneous_ops_per_sec:')) {
      stats.opsPerSec = parseInt(line.split(':')[1]);
    }
  }
  
  return stats;
}

/**
 * Parse Redis clients info
 */
function parseRedisClients(clientsInfo) {
  const lines = clientsInfo.split('\r\n');
  const clients = {};
  
  for (const line of lines) {
    if (line.startsWith('connected_clients:')) {
      clients.connected = parseInt(line.split(':')[1]);
    }
    if (line.startsWith('blocked_clients:')) {
      clients.blocked = parseInt(line.split(':')[1]);
    }
  }
  
  return clients;
}

/**
 * GET /api/system-health/cache-stats
 * Get detailed cache statistics
 */
router.get('/cache-stats', authenticate, requireRole(['admin', 'super_admin']), asyncHandler(async (req, res) => {
  try {
    const stats = await getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}));

/**
 * GET /api/system-health/trends
 * Get health trends over time
 */
router.get('/trends', authenticate, requireRole(['admin', 'super_admin']), asyncHandler(async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const trends = await pool.query(`
      SELECT * FROM system_health_trends_hourly
      WHERE hour > NOW() - INTERVAL '${hours} hours'
      ORDER BY hour DESC
    `);

    res.json({
      success: true,
      data: trends.rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}));

/**
 * GET /api/system-health/database/tables
 * Get detailed table statistics
 */
router.get('/database/tables', authenticate, requireRole(['admin', 'super_admin']), asyncHandler(async (req, res) => {
  try {
    const tables = await pool.query(`
      SELECT 
        schemaname,
        relname as tablename,
        n_live_tup as row_count,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
        pg_total_relation_size(schemaname||'.'||relname) as total_size_bytes,
        pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size,
        pg_relation_size(schemaname||'.'||relname) as table_size_bytes
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: tables.rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}));

/**
 * GET /api/system-health/database/queries
 * Get slow queries and active queries
 */
router.get('/database/queries', authenticate, requireRole(['admin', 'super_admin']), asyncHandler(async (req, res) => {
  try {
    const queries = await pool.query(`
      SELECT 
        pid,
        usename,
        application_name,
        client_addr,
        state,
        wait_event_type,
        wait_event,
        query_start,
        state_change,
        EXTRACT(EPOCH FROM (NOW() - query_start))::INTEGER as duration_seconds,
        LEFT(query, 200) as query_preview
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid != pg_backend_pid()
        AND state != 'idle'
      ORDER BY query_start
      LIMIT 20
    `);

    res.json({
      success: true,
      data: queries.rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}));

/**
 * GET /api/system-health/database/indexes
 * Get index usage statistics
 */
router.get('/database/indexes', authenticate, requireRole(['admin', 'super_admin']), asyncHandler(async (req, res) => {
  try {
    const indexes = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        pg_relation_size(indexrelid) as index_size_bytes
      FROM pg_stat_user_indexes
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: indexes.rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}));

module.exports = router;
