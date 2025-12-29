/**
 * Asset Reports Page
 * Comprehensive asset analytics and reporting
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  Wrench,
  Trash2,
  Package,
  MapPin,
  FolderTree,
} from 'lucide-react';
import {
  getAssetReports,
  type AssetReports,
} from '@/services/api/asset-service';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function AssetReports() {
  const { toast } = useToast();
  const [reports, setReports] = useState<AssetReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    loadReports();
  }, [dateFrom, dateTo]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await getAssetReports({
        date_from: dateFrom,
        date_to: dateTo,
      });
      setReports(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load asset reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return '₹0.00';
    const numValue = typeof value === 'number' ? value : parseFloat(String(value || 0));
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(numValue);
  };

  const formatNumber = (value: number | undefined) => {
    if (value === undefined || value === null) return '0';
    const numValue = typeof value === 'number' ? value : parseFloat(String(value || 0));
    return new Intl.NumberFormat('en-IN').format(numValue);
  };

  const handleExport = () => {
    toast({
      title: 'Export',
      description: 'Export functionality coming soon',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      maintenance: 'secondary',
      disposed: 'destructive',
      written_off: 'outline',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (loading && !reports) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const summary = reports?.summary || {};
  const assetsByStatus = reports?.assets_by_status || [];
  const assetsByCategory = reports?.assets_by_category || [];
  const depreciationTrend = reports?.depreciation_trend || [];
  const maintenanceSummary = reports?.maintenance_summary || [];
  const topAssets = reports?.top_assets || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Reports</h1>
          <p className="text-muted-foreground">Comprehensive asset analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={loadReports}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.total_assets)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(summary.active_assets)} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchase Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_purchase_cost)}</div>
            <p className="text-xs text-muted-foreground">
              Current: {formatCurrency(summary.total_current_value)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Depreciation</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_depreciation)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(summary.total_categories)} categories
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.total_locations)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(summary.maintenance_assets)} in maintenance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="status">By Status</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="top-assets">Top Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Assets by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {assetsByStatus.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead className="text-right">Purchase Cost</TableHead>
                        <TableHead className="text-right">Current Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assetsByStatus.map((item) => (
                        <TableRow key={item.status}>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>{formatNumber(item.count)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.total_purchase_cost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.total_current_value)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {assetsByCategory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Assets</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assetsByCategory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">{item.code}</div>
                            </div>
                          </TableCell>
                          <TableCell>{formatNumber(item.asset_count)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.total_current_value)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Assets by Status</CardTitle>
              <CardDescription>Breakdown of assets by status</CardDescription>
            </CardHeader>
            <CardContent>
              {assetsByStatus.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No status data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead className="text-right">Purchase Cost</TableHead>
                      <TableHead className="text-right">Current Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assetsByStatus.map((item) => (
                      <TableRow key={item.status}>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>{formatNumber(item.count)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.total_purchase_cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.total_current_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category">
          <Card>
            <CardHeader>
              <CardTitle>Assets by Category</CardTitle>
              <CardDescription>Breakdown of assets by category</CardDescription>
            </CardHeader>
            <CardContent>
              {assetsByCategory.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No category data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Asset Count</TableHead>
                      <TableHead className="text-right">Purchase Cost</TableHead>
                      <TableHead className="text-right">Current Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assetsByCategory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.code}</TableCell>
                        <TableCell>{formatNumber(item.asset_count)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.total_purchase_cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.total_current_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depreciation">
          <Card>
            <CardHeader>
              <CardTitle>Depreciation Trends</CardTitle>
              <CardDescription>Monthly depreciation trends</CardDescription>
            </CardHeader>
            <CardContent>
              {depreciationTrend.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No depreciation data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead className="text-right">Total Depreciation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depreciationTrend.map((trend, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(trend.month).toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>{formatNumber(trend.record_count)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(trend.total_depreciation)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Summary</CardTitle>
              <CardDescription>Maintenance activities by type</CardDescription>
            </CardHeader>
            <CardContent>
              {maintenanceSummary.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No maintenance data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Maintenance Type</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceSummary.map((item) => (
                      <TableRow key={item.maintenance_type}>
                        <TableCell className="font-medium">{item.maintenance_type}</TableCell>
                        <TableCell>{formatNumber(item.count)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.total_cost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-assets">
          <Card>
            <CardHeader>
              <CardTitle>Top Assets by Value</CardTitle>
              <CardDescription>Highest value assets</CardDescription>
            </CardHeader>
            <CardContent>
              {topAssets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No asset data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Purchase Cost</TableHead>
                      <TableHead className="text-right">Current Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.asset_number}</TableCell>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>{asset.category_name || '-'}</TableCell>
                        <TableCell>{getStatusBadge(asset.status)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(asset.purchase_cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(asset.current_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

