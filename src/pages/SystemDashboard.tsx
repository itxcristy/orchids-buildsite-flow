import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useSystemAnalytics } from '@/hooks/useSystemAnalytics';
import { Navigate } from 'react-router-dom';
import { SystemMetricsCards } from '@/components/system/SystemMetricsCards';
import { AgencyManagement } from '@/components/system/AgencyManagement';
import { SystemDashboardCharts } from '@/components/system/SystemDashboardCharts';
import { SupportTicketsWidget } from '@/components/system/SupportTicketsWidget';
import { RealTimeUsageWidget } from '@/components/system/RealTimeUsageWidget';
import PlanManagement from '@/components/system/PlanManagement';
import { AgencySettings } from '@/components/system/AgencySettings';
import { SystemSettings } from '@/components/system/SystemSettings';
import PageCatalogManagement from '@/components/system/PageCatalogManagement';
import PageRequestManagement from '@/components/system/PageRequestManagement';
import { RefreshCw, AlertTriangle, CheckCircle, TrendingUp, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SystemDashboard = () => {
  const { user, userRole, signOut } = useAuth();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Show loading while auth is being determined
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect non-super_admin users
  if (userRole && userRole !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Only initialize analytics after authentication is confirmed
  const { metrics, agencies, loading, refreshMetrics } = useSystemAnalytics({
    userId: user.id,
    userRole: userRole || ''
  });
  const { toast } = useToast();

  useEffect(() => {
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      refreshMetrics();
      setLastRefresh(new Date());
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshMetrics]);

  const handleManualRefresh = () => {
    refreshMetrics();
    setLastRefresh(new Date());
    toast({
      title: "Dashboard Refreshed",
      description: "System metrics have been updated."
    });
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out."
    });
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Error Loading Data
            </CardTitle>
            <CardDescription>
              Unable to load system metrics. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleManualRefresh} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">System Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Platform-wide analytics and agency management for BuildFlow
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-xs">
                Super Admin
              </Badge>
              <div className="text-sm text-muted-foreground">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              <Button 
                onClick={handleManualRefresh} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                onClick={handleLogout} 
                variant="outline" 
                size="sm"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Quick Stats */}
        <SystemMetricsCards metrics={metrics} />

        {/* System Status Alert */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-green-800">All Systems Operational</div>
                <div className="text-sm text-green-600">
                  Platform is running smoothly with {metrics.systemHealth.uptime} uptime
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="agencies">Agencies</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Revenue Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        ${metrics.revenueMetrics.mrr.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Monthly Recurring Revenue</div>
                    </div>
                    <div>
                      <div className="text-xl font-semibold">
                        ${metrics.revenueMetrics.arr.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Annual Recurring Revenue</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Platform Growth */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Platform Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Active Agencies</span>
                      <span className="font-medium">{metrics.activeAgencies}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Users</span>
                      <span className="font-medium">{metrics.totalUsers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Projects</span>
                      <span className="font-medium">{metrics.usageStats.totalProjects}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Uptime</span>
                      <Badge variant="default">{metrics.systemHealth.uptime}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Response Time</span>
                      <span className="font-medium">{metrics.systemHealth.responseTime.toFixed(0)}ms</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Error Rate</span>
                      <span className="font-medium">{metrics.systemHealth.errorRate.toFixed(2)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="agencies" className="space-y-6">
            <AgencyManagement agencies={agencies} onRefresh={refreshMetrics} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <SystemDashboardCharts metrics={metrics} />
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RealTimeUsageWidget />
              <SupportTicketsWidget />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <SystemSettings />
            <AgencySettings agencies={agencies} onRefresh={refreshMetrics} />
            <PlanManagement />
            <PageCatalogManagement />
            <PageRequestManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SystemDashboard;