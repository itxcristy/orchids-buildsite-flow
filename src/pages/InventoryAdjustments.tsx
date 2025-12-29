/**
 * Inventory Adjustments Page
 * Inventory adjustment and correction management interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Edit,
  Plus,
  Search,
  Loader2,
  Eye,
  Package,
  Warehouse,
  Calendar,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';
import {
  getProducts,
  getWarehouses,
  createAdjustment,
  getInventoryTransactions,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Adjustment {
  id: string;
  product_id: string;
  variant_id?: string;
  warehouse_id: string;
  quantity: number;
  unit_cost?: number;
  reason?: string;
  notes?: string;
  created_at: string;
  product_name?: string;
  product_sku?: string;
  warehouse_name?: string;
  warehouse_code?: string;
  transaction_type?: string;
}

export default function InventoryAdjustments() {
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();

  // Data
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [filteredAdjustments, setFilteredAdjustments] = useState<Adjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [selectedAdjustment, setSelectedAdjustment] = useState<Adjustment | null>(null);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Adjustment form
  const [adjustmentForm, setAdjustmentForm] = useState({
    product_id: '',
    variant_id: '',
    warehouse_id: '',
    quantity: '',
    unit_cost: '',
    reason: '',
    notes: '',
  });

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      try {
        setInitialLoad(true);
        await Promise.all([
          fetchAdjustments(),
          fetchProducts(),
          fetchWarehouses(),
        ]);
      } catch (error: any) {
        console.error('Error loading adjustments data:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load adjustments',
          variant: 'destructive',
        });
      } finally {
        setInitialLoad(false);
      }
    };
    loadData();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = adjustments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(a =>
        a.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.reason?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Product filter
    if (productFilter !== 'all') {
      filtered = filtered.filter(a => a.product_id === productFilter);
    }

    // Warehouse filter
    if (warehouseFilter !== 'all') {
      filtered = filtered.filter(a => a.warehouse_id === warehouseFilter);
    }

    // Type filter (positive/negative adjustment)
    if (typeFilter !== 'all') {
      if (typeFilter === 'increase') {
        filtered = filtered.filter(a => {
          const qty = typeof a.quantity === 'number' ? a.quantity : parseFloat(String(a.quantity || 0));
          return qty > 0;
        });
      } else if (typeFilter === 'decrease') {
        filtered = filtered.filter(a => {
          const qty = typeof a.quantity === 'number' ? a.quantity : parseFloat(String(a.quantity || 0));
          return qty < 0;
        });
      }
    }

    setFilteredAdjustments(filtered);
  }, [adjustments, searchTerm, productFilter, warehouseFilter, typeFilter]);

  const fetchAdjustments = async () => {
    try {
      setLoading(true);
      // Get adjustments from inventory transactions
      const transactions = await getInventoryTransactions({ transaction_type: 'ADJUSTMENT' });
      
      const adjustmentList: Adjustment[] = transactions.map((tx: any) => ({
        id: tx.id,
        product_id: tx.product_id || '',
        variant_id: tx.variant_id,
        warehouse_id: tx.warehouse_id || '',
        quantity: tx.quantity,
        unit_cost: tx.unit_cost,
        reason: tx.notes,
        notes: tx.notes,
        created_at: tx.created_at,
        product_name: tx.product_name,
        product_sku: tx.product_sku,
        warehouse_name: tx.warehouse_name,
        warehouse_code: tx.warehouse_code,
        transaction_type: tx.transaction_type,
      }));

      setAdjustments(adjustmentList);
    } catch (error: any) {
      console.error('Error fetching adjustments:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch adjustments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await getProducts({ is_active: true });
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

  const handleCreateAdjustment = async () => {
    try {
      if (!adjustmentForm.product_id || !adjustmentForm.warehouse_id || !adjustmentForm.quantity) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      if (!adjustmentForm.reason) {
        toast({
          title: 'Validation Error',
          description: 'Please provide a reason for this adjustment',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);
      await createAdjustment({
        product_id: adjustmentForm.product_id,
        variant_id: adjustmentForm.variant_id || undefined,
        warehouse_id: adjustmentForm.warehouse_id,
        quantity: parseFloat(adjustmentForm.quantity) || 0,
        unit_cost: adjustmentForm.unit_cost ? parseFloat(adjustmentForm.unit_cost) : undefined,
        reason: adjustmentForm.reason,
        notes: adjustmentForm.notes || undefined,
      });

      toast({
        title: 'Success',
        description: 'Adjustment created successfully',
      });

      setShowAdjustmentDialog(false);
      resetForm();
      fetchAdjustments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create adjustment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewAdjustment = (adjustment: Adjustment) => {
    setSelectedAdjustment(adjustment);
    setShowViewDialog(true);
  };

  const resetForm = () => {
    setAdjustmentForm({
      product_id: '',
      variant_id: '',
      warehouse_id: '',
      quantity: '',
      unit_cost: '',
      reason: '',
      notes: '',
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setShowAdjustmentDialog(true);
  };

  // Calculate statistics
  const totalAdjustments = adjustments.length;
  const increaseCount = adjustments.filter(a => {
    const qty = typeof a.quantity === 'number' ? a.quantity : parseFloat(String(a.quantity || 0));
    return qty > 0;
  }).length;
  const decreaseCount = adjustments.filter(a => {
    const qty = typeof a.quantity === 'number' ? a.quantity : parseFloat(String(a.quantity || 0));
    return qty < 0;
  }).length;
  const totalQuantityChange = adjustments.reduce((sum, a) => {
    const qty = typeof a.quantity === 'number' ? a.quantity : parseFloat(String(a.quantity || 0));
    return sum + (isNaN(qty) ? 0 : qty);
  }, 0);

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
          <h1 className="text-3xl font-bold">Inventory Adjustments</h1>
          <p className="text-muted-foreground mt-1">
            Manage inventory adjustments and corrections
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Adjustment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Adjustments</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAdjustments}</div>
            <p className="text-xs text-muted-foreground">
              All time adjustments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Increases</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{increaseCount}</div>
            <p className="text-xs text-muted-foreground">
              Stock increases
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Decreases</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{decreaseCount}</div>
            <p className="text-xs text-muted-foreground">
              Stock decreases
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Change</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalQuantityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalQuantityChange >= 0 ? '+' : ''}{totalQuantityChange.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total quantity change
            </p>
          </CardContent>
        </Card>
      </div>

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
                  placeholder="Search adjustments..."
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
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="increase">Increases Only</SelectItem>
                  <SelectItem value="decrease">Decreases Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adjustments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Adjustments ({filteredAdjustments.length})</CardTitle>
          <CardDescription>
            Inventory adjustments and corrections
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && filteredAdjustments.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredAdjustments.length === 0 ? (
            <Alert>
              <AlertDescription>
                No adjustments found. {searchTerm || productFilter !== 'all' || warehouseFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Create your first adjustment to get started.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Quantity Change</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdjustments.map((adjustment) => {
                    const qty = typeof adjustment.quantity === 'number' ? adjustment.quantity : parseFloat(String(adjustment.quantity || 0));
                    const isIncrease = qty > 0;
                    
                    return (
                      <TableRow key={adjustment.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{adjustment.product_name || 'N/A'}</span>
                            {adjustment.product_sku && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {adjustment.product_sku}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Warehouse className="h-4 w-4 mr-2 text-muted-foreground" />
                            {adjustment.warehouse_name || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`font-medium flex items-center justify-end ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                            {isIncrease ? (
                              <TrendingUp className="h-4 w-4 mr-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 mr-1" />
                            )}
                            {isIncrease ? '+' : ''}{qty.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {adjustment.unit_cost
                            ? (typeof adjustment.unit_cost === 'number' ? adjustment.unit_cost : parseFloat(String(adjustment.unit_cost || 0))).toLocaleString('en-IN', {
                                style: 'currency',
                                currency: 'INR',
                              })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={adjustment.reason || adjustment.notes || 'N/A'}>
                            {adjustment.reason || adjustment.notes || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(adjustment.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewAdjustment(adjustment)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Create Adjustment Dialog */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Inventory Adjustment</DialogTitle>
            <DialogDescription>
              Adjust inventory quantity (use positive for increase, negative for decrease)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={adjustmentForm.product_id}
                onValueChange={(value) => setAdjustmentForm({ ...adjustmentForm, product_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="warehouse">Warehouse *</Label>
              <Select
                value={adjustmentForm.warehouse_id}
                onValueChange={(value) => setAdjustmentForm({ ...adjustmentForm, warehouse_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity Change *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={adjustmentForm.quantity}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: e.target.value })}
                  placeholder="+10 or -5"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use positive for increase, negative for decrease
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit_cost">Unit Cost</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  value={adjustmentForm.unit_cost}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, unit_cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason *</Label>
              <Input
                id="reason"
                value={adjustmentForm.reason}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                placeholder="e.g., Stock count correction, Damage, Found stock"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={adjustmentForm.notes}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })}
                placeholder="Additional details about this adjustment"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustmentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdjustment} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Adjustment Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adjustment Details</DialogTitle>
            <DialogDescription>
              View complete adjustment information
            </DialogDescription>
          </DialogHeader>
          {selectedAdjustment && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Product</Label>
                <div>
                  <p className="font-medium">{selectedAdjustment.product_name || 'N/A'}</p>
                  {selectedAdjustment.product_sku && (
                    <p className="text-sm text-muted-foreground font-mono">
                      SKU: {selectedAdjustment.product_sku}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Warehouse</Label>
                <div className="flex items-center">
                  <Warehouse className="h-4 w-4 mr-2 text-muted-foreground" />
                  <p>{selectedAdjustment.warehouse_name || 'N/A'}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Quantity Change</Label>
                  {(() => {
                    const qty = typeof selectedAdjustment.quantity === 'number' ? selectedAdjustment.quantity : parseFloat(String(selectedAdjustment.quantity || 0));
                    const isIncrease = qty > 0;
                    return (
                      <p className={`font-medium text-lg flex items-center ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                        {isIncrease ? (
                          <TrendingUp className="h-5 w-5 mr-1" />
                        ) : (
                          <TrendingDown className="h-5 w-5 mr-1" />
                        )}
                        {isIncrease ? '+' : ''}{qty.toLocaleString()}
                      </p>
                    );
                  })()}
                </div>
                {selectedAdjustment.unit_cost && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Unit Cost</Label>
                    <p className="font-medium">
                      {(typeof selectedAdjustment.unit_cost === 'number' ? selectedAdjustment.unit_cost : parseFloat(String(selectedAdjustment.unit_cost || 0))).toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      })}
                    </p>
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Reason</Label>
                <p className="text-sm">{selectedAdjustment.reason || 'N/A'}</p>
              </div>
              {selectedAdjustment.notes && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedAdjustment.notes}</p>
                </div>
              )}
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Date</Label>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <p>{new Date(selectedAdjustment.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

