/**
 * System Health Dashboard
 * Displays comprehensive system health metrics and monitoring with high performance
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/config/api';
import {
  Activity,
  Database,
  Server,
  Cpu,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Table,
  Zap,
  Lock,
  Network,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SystemHealth {
  timestamp: string;
  status: string;
  cached?: boolean;
  services: {
    database?: {
      status: string;
      responseTime?: number;
      size?: number;
      connections?: {
        current: number;
        max: number;
        usage: string;
      };
      pool?: {
        active: number;
        idle: number;
        idleInTransaction: number;
        waiting: number;
      };
    };
    redis?: {
      status: string;
      responseTime?: number;
      cacheSize?: number;
      memory?: {
        used?: number;
        usedHuman?: string;
        peak?: number;
        peakHuman?: string;
      };
      stats?: {
        totalCommands?: number;
        keyspaceHits?: number;
        keyspaceMisses?: number;
        opsPerSec?: number;
      };
      clients?: {
        connected?: number;
        blocked?: number;
      };
      fallback?: string;
    };
  };
  system: {
    platform?: string;
    arch?: string;
    nodeVersion?: string;
    uptime?: number;
    memory?: {
      total: number;
      used: number;
      free: number;
      usage: string;
      usagePercent?: number;
    };
    cpu?: {
      count: number;
      model: string;
      speed?: number;
    };
    loadAverage?: number[];
    disk?: {
      total?: number;
      free?: number;
      used?: number;
    };
  };
  performance: {
    cache?: {
      type: string;
      size: number;
    };
    process?: {
      memoryUsage: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
        arrayBuffers?: number;
      };
      cpuUsage?: {
        user: number;
        system: number;
      };
    };
  };
  database?: {
    tables?: {
      count: number;
      totalRows: number;
      totalSize: number;
    };
    indexes?: {
      count: number;
      totalSize: number;
      usagePercent: number;
    };
    queries?: {
      active: number;
      idleInTransaction: number;
      longestQuerySeconds: number;
    };
    locks?: {
      waiting: number;
    };
    cache?: {
      hitRatio: number;
    };
    replication?: {
      role: string;
    };
  };
  trends?: {
    available: boolean;
    hourly?: any[];
  };
}

export default function SystemHealth() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  const fetchHealth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const apiBaseUrl = getApiBaseUrl();
      const url = `${apiBaseUrl}/api/system-health`;
      
      // Log API URL for debugging (only in development)
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || import.meta.env.DEV)) {
        console.log('[System Health] Fetching from URL:', url);
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Agency-Database': localStorage.getItem('agency_database') || '',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors', // Explicitly enable CORS
        credentials: 'omit', // Don't send cookies (auth is header-based)
        cache: 'no-cache', // Always fetch fresh data
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to fetch health data';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch {
          errorMessage = `${errorMessage} (status ${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (result.success) {
        setHealth(result.data);
      } else {
        throw new Error(result.error?.message || result.error || 'Failed to fetch health data');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to fetch system health';
      
      // Check for CORS errors specifically
      const isCorsError = errorMessage.includes('CORS') || 
                         errorMessage.includes('cross-origin') ||
                         errorMessage.includes('Access-Control') ||
                         (error.name === 'TypeError' && errorMessage.includes('Failed to fetch'));
      
      console.error('Error fetching health:', {
        message: errorMessage,
        error: error,
        stack: error?.stack,
        name: error?.name,
        isCorsError,
        apiBase: getApiBaseUrl(),
        currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A'
      });
      
      let userMessage = errorMessage;
      if (isCorsError || errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
        userMessage = 'Unable to connect to the server. This may be a CORS or network configuration issue.';
      }
      
      toast({
        title: 'Error',
        description: userMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHealth();
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'connected':
      case 'ok':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {status}
          </Badge>
        );
      case 'degraded':
      case 'unavailable':
        return (
          <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
            <AlertCircle className="mr-1 h-3 w-3" />
            {status}
          </Badge>
        );
      case 'error':
      case 'disconnected':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            {status}
          </Badge>
        );
      default:
        return <Badge>{status || 'Unknown'}</Badge>;
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading system health...</span>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-lg font-semibold">Failed to load system health</p>
              <Button onClick={handleRefresh} className="mt-4">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground">
            Comprehensive system monitoring and performance metrics
            {health.cached && <span className="ml-2 text-xs text-muted-foreground">(Cached)</span>}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Overall Status
            </CardTitle>
            {getStatusBadge(health.status)}
          </div>
          <CardDescription>
            Last updated: {new Date(health.timestamp).toLocaleString()}
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Database Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Database
                </CardTitle>
              </CardHeader>
              <CardContent>
                {health.services.database ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status</span>
                      {getStatusBadge(health.services.database.status)}
                    </div>
                    {health.services.database.responseTime !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Response Time</span>
                        <span className="text-sm font-mono">{health.services.database.responseTime}ms</span>
                      </div>
                    )}
                    {health.services.database.connections && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Connections</span>
                          <span className="font-mono">
                            {health.services.database.connections.current}/{health.services.database.connections.max}
                          </span>
                        </div>
                        <Progress
                          value={parseFloat(health.services.database.connections.usage)}
                          className="h-1.5"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Not available</p>
                )}
              </CardContent>
            </Card>

            {/* Redis Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Redis Cache
                </CardTitle>
              </CardHeader>
              <CardContent>
                {health.services.redis ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status</span>
                      {getStatusBadge(health.services.redis.status)}
                    </div>
                    {health.services.redis.responseTime !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Response Time</span>
                        <span className="text-sm font-mono">{health.services.redis.responseTime}ms</span>
                      </div>
                    )}
                    {health.services.redis.cacheSize !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Cache Size</span>
                        <span className="text-sm font-mono">{health.services.redis.cacheSize} keys</span>
                      </div>
                    )}
                    {health.services.redis.memory?.usedHuman && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Memory</span>
                        <span className="text-sm font-mono">{health.services.redis.memory.usedHuman}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Not available</p>
                )}
              </CardContent>
            </Card>

            {/* System Memory */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  System Memory
                </CardTitle>
              </CardHeader>
              <CardContent>
                {health.system.memory ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Usage</span>
                      <span className="text-sm font-mono">{health.system.memory.usage}</span>
                    </div>
                    <Progress
                      value={health.system.memory.usagePercent || parseFloat(health.system.memory.usage)}
                      className="h-1.5"
                    />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Used</span>
                        <p className="font-mono">{formatBytes(health.system.memory.used)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Free</span>
                        <p className="font-mono">{formatBytes(health.system.memory.free)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Not available</p>
                )}
              </CardContent>
            </Card>

            {/* CPU & Load */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  CPU & Load
                </CardTitle>
              </CardHeader>
              <CardContent>
                {health.system.cpu && health.system.loadAverage ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Cores</span>
                      <span className="text-sm font-mono">{health.system.cpu.count}</span>
                    </div>
                    {health.system.loadAverage && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Load (1m)</span>
                          <span className="font-mono">{health.system.loadAverage[0]?.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Load (5m)</span>
                          <span className="font-mono">{health.system.loadAverage[1]?.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Load (15m)</span>
                          <span className="font-mono">{health.system.loadAverage[2]?.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Not available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {health.database?.tables && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    Database Tables
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total Tables</span>
                      <span className="text-sm font-semibold">{health.database.tables.count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total Rows</span>
                      <span className="text-sm font-mono">
                        {health.database.tables.totalRows.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total Size</span>
                      <span className="text-sm font-mono">
                        {formatBytes(health.database.tables.totalSize)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {health.database?.indexes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Indexes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total Indexes</span>
                      <span className="text-sm font-semibold">{health.database.indexes.count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Index Size</span>
                      <span className="text-sm font-mono">
                        {formatBytes(health.database.indexes.totalSize)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Usage</span>
                      <span className="text-sm font-mono">
                        {health.database.indexes.usagePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {health.database?.cache && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Cache Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Hit Ratio</span>
                      <span className="text-sm font-mono">
                        {health.database.cache.hitRatio.toFixed(2)}%
                      </span>
                    </div>
                    <Progress
                      value={health.database.cache.hitRatio}
                      className="h-1.5"
                    />
                    <p className="text-xs text-muted-foreground">
                      {health.database.cache.hitRatio > 95 ? 'Excellent' :
                       health.database.cache.hitRatio > 80 ? 'Good' :
                       health.database.cache.hitRatio > 60 ? 'Fair' : 'Poor'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Database Connection Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Connection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {health.services.database ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      {getStatusBadge(health.services.database.status)}
                    </div>
                    
                    {health.services.database.responseTime !== undefined && (
                      <div className="flex items-center justify-between">
                        <span>Response Time</span>
                        <span className="font-mono">{health.services.database.responseTime}ms</span>
                      </div>
                    )}
                    
                    {health.services.database.size && (
                      <div className="flex items-center justify-between">
                        <span>Database Size</span>
                        <span className="font-mono">{formatBytes(health.services.database.size)}</span>
                      </div>
                    )}
                    
                    {health.services.database.connections && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Connections</span>
                          <span className="font-mono">
                            {health.services.database.connections.current} / {health.services.database.connections.max}
                          </span>
                        </div>
                        <Progress
                          value={parseFloat(health.services.database.connections.usage)}
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {health.services.database.connections.usage} usage
                        </p>
                      </div>
                    )}

                    {health.services.database.pool && (
                      <div className="pt-4 border-t space-y-2">
                        <p className="text-sm font-semibold">Connection Pool</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Active</span>
                            <p className="font-mono">{health.services.database.pool.active}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Idle</span>
                            <p className="font-mono">{health.services.database.pool.idle}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Idle in TX</span>
                            <p className="font-mono">{health.services.database.pool.idleInTransaction}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Waiting</span>
                            <p className="font-mono text-orange-500">
                              {health.services.database.pool.waiting}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Database information not available</p>
                )}
              </CardContent>
            </Card>

            {/* Database Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {health.database ? (
                  <>
                    {health.database.tables && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Tables</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Count</span>
                            <p className="font-semibold">{health.database.tables.count}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Rows</span>
                            <p className="font-mono">
                              {health.database.tables.totalRows.toLocaleString()}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Total Size</span>
                            <p className="font-mono">{formatBytes(health.database.tables.totalSize)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {health.database.indexes && (
                      <div className="space-y-2 pt-4 border-t">
                        <p className="text-sm font-semibold">Indexes</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Count</span>
                            <p className="font-semibold">{health.database.indexes.count}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Size</span>
                            <p className="font-mono">{formatBytes(health.database.indexes.totalSize)}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Usage</span>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={health.database.indexes.usagePercent}
                                className="h-2 flex-1"
                              />
                              <span className="font-mono text-xs">
                                {health.database.indexes.usagePercent.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {health.database.queries && (
                      <div className="space-y-2 pt-4 border-t">
                        <p className="text-sm font-semibold">Active Queries</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Active</span>
                            <p className="font-mono">{health.database.queries.active}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Idle in TX</span>
                            <p className="font-mono">{health.database.queries.idleInTransaction}</p>
                          </div>
                          {health.database.queries.longestQuerySeconds > 0 && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Longest Query</span>
                              <p className="font-mono text-orange-500">
                                {formatDuration(health.database.queries.longestQuerySeconds)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {health.database.locks && health.database.locks.waiting > 0 && (
                      <div className="pt-4 border-t">
                        <div className="flex items-center gap-2 text-orange-500">
                          <Lock className="h-4 w-4" />
                          <span className="text-sm font-semibold">
                            {health.database.locks.waiting} Waiting Locks
                          </span>
                        </div>
                      </div>
                    )}

                    {health.database.cache && (
                      <div className="space-y-2 pt-4 border-t">
                        <p className="text-sm font-semibold">Cache Hit Ratio</p>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={health.database.cache.hitRatio}
                            className="h-2 flex-1"
                          />
                          <span className="font-mono text-sm">
                            {health.database.cache.hitRatio.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {health.database.replication && (
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">Replication Role</span>
                          <Badge variant="outline">
                            {health.database.replication.role}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Performance metrics not available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  CPU & Platform
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {health.system && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Platform</p>
                        <p className="font-semibold">{health.system.platform || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Architecture</p>
                        <p className="font-semibold">{health.system.arch || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Node Version</p>
                        <p className="font-semibold">{health.system.nodeVersion || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Uptime</p>
                        <p className="font-semibold">
                          {health.system.uptime ? formatUptime(health.system.uptime) : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    
                    {health.system.cpu && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-2">CPU</p>
                        <p className="font-semibold">{health.system.cpu.model}</p>
                        <p className="text-sm text-muted-foreground">
                          {health.system.cpu.count} cores
                          {health.system.cpu.speed && ` @ ${health.system.cpu.speed}MHz`}
                        </p>
                      </div>
                    )}
                    
                    {health.system.loadAverage && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-2">Load Average</p>
                        <div className="flex gap-4">
                          {health.system.loadAverage.map((load, index) => (
                            <div key={index}>
                              <p className="text-xs text-muted-foreground">
                                {index === 0 ? '1min' : index === 1 ? '5min' : '15min'}
                              </p>
                              <p className="font-mono">{load.toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Memory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {health.system.memory && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Memory Usage</span>
                        <span className="font-mono">{health.system.memory.usage}</span>
                      </div>
                      <Progress
                        value={health.system.memory.usagePercent || parseFloat(health.system.memory.usage)}
                        className="h-2"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="font-semibold">{formatBytes(health.system.memory.total)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Used</p>
                        <p className="font-semibold text-orange-500">
                          {formatBytes(health.system.memory.used)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Free</p>
                        <p className="font-semibold text-green-500">
                          {formatBytes(health.system.memory.free)}
                        </p>
                      </div>
                    </div>

                    {health.system.disk && (
                      <div className="pt-4 border-t space-y-2">
                        <p className="text-sm font-semibold">Disk Usage</p>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total</span>
                            <p className="font-mono">{formatBytes(health.system.disk.total || 0)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Used</span>
                            <p className="font-mono text-orange-500">
                              {formatBytes(health.system.disk.used || 0)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Free</span>
                            <p className="font-mono text-green-500">
                              {formatBytes(health.system.disk.free || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Cache Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {health.performance.cache && (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Cache Type</span>
                      <Badge>{health.performance.cache.type}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Cache Size</span>
                      <span className="font-mono">{health.performance.cache.size} items</span>
                    </div>
                  </>
                )}
                {health.services.redis?.stats && (
                  <div className="pt-4 border-t space-y-2">
                    <p className="text-sm font-semibold">Redis Statistics</p>
                    {health.services.redis.stats.totalCommands !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Commands</span>
                        <span className="font-mono">
                          {health.services.redis.stats.totalCommands.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {health.services.redis.stats.opsPerSec !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Ops/sec</span>
                        <span className="font-mono">{health.services.redis.stats.opsPerSec}</span>
                      </div>
                    )}
                    {health.services.redis.stats.keyspaceHits !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Cache Hits</span>
                        <span className="font-mono text-green-500">
                          {health.services.redis.stats.keyspaceHits.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {health.services.redis.stats.keyspaceMisses !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Cache Misses</span>
                        <span className="font-mono text-orange-500">
                          {health.services.redis.stats.keyspaceMisses.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Process Memory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {health.performance.process?.memoryUsage && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">RSS</p>
                      <p className="font-semibold">
                        {formatBytes(health.performance.process.memoryUsage.rss)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Heap Total</p>
                      <p className="font-semibold">
                        {formatBytes(health.performance.process.memoryUsage.heapTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Heap Used</p>
                      <p className="font-semibold text-orange-500">
                        {formatBytes(health.performance.process.memoryUsage.heapUsed)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">External</p>
                      <p className="font-semibold">
                        {formatBytes(health.performance.process.memoryUsage.external)}
                      </p>
                    </div>
                    {health.performance.process.memoryUsage.arrayBuffers !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground">Array Buffers</p>
                        <p className="font-semibold">
                          {formatBytes(health.performance.process.memoryUsage.arrayBuffers)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {health.performance.process?.cpuUsage && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-semibold mb-2">CPU Usage</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">User</span>
                        <p className="font-mono">
                          {(health.performance.process.cpuUsage.user / 1000).toFixed(2)}s
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">System</span>
                        <p className="font-mono">
                          {(health.performance.process.cpuUsage.system / 1000).toFixed(2)}s
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Database Service */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Service
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {health.services.database ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      {getStatusBadge(health.services.database.status)}
                    </div>
                    
                    {health.services.database.responseTime !== undefined && (
                      <div className="flex items-center justify-between">
                        <span>Response Time</span>
                        <span className="font-mono">{health.services.database.responseTime}ms</span>
                      </div>
                    )}
                    
                    {health.services.database.size && (
                      <div className="flex items-center justify-between">
                        <span>Database Size</span>
                        <span className="font-mono">{formatBytes(health.services.database.size)}</span>
                      </div>
                    )}
                    
                    {health.services.database.connections && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Connections</span>
                          <span className="font-mono">
                            {health.services.database.connections.current} / {health.services.database.connections.max}
                          </span>
                        </div>
                        <Progress
                          value={parseFloat(health.services.database.connections.usage)}
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {health.services.database.connections.usage} usage
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Database information not available</p>
                )}
              </CardContent>
            </Card>

            {/* Redis Service */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Redis Cache Service
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {health.services.redis ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      {getStatusBadge(health.services.redis.status)}
                    </div>
                    
                    {health.services.redis.responseTime !== undefined && (
                      <div className="flex items-center justify-between">
                        <span>Response Time</span>
                        <span className="font-mono">{health.services.redis.responseTime}ms</span>
                      </div>
                    )}
                    
                    {health.services.redis.cacheSize !== undefined && (
                      <div className="flex items-center justify-between">
                        <span>Cache Size</span>
                        <span className="font-mono">{health.services.redis.cacheSize} keys</span>
                      </div>
                    )}
                    
                    {health.services.redis.memory && (
                      <>
                        <div className="flex items-center justify-between">
                          <span>Memory Used</span>
                          <span className="font-mono">
                            {health.services.redis.memory.usedHuman || formatBytes(health.services.redis.memory.used || 0)}
                          </span>
                        </div>
                        {health.services.redis.memory.peak && (
                          <div className="flex items-center justify-between">
                            <span>Memory Peak</span>
                            <span className="font-mono">
                              {health.services.redis.memory.peakHuman || formatBytes(health.services.redis.memory.peak)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {health.services.redis.clients && (
                      <div className="pt-4 border-t space-y-2">
                        <p className="text-sm font-semibold">Clients</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Connected</span>
                            <p className="font-mono">{health.services.redis.clients.connected || 0}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Blocked</span>
                            <p className="font-mono text-orange-500">
                              {health.services.redis.clients.blocked || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {health.services.redis.fallback && (
                      <Badge variant="outline" className="w-full justify-center">
                        Fallback: {health.services.redis.fallback}
                      </Badge>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Redis information not available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
