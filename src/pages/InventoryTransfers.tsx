/**
 * Inventory Transfers Page
 * Inter-warehouse transfer management interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowRightLeft,
  Plus,
  Search,
  Loader2,
  Eye,
  Package,
  Warehouse,
  Calendar,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import {
  getProducts,
  getWarehouses,
  createTransfer,
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

interface Transfer {
  id: string;
  product_id: string;
  variant_id?: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  quantity: number;
  notes?: string;
  created_at: string;
  product_name?: string;
  product_sku?: string;
  from_warehouse_name?: string;
  to_warehouse_name?: string;
  status?: string;
}

interface InventoryTransaction {
  id: string;
  inventory_id: string;
  transaction_type: string;
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  notes?: string;
  created_at: string;
  product_name?: string;
  product_sku?: string;
  warehouse_name?: string;
  warehouse_code?: string;
}

export default function InventoryTransfers() {
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();

  // Data
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');

  // Transfer form
  const [transferForm, setTransferForm] = useState({
    product_id: '',
    variant_id: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    quantity: '',
    notes: '',
  });

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      try {
        setInitialLoad(true);
        await Promise.all([
          fetchTransfers(),
          fetchProducts(),
          fetchWarehouses(),
        ]);
      } catch (error: any) {
        console.error('Error loading transfers data:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load transfers',
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
    let filtered = transfers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.from_warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.to_warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Product filter
    if (productFilter !== 'all') {
      filtered = filtered.filter(t => t.product_id === productFilter);
    }

    // Warehouse filter
    if (warehouseFilter !== 'all') {
      filtered = filtered.filter(t =>
        t.from_warehouse_id === warehouseFilter || t.to_warehouse_id === warehouseFilter
      );
    }

    setFilteredTransfers(filtered);
  }, [transfers, searchTerm, productFilter, warehouseFilter]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      // Get transfers from inventory transactions
      const transactions = await getInventoryTransactions({ transaction_type: 'TRANSFER' });
      
      // Group transactions by reference_id to create transfer pairs
      const transferMap = new Map<string, any>();
      
      transactions.forEach((tx: InventoryTransaction) => {
        if (tx.reference_id) {
          if (!transferMap.has(tx.reference_id)) {
            transferMap.set(tx.reference_id, {
              id: tx.reference_id,
              product_id: tx.product_name ? '' : '',
              from_warehouse_id: tx.from_warehouse_id || '',
              to_warehouse_id: tx.to_warehouse_id || '',
              quantity: Math.abs(tx.quantity),
              notes: tx.notes,
              created_at: tx.created_at,
              product_name: tx.product_name,
              product_sku: tx.product_sku,
              from_warehouse_name: tx.warehouse_name,
              to_warehouse_name: tx.to_warehouse_id ? '' : '',
              status: 'completed',
            });
          }
        } else {
          // Standalone transfer transaction
          transferMap.set(tx.id, {
            id: tx.id,
            product_id: '',
            from_warehouse_id: tx.from_warehouse_id || '',
            to_warehouse_id: tx.to_warehouse_id || '',
            quantity: Math.abs(tx.quantity),
            notes: tx.notes,
            created_at: tx.created_at,
            product_name: tx.product_name,
            product_sku: tx.product_sku,
            from_warehouse_name: tx.from_warehouse_id ? tx.warehouse_name : '',
            to_warehouse_name: tx.to_warehouse_id ? tx.warehouse_name : '',
            status: 'completed',
          });
        }
      });

      setTransfers(Array.from(transferMap.values()));
    } catch (error: any) {
      console.error('Error fetching transfers:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch transfers',
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

  const handleCreateTransfer = async () => {
    try {
      if (!transferForm.product_id || !transferForm.from_warehouse_id || !transferForm.to_warehouse_id || !transferForm.quantity) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      if (transferForm.from_warehouse_id === transferForm.to_warehouse_id) {
        toast({
          title: 'Validation Error',
          description: 'Source and destination warehouses must be different',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);
      await createTransfer({
        product_id: transferForm.product_id,
        variant_id: transferForm.variant_id || undefined,
        from_warehouse_id: transferForm.from_warehouse_id,
        to_warehouse_id: transferForm.to_warehouse_id,
        quantity: parseFloat(transferForm.quantity) || 0,
        notes: transferForm.notes || undefined,
      });

      toast({
        title: 'Success',
        description: 'Transfer created successfully',
      });

      setShowTransferDialog(false);
      resetForm();
      fetchTransfers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create transfer',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewTransfer = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setShowViewDialog(true);
  };

  const resetForm = () => {
    setTransferForm({
      product_id: '',
      variant_id: '',
      from_warehouse_id: '',
      to_warehouse_id: '',
      quantity: '',
      notes: '',
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setShowTransferDialog(true);
  };

  // Calculate statistics
  const totalTransfers = transfers.length;
  const totalQuantity = transfers.reduce((sum, t) => {
    const qty = typeof t.quantity === 'number' ? t.quantity : parseFloat(String(t.quantity || 0));
    return sum + (isNaN(qty) ? 0 : qty);
  }, 0);
  const uniqueProducts = new Set(transfers.map(t => t.product_id)).size;
  const uniqueWarehouses = new Set([
    ...transfers.map(t => t.from_warehouse_id),
    ...transfers.map(t => t.to_warehouse_id),
  ]).size;

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
          <h1 className="text-3xl font-bold">Inventory Transfers</h1>
          <p className="text-muted-foreground mt-1">
            Manage inter-warehouse inventory transfers
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Transfer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransfers}</div>
            <p className="text-xs text-muted-foreground">
              All time transfers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Units transferred
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueProducts}</div>
            <p className="text-xs text-muted-foreground">
              Unique products
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueWarehouses}</div>
            <p className="text-xs text-muted-foreground">
              Involved warehouses
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transfers..."
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
          </div>
        </CardContent>
      </Card>

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transfers ({filteredTransfers.length})</CardTitle>
          <CardDescription>
            Inter-warehouse inventory transfers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && filteredTransfers.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredTransfers.length === 0 ? (
            <Alert>
              <AlertDescription>
                No transfers found. {searchTerm || productFilter !== 'all' || warehouseFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Create your first transfer to get started.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>From Warehouse</TableHead>
                    <TableHead>To Warehouse</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{transfer.product_name || 'N/A'}</span>
                          {transfer.product_sku && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {transfer.product_sku}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Warehouse className="h-4 w-4 mr-2 text-muted-foreground" />
                          {transfer.from_warehouse_name || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <ArrowRightLeft className="h-4 w-4 mr-2 text-blue-500" />
                          <Warehouse className="h-4 w-4 mr-2 text-muted-foreground" />
                          {transfer.to_warehouse_name || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(typeof transfer.quantity === 'number' ? transfer.quantity : parseFloat(String(transfer.quantity || 0))).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(transfer.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewTransfer(transfer)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Inventory Transfer</DialogTitle>
            <DialogDescription>
              Transfer inventory from one warehouse to another
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={transferForm.product_id}
                onValueChange={(value) => setTransferForm({ ...transferForm, product_id: value })}
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="from_warehouse">From Warehouse *</Label>
                <Select
                  value={transferForm.from_warehouse_id}
                  onValueChange={(value) => setTransferForm({ ...transferForm, from_warehouse_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source warehouse" />
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
              <div className="grid gap-2">
                <Label htmlFor="to_warehouse">To Warehouse *</Label>
                <Select
                  value={transferForm.to_warehouse_id}
                  onValueChange={(value) => setTransferForm({ ...transferForm, to_warehouse_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter(w => w.id !== transferForm.from_warehouse_id)
                      .map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="0.01"
                value={transferForm.quantity}
                onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
                placeholder="Enter quantity"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={transferForm.notes}
                onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                placeholder="Additional notes about this transfer"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTransfer} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Transfer Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transfer Details</DialogTitle>
            <DialogDescription>
              View complete transfer information
            </DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Product</Label>
                <div>
                  <p className="font-medium">{selectedTransfer.product_name || 'N/A'}</p>
                  {selectedTransfer.product_sku && (
                    <p className="text-sm text-muted-foreground font-mono">
                      SKU: {selectedTransfer.product_sku}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">From Warehouse</Label>
                  <div className="flex items-center">
                    <Warehouse className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p>{selectedTransfer.from_warehouse_name || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">To Warehouse</Label>
                  <div className="flex items-center">
                    <ArrowRightLeft className="h-4 w-4 mr-2 text-blue-500" />
                    <Warehouse className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p>{selectedTransfer.to_warehouse_name || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Quantity</Label>
                  <p className="font-medium text-lg">
                    {(typeof selectedTransfer.quantity === 'number' ? selectedTransfer.quantity : parseFloat(String(selectedTransfer.quantity || 0))).toLocaleString()}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Date</Label>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p>{new Date(selectedTransfer.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              {selectedTransfer.notes && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedTransfer.notes}</p>
                </div>
              )}
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Status</Label>
                <Badge variant="default">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
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

