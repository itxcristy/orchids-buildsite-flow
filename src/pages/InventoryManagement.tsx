/**
 * Inventory Management Page
 * Complete inventory management interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Warehouse,
  Package,
  TrendingDown,
  AlertTriangle,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  QrCode,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import {
  getWarehouses,
  createWarehouse,
  getProducts,
  createProduct,
  getInventoryLevels,
  createInventoryTransaction,
  getLowStockAlerts,
  generateProductCode,
  type Warehouse as WarehouseType,
  type Product as ProductType,
  type InventoryLevel,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function InventoryManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();

  // Warehouses
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [showWarehouseDialog, setShowWarehouseDialog] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    contact_person: '',
    phone: '',
    email: '',
    is_primary: false,
  });

  // Products
  const [products, setProducts] = useState<ProductType[]>([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    brand: '',
    unit_of_measure: 'pcs',
    barcode: '',
    weight: '',
    dimensions: '',
    is_trackable: false,
    track_by: 'none' as 'serial' | 'batch' | 'none',
  });

  // Inventory
  const [inventoryLevels, setInventoryLevels] = useState<InventoryLevel[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<InventoryLevel[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Transactions
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    product_id: '',
    variant_id: '',
    warehouse_id: '',
    transaction_type: 'IN' as 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN',
    quantity: '',
    unit_cost: '',
    reference_type: '',
    reference_id: '',
    notes: '',
  });

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      try {
        setInitialLoad(true);
        await Promise.all([
          fetchWarehouses(),
          fetchProducts(),
          fetchLowStockAlerts(),
        ]);
      } catch (error: any) {
        // Error handling is done in individual functions; log summarized error for diagnostics
        logError('Error loading inventory data:', error);
      } finally {
        setInitialLoad(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchInventoryLevels(selectedProduct);
    }
  }, [selectedProduct]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const data = await getWarehouses();
      setWarehouses(data || []);
    } catch (error: any) {
      logError('Error fetching warehouses:', error);
      const errorMessage = error.message || 'Failed to fetch warehouses';
      // Check if it's a network/connection error
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        toast({
          title: 'Connection Error',
          description: 'Unable to connect to the server. Please check your connection and try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryLevels = async (productId: string) => {
    try {
      const data = await getInventoryLevels(productId);
      setInventoryLevels(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch inventory levels',
        variant: 'destructive',
      });
    }
  };

  const fetchLowStockAlerts = async () => {
    try {
      const data = await getLowStockAlerts();
      setLowStockAlerts(data);
    } catch (error: any) {
      logError('Failed to fetch low stock alerts:', error);
    }
  };

  const handleCreateWarehouse = async () => {
    try {
      setLoading(true);
      await createWarehouse(warehouseForm);
      toast({
        title: 'Success',
        description: 'Warehouse created successfully',
      });
      setShowWarehouseDialog(false);
      setWarehouseForm({
        code: '',
        name: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India',
        contact_person: '',
        phone: '',
        email: '',
        is_primary: false,
      });
      fetchWarehouses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create warehouse',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    try {
      setLoading(true);
      // Convert weight from string to number if provided
      const productData: Partial<ProductType> = {
        ...productForm,
        weight: productForm.weight ? parseFloat(productForm.weight) || undefined : undefined,
      };
      await createProduct(productData);
      toast({
        title: 'Success',
        description: 'Product created successfully',
      });
      setShowProductDialog(false);
      setProductForm({
        sku: '',
        name: '',
        description: '',
        category_id: '',
        brand: '',
        unit_of_measure: 'pcs',
        barcode: '',
        weight: '',
        dimensions: '',
        is_trackable: false,
        track_by: 'none',
      });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create product',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async () => {
    try {
      setLoading(true);
      await createInventoryTransaction({
        ...transactionForm,
        quantity: parseFloat(transactionForm.quantity),
        unit_cost: transactionForm.unit_cost ? parseFloat(transactionForm.unit_cost) : undefined,
      });
      toast({
        title: 'Success',
        description: 'Inventory transaction created successfully',
      });
      setShowTransactionDialog(false);
      setTransactionForm({
        product_id: '',
        variant_id: '',
        warehouse_id: '',
        transaction_type: 'IN',
        quantity: '',
        unit_cost: '',
        reference_type: '',
        reference_id: '',
        notes: '',
      });
      if (selectedProduct) {
        fetchInventoryLevels(selectedProduct);
      }
      fetchLowStockAlerts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create transaction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad && loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Manage products, warehouses, and stock levels</p>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{lowStockAlerts.length} product(s) are below reorder point!</strong>
            <Button
              variant="link"
              className="ml-2 p-0 h-auto"
              onClick={() => setActiveTab('alerts')}
            >
              View Alerts
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products.length}</div>
                <p className="text-xs text-muted-foreground">Active products in catalog</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
                <Warehouse className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{warehouses.length}</div>
                <p className="text-xs text-muted-foreground">Active warehouse locations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{lowStockAlerts.length}</div>
                <p className="text-xs text-muted-foreground">Products below reorder point</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Products */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Products</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.slice(0, 5).map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono">{product.sku}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.unit_of_measure}</TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Products</CardTitle>
                  <CardDescription>Manage your product catalog</CardDescription>
                </div>
                <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Product</DialogTitle>
                      <DialogDescription>Add a new product to your catalog</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="sku">SKU *</Label>
                          <Input
                            id="sku"
                            value={productForm.sku}
                            onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                            placeholder="PROD-001"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="name">Product Name *</Label>
                          <Input
                            id="name"
                            value={productForm.name}
                            onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Product Name"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={productForm.description}
                          onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Product description"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="brand">Brand</Label>
                          <Input
                            id="brand"
                            value={productForm.brand}
                            onChange={(e) => setProductForm(prev => ({ ...prev, brand: e.target.value }))}
                            placeholder="Brand name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="unit_of_measure">Unit of Measure</Label>
                          <Select
                            value={productForm.unit_of_measure}
                            onValueChange={(value) => setProductForm(prev => ({ ...prev, unit_of_measure: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pcs">Pieces</SelectItem>
                              <SelectItem value="kg">Kilograms</SelectItem>
                              <SelectItem value="g">Grams</SelectItem>
                              <SelectItem value="l">Liters</SelectItem>
                              <SelectItem value="ml">Milliliters</SelectItem>
                              <SelectItem value="m">Meters</SelectItem>
                              <SelectItem value="cm">Centimeters</SelectItem>
                              <SelectItem value="box">Box</SelectItem>
                              <SelectItem value="pack">Pack</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="barcode">Barcode</Label>
                          <Input
                            id="barcode"
                            value={productForm.barcode}
                            onChange={(e) => setProductForm(prev => ({ ...prev, barcode: e.target.value }))}
                            placeholder="Barcode"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="weight">Weight (kg)</Label>
                          <Input
                            id="weight"
                            type="number"
                            value={productForm.weight}
                            onChange={(e) => setProductForm(prev => ({ ...prev, weight: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="track_by">Tracking Method</Label>
                        <Select
                          value={productForm.track_by}
                          onValueChange={(value: 'serial' | 'batch' | 'none') => {
                            setProductForm(prev => ({
                              ...prev,
                              track_by: value,
                              is_trackable: value !== 'none',
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Tracking</SelectItem>
                            <SelectItem value="serial">Serial Number</SelectItem>
                            <SelectItem value="batch">Batch Number</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowProductDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateProduct} disabled={loading || !productForm.sku || !productForm.name}>
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Product'
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-mono">{product.sku}</TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.brand || '-'}</TableCell>
                          <TableCell>{product.unit_of_measure}</TableCell>
                          <TableCell className="font-mono text-xs">{product.barcode || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={product.is_active ? 'default' : 'secondary'}>
                              {product.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedProduct(product.id);
                                  setActiveTab('transactions');
                                }}
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const code = await generateProductCode(product.id, 'barcode');
                                    toast({
                                      title: 'Success',
                                      description: `Barcode generated: ${code}`,
                                    });
                                    fetchProducts();
                                  } catch (error: any) {
                                    toast({
                                      title: 'Error',
                                      description: error.message,
                                      variant: 'destructive',
                                    });
                                  }
                                }}
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Warehouses</CardTitle>
                  <CardDescription>Manage warehouse locations</CardDescription>
                </div>
                <Dialog open={showWarehouseDialog} onOpenChange={setShowWarehouseDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Warehouse
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Warehouse</DialogTitle>
                      <DialogDescription>Add a new warehouse location</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="warehouse-code">Code *</Label>
                          <Input
                            id="warehouse-code"
                            value={warehouseForm.code}
                            onChange={(e) => setWarehouseForm(prev => ({ ...prev, code: e.target.value }))}
                            placeholder="WH-001"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="warehouse-name">Name *</Label>
                          <Input
                            id="warehouse-name"
                            value={warehouseForm.name}
                            onChange={(e) => setWarehouseForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Main Warehouse"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="warehouse-address">Address</Label>
                        <Input
                          id="warehouse-address"
                          value={warehouseForm.address}
                          onChange={(e) => setWarehouseForm(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Street address"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="warehouse-city">City</Label>
                          <Input
                            id="warehouse-city"
                            value={warehouseForm.city}
                            onChange={(e) => setWarehouseForm(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="City"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="warehouse-state">State</Label>
                          <Input
                            id="warehouse-state"
                            value={warehouseForm.state}
                            onChange={(e) => setWarehouseForm(prev => ({ ...prev, state: e.target.value }))}
                            placeholder="State"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="warehouse-postal">Postal Code</Label>
                          <Input
                            id="warehouse-postal"
                            value={warehouseForm.postal_code}
                            onChange={(e) => setWarehouseForm(prev => ({ ...prev, postal_code: e.target.value }))}
                            placeholder="PIN"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="warehouse-contact">Contact Person</Label>
                          <Input
                            id="warehouse-contact"
                            value={warehouseForm.contact_person}
                            onChange={(e) => setWarehouseForm(prev => ({ ...prev, contact_person: e.target.value }))}
                            placeholder="Contact name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="warehouse-phone">Phone</Label>
                          <Input
                            id="warehouse-phone"
                            value={warehouseForm.phone}
                            onChange={(e) => setWarehouseForm(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+91 98765 43210"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowWarehouseDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateWarehouse} disabled={loading || !warehouseForm.code || !warehouseForm.name}>
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Warehouse'
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouses.map((warehouse) => (
                      <TableRow key={warehouse.id}>
                        <TableCell className="font-mono">{warehouse.code}</TableCell>
                        <TableCell className="font-medium">
                          {warehouse.name}
                          {warehouse.is_primary && (
                            <Badge variant="outline" className="ml-2">Primary</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {warehouse.city && warehouse.state
                            ? `${warehouse.city}, ${warehouse.state}`
                            : warehouse.address || '-'}
                        </TableCell>
                        <TableCell>
                          {warehouse.contact_person || '-'}
                          {warehouse.phone && <div className="text-xs text-muted-foreground">{warehouse.phone}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={warehouse.is_active ? 'default' : 'secondary'}>
                            {warehouse.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Inventory Transactions</CardTitle>
                  <CardDescription>Record stock movements</CardDescription>
                </div>
                <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Transaction
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Inventory Transaction</DialogTitle>
                      <DialogDescription>Record stock in, out, or adjustment</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="transaction-product">Product *</Label>
                        <Select
                          value={transactionForm.product_id}
                          onValueChange={(value) => setTransactionForm(prev => ({ ...prev, product_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.sku} - {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="transaction-warehouse">Warehouse *</Label>
                        <Select
                          value={transactionForm.warehouse_id}
                          onValueChange={(value) => setTransactionForm(prev => ({ ...prev, warehouse_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select warehouse" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.code} - {warehouse.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="transaction-type">Transaction Type *</Label>
                          <Select
                            value={transactionForm.transaction_type}
                            onValueChange={(value: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN') =>
                              setTransactionForm(prev => ({ ...prev, transaction_type: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IN">Stock In</SelectItem>
                              <SelectItem value="OUT">Stock Out</SelectItem>
                              <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                              <SelectItem value="TRANSFER">Transfer</SelectItem>
                              <SelectItem value="RETURN">Return</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="transaction-quantity">Quantity *</Label>
                          <Input
                            id="transaction-quantity"
                            type="number"
                            step="0.01"
                            value={transactionForm.quantity}
                            onChange={(e) => setTransactionForm(prev => ({ ...prev, quantity: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="transaction-cost">Unit Cost</Label>
                        <Input
                          id="transaction-cost"
                          type="number"
                          step="0.01"
                          value={transactionForm.unit_cost}
                          onChange={(e) => setTransactionForm(prev => ({ ...prev, unit_cost: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="transaction-notes">Notes</Label>
                        <Input
                          id="transaction-notes"
                          value={transactionForm.notes}
                          onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Transaction notes"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateTransaction}
                          disabled={loading || !transactionForm.product_id || !transactionForm.warehouse_id || !transactionForm.quantity}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Transaction'
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              </CardHeader>
              <CardContent>
                {selectedProduct ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Inventory Levels</h3>
                      <Button variant="outline" size="sm" onClick={() => setSelectedProduct(null)}>
                        Clear Selection
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Warehouse</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead>Reserved</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Reorder Point</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryLevels.map((level) => (
                          <TableRow key={level.id}>
                            <TableCell>{level.warehouse_name}</TableCell>
                            <TableCell className="font-mono">{level.available_quantity}</TableCell>
                            <TableCell className="font-mono">{level.reserved_quantity}</TableCell>
                            <TableCell className="font-mono font-semibold">{level.quantity}</TableCell>
                            <TableCell className="font-mono">{level.reorder_point}</TableCell>
                            <TableCell>
                              {level.available_quantity <= level.reorder_point ? (
                                <Badge variant="destructive">Low Stock</Badge>
                              ) : (
                                <Badge variant="default">In Stock</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a product from the Products tab to view inventory levels</p>
                  </div>
                )}
              </CardContent>
            </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>Products below reorder point</CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockAlerts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Reorder Point</TableHead>
                      <TableHead>Shortage</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{alert.product_name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{alert.product_sku}</div>
                          </div>
                        </TableCell>
                        <TableCell>{alert.warehouse_name}</TableCell>
                        <TableCell className="font-mono text-orange-500 font-semibold">
                          {alert.available_quantity}
                        </TableCell>
                        <TableCell className="font-mono">{alert.reorder_point}</TableCell>
                        <TableCell className="font-mono text-red-500 font-semibold">
                          {alert.reorder_point > alert.available_quantity 
                            ? `-${alert.reorder_point - alert.available_quantity}` 
                            : '0'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(alert.product_id);
                              setShowTransactionDialog(true);
                              setTransactionForm(prev => ({
                                ...prev,
                                product_id: alert.product_id,
                                warehouse_id: alert.warehouse_id,
                                transaction_type: 'IN',
                              }));
                            }}
                          >
                            Reorder
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>No low stock alerts. All products are above reorder point.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
