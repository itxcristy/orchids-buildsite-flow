-- System Health Metrics Table
-- Stores historical health metrics for trend analysis and monitoring

CREATE TABLE IF NOT EXISTS system_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Overall Status
    overall_status VARCHAR(20) NOT NULL CHECK (overall_status IN ('ok', 'degraded', 'error')),
    
    -- Database Metrics
    db_status VARCHAR(20),
    db_response_time_ms INTEGER,
    db_size_bytes BIGINT,
    db_connections_current INTEGER,
    db_connections_max INTEGER,
    db_connections_usage_percent DECIMAL(5,2),
    db_active_queries INTEGER,
    db_idle_connections INTEGER,
    db_waiting_queries INTEGER,
    db_locks_count INTEGER,
    db_cache_hit_ratio DECIMAL(5,2),
    db_index_usage_percent DECIMAL(5,2),
    db_table_count INTEGER,
    db_total_rows BIGINT,
    
    -- Redis Metrics
    redis_status VARCHAR(20),
    redis_response_time_ms INTEGER,
    redis_cache_size INTEGER,
    redis_memory_used_bytes BIGINT,
    redis_memory_peak_bytes BIGINT,
    redis_connected_clients INTEGER,
    redis_commands_processed BIGINT,
    redis_keyspace_hits BIGINT,
    redis_keyspace_misses BIGINT,
    
    -- System Resources
    system_platform VARCHAR(50),
    system_arch VARCHAR(20),
    system_node_version VARCHAR(20),
    system_uptime_seconds INTEGER,
    system_memory_total_bytes BIGINT,
    system_memory_used_bytes BIGINT,
    system_memory_free_bytes BIGINT,
    system_memory_usage_percent DECIMAL(5,2),
    system_cpu_count INTEGER,
    system_cpu_model VARCHAR(200),
    system_load_avg_1min DECIMAL(10,2),
    system_load_avg_5min DECIMAL(10,2),
    system_load_avg_15min DECIMAL(10,2),
    
    -- Process Metrics
    process_memory_rss_bytes BIGINT,
    process_memory_heap_total_bytes BIGINT,
    process_memory_heap_used_bytes BIGINT,
    process_memory_external_bytes BIGINT,
    process_cpu_user_microseconds BIGINT,
    process_cpu_system_microseconds BIGINT,
    
    -- Performance Metrics
    cache_type VARCHAR(50),
    cache_size INTEGER,
    api_response_time_avg_ms INTEGER,
    api_requests_per_minute INTEGER,
    api_error_rate_percent DECIMAL(5,2),
    
    -- Additional Metadata
    metadata JSONB,
    
    -- Indexes for performance
    CONSTRAINT system_health_metrics_timestamp_idx UNIQUE (timestamp)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_timestamp ON system_health_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_status ON system_health_metrics(overall_status);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_db_status ON system_health_metrics(db_status);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_redis_status ON system_health_metrics(redis_status);

-- Function to clean up old metrics (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_health_metrics()
RETURNS void AS $$
BEGIN
    DELETE FROM system_health_metrics
    WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a view for latest health metrics
CREATE OR REPLACE VIEW latest_system_health AS
SELECT *
FROM system_health_metrics
ORDER BY timestamp DESC
LIMIT 1;

-- Create a view for health trends (hourly aggregates)
CREATE OR REPLACE VIEW system_health_trends_hourly AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as sample_count,
    AVG(db_response_time_ms) as avg_db_response_time,
    AVG(redis_response_time_ms) as avg_redis_response_time,
    AVG(system_memory_usage_percent) as avg_memory_usage,
    AVG(db_connections_usage_percent) as avg_db_connections_usage,
    AVG(api_response_time_avg_ms) as avg_api_response_time,
    AVG(api_error_rate_percent) as avg_error_rate,
    MAX(CASE WHEN overall_status = 'error' THEN 1 ELSE 0 END) as had_errors
FROM system_health_metrics
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

COMMENT ON TABLE system_health_metrics IS 'Stores historical system health metrics for monitoring and trend analysis';
COMMENT ON VIEW latest_system_health IS 'Latest system health metrics snapshot';
COMMENT ON VIEW system_health_trends_hourly IS 'Hourly aggregated health metrics for trend analysis';

