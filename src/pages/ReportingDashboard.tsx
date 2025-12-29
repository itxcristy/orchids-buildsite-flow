/**
 * Reporting Dashboard Page
 * Comprehensive dashboard aggregating data from all modules
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Building2,
  FolderKanban,
  Users,
  AlertTriangle,
  Loader2,
  Download,
  Calendar,
  RefreshCw,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { ReportService } from '@/services/api/reports';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DashboardData {
  financial: {
    revenue?: number;
    pending_revenue?: number;
    overdue_revenue?: number;
    expenses?: number;
    profit?: number;
    paid_invoices?: number;
    pending_invoices?: number;
    overdue_invoices?: number;
  };
  inventory: {
    total_products?: number;
    total_warehouses?: number;
    total_quantity?: number;
    total_stock_value?: number;
    low_stock_items?: number;
  };
  procurement: {
    total_requisitions?: number;
    approved_requisitions?: number;
    total_purchase_orders?: number;
    completed_orders?: number;
    pending_po_value?: number;
    completed_po_value?: number;
  };
  assets: {
    total_assets?: number;
    active_assets?: number;
    maintenance_assets?: number;
    total_asset_value?: number;
    total_current_value?: number;
    total_depreciation?: number;
  };
  projects: {
    total_projects?: number;
    active_projects?: number;
    completed_projects?: number;
    total_budget?: number;
    completed_budget?: number;
  };
  hr: {
    total_employees?: number;
    active_employees?: number;
    attendance_records?: number;
    present_count?: number;
    attendance_rate?: number;
  };
  recent_activity: Array<{
    module: string;
    count: number;
  }>;
  date_range: {
    from: string;
    to: string;
  };
}

export default function ReportingDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // Memoized load function to avoid unnecessary re-renders
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Validate dates
      if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
        throw new Error('Start date must be before or equal to end date');
      }
      
      const data = await ReportService.getDashboardData({
        date_from: dateFrom,
        date_to: dateTo,
      });
      setDashboardData(data);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load dashboard data';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo, toast]);

  // Debounce date changes to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboardData();
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [dateFrom, dateTo, loadDashboardData]);

  // Initial load
  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = useCallback(() => {
    if (!dashboardData) {
      toast({
        title: 'No Data',
        description: 'No data available to export',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const exportData = {
        ...dashboardData,
        exported_at: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Successful',
        description: 'Dashboard data exported successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export data',
        variant: 'destructive',
      });
    }
  }, [dashboardData, toast]);

  // Memoize formatters to avoid recreating on every render
  const formatCurrency = useCallback((value: number | undefined) => {
    if (value === undefined || value === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }, []);

  const formatNumber = useCallback((value: number | undefined) => {
    if (value === undefined || value === null) return '0';
    return new Intl.NumberFormat('en-US').format(value);
  }, []);

  // Show loading state only on initial load
  if (loading && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reporting Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of all modules
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[150px]"
                max={dateTo}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[150px]"
                min={dateFrom}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => loadDashboardData(true)} 
            disabled={loading || refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!dashboardData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Error loading dashboard</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading overlay for refresh */}
      {refreshing && dashboardData && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Refreshing data...</span>
            </div>
          </Card>
        </div>
      )}

      {dashboardData && !error && (
        <>
          {/* Financial Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboardData.financial?.revenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(dashboardData.financial?.paid_invoices)} paid invoices
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboardData.financial?.expenses)}
                </div>
                <p className="text-xs text-muted-foreground">Total expenses</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboardData.financial?.profit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.financial?.profit && dashboardData.financial.profit >= 0
                    ? 'Positive'
                    : 'Negative'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboardData.financial?.pending_revenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(dashboardData.financial?.pending_invoices)} invoices
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Module Overview Cards */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="procurement">Procurement</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="hr">HR</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Inventory Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Inventory
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Products</span>
                      <span className="font-medium">
                        {formatNumber(dashboardData.inventory?.total_products)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Warehouses</span>
                      <span className="font-medium">
                        {formatNumber(dashboardData.inventory?.total_warehouses)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Stock Value</span>
                      <span className="font-medium">
                        {formatCurrency(dashboardData.inventory?.total_stock_value)}
                      </span>
                    </div>
                    {dashboardData.inventory?.low_stock_items && dashboardData.inventory.low_stock_items > 0 && (
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-sm text-red-600">Low Stock Items</span>
                        <Badge variant="destructive">
                          {formatNumber(dashboardData.inventory.low_stock_items)}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Procurement Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Procurement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Requisitions</span>
                      <span className="font-medium">
                        {formatNumber(dashboardData.procurement?.total_requisitions)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Purchase Orders</span>
                      <span className="font-medium">
                        {formatNumber(dashboardData.procurement?.total_purchase_orders)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Completed Orders</span>
                      <span className="font-medium">
                        {formatNumber(dashboardData.procurement?.completed_orders)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Pending PO Value</span>
                      <span className="font-medium">
                        {formatCurrency(dashboardData.procurement?.pending_po_value)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Assets Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Assets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Assets</span>
                      <span className="font-medium">
                        {formatNumber(dashboardData.assets?.total_assets)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Active</span>
                      <span className="font-medium">
                        {formatNumber(dashboardData.assets?.active_assets)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Value</span>
                      <span className="font-medium">
                        {formatCurrency(dashboardData.assets?.total_asset_value)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Current Value</span>
                      <span className="font-medium">
                        {formatCurrency(dashboardData.assets?.total_current_value)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Projects Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderKanban className="w-5 h-5" />
                      Projects
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Projects</span>
                      <span className="font-medium">
                        {formatNumber(dashboardData.projects?.total_projects)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Active</span>
                      <span className="font-medium">
                        {formatNumber(dashboardData.projects?.active_projects)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Completed</span>
                      <span className="font-medium">
                        {formatNumber(dashboardData.projects?.completed_projects)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Total Budget</span>
                      <span className="font-medium">
                        {formatCurrency(dashboardData.projects?.total_budget)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* HR Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Human Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Employees</span>
                      <span className="font-medium">
                        {formatNumber(dashboardData.hr?.total_employees)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Active</span>
                      <span className="font-medium">
                        {formatNumber(dashboardData.hr?.active_employees)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Attendance Rate</span>
                      <span className="font-medium">
                        {dashboardData.hr?.attendance_rate?.toFixed(1) || '0'}%
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Present Today</span>
                      <span className="font-medium">
                        {formatNumber(dashboardData.hr?.present_count)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Recent Activity (7 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dashboardData.recent_activity && dashboardData.recent_activity.length > 0 ? (
                      dashboardData.recent_activity.map((activity, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-sm text-muted-foreground capitalize">
                            {activity.module}
                          </span>
                          <span className="font-medium">{formatNumber(activity.count)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Detailed Module Views */}
            <TabsContent value="financial" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Details</CardTitle>
                  <CardDescription>Revenue, expenses, and profit breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Paid Invoices</Label>
                      <p className="text-2xl font-bold">
                        {formatNumber(dashboardData.financial?.paid_invoices)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Pending Invoices</Label>
                      <p className="text-2xl font-bold">
                        {formatNumber(dashboardData.financial?.pending_invoices)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Overdue Invoices</Label>
                      <p className="text-2xl font-bold text-red-600">
                        {formatNumber(dashboardData.financial?.overdue_invoices)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Overdue Amount</Label>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(dashboardData.financial?.overdue_revenue)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Details</CardTitle>
                  <CardDescription>Stock levels and warehouse information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Total Quantity</Label>
                      <p className="text-2xl font-bold">
                        {formatNumber(dashboardData.inventory?.total_quantity)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Stock Value</Label>
                      <p className="text-2xl font-bold">
                        {formatCurrency(dashboardData.inventory?.total_stock_value)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="procurement" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Procurement Details</CardTitle>
                  <CardDescription>Purchase orders and requisitions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Approved Requisitions</Label>
                      <p className="text-2xl font-bold">
                        {formatNumber(dashboardData.procurement?.approved_requisitions)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Completed PO Value</Label>
                      <p className="text-2xl font-bold">
                        {formatCurrency(dashboardData.procurement?.completed_po_value)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assets" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Assets Details</CardTitle>
                  <CardDescription>Asset value and depreciation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Maintenance Assets</Label>
                      <p className="text-2xl font-bold">
                        {formatNumber(dashboardData.assets?.maintenance_assets)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Total Depreciation</Label>
                      <p className="text-2xl font-bold">
                        {formatCurrency(dashboardData.assets?.total_depreciation)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projects" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Projects Details</CardTitle>
                  <CardDescription>Project status and budget</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Completed Budget</Label>
                      <p className="text-2xl font-bold">
                        {formatCurrency(dashboardData.projects?.completed_budget)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hr" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>HR Details</CardTitle>
                  <CardDescription>Employee and attendance information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Attendance Records</Label>
                      <p className="text-2xl font-bold">
                        {formatNumber(dashboardData.hr?.attendance_records)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

