import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, DollarSign, Activity, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import type { SystemMetrics } from '@/types/system';

interface SystemMetricsCardsProps {
  metrics: SystemMetrics;
}

export const SystemMetricsCards = ({ metrics }: SystemMetricsCardsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Agencies Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Agencies</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalAgencies}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={metrics.activeAgencies > 0 ? "default" : "secondary"} className="text-xs">
              {metrics.activeAgencies} Active
            </Badge>
            {metrics.totalAgencies - metrics.activeAgencies > 0 && (
              <Badge variant="outline" className="text-xs">
                {metrics.totalAgencies - metrics.activeAgencies} Inactive
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users Overview */}
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

      {/* Revenue Metrics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.revenueMetrics.mrr)}</div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(metrics.revenueMetrics.arr)} ARR
          </p>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Health</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.systemHealth.uptime}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.systemHealth.responseTime.toFixed(0)}ms avg response
          </p>
        </CardContent>
      </Card>

      {/* Subscription Plans Distribution */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Subscription Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.subscriptionPlans.basic}</div>
              <p className="text-xs text-muted-foreground">Basic</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.subscriptionPlans.pro}</div>
              <p className="text-xs text-muted-foreground">Pro</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.subscriptionPlans.enterprise}</div>
              <p className="text-xs text-muted-foreground">Enterprise</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Platform Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Projects</span>
              <span className="font-medium">{metrics.usageStats.totalProjects}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Invoices</span>
              <span className="font-medium">{metrics.usageStats.totalInvoices}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Clients</span>
              <span className="font-medium">{metrics.usageStats.totalClients}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Attendance Records</span>
              <span className="font-medium">{metrics.usageStats.totalAttendanceRecords}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};