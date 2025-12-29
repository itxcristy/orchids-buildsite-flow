import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useAgencyAnalytics } from '@/hooks/useAgencyAnalytics';
import { RefreshCw, AlertTriangle, CheckCircle, TrendingUp, Users, Building, FileText, DollarSign, Calendar, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { PageContainer, PageHeader, StatsGrid } from '@/components/layout';

const AgencyDashboard = () => {
  const { user, userRole } = useAuth();
  const { metrics, loading, refreshMetrics } = useAgencyAnalytics();
  const { toast } = useToast();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Redirect super_admin users to system dashboard
  if (userRole === 'super_admin') {
    return <Navigate to="/system" replace />;
  }

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
      description: "Agency metrics have been updated."
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
              Unable to load agency metrics. Please try refreshing the page.
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
    <PageContainer>
      <PageHeader 
        title="Agency Dashboard"
        description="Your agency's performance and activity overview"
        actions={
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              {userRole?.replace('_', ' ').toUpperCase()}
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
          </div>
        }
      />
        {/* Quick Stats */}
        <StatsGrid cols={4}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.activeUsers} active users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.activeProjects} active projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ${metrics.monthlyRevenue.toLocaleString()} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalInvoices}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.totalClients} clients
              </p>
            </CardContent>
          </Card>
        </StatsGrid>

        {/* Quick Actions for Admin and HR */}
        {(userRole === 'admin' || userRole === 'hr') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>
                Manage events and holidays for your agency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button asChild>
                  <a href="/calendar">
                    <Calendar className="mr-2 h-4 w-4" />
                    Create Event
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href="/holiday-management">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Add Holiday
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href="/calendar">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Manage Calendar
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agency Status Alert */}
        <Card className="border-success/30 bg-success-light">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <div className="font-medium text-success-foreground">Agency Active</div>
                <div className="text-sm text-success-foreground/80">
                  Your agency is operating normally with all systems functional
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity (30 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">New Users</span>
                      <span className="font-medium">{metrics.recentActivity.newUsers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">New Projects</span>
                      <span className="font-medium">{metrics.recentActivity.newProjects}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">New Invoices</span>
                      <span className="font-medium">{metrics.recentActivity.newInvoices}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leave Requests */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Leave Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pending</span>
                      <Badge variant="secondary">{metrics.leaveRequests.pending}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Approved</span>
                      <Badge variant="default">{metrics.leaveRequests.approved}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="font-medium">{metrics.leaveRequests.total}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Overview</CardTitle>
                <CardDescription>
                  Manage your team members and track their activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-primary">{metrics.totalUsers}</div>
                    <div className="text-sm text-muted-foreground">Total Team Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-success">{metrics.activeUsers}</div>
                    <div className="text-sm text-muted-foreground">Active Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-info">{metrics.attendanceRecords}</div>
                    <div className="text-sm text-muted-foreground">Attendance Records</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Overview</CardTitle>
                <CardDescription>
                  Track your agency's project progress and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-3xl font-semibold text-primary">{metrics.totalProjects}</div>
                    <div className="text-sm text-muted-foreground">Total Projects</div>
                  </div>
                  <div>
                    <div className="text-3xl font-semibold text-success">{metrics.activeProjects}</div>
                    <div className="text-sm text-muted-foreground">Active Projects</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Agency Analytics
                </CardTitle>
                <CardDescription>
                  Financial and operational metrics for your agency
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Revenue Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Revenue</span>
                        <span className="font-medium">${metrics.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                        <span className="font-medium">${metrics.monthlyRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Invoices</span>
                        <span className="font-medium">{metrics.totalInvoices}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">Operational Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Client Base</span>
                        <span className="font-medium">{metrics.totalClients}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Project Completion</span>
                        <span className="font-medium">
                          {metrics.totalProjects > 0 ? 
                            Math.round((metrics.activeProjects / metrics.totalProjects) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Team Utilization</span>
                        <span className="font-medium">
                          {metrics.totalUsers > 0 ? 
                            Math.round((metrics.activeUsers / metrics.totalUsers) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </PageContainer>
  );
};

export default AgencyDashboard;