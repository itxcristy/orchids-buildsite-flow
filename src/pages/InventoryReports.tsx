/**
 * Inventory Reports Page
 * Comprehensive inventory analytics and reporting
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
  Package,
  Warehouse,
  DollarSign,
  AlertTriangle,
  Loader2,
  Download,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  getInventoryReports,
  getStockValueReport,
  getMovementReport,
  getWarehouseUtilizationReport,
  getWarehouses,
  getProducts,
  type InventoryReportSummary,
  type StockValueReportItem,
  type MovementReportItem,
  type WarehouseUtilizationItem,
} from '@/services/api/inventory-service';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function InventoryReports() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<InventoryReportSummary | null>(null);
  const [stockValueReport, setStockValueReport] = useState<StockValueReportItem[]>([]);
  const [movementReport, setMovementReport] = useState<MovementReportItem[]>([]);
  const [warehouseUtilization, setWarehouseUtilization] = useState<WarehouseUtilizationItem[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Filters
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [filterWarehouse, setFilterWarehouse] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => {
    loadWarehouses();
    loadProducts();
    loadReports();
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadStockValueReport();
    loadWarehouseUtilization();
  }, [filterWarehouse, filterCategory, lowStockOnly]);

  useEffect(() => {
    loadMovementReport();
  }, [dateFrom, dateTo, filterWarehouse]);

  const loadWarehouses = async () => {
    try {
      const data = await getWarehouses();
      setWarehouses(data.filter((w) => w.is_active));
    } catch (error: any) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await getProducts({ is_active: true });
      setProducts(data);
    } catch (error: any) {
      console.error('Failed to load products:', error);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await getInventoryReports({
        date_from: dateFrom,
        date_to: dateTo,
      });
      setReports(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStockValueReport = async () => {
    try {
      const filters: any = {};
      if (filterWarehouse !== 'all') filters.warehouse_id = filterWarehouse;
      if (filterCategory !== 'all') filters.category_id = filterCategory;
      if (lowStockOnly) filters.low_stock_only = true;

      const data = await getStockValueReport(filters);
      setStockValueReport(data);
    } catch (error: any) {
      console.error('Failed to load stock value report:', error);
    }
  };

  const loadMovementReport = async () => {
    try {
      const filters: any = {
        date_from: dateFrom,
        date_to: dateTo,
      };
      if (filterWarehouse !== 'all') filters.warehouse_id = filterWarehouse;

      const data = await getMovementReport(filters);
      setMovementReport(data);
    } catch (error: any) {
      console.error('Failed to load movement report:', error);
    }
  };

  const loadWarehouseUtilization = async () => {
    try {
      const data = await getWarehouseUtilizationReport();
      setWarehouseUtilization(data);
    } catch (error: any) {
      console.error('Failed to load warehouse utilization:', error);
    }
  };

  const handleExport = () => {
    toast({
      title: 'Export',
      description: 'Export functionality coming soon',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Reports</h1>
          <p className="text-muted-foreground">Comprehensive inventory analytics and insights</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={loadReports} className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {reports && (
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reports.summary.total_products || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
              <Warehouse className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reports.summary.total_warehouses || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(typeof reports.summary.total_quantity === 'number'
                  ? reports.summary.total_quantity
                  : parseFloat(String(reports.summary.total_quantity || 0))
                ).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {(typeof reports.summary.total_value === 'number'
                  ? reports.summary.total_value
                  : parseFloat(String(reports.summary.total_value || 0))
                ).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {reports.summary.low_stock_items || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Records</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reports.summary.total_inventory_records || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stock-value">Stock Value</TabsTrigger>
          <TabsTrigger value="movement">Movement</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Transaction Summary */}
          {reports && reports.transactions && reports.transactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Transaction Summary</CardTitle>
                <CardDescription>
                  Transactions from {dateFrom} to {dateTo}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction Type</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Total Quantity</TableHead>
                      <TableHead>Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.transactions.map((txn, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge variant="outline">{txn.transaction_type}</Badge>
                        </TableCell>
                        <TableCell>{txn.count}</TableCell>
                        <TableCell>
                          {(typeof txn.total_quantity === 'number'
                            ? txn.total_quantity
                            : parseFloat(String(txn.total_quantity || 0))
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          $
                          {(typeof txn.total_cost === 'number'
                            ? txn.total_cost
                            : parseFloat(String(txn.total_cost || 0))
                          ).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Top Products by Value */}
          {reports && reports.top_products && reports.top_products.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Products by Value</CardTitle>
                <CardDescription>Products with highest inventory value</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.top_products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono">{product.sku}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          {(typeof product.total_quantity === 'number'
                            ? product.total_quantity
                            : parseFloat(String(product.total_quantity || 0))
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {(typeof product.available_quantity === 'number'
                            ? product.available_quantity
                            : parseFloat(String(product.available_quantity || 0))
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          $
                          {(typeof product.total_value === 'number'
                            ? product.total_value
                            : parseFloat(String(product.total_value || 0))
                          ).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Stock Value Tab */}
        <TabsContent value="stock-value" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Value Report</CardTitle>
              <CardDescription>Detailed inventory valuation by product and warehouse</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-4">
                <div className="space-y-2">
                  <Label>Warehouse</Label>
                  <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Warehouses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Warehouses</SelectItem>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.code} - {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Low Stock Only</Label>
                  <Select
                    value={lowStockOnly ? 'yes' : 'no'}
                    onValueChange={(v) => setLowStockOnly(v === 'yes')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">All Items</SelectItem>
                      <SelectItem value="yes">Low Stock Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Avg Cost</TableHead>
                    <TableHead>Stock Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockValueReport.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockValueReport.map((item) => (
                      <TableRow key={`${item.id}-${item.warehouse_id}`}>
                        <TableCell className="font-mono">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-mono text-sm">{item.warehouse_code}</div>
                            <div className="text-sm text-muted-foreground">{item.warehouse_name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(typeof item.quantity === 'number'
                            ? item.quantity
                            : parseFloat(String(item.quantity || 0))
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {(typeof item.available_quantity === 'number'
                            ? item.available_quantity
                            : parseFloat(String(item.available_quantity || 0))
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          $
                          {(typeof item.average_cost === 'number'
                            ? item.average_cost
                            : parseFloat(String(item.average_cost || 0))
                          ).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          $
                          {(typeof item.stock_value === 'number'
                            ? item.stock_value
                            : parseFloat(String(item.stock_value || 0))
                          ).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          {item.is_low_stock ? (
                            <Badge variant="destructive">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="default">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movement Tab */}
        <TabsContent value="movement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Movement Report</CardTitle>
              <CardDescription>Inventory transactions and movements over time</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementReport.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No transactions found for the selected period
                      </TableCell>
                    </TableRow>
                  ) : (
                    movementReport.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.transaction_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-mono text-sm">{item.sku}</div>
                            <div className="text-sm text-muted-foreground">{item.product_name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.warehouse_name ? (
                            <div>
                              <div className="font-mono text-sm">{item.warehouse_code}</div>
                              <div className="text-sm text-muted-foreground">{item.warehouse_name}</div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {(typeof item.total_quantity === 'number'
                            ? item.total_quantity
                            : parseFloat(String(item.total_quantity || 0))
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          $
                          {(typeof item.total_cost === 'number'
                            ? item.total_cost
                            : parseFloat(String(item.total_cost || 0))
                          ).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Warehouse Utilization</CardTitle>
              <CardDescription>Inventory distribution across warehouses</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Total Quantity</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Low Stock Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouseUtilization.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No warehouse data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    warehouseUtilization.map((warehouse) => (
                      <TableRow key={warehouse.id}>
                        <TableCell>
                          <div>
                            <div className="font-mono font-medium">{warehouse.code}</div>
                            <div className="text-sm text-muted-foreground">{warehouse.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>{warehouse.product_count || 0}</TableCell>
                        <TableCell>
                          {(typeof warehouse.total_quantity === 'number'
                            ? warehouse.total_quantity
                            : parseFloat(String(warehouse.total_quantity || 0))
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {(typeof warehouse.available_quantity === 'number'
                            ? warehouse.available_quantity
                            : parseFloat(String(warehouse.available_quantity || 0))
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {(typeof warehouse.reserved_quantity === 'number'
                            ? warehouse.reserved_quantity
                            : parseFloat(String(warehouse.reserved_quantity || 0))
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          $
                          {(typeof warehouse.total_value === 'number'
                            ? warehouse.total_value
                            : parseFloat(String(warehouse.total_value || 0))
                          ).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          {warehouse.low_stock_count > 0 ? (
                            <Badge variant="destructive">
                              {warehouse.low_stock_count} items
                            </Badge>
                          ) : (
                            <Badge variant="default">None</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

