/**
 * Inventory Stock Levels Page
 * Real-time stock tracking and inventory visibility
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Warehouse,
  Filter,
  Download,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  getProducts,
  getWarehouses,
  getInventoryLevels,
  getLowStockAlerts,
  type Product,
  type Warehouse as WarehouseType,
} from '@/services/api/inventory-service';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface InventoryLevel {
  id: string;
  product_id: string;
  variant_id?: string;
  warehouse_id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  reorder_point: number;
  reorder_quantity: number;
  product_name: string;
  product_sku: string;
  warehouse_name: string;
  warehouse_code: string;
}

interface LowStockAlert {
  id: string;
  product_id: string;
  warehouse_id: string;
  product_name: string;
  product_sku: string;
  warehouse_name: string;
  available_quantity: number;
  reorder_point: number;
  shortage: number;
}

export default function InventoryStockLevels() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();

  // Data
  const [inventoryLevels, setInventoryLevels] = useState<InventoryLevel[]>([]);
  const [filteredLevels, setFilteredLevels] = useState<InventoryLevel[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);

  // Filters
  const [productFilter, setProductFilter] = useState<string>(
    searchParams.get('product') || 'all'
  );
  const [warehouseFilter, setWarehouseFilter] = useState<string>(
    searchParams.get('warehouse') || 'all'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'low-stock' | 'out-of-stock'>('all');

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      try {
        setInitialLoad(true);
        await Promise.all([
          fetchInventoryLevels(),
          fetchLowStockAlerts(),
          fetchProducts(),
          fetchWarehouses(),
        ]);
      } catch (error: any) {
        console.error('Error loading stock data:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load stock levels',
          variant: 'destructive',
        });
      } finally {
        setInitialLoad(false);
      }
    };
    loadData();
  }, [productFilter, warehouseFilter]);

  // Apply filters
  useEffect(() => {
    let filtered = inventoryLevels;

    // Product filter
    if (productFilter !== 'all') {
      filtered = filtered.filter(level => level.product_id === productFilter);
    }

    // Warehouse filter
    if (warehouseFilter !== 'all') {
      filtered = filtered.filter(level => level.warehouse_id === warehouseFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(level =>
        level.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        level.product_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        level.warehouse_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // View mode filter
    if (viewMode === 'low-stock') {
      filtered = filtered.filter(level => 
        level.available_quantity <= level.reorder_point && level.reorder_point > 0
      );
    } else if (viewMode === 'out-of-stock') {
      filtered = filtered.filter(level => level.available_quantity <= 0);
    }

    setFilteredLevels(filtered);
  }, [inventoryLevels, productFilter, warehouseFilter, searchTerm, viewMode]);

  const fetchInventoryLevels = async () => {
    try {
      setLoading(true);
      let levels: InventoryLevel[] = [];

      if (productFilter !== 'all') {
        // Get levels for specific product
        const productLevels = await getInventoryLevels(productFilter);
        levels = productLevels as any;
      } else {
        // Get all products and their levels
        const allProducts = await getProducts();
        const allLevels: InventoryLevel[] = [];

        for (const product of allProducts) {
          try {
            const productLevels = await getInventoryLevels(product.id);
            if (Array.isArray(productLevels)) {
              allLevels.push(...(productLevels as any));
            }
          } catch (error) {
            // Product might not have inventory levels yet
            console.warn(`No inventory levels for product ${product.id}`);
          }
        }

        levels = allLevels;
      }

      setInventoryLevels(levels);
    } catch (error: any) {
      console.error('Error fetching inventory levels:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch inventory levels',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStockAlerts = async () => {
    try {
      const alerts = await getLowStockAlerts();
      setLowStockAlerts(alerts as any);
    } catch (error: any) {
      console.error('Error fetching low stock alerts:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const data = await getWarehouses();
      setWarehouses(data || []);
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const handleRefresh = () => {
    fetchInventoryLevels();
    fetchLowStockAlerts();
    toast({
      title: 'Refreshed',
      description: 'Stock levels updated',
    });
  };

  // Calculate statistics
  const totalValue = inventoryLevels.reduce((sum, level) => {
    // This would need unit cost from products - simplified for now
    return sum + level.quantity;
  }, 0);

  const lowStockCount = inventoryLevels.filter(
    level => level.available_quantity <= level.reorder_point && level.reorder_point > 0
  ).length;

  const outOfStockCount = inventoryLevels.filter(
    level => level.available_quantity <= 0
  ).length;

  const totalProducts = new Set(inventoryLevels.map(level => level.product_id)).size;

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Levels</h1>
          <p className="text-muted-foreground mt-1">
            Real-time inventory tracking and stock visibility
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Products with inventory
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Below reorder point
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Zero inventory
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryLevels.reduce((sum, level) => {
                const qty = typeof level.quantity === 'number' ? level.quantity : parseFloat(String(level.quantity || 0));
                return sum + (isNaN(qty) ? 0 : qty);
              }, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Units across all warehouses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>{lowStockAlerts.length} products</strong> are below reorder point and need restocking.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>View Mode</Label>
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Levels Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Levels ({filteredLevels.length})</CardTitle>
          <CardDescription>
            Current stock levels across all warehouses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && filteredLevels.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredLevels.length === 0 ? (
            <Alert>
              <AlertDescription>
                No inventory levels found. {searchTerm || productFilter !== 'all' || warehouseFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Products will appear here once inventory is added.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Reorder Point</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLevels.map((level) => {
                    const isLowStock = level.available_quantity <= level.reorder_point && level.reorder_point > 0;
                    const isOutOfStock = level.available_quantity <= 0;
                    const status = isOutOfStock ? 'out-of-stock' : isLowStock ? 'low-stock' : 'in-stock';

                    return (
                      <TableRow key={level.id}>
                        <TableCell className="font-medium">{level.product_name}</TableCell>
                        <TableCell className="font-mono text-sm">{level.product_sku}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Warehouse className="h-4 w-4 mr-2 text-muted-foreground" />
                            {level.warehouse_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {(typeof level.available_quantity === 'number' ? level.available_quantity : parseFloat(String(level.available_quantity || 0))).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {(typeof level.reserved_quantity === 'number' ? level.reserved_quantity : parseFloat(String(level.reserved_quantity || 0))).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {(typeof level.quantity === 'number' ? level.quantity : parseFloat(String(level.quantity || 0))).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const reorderPoint = typeof level.reorder_point === 'number' ? level.reorder_point : parseFloat(String(level.reorder_point || 0));
                            return reorderPoint > 0 ? reorderPoint.toLocaleString() : '-';
                          })()}
                        </TableCell>
                        <TableCell>
                          {status === 'out-of-stock' && (
                            <Badge variant="destructive">Out of Stock</Badge>
                          )}
                          {status === 'low-stock' && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                              Low Stock
                            </Badge>
                          )}
                          {status === 'in-stock' && (
                            <Badge variant="default">In Stock</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Alerts Table */}
      {lowStockAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
              Low Stock Alerts ({lowStockAlerts.length})
            </CardTitle>
            <CardDescription>
              Products that need immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Reorder Point</TableHead>
                    <TableHead className="text-right">Shortage</TableHead>
                    <TableHead className="text-right">Reorder Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.product_name}</TableCell>
                      <TableCell className="font-mono text-sm">{alert.product_sku}</TableCell>
                      <TableCell>{alert.warehouse_name}</TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {(typeof alert.available_quantity === 'number' ? alert.available_quantity : parseFloat(String(alert.available_quantity || 0))).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {(typeof alert.reorder_point === 'number' ? alert.reorder_point : parseFloat(String(alert.reorder_point || 0))).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {(typeof alert.shortage === 'number' ? alert.shortage : parseFloat(String(alert.shortage || 0))).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {/* This would come from inventory level */}
                        -
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

