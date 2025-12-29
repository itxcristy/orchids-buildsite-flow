/**
 * Procurement Reports Page
 * Comprehensive procurement analytics and reporting
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
  ShoppingCart,
  FileText,
  Users,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  Package,
  Building2,
} from 'lucide-react';
import {
  getProcurementReports,
  type ProcurementReports,
} from '@/services/api/procurement-service';
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

export default function ProcurementReports() {
  const { toast } = useToast();
  const [reports, setReports] = useState<ProcurementReports | null>(null);
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
      const data = await getProcurementReports({
        date_from: dateFrom,
        date_to: dateTo,
      });
      setReports(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load procurement reports',
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

  if (loading && !reports) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const summary = reports?.summary || {};
  const requisitionsByStatus = reports?.requisitions_by_status || [];
  const poByStatus = reports?.purchase_orders_by_status || [];
  const topSuppliers = reports?.top_suppliers || [];
  const monthlyTrend = reports?.monthly_trend || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Procurement Reports</h1>
          <p className="text-muted-foreground">Comprehensive procurement analytics and insights</p>
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
            <CardTitle className="text-sm font-medium">Total Requisitions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.total_requisitions)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(summary.approved_requisitions)} approved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.total_purchase_orders)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(summary.completed_orders)} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PO Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_po_value)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.completed_po_value)} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.total_suppliers)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(summary.total_goods_receipts)} goods receipts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requisitions">Requisitions</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="suppliers">Top Suppliers</TabsTrigger>
          <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Requisitions by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {requisitionsByStatus.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requisitionsByStatus.map((item) => (
                        <TableRow key={item.status}>
                          <TableCell>
                            <Badge variant="secondary">{item.status}</Badge>
                          </TableCell>
                          <TableCell>{formatNumber(item.count)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.total_amount)}
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
                <CardTitle>Purchase Orders by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {poByStatus.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poByStatus.map((item) => (
                        <TableRow key={item.status}>
                          <TableCell>
                            <Badge variant="secondary">{item.status}</Badge>
                          </TableCell>
                          <TableCell>{formatNumber(item.count)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.total_amount)}
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

        <TabsContent value="requisitions">
          <Card>
            <CardHeader>
              <CardTitle>Requisitions Analysis</CardTitle>
              <CardDescription>Breakdown of purchase requisitions by status</CardDescription>
            </CardHeader>
            <CardContent>
              {requisitionsByStatus.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No requisitions data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requisitionsByStatus.map((item) => (
                      <TableRow key={item.status}>
                        <TableCell>
                          <Badge variant="secondary">{item.status}</Badge>
                        </TableCell>
                        <TableCell>{formatNumber(item.count)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase-orders">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders Analysis</CardTitle>
              <CardDescription>Breakdown of purchase orders by status</CardDescription>
            </CardHeader>
            <CardContent>
              {poByStatus.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No purchase orders data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poByStatus.map((item) => (
                      <TableRow key={item.status}>
                        <TableCell>
                          <Badge variant="secondary">{item.status}</Badge>
                        </TableCell>
                        <TableCell>{formatNumber(item.count)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>Top Suppliers</CardTitle>
              <CardDescription>Suppliers ranked by order value</CardDescription>
            </CardHeader>
            <CardContent>
              {topSuppliers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No supplier data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.code}</TableCell>
                        <TableCell>{formatNumber(supplier.order_count)}</TableCell>
                        <TableCell>{formatNumber(supplier.completed_orders)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(supplier.total_order_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Purchase order trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyTrend.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No trend data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Order Count</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyTrend.map((trend, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(trend.month).toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>{formatNumber(trend.order_count)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(trend.total_amount)}
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

