/**
 * Procurement Goods Receipts Page
 * Goods Receipt Note (GRN) management interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  PackageCheck,
  Plus,
  Search,
  Loader2,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  MoreVertical,
  FileText,
  Warehouse,
  Calendar,
} from 'lucide-react';
import {
  getGoodsReceipts,
  createGoodsReceipt,
  getPurchaseOrders,
  type GoodsReceipt,
  type PurchaseOrder,
} from '@/services/api/procurement-service';
import {
  getWarehouses,
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

interface GRNItem {
  po_item_id: string;
  product_id?: string;
  ordered_quantity: number;
  received_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  unit_price?: number;
  batch_number?: string;
  expiry_date?: string;
  quality_status: 'passed' | 'failed' | 'partial';
  notes?: string;
  product_name?: string;
  product_sku?: string;
}

export default function ProcurementGoodsReceipts() {
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();

  // Goods Receipts
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<GoodsReceipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);
  const [showGRNDialog, setShowGRNDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);

  // Related data
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [poFilter, setPoFilter] = useState<string>('all');

  // GRN form
  const [grnForm, setGrnForm] = useState({
    po_id: '',
    warehouse_id: '',
    received_date: new Date().toISOString().split('T')[0],
    inspection_notes: '',
    notes: '',
    items: [] as GRNItem[],
  });

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      try {
        setInitialLoad(true);
        await Promise.all([
          fetchGoodsReceipts(),
          fetchPurchaseOrders(),
          fetchWarehouses(),
        ]);
      } catch (error: any) {
        console.error('Error loading goods receipts data:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load goods receipts',
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
    let filtered = goodsReceipts;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(grn =>
        grn.grn_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grn.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grn.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(grn => grn.status === statusFilter);
    }

    // PO filter
    if (poFilter !== 'all') {
      filtered = filtered.filter(grn => grn.po_id === poFilter);
    }

    setFilteredReceipts(filtered);
  }, [goodsReceipts, searchTerm, statusFilter, poFilter]);

  const fetchGoodsReceipts = async () => {
    try {
      setLoading(true);
      const data = await getGoodsReceipts();
      setGoodsReceipts(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch goods receipts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const data = await getPurchaseOrders();
      setPurchaseOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching purchase orders:', error);
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

  const handlePOSelection = async (poId: string) => {
    try {
      const po = purchaseOrders.find(p => p.id === poId);
      if (po) {
        setSelectedPO(po);
        // Load PO items if available
        if ((po as any).items) {
          const items: GRNItem[] = (po as any).items.map((item: any) => ({
            po_item_id: item.id || '',
            product_id: item.product_id,
            ordered_quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity || 0)),
            received_quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity || 0)),
            accepted_quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity || 0)),
            rejected_quantity: 0,
            unit_price: typeof item.unit_price === 'number' ? item.unit_price : parseFloat(String(item.unit_price || 0)),
            quality_status: 'passed',
            product_name: item.product_name,
            product_sku: item.product_sku,
          }));
          setGrnForm({ ...grnForm, po_id: poId, items });
        }
      }
    } catch (error: any) {
      console.error('Error loading PO details:', error);
    }
  };

  const handleCreateGRN = async () => {
    try {
      if (!grnForm.po_id || !grnForm.warehouse_id || grnForm.items.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields and add items',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);
      await createGoodsReceipt({
        po_id: grnForm.po_id,
        warehouse_id: grnForm.warehouse_id,
        received_date: grnForm.received_date,
        inspection_notes: grnForm.inspection_notes || undefined,
        notes: grnForm.notes || undefined,
        items: grnForm.items.map(item => ({
          po_item_id: item.po_item_id,
          received_quantity: item.received_quantity,
          accepted_quantity: item.accepted_quantity,
          rejected_quantity: item.rejected_quantity,
          batch_number: item.batch_number || undefined,
          expiry_date: item.expiry_date || undefined,
          quality_status: item.quality_status,
          notes: item.notes || undefined,
        })),
      });

      toast({
        title: 'Success',
        description: 'Goods receipt created successfully',
      });

      setShowGRNDialog(false);
      resetForm();
      fetchGoodsReceipts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create goods receipt',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = (receipt: GoodsReceipt) => {
    setSelectedReceipt(receipt);
    setShowViewDialog(true);
  };

  const updateItem = (index: number, field: keyof GRNItem, value: any) => {
    const updatedItems = [...grnForm.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    // Auto-calculate accepted quantity
    if (field === 'received_quantity' || field === 'rejected_quantity') {
      const received = typeof updatedItems[index].received_quantity === 'number' 
        ? updatedItems[index].received_quantity 
        : parseFloat(String(updatedItems[index].received_quantity || 0));
      const rejected = typeof updatedItems[index].rejected_quantity === 'number'
        ? updatedItems[index].rejected_quantity
        : parseFloat(String(updatedItems[index].rejected_quantity || 0));
      updatedItems[index].accepted_quantity = Math.max(0, received - rejected);
    }
    setGrnForm({ ...grnForm, items: updatedItems });
  };

  const resetForm = () => {
    setGrnForm({
      po_id: '',
      warehouse_id: '',
      received_date: new Date().toISOString().split('T')[0],
      inspection_notes: '',
      notes: '',
      items: [],
    });
    setSelectedPO(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowGRNDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: any; label: string }> = {
      pending: { variant: 'outline', icon: Clock, label: 'Pending' },
      inspected: { variant: 'default', icon: PackageCheck, label: 'Inspected' },
      approved: { variant: 'default', icon: CheckCircle2, label: 'Approved' },
      rejected: { variant: 'destructive', icon: XCircle, label: 'Rejected' },
    };

    const config = statusConfig[status] || { variant: 'secondary', icon: FileText, label: status };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getQualityBadge = (quality?: string) => {
    if (!quality) return null;
    const qualityConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      passed: { variant: 'default', label: 'Passed' },
      failed: { variant: 'destructive', label: 'Failed' },
      partial: { variant: 'outline', label: 'Partial' },
    };
    const config = qualityConfig[quality] || { variant: 'secondary', label: quality };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Calculate statistics
  const totalReceipts = goodsReceipts.length;
  const pendingReceipts = goodsReceipts.filter(grn => grn.status === 'pending').length;
  const approvedReceipts = goodsReceipts.filter(grn => grn.status === 'approved').length;
  const inspectedReceipts = goodsReceipts.filter(grn => grn.status === 'inspected').length;

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
          <h1 className="text-3xl font-bold">Goods Receipts (GRN)</h1>
          <p className="text-muted-foreground mt-1">
            Manage goods receipt notes and inventory receiving
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create GRN
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total GRNs</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReceipts}</div>
            <p className="text-xs text-muted-foreground">
              All goods receipts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReceipts}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting inspection
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inspected</CardTitle>
            <PackageCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inspectedReceipts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedReceipts}</div>
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
                  placeholder="Search GRN numbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inspected">Inspected</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Purchase Order</Label>
              <Select value={poFilter} onValueChange={setPoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All POs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Purchase Orders</SelectItem>
                  {purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.po_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goods Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Goods Receipts ({filteredReceipts.length})</CardTitle>
          <CardDescription>
            Manage your goods receipt notes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && filteredReceipts.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredReceipts.length === 0 ? (
            <Alert>
              <AlertDescription>
                No goods receipts found. {searchTerm || statusFilter !== 'all' || poFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Create your first GRN to get started.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN Number</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Received Date</TableHead>
                    <TableHead>Quality Status</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-mono font-medium">{receipt.grn_number}</TableCell>
                      <TableCell className="font-mono">{receipt.po_number || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Warehouse className="h-4 w-4 mr-2 text-muted-foreground" />
                          {receipt.warehouse_name || receipt.warehouse_code || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(receipt.received_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {getQualityBadge(receipt.quality_status)}
                      </TableCell>
                      <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewReceipt(receipt)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
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

      {/* Create GRN Dialog */}
      <Dialog open={showGRNDialog} onOpenChange={setShowGRNDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Goods Receipt (GRN)</DialogTitle>
            <DialogDescription>
              Record goods received against a purchase order
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="po_id">Purchase Order *</Label>
                <Select
                  value={grnForm.po_id}
                  onValueChange={handlePOSelection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purchase order" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrders
                      .filter(po => ['sent', 'acknowledged', 'partial', 'received'].includes(po.status))
                      .map((po) => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.po_number} - {po.supplier_name || po.supplier_code || 'N/A'}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="warehouse_id">Warehouse *</Label>
                <Select
                  value={grnForm.warehouse_id}
                  onValueChange={(value) => setGrnForm({ ...grnForm, warehouse_id: value })}
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
            </div>
            <div className="grid gap-2">
              <Label htmlFor="received_date">Received Date *</Label>
              <Input
                id="received_date"
                type="date"
                value={grnForm.received_date}
                onChange={(e) => setGrnForm({ ...grnForm, received_date: e.target.value })}
                required
              />
            </div>

            {/* Items Section */}
            {grnForm.items.length > 0 && (
              <div className="space-y-2">
                <Label>Received Items</Label>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Ordered</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Accepted</TableHead>
                        <TableHead className="text-right">Rejected</TableHead>
                        <TableHead>Batch/Lot</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Quality</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grnForm.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{item.product_name || 'N/A'}</span>
                              {item.product_sku && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  {item.product_sku}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.ordered_quantity.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={item.received_quantity}
                              onChange={(e) => updateItem(index, 'received_quantity', parseFloat(e.target.value) || 0)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.accepted_quantity.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={item.rejected_quantity}
                              onChange={(e) => updateItem(index, 'rejected_quantity', parseFloat(e.target.value) || 0)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.batch_number || ''}
                              onChange={(e) => updateItem(index, 'batch_number', e.target.value)}
                              placeholder="Batch #"
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={item.expiry_date || ''}
                              onChange={(e) => updateItem(index, 'expiry_date', e.target.value)}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.quality_status}
                              onValueChange={(value: 'passed' | 'failed' | 'partial') =>
                                updateItem(index, 'quality_status', value)
                              }
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="passed">Passed</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="partial">Partial</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {grnForm.items.length === 0 && selectedPO && (
              <Alert>
                <AlertDescription>
                  No items found in the selected purchase order. Please select a different PO.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="inspection_notes">Inspection Notes</Label>
              <Textarea
                id="inspection_notes"
                value={grnForm.inspection_notes}
                onChange={(e) => setGrnForm({ ...grnForm, inspection_notes: e.target.value })}
                placeholder="Quality inspection notes"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={grnForm.notes}
                onChange={(e) => setGrnForm({ ...grnForm, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGRNDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGRN} disabled={loading || !grnForm.po_id || !grnForm.warehouse_id || grnForm.items.length === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create GRN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View GRN Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Goods Receipt Details</DialogTitle>
            <DialogDescription>
              View complete GRN information
            </DialogDescription>
          </DialogHeader>
          {selectedReceipt && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">GRN Number</Label>
                  <p className="font-mono">{selectedReceipt.grn_number}</p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">PO Number</Label>
                  <p className="font-mono">{selectedReceipt.po_number || 'N/A'}</p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Warehouse</Label>
                  <div className="flex items-center">
                    <Warehouse className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p>{selectedReceipt.warehouse_name || selectedReceipt.warehouse_code || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Received Date</Label>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p>{new Date(selectedReceipt.received_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Quality Status</Label>
                  {getQualityBadge(selectedReceipt.quality_status)}
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Status</Label>
                  {getStatusBadge(selectedReceipt.status)}
                </div>
              </div>
              {selectedReceipt.inspection_notes && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Inspection Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedReceipt.inspection_notes}</p>
                </div>
              )}
              {selectedReceipt.notes && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedReceipt.notes}</p>
                </div>
              )}
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

