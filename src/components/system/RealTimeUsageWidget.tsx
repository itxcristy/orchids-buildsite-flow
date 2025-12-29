import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Users, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiEndpoint } from '@/config/services';

interface UsageMetrics {
  activeUsers: number;
  activeSessions: number;
  recentActions: number;
  peakHour: string;
  totalActionsToday: number;
  avgResponseTime: number;
}

interface RecentActivity {
  id: string;
  action_type: string;
  resource_type: string;
  timestamp: string;
  user_count: number;
}

function authHeaders() {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('auth_token') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const RealTimeUsageWidget = () => {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsageMetrics = async () => {
    try {
      setLoading(true);

      const endpoint = getApiEndpoint('/system/usage/realtime');
      
      // Log API URL for debugging (only in development)
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || import.meta.env.DEV)) {
        console.log('[RealTime Usage] Fetching from URL:', endpoint);
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          ...authHeaders(),
          'Accept': 'application/json',
        },
        mode: 'cors', // Explicitly enable CORS
        credentials: 'omit', // Don't send cookies (auth is header-based)
        cache: 'no-cache', // Always fetch fresh data
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to fetch usage metrics: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch {
          // Use default error message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setMetrics(data.data.metrics);
        setRecentActivity(data.data.recentActivity || []);
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to load real-time usage statistics';
      
      // Check for CORS errors specifically
      const isCorsError = errorMessage.includes('CORS') || 
                         errorMessage.includes('cross-origin') ||
                         errorMessage.includes('Access-Control') ||
                         (error.name === 'TypeError' && errorMessage.includes('Failed to fetch'));
      
      console.error('Error fetching usage metrics:', {
        message: errorMessage,
        error: error,
        stack: error?.stack,
        name: error?.name,
        isCorsError
      });
      
      let userMessage = errorMessage;
      if (isCorsError || errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
        userMessage = 'Unable to connect to the server. This may be a CORS or network configuration issue.';
      }
      
      toast({
        title: "Error loading usage data",
        description: userMessage,
        variant: "destructive"
      });
      
      // Fallback to zero values on error
      setMetrics({
        activeUsers: 0,
        activeSessions: 0,
        recentActions: 0,
        peakHour: '00:00',
        totalActionsToday: 0,
        avgResponseTime: 0,
      });
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageMetrics();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchUsageMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatActionType = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatResourceType = (resource: string) => {
    return resource.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading && !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-Time Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Real-Time Usage
          <Badge variant="outline" className="ml-auto">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics && (
          <>
            {/* Current Activity Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{metrics.activeUsers}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Users className="h-3 w-3" />
                  Active Now
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{metrics.activeSessions}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  Sessions Today
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{metrics.recentActions}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Actions (5m)
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{metrics.peakHour}</div>
                <div className="text-xs text-muted-foreground">
                  Peak Hour
                </div>
              </div>
            </div>

            {/* Today's Summary */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Today's Summary</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Actions</span>
                  <span className="font-medium">{metrics.totalActionsToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Response</span>
                  <span className="font-medium">{metrics.avgResponseTime.toFixed(0)}ms</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Recent Activity */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Recent Activity</h4>
          {recentActivity.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex-1">
                    <span className="text-sm font-medium">
                      {formatActionType(activity.action_type)}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {formatResourceType(activity.resource_type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {activity.user_count} users
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Activity className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};