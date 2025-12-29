/**
 * Inventory Serial/Batch Tracking Page
 * Complete serial number and batch tracking interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Hash,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Eye,
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import {
  getSerialNumbers,
  createSerialNumber,
  updateSerialNumber,
  deleteSerialNumber,
  getBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  getProducts,
  getWarehouses,
  type SerialNumber,
  type Batch,
  type Product,
  type Warehouse,
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function InventorySerialBatch() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'serial' | 'batch'>('serial');
  
  // Serial Numbers State
  const [serialNumbers, setSerialNumbers] = useState<SerialNumber[]>([]);
  const [serialLoading, setSerialLoading] = useState(true);
  const [serialSearch, setSerialSearch] = useState('');
  const [serialFilterProduct, setSerialFilterProduct] = useState<string>('all');
  const [serialFilterWarehouse, setSerialFilterWarehouse] = useState<string>('all');
  const [serialFilterStatus, setSerialFilterStatus] = useState<string>('all');
  const [isSerialDialogOpen, setIsSerialDialogOpen] = useState(false);
  const [isSerialViewDialogOpen, setIsSerialViewDialogOpen] = useState(false);
  const [selectedSerial, setSelectedSerial] = useState<SerialNumber | null>(null);
  const [isSerialSubmitting, setIsSerialSubmitting] = useState(false);
  
  // Batches State
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchLoading, setBatchLoading] = useState(true);
  const [batchSearch, setBatchSearch] = useState('');
  const [batchFilterProduct, setBatchFilterProduct] = useState<string>('all');
  const [batchFilterWarehouse, setBatchFilterWarehouse] = useState<string>('all');
  const [batchFilterStatus, setBatchFilterStatus] = useState<string>('all');
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [isBatchViewDialogOpen, setIsBatchViewDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  
  // Shared State
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Form state
  const [serialFormData, setSerialFormData] = useState<Partial<SerialNumber>>({
    product_id: '',
    serial_number: '',
    warehouse_id: '',
    status: 'available',
    notes: '',
  });

  const [batchFormData, setBatchFormData] = useState<Partial<Batch>>({
    product_id: '',
    batch_number: '',
    warehouse_id: '',
    quantity: 0,
    manufacture_date: '',
    expiry_date: '',
    cost_per_unit: 0,
    status: 'active',
    notes: '',
  });

  useEffect(() => {
    loadProducts();
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (activeTab === 'serial') {
      loadSerialNumbers();
    } else {
      loadBatches();
    }
  }, [activeTab, serialFilterProduct, serialFilterWarehouse, serialFilterStatus, batchFilterProduct, batchFilterWarehouse, batchFilterStatus]);

  const loadProducts = async () => {
    try {
      setProductsLoading(true);
      const data = await getProducts({ is_active: true });
      setProducts(data);
    } catch (error: any) {
      console.error('Failed to load products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const loadWarehouses = async () => {
    try {
      const data = await getWarehouses();
      setWarehouses(data.filter((w) => w.is_active));
    } catch (error: any) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const loadSerialNumbers = async () => {
    try {
      setSerialLoading(true);
      const filters: any = {};
      if (serialFilterProduct !== 'all') filters.product_id = serialFilterProduct;
      if (serialFilterWarehouse !== 'all') filters.warehouse_id = serialFilterWarehouse;
      if (serialFilterStatus !== 'all') filters.status = serialFilterStatus;
      if (serialSearch) filters.search = serialSearch;

      const data = await getSerialNumbers(filters);
      setSerialNumbers(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load serial numbers',
        variant: 'destructive',
      });
    } finally {
      setSerialLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      setBatchLoading(true);
      const filters: any = {};
      if (batchFilterProduct !== 'all') filters.product_id = batchFilterProduct;
      if (batchFilterWarehouse !== 'all') filters.warehouse_id = batchFilterWarehouse;
      if (batchFilterStatus !== 'all') filters.status = batchFilterStatus;
      if (batchSearch) filters.search = batchSearch;

      const data = await getBatches(filters);
      setBatches(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load batches',
        variant: 'destructive',
      });
    } finally {
      setBatchLoading(false);
    }
  };

  // Serial Number Handlers
  const handleCreateSerial = () => {
    setSerialFormData({
      product_id: '',
      serial_number: '',
      warehouse_id: '',
      status: 'available',
      notes: '',
    });
    setSelectedSerial(null);
    setIsSerialDialogOpen(true);
  };

  const handleEditSerial = (serial: SerialNumber) => {
    setSerialFormData({
      ...serial,
    });
    setSelectedSerial(serial);
    setIsSerialDialogOpen(true);
  };

  const handleViewSerial = (serial: SerialNumber) => {
    setSelectedSerial(serial);
    setIsSerialViewDialogOpen(true);
  };

  const handleDeleteSerial = async (serial: SerialNumber) => {
    if (!confirm(`Are you sure you want to delete serial number "${serial.serial_number}"?`)) {
      return;
    }

    try {
      await deleteSerialNumber(serial.id);
      toast({
        title: 'Success',
        description: 'Serial number deleted successfully',
      });
      loadSerialNumbers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete serial number',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialFormData.product_id || !serialFormData.serial_number) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSerialSubmitting(true);
      if (selectedSerial) {
        await updateSerialNumber(selectedSerial.id, serialFormData);
        toast({
          title: 'Success',
          description: 'Serial number updated successfully',
        });
      } else {
        await createSerialNumber(serialFormData);
        toast({
          title: 'Success',
          description: 'Serial number created successfully',
        });
      }
      setIsSerialDialogOpen(false);
      loadSerialNumbers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save serial number',
        variant: 'destructive',
      });
    } finally {
      setIsSerialSubmitting(false);
    }
  };

  // Batch Handlers
  const handleCreateBatch = () => {
    setBatchFormData({
      product_id: '',
      batch_number: '',
      warehouse_id: '',
      quantity: 0,
      manufacture_date: '',
      expiry_date: '',
      cost_per_unit: 0,
      status: 'active',
      notes: '',
    });
    setSelectedBatch(null);
    setIsBatchDialogOpen(true);
  };

  const handleEditBatch = (batch: Batch) => {
    setBatchFormData({
      ...batch,
    });
    setSelectedBatch(batch);
    setIsBatchDialogOpen(true);
  };

  const handleViewBatch = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsBatchViewDialogOpen(true);
  };

  const handleDeleteBatch = async (batch: Batch) => {
    if (!confirm(`Are you sure you want to delete batch "${batch.batch_number}"?`)) {
      return;
    }

    try {
      await deleteBatch(batch.id);
      toast({
        title: 'Success',
        description: 'Batch deleted successfully',
      });
      loadBatches();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete batch',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchFormData.product_id || !batchFormData.batch_number) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsBatchSubmitting(true);
      if (selectedBatch) {
        await updateBatch(selectedBatch.id, batchFormData);
        toast({
          title: 'Success',
          description: 'Batch updated successfully',
        });
      } else {
        await createBatch(batchFormData);
        toast({
          title: 'Success',
          description: 'Batch created successfully',
        });
      }
      setIsBatchDialogOpen(false);
      loadBatches();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save batch',
        variant: 'destructive',
      });
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  const getSerialStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      available: 'default',
      reserved: 'outline',
      sold: 'secondary',
      returned: 'outline',
      damaged: 'destructive',
    };
    const icons: Record<string, any> = {
      available: CheckCircle2,
      reserved: Clock,
      sold: Package,
      returned: XCircle,
      damaged: AlertTriangle,
    };
    const Icon = icons[status] || CheckCircle2;
    return (
      <Badge variant={variants[status] || 'outline'}>
        <Icon className="mr-1 h-3 w-3" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getBatchStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      expired: 'destructive',
      consumed: 'secondary',
      damaged: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const serialStats = {
    total: serialNumbers.length,
    available: serialNumbers.filter((s) => s.status === 'available').length,
    reserved: serialNumbers.filter((s) => s.status === 'reserved').length,
    sold: serialNumbers.filter((s) => s.status === 'sold').length,
  };

  const batchStats = {
    total: batches.length,
    active: batches.filter((b) => b.status === 'active').length,
    expired: batches.filter((b) => b.status === 'expired').length,
    totalQuantity: batches.reduce((sum, b) => {
      const qty = typeof b.quantity === 'number' ? b.quantity : parseFloat(String(b.quantity || 0));
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0),
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Serial & Batch Tracking</h1>
          <p className="text-muted-foreground">Manage serial numbers and batch tracking</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'serial' | 'batch')}>
        <TabsList>
          <TabsTrigger value="serial">Serial Numbers</TabsTrigger>
          <TabsTrigger value="batch">Batches</TabsTrigger>
        </TabsList>

        {/* Serial Numbers Tab */}
        <TabsContent value="serial" className="space-y-6">
          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Serial Numbers</CardTitle>
                <Hash className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{serialStats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{serialStats.available}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reserved</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{serialStats.reserved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sold</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{serialStats.sold}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search serial numbers..."
                      value={serialSearch}
                      onChange={(e) => setSerialSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadSerialNumbers()}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select value={serialFilterProduct} onValueChange={setSerialFilterProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.sku} - {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Warehouse</Label>
                  <Select value={serialFilterWarehouse} onValueChange={setSerialFilterWarehouse}>
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
                  <Label>Status</Label>
                  <Select value={serialFilterStatus} onValueChange={setSerialFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreateSerial} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Serial
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Serial Numbers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Serial Numbers</CardTitle>
              <CardDescription>Manage all serial number tracking</CardDescription>
            </CardHeader>
            <CardContent>
              {serialLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : serialNumbers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No serial numbers found. Create your first serial number to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serialNumbers.map((serial) => (
                      <TableRow key={serial.id}>
                        <TableCell className="font-mono font-medium">{serial.serial_number}</TableCell>
                        <TableCell>
                          {serial.product_name ? (
                            <div>
                              <div className="font-mono text-sm">{serial.product_sku}</div>
                              <div className="text-sm text-muted-foreground">{serial.product_name}</div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {serial.warehouse_name ? (
                            <div>
                              <div className="font-mono text-sm">{serial.warehouse_code}</div>
                              <div className="text-sm text-muted-foreground">{serial.warehouse_name}</div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{getSerialStatusBadge(serial.status)}</TableCell>
                        <TableCell>
                          {new Date(serial.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewSerial(serial)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSerial(serial)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSerial(serial)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batches Tab */}
        <TabsContent value="batch" className="space-y-6">
          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{batchStats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{batchStats.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expired</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{batchStats.expired}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
                <Hash className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(typeof batchStats.totalQuantity === 'number' ? batchStats.totalQuantity : parseFloat(String(batchStats.totalQuantity || 0))).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search batches..."
                      value={batchSearch}
                      onChange={(e) => setBatchSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadBatches()}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select value={batchFilterProduct} onValueChange={setBatchFilterProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.sku} - {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Warehouse</Label>
                  <Select value={batchFilterWarehouse} onValueChange={setBatchFilterWarehouse}>
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
                  <Label>Status</Label>
                  <Select value={batchFilterStatus} onValueChange={setBatchFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="consumed">Consumed</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreateBatch} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Batch
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Batches Table */}
          <Card>
            <CardHeader>
              <CardTitle>Batches</CardTitle>
              <CardDescription>Manage all batch tracking</CardDescription>
            </CardHeader>
            <CardContent>
              {batchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No batches found. Create your first batch to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-mono font-medium">{batch.batch_number}</TableCell>
                        <TableCell>
                          {batch.product_name ? (
                            <div>
                              <div className="font-mono text-sm">{batch.product_sku}</div>
                              <div className="text-sm text-muted-foreground">{batch.product_name}</div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {batch.warehouse_name ? (
                            <div>
                              <div className="font-mono text-sm">{batch.warehouse_code}</div>
                              <div className="text-sm text-muted-foreground">{batch.warehouse_name}</div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {(typeof batch.quantity === 'number' ? batch.quantity : parseFloat(String(batch.quantity || 0))).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {batch.expiry_date ? (
                            <div className="flex items-center gap-2">
                              {new Date(batch.expiry_date) < new Date() && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                              {new Date(batch.expiry_date).toLocaleDateString()}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{getBatchStatusBadge(batch.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewBatch(batch)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditBatch(batch)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBatch(batch)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Serial Number Create/Edit Dialog */}
      <Dialog open={isSerialDialogOpen} onOpenChange={setIsSerialDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSerial ? 'Edit Serial Number' : 'Create Serial Number'}
            </DialogTitle>
            <DialogDescription>
              {selectedSerial
                ? 'Update serial number details'
                : 'Create a new serial number record'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitSerial}>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="product_id">Product *</Label>
                  <Select
                    value={serialFormData.product_id || ''}
                    onValueChange={(value) => setSerialFormData({ ...serialFormData, product_id: value })}
                    disabled={!!selectedSerial}
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
                  <Label htmlFor="serial_number">Serial Number *</Label>
                  <Input
                    id="serial_number"
                    value={serialFormData.serial_number || ''}
                    onChange={(e) => setSerialFormData({ ...serialFormData, serial_number: e.target.value })}
                    placeholder="Enter serial number"
                    disabled={!!selectedSerial}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="warehouse_id">Warehouse</Label>
                  <Select
                    value={serialFormData.warehouse_id || ''}
                    onValueChange={(value) => setSerialFormData({ ...serialFormData, warehouse_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.code} - {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={serialFormData.status || 'available'}
                    onValueChange={(value: any) => setSerialFormData({ ...serialFormData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={serialFormData.notes || ''}
                  onChange={(e) => setSerialFormData({ ...serialFormData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsSerialDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSerialSubmitting}>
                {isSerialSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedSerial ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Serial Number View Dialog */}
      <Dialog open={isSerialViewDialogOpen} onOpenChange={setIsSerialViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Serial Number Details</DialogTitle>
            <DialogDescription>View serial number information</DialogDescription>
          </DialogHeader>
          {selectedSerial && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Serial Number</Label>
                  <div className="mt-1 font-mono font-medium">{selectedSerial.serial_number}</div>
                </div>
                <div>
                  <Label>Product</Label>
                  <div className="mt-1">
                    {selectedSerial.product_name ? (
                      <div>
                        <div className="font-mono text-sm">{selectedSerial.product_sku}</div>
                        <div className="text-sm text-muted-foreground">{selectedSerial.product_name}</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                <div>
                  <Label>Warehouse</Label>
                  <div className="mt-1">
                    {selectedSerial.warehouse_name ? (
                      <div>
                        <div className="font-mono text-sm">{selectedSerial.warehouse_code}</div>
                        <div className="text-sm text-muted-foreground">{selectedSerial.warehouse_name}</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getSerialStatusBadge(selectedSerial.status)}</div>
                </div>
                {selectedSerial.notes && (
                  <div className="md:col-span-2">
                    <Label>Notes</Label>
                    <div className="mt-1">{selectedSerial.notes}</div>
                  </div>
                )}
                <div>
                  <Label>Created</Label>
                  <div className="mt-1">
                    {new Date(selectedSerial.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSerialViewDialogOpen(false)}>
              Close
            </Button>
            {selectedSerial && (
              <Button
                onClick={() => {
                  setIsSerialViewDialogOpen(false);
                  handleEditSerial(selectedSerial);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Create/Edit Dialog */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedBatch ? 'Edit Batch' : 'Create Batch'}
            </DialogTitle>
            <DialogDescription>
              {selectedBatch
                ? 'Update batch details'
                : 'Create a new batch record'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitBatch}>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="batch_product_id">Product *</Label>
                  <Select
                    value={batchFormData.product_id || ''}
                    onValueChange={(value) => setBatchFormData({ ...batchFormData, product_id: value })}
                    disabled={!!selectedBatch}
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
                  <Label htmlFor="batch_number">Batch Number *</Label>
                  <Input
                    id="batch_number"
                    value={batchFormData.batch_number || ''}
                    onChange={(e) => setBatchFormData({ ...batchFormData, batch_number: e.target.value })}
                    placeholder="Enter batch number"
                    disabled={!!selectedBatch}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="warehouse_id_batch">Warehouse</Label>
                  <Select
                    value={batchFormData.warehouse_id || ''}
                    onValueChange={(value) => setBatchFormData({ ...batchFormData, warehouse_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.code} - {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    value={batchFormData.quantity || 0}
                    onChange={(e) =>
                      setBatchFormData({ ...batchFormData, quantity: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="manufacture_date">Manufacture Date</Label>
                  <Input
                    id="manufacture_date"
                    type="date"
                    value={batchFormData.manufacture_date || ''}
                    onChange={(e) => setBatchFormData({ ...batchFormData, manufacture_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={batchFormData.expiry_date || ''}
                    onChange={(e) => setBatchFormData({ ...batchFormData, expiry_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_per_unit">Cost Per Unit</Label>
                  <Input
                    id="cost_per_unit"
                    type="number"
                    step="0.01"
                    value={batchFormData.cost_per_unit || 0}
                    onChange={(e) =>
                      setBatchFormData({ ...batchFormData, cost_per_unit: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status_batch">Status</Label>
                <Select
                  value={batchFormData.status || 'active'}
                  onValueChange={(value: any) => setBatchFormData({ ...batchFormData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="consumed">Consumed</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes_batch">Notes</Label>
                <Textarea
                  id="notes_batch"
                  value={batchFormData.notes || ''}
                  onChange={(e) => setBatchFormData({ ...batchFormData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsBatchDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isBatchSubmitting}>
                {isBatchSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedBatch ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Batch View Dialog */}
      <Dialog open={isBatchViewDialogOpen} onOpenChange={setIsBatchViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Batch Details</DialogTitle>
            <DialogDescription>View batch information</DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Batch Number</Label>
                  <div className="mt-1 font-mono font-medium">{selectedBatch.batch_number}</div>
                </div>
                <div>
                  <Label>Product</Label>
                  <div className="mt-1">
                    {selectedBatch.product_name ? (
                      <div>
                        <div className="font-mono text-sm">{selectedBatch.product_sku}</div>
                        <div className="text-sm text-muted-foreground">{selectedBatch.product_name}</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                <div>
                  <Label>Warehouse</Label>
                  <div className="mt-1">
                    {selectedBatch.warehouse_name ? (
                      <div>
                        <div className="font-mono text-sm">{selectedBatch.warehouse_code}</div>
                        <div className="text-sm text-muted-foreground">{selectedBatch.warehouse_name}</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <div className="mt-1">
                    {(typeof selectedBatch.quantity === 'number' ? selectedBatch.quantity : parseFloat(String(selectedBatch.quantity || 0))).toLocaleString()}
                  </div>
                </div>
                {selectedBatch.manufacture_date && (
                  <div>
                    <Label>Manufacture Date</Label>
                    <div className="mt-1">
                      {new Date(selectedBatch.manufacture_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {selectedBatch.expiry_date && (
                  <div>
                    <Label>Expiry Date</Label>
                    <div className="mt-1 flex items-center gap-2">
                      {new Date(selectedBatch.expiry_date) < new Date() && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      {new Date(selectedBatch.expiry_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {selectedBatch.cost_per_unit && (
                  <div>
                    <Label>Cost Per Unit</Label>
                    <div className="mt-1">
                      $
                      {(typeof selectedBatch.cost_per_unit === 'number'
                        ? selectedBatch.cost_per_unit
                        : parseFloat(String(selectedBatch.cost_per_unit || 0))
                      ).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getBatchStatusBadge(selectedBatch.status)}</div>
                </div>
                {selectedBatch.notes && (
                  <div className="md:col-span-2">
                    <Label>Notes</Label>
                    <div className="mt-1">{selectedBatch.notes}</div>
                  </div>
                )}
                <div>
                  <Label>Created</Label>
                  <div className="mt-1">
                    {new Date(selectedBatch.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchViewDialogOpen(false)}>
              Close
            </Button>
            {selectedBatch && (
              <Button
                onClick={() => {
                  setIsBatchViewDialogOpen(false);
                  handleEditBatch(selectedBatch);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

