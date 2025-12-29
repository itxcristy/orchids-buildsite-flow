/**
 * Procurement Purchase Orders Page
 * Complete purchase order management interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ShoppingCart,
  Plus,
  Search,
  Loader2,
  Edit,
  Eye,
  FileText,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  DollarSign,
  Calendar,
} from 'lucide-react';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  getPurchaseOrderById,
  updatePurchaseOrder,
  getSuppliers,
  type PurchaseOrder,
  type Supplier,
} from '@/services/api/procurement-service';
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

interface PurchaseOrderItem {
  id?: string;
  requisition_item_id?: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit_of_measure: string;
  total_price?: number;
  notes?: string;
  product_name?: string;
  product_sku?: string;
}

interface PurchaseOrderWithItems extends PurchaseOrder {
  items?: PurchaseOrderItem[];
}

export default function ProcurementPurchaseOrders() {
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();

  // Purchase Orders
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderWithItems | null>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');

  // Purchase Order form
  const [poForm, setPoForm] = useState({
    supplier_id: '',
    expected_delivery_date: '',
    delivery_address: '',
    payment_terms: '',
    currency: 'INR',
    exchange_rate: '1',
    tax_amount: '',
    shipping_cost: '',
    discount_amount: '',
    notes: '',
    terms_conditions: '',
    items: [] as PurchaseOrderItem[],
  });

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      try {
        setInitialLoad(true);
        await Promise.all([
          fetchPurchaseOrders(),
          fetchSuppliers(),
        ]);
      } catch (error: any) {
        console.error('Error loading purchase orders data:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load purchase orders',
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
    let filtered = purchaseOrders;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(po =>
        po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplier_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(po => po.status === statusFilter);
    }

    // Supplier filter
    if (supplierFilter !== 'all') {
      filtered = filtered.filter(po => po.supplier_id === supplierFilter);
    }

    setFilteredOrders(filtered);
  }, [purchaseOrders, searchTerm, statusFilter, supplierFilter]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const data = await getPurchaseOrders();
      setPurchaseOrders(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch purchase orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const data = await getSuppliers({ is_active: true });
      setSuppliers(data || []);
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleCreateOrder = async () => {
    try {
      setLoading(true);
      const orderData = {
        ...poForm,
        supplier_id: poForm.supplier_id,
        expected_delivery_date: poForm.expected_delivery_date || undefined,
        delivery_address: poForm.delivery_address || undefined,
        payment_terms: poForm.payment_terms || undefined,
        currency: poForm.currency,
        exchange_rate: parseFloat(poForm.exchange_rate) || 1,
        tax_amount: parseFloat(poForm.tax_amount) || 0,
        shipping_cost: parseFloat(poForm.shipping_cost) || 0,
        discount_amount: parseFloat(poForm.discount_amount) || 0,
        notes: poForm.notes || undefined,
        terms_conditions: poForm.terms_conditions || undefined,
        items: poForm.items.map(item => ({
          requisition_item_id: item.requisition_item_id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_of_measure: item.unit_of_measure || 'pcs',
          notes: item.notes,
        })),
      };

      if (isEditing && selectedOrder) {
        await updatePurchaseOrder(selectedOrder.id, orderData);
        toast({
          title: 'Success',
          description: 'Purchase order updated successfully',
        });
      } else {
        await createPurchaseOrder(orderData);
        toast({
          title: 'Success',
          description: 'Purchase order created successfully',
        });
      }
      setShowOrderDialog(false);
      resetForm();
      fetchPurchaseOrders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save purchase order',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditOrder = async (order: PurchaseOrder) => {
    try {
      const fullOrder = await getPurchaseOrderById(order.id);
      setSelectedOrder(fullOrder as PurchaseOrderWithItems);
      setIsEditing(true);
      setPoForm({
        supplier_id: fullOrder.supplier_id,
        expected_delivery_date: fullOrder.expected_delivery_date || '',
        delivery_address: fullOrder.delivery_address || '',
        payment_terms: fullOrder.payment_terms || '',
        currency: fullOrder.currency,
        exchange_rate: fullOrder.exchange_rate.toString(),
        tax_amount: fullOrder.tax_amount.toString(),
        shipping_cost: fullOrder.shipping_cost.toString(),
        discount_amount: fullOrder.discount_amount.toString(),
        notes: fullOrder.notes || '',
        terms_conditions: fullOrder.terms_conditions || '',
        items: (fullOrder as PurchaseOrderWithItems).items || [],
      });
      setShowOrderDialog(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load purchase order details',
        variant: 'destructive',
      });
    }
  };

  const handleViewOrder = async (order: PurchaseOrder) => {
    try {
      const fullOrder = await getPurchaseOrderById(order.id);
      setSelectedOrder(fullOrder as PurchaseOrderWithItems);
      setShowViewDialog(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load purchase order details',
        variant: 'destructive',
      });
    }
  };

  const addItem = () => {
    setPoForm({
      ...poForm,
      items: [
        ...poForm.items,
        {
          description: '',
          quantity: 1,
          unit_price: 0,
          unit_of_measure: 'pcs',
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    setPoForm({
      ...poForm,
      items: poForm.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const updatedItems = [...poForm.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    // Calculate total_price
    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].total_price =
        updatedItems[index].quantity * updatedItems[index].unit_price;
    }
    setPoForm({ ...poForm, items: updatedItems });
  };

  const calculateSubtotal = () => {
    return poForm.items.reduce((sum, item) => sum + (item.total_price || item.quantity * item.unit_price), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = parseFloat(poForm.tax_amount) || 0;
    const shipping = parseFloat(poForm.shipping_cost) || 0;
    const discount = parseFloat(poForm.discount_amount) || 0;
    return subtotal + tax + shipping - discount;
  };

  const resetForm = () => {
    setPoForm({
      supplier_id: '',
      expected_delivery_date: '',
      delivery_address: '',
      payment_terms: '',
      currency: 'INR',
      exchange_rate: '1',
      tax_amount: '',
      shipping_cost: '',
      discount_amount: '',
      notes: '',
      terms_conditions: '',
      items: [],
    });
    setSelectedOrder(null);
    setIsEditing(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowOrderDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      sent: { variant: 'outline', label: 'Sent' },
      acknowledged: { variant: 'default', label: 'Acknowledged' },
      partial: { variant: 'outline', label: 'Partial' },
      received: { variant: 'default', label: 'Received' },
      completed: { variant: 'default', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Calculate statistics
  const totalOrders = purchaseOrders.length;
  const draftOrders = purchaseOrders.filter(po => po.status === 'draft').length;
  const pendingOrders = purchaseOrders.filter(po => ['sent', 'acknowledged'].includes(po.status)).length;
  const totalValue = purchaseOrders.reduce((sum, po) => {
    const amount = typeof po.total_amount === 'number' ? po.total_amount : parseFloat(String(po.total_amount || 0));
    return sum + (isNaN(amount) ? 0 : amount);
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
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage purchase orders and procurement transactions
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create PO
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              All purchase orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search PO numbers..."
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders ({filteredOrders.length})</CardTitle>
          <CardDescription>
            Manage your purchase orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && filteredOrders.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <Alert>
              <AlertDescription>
                No purchase orders found. {searchTerm || statusFilter !== 'all' || supplierFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Create your first purchase order to get started.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-medium">{order.po_number}</TableCell>
                      <TableCell>
                        {order.supplier_name || order.supplier_code || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {new Date(order.order_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {order.expected_delivery_date
                          ? new Date(order.expected_delivery_date).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(typeof order.total_amount === 'number' ? order.total_amount : parseFloat(String(order.total_amount || 0))).toLocaleString('en-IN', {
                          style: 'currency',
                          currency: order.currency || 'INR',
                        })}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" />
                              Print
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

      {/* Create/Edit Purchase Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Purchase Order' : 'Create New Purchase Order'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update purchase order information' : 'Create a new purchase order'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="supplier">Supplier *</Label>
                <Select
                  value={poForm.supplier_id}
                  onValueChange={(value) => setPoForm({ ...poForm, supplier_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
                <Input
                  id="expected_delivery_date"
                  type="date"
                  value={poForm.expected_delivery_date}
                  onChange={(e) => setPoForm({ ...poForm, expected_delivery_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="delivery_address">Delivery Address</Label>
              <Textarea
                id="delivery_address"
                value={poForm.delivery_address}
                onChange={(e) => setPoForm({ ...poForm, delivery_address: e.target.value })}
                placeholder="Delivery address"
                rows={2}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={poForm.currency}
                  onValueChange={(value) => setPoForm({ ...poForm, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Input
                  id="payment_terms"
                  value={poForm.payment_terms}
                  onChange={(e) => setPoForm({ ...poForm, payment_terms: e.target.value })}
                  placeholder="e.g., Net 30"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="exchange_rate">Exchange Rate</Label>
                <Input
                  id="exchange_rate"
                  type="number"
                  step="0.0001"
                  value={poForm.exchange_rate}
                  onChange={(e) => setPoForm({ ...poForm, exchange_rate: e.target.value })}
                />
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              {poForm.items.length === 0 ? (
                <Alert>
                  <AlertDescription>No items added. Click "Add Item" to add items to this purchase order.</AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poForm.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              placeholder="Item description"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.unit_of_measure}
                              onChange={(e) => updateItem(index, 'unit_of_measure', e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {(item.total_price || item.quantity * item.unit_price).toLocaleString('en-IN', {
                              style: 'currency',
                              currency: poForm.currency,
                            })}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="grid gap-4 md:grid-cols-2 border-t pt-4">
              <div className="space-y-2">
                <div className="grid gap-2">
                  <Label htmlFor="tax_amount">Tax Amount</Label>
                  <Input
                    id="tax_amount"
                    type="number"
                    step="0.01"
                    value={poForm.tax_amount}
                    onChange={(e) => setPoForm({ ...poForm, tax_amount: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="shipping_cost">Shipping Cost</Label>
                  <Input
                    id="shipping_cost"
                    type="number"
                    step="0.01"
                    value={poForm.shipping_cost}
                    onChange={(e) => setPoForm({ ...poForm, shipping_cost: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="discount_amount">Discount Amount</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    step="0.01"
                    value={poForm.discount_amount}
                    onChange={(e) => setPoForm({ ...poForm, discount_amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Subtotal:</span>
                  <span className="font-medium">
                    {calculateSubtotal().toLocaleString('en-IN', {
                      style: 'currency',
                      currency: poForm.currency,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tax:</span>
                  <span className="font-medium">
                    {(parseFloat(poForm.tax_amount) || 0).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: poForm.currency,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Shipping:</span>
                  <span className="font-medium">
                    {(parseFloat(poForm.shipping_cost) || 0).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: poForm.currency,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Discount:</span>
                  <span className="font-medium text-red-600">
                    -{(parseFloat(poForm.discount_amount) || 0).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: poForm.currency,
                    })}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-lg">
                  <span>Total:</span>
                  <span>
                    {calculateTotal().toLocaleString('en-IN', {
                      style: 'currency',
                      currency: poForm.currency,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={poForm.notes}
                onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="terms_conditions">Terms & Conditions</Label>
              <Textarea
                id="terms_conditions"
                value={poForm.terms_conditions}
                onChange={(e) => setPoForm({ ...poForm, terms_conditions: e.target.value })}
                placeholder="Terms and conditions"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrder} disabled={loading || !poForm.supplier_id || poForm.items.length === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'} Purchase Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Purchase Order Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>
              View complete purchase order information
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">PO Number</Label>
                  <p className="font-mono">{selectedOrder.po_number}</p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Supplier</Label>
                  <p>{selectedOrder.supplier_name || selectedOrder.supplier_code || 'N/A'}</p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Order Date</Label>
                  <p>{new Date(selectedOrder.order_date).toLocaleDateString()}</p>
                </div>
                {selectedOrder.expected_delivery_date && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Expected Delivery</Label>
                    <p>{new Date(selectedOrder.expected_delivery_date).toLocaleDateString()}</p>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Status</Label>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Total Amount</Label>
                  <p className="font-bold text-lg">
                    {selectedOrder.total_amount.toLocaleString('en-IN', {
                      style: 'currency',
                      currency: selectedOrder.currency || 'INR',
                    })}
                  </p>
                </div>
              </div>

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Items</Label>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              {(typeof item.unit_price === 'number' ? item.unit_price : parseFloat(String(item.unit_price || 0))).toLocaleString('en-IN', {
                                style: 'currency',
                                currency: selectedOrder.currency || 'INR',
                              })}
                            </TableCell>
                            <TableCell>{item.unit_of_measure}</TableCell>
                            <TableCell className="text-right font-medium">
                              {(() => {
                                const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity || 0));
                                const price = typeof item.unit_price === 'number' ? item.unit_price : parseFloat(String(item.unit_price || 0));
                                const total = item.total_price || (qty * price);
                                return (typeof total === 'number' ? total : parseFloat(String(total || 0))).toLocaleString('en-IN', {
                                  style: 'currency',
                                  currency: selectedOrder.currency || 'INR',
                                });
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Subtotal:</span>
                    <span className="font-medium">
                      {(typeof selectedOrder.subtotal === 'number' ? selectedOrder.subtotal : parseFloat(String(selectedOrder.subtotal || 0))).toLocaleString('en-IN', {
                        style: 'currency',
                        currency: selectedOrder.currency || 'INR',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Tax:</span>
                    <span className="font-medium">
                      {(typeof selectedOrder.tax_amount === 'number' ? selectedOrder.tax_amount : parseFloat(String(selectedOrder.tax_amount || 0))).toLocaleString('en-IN', {
                        style: 'currency',
                        currency: selectedOrder.currency || 'INR',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Shipping:</span>
                    <span className="font-medium">
                      {(typeof selectedOrder.shipping_cost === 'number' ? selectedOrder.shipping_cost : parseFloat(String(selectedOrder.shipping_cost || 0))).toLocaleString('en-IN', {
                        style: 'currency',
                        currency: selectedOrder.currency || 'INR',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Discount:</span>
                    <span className="font-medium text-red-600">
                      -{(typeof selectedOrder.discount_amount === 'number' ? selectedOrder.discount_amount : parseFloat(String(selectedOrder.discount_amount || 0))).toLocaleString('en-IN', {
                        style: 'currency',
                        currency: selectedOrder.currency || 'INR',
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-lg">
                  <span>Total:</span>
                  <span>
                    {(typeof selectedOrder.total_amount === 'number' ? selectedOrder.total_amount : parseFloat(String(selectedOrder.total_amount || 0))).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: selectedOrder.currency || 'INR',
                    })}
                  </span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedOrder && (
              <Button onClick={() => {
                setShowViewDialog(false);
                handleEditOrder(selectedOrder);
              }}>
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

