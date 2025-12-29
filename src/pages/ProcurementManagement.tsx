/**
 * Procurement Management Page
 * Complete procurement management interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  ShoppingCart,
  FileText,
  PackageCheck,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  getPurchaseRequisitions,
  createPurchaseRequisition,
  getPurchaseOrders,
  createPurchaseOrder,
  getGoodsReceipts,
  createGoodsReceipt,
  type PurchaseRequisition,
  type PurchaseOrder,
  type GoodsReceipt,
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
import { Textarea } from '@/components/ui/textarea';

export default function ProcurementManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Requisitions
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [showRequisitionDialog, setShowRequisitionDialog] = useState(false);
  const [requisitionForm, setRequisitionForm] = useState({
    department_id: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    required_date: '',
    notes: '',
    items: [] as Array<{
      product_id?: string;
      description: string;
      quantity: string;
      unit_price?: string;
      unit_of_measure: string;
      notes?: string;
    }>,
  });

  // Purchase Orders
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [showPODialog, setShowPODialog] = useState(false);
  const [poForm, setPoForm] = useState({
    requisition_id: '',
    supplier_id: '',
    expected_delivery_date: '',
    delivery_address: '',
    payment_terms: '',
    currency: 'INR',
    tax_amount: '',
    shipping_cost: '',
    discount_amount: '',
    notes: '',
    items: [] as Array<{
      requisition_item_id?: string;
      product_id?: string;
      description: string;
      quantity: string;
      unit_price: string;
      unit_of_measure: string;
      notes?: string;
    }>,
  });

  // Goods Receipts
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [showGRNDialog, setShowGRNDialog] = useState(false);
  const [grnForm, setGrnForm] = useState({
    po_id: '',
    warehouse_id: '',
    received_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: [] as Array<{
      po_item_id: string;
      product_id?: string;
      ordered_quantity: string;
      received_quantity: string;
      accepted_quantity: string;
      rejected_quantity: string;
      unit_price?: string;
      batch_number?: string;
      expiry_date?: string;
      quality_status: 'passed' | 'failed' | 'partial';
      notes?: string;
    }>,
  });

  // Fetch data
  useEffect(() => {
    fetchRequisitions();
    fetchPurchaseOrders();
    fetchGoodsReceipts();
  }, []);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const data = await getPurchaseRequisitions();
      setRequisitions(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch requisitions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const data = await getPurchaseOrders();
      setPurchaseOrders(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch purchase orders',
        variant: 'destructive',
      });
    }
  };

  const fetchGoodsReceipts = async () => {
    try {
      const data = await getGoodsReceipts();
      setGoodsReceipts(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch goods receipts',
        variant: 'destructive',
      });
    }
  };

  const handleCreateRequisition = async () => {
    try {
      setLoading(true);
      await createPurchaseRequisition(requisitionForm);
      toast({
        title: 'Success',
        description: 'Purchase requisition created successfully',
      });
      setShowRequisitionDialog(false);
      setRequisitionForm({
        department_id: '',
        priority: 'normal',
        required_date: '',
        notes: '',
        items: [],
      });
      fetchRequisitions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create requisition',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePO = async () => {
    try {
      setLoading(true);
      await createPurchaseOrder({
        ...poForm,
        tax_amount: poForm.tax_amount ? parseFloat(poForm.tax_amount) : 0,
        shipping_cost: poForm.shipping_cost ? parseFloat(poForm.shipping_cost) : 0,
        discount_amount: poForm.discount_amount ? parseFloat(poForm.discount_amount) : 0,
      });
      toast({
        title: 'Success',
        description: 'Purchase order created successfully',
      });
      setShowPODialog(false);
      setPoForm({
        requisition_id: '',
        supplier_id: '',
        expected_delivery_date: '',
        delivery_address: '',
        payment_terms: '',
        currency: 'INR',
        tax_amount: '',
        shipping_cost: '',
        discount_amount: '',
        notes: '',
        items: [],
      });
      fetchPurchaseOrders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create purchase order',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGRN = async () => {
    try {
      setLoading(true);
      await createGoodsReceipt({
        ...grnForm,
        items: grnForm.items.map(item => ({
          ...item,
          ordered_quantity: parseFloat(item.ordered_quantity),
          received_quantity: parseFloat(item.received_quantity),
          accepted_quantity: parseFloat(item.accepted_quantity),
          rejected_quantity: parseFloat(item.rejected_quantity),
          unit_price: item.unit_price ? parseFloat(item.unit_price) : undefined,
        })),
      });
      toast({
        title: 'Success',
        description: 'Goods receipt created successfully',
      });
      setShowGRNDialog(false);
      setGrnForm({
        po_id: '',
        warehouse_id: '',
        received_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [],
      });
      fetchGoodsReceipts();
      fetchPurchaseOrders(); // Refresh PO status
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      draft: { variant: 'secondary', icon: FileText },
      pending: { variant: 'outline', icon: Clock },
      approved: { variant: 'default', icon: CheckCircle2 },
      rejected: { variant: 'destructive', icon: XCircle },
      sent: { variant: 'default', icon: CheckCircle2 },
      received: { variant: 'default', icon: PackageCheck },
      partial: { variant: 'outline', icon: AlertCircle },
    };

    const config = statusConfig[status] || { variant: 'secondary', icon: FileText };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="mr-1 h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Procurement Management</h1>
          <p className="text-muted-foreground">Manage purchase requisitions, orders, and goods receipts</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requisitions">Requisitions</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="goods-receipts">Goods Receipts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requisitions</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{requisitions.length}</div>
                <p className="text-xs text-muted-foreground">
                  {requisitions.filter(r => r.status === 'pending').length} pending approval
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{purchaseOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                  {purchaseOrders.filter(po => po.status === 'partial' || po.status === 'sent').length} in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Goods Receipts</CardTitle>
                <PackageCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{goodsReceipts.length}</div>
                <p className="text-xs text-muted-foreground">
                  {goodsReceipts.filter(gr => gr.status === 'pending').length} pending inspection
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Requisitions Tab */}
        <TabsContent value="requisitions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Purchase Requisitions</CardTitle>
                  <CardDescription>Request items for purchase</CardDescription>
                </div>
                <Dialog open={showRequisitionDialog} onOpenChange={setShowRequisitionDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Requisition
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Purchase Requisition</DialogTitle>
                      <DialogDescription>Request items for purchase</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="req-priority">Priority</Label>
                          <Select
                            value={requisitionForm.priority}
                            onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') =>
                              setRequisitionForm(prev => ({ ...prev, priority: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="req-date">Required Date</Label>
                          <Input
                            id="req-date"
                            type="date"
                            value={requisitionForm.required_date}
                            onChange={(e) => setRequisitionForm(prev => ({ ...prev, required_date: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Items</Label>
                        <div className="space-y-2 border rounded-lg p-4">
                          {requisitionForm.items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-end">
                              <div className="col-span-5">
                                <Input
                                  placeholder="Description"
                                  value={item.description}
                                  onChange={(e) => {
                                    const newItems = [...requisitionForm.items];
                                    newItems[index].description = e.target.value;
                                    setRequisitionForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Qty"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newItems = [...requisitionForm.items];
                                    newItems[index].quantity = e.target.value;
                                    setRequisitionForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Unit Price"
                                  value={item.unit_price}
                                  onChange={(e) => {
                                    const newItems = [...requisitionForm.items];
                                    newItems[index].unit_price = e.target.value;
                                    setRequisitionForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  placeholder="Unit"
                                  value={item.unit_of_measure}
                                  onChange={(e) => {
                                    const newItems = [...requisitionForm.items];
                                    newItems[index].unit_of_measure = e.target.value;
                                    setRequisitionForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                />
                              </div>
                              <div className="col-span-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newItems = requisitionForm.items.filter((_, i) => i !== index);
                                    setRequisitionForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                >
                                  ×
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRequisitionForm(prev => ({
                                ...prev,
                                items: [...prev.items, {
                                  description: '',
                                  quantity: '',
                                  unit_price: '',
                                  unit_of_measure: 'pcs',
                                }],
                              }));
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="req-notes">Notes</Label>
                        <Textarea
                          id="req-notes"
                          value={requisitionForm.notes}
                          onChange={(e) => setRequisitionForm(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Additional notes..."
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowRequisitionDialog(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateRequisition}
                          disabled={loading || requisitionForm.items.length === 0}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Requisition'
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
                    <TableHead>Requisition #</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Required Date</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requisitions.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-mono">{req.requisition_number}</TableCell>
                        <TableCell>{req.requested_by_name || req.requested_by_email || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={req.priority === 'urgent' ? 'destructive' : 'outline'}>
                            {req.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{req.required_date || '-'}</TableCell>
                        <TableCell className="font-mono">
                          ₹{typeof req.total_amount === 'number' ? req.total_amount.toFixed(2) : (parseFloat(String(req.total_amount || 0))).toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Purchase Orders</CardTitle>
                  <CardDescription>Manage purchase orders to suppliers</CardDescription>
                </div>
                <Dialog open={showPODialog} onOpenChange={setShowPODialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Purchase Order
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Purchase Order</DialogTitle>
                      <DialogDescription>Create a new purchase order to supplier</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="po-supplier">Supplier *</Label>
                          <Input
                            id="po-supplier"
                            value={poForm.supplier_id}
                            onChange={(e) => setPoForm(prev => ({ ...prev, supplier_id: e.target.value }))}
                            placeholder="Supplier ID"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="po-delivery-date">Expected Delivery Date</Label>
                          <Input
                            id="po-delivery-date"
                            type="date"
                            value={poForm.expected_delivery_date}
                            onChange={(e) => setPoForm(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Items</Label>
                        <div className="space-y-2 border rounded-lg p-4">
                          {poForm.items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-end">
                              <div className="col-span-4">
                                <Input
                                  placeholder="Description"
                                  value={item.description}
                                  onChange={(e) => {
                                    const newItems = [...poForm.items];
                                    newItems[index].description = e.target.value;
                                    setPoForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Qty"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newItems = [...poForm.items];
                                    newItems[index].quantity = e.target.value;
                                    setPoForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Unit Price"
                                  value={item.unit_price}
                                  onChange={(e) => {
                                    const newItems = [...poForm.items];
                                    newItems[index].unit_price = e.target.value;
                                    setPoForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  placeholder="Unit"
                                  value={item.unit_of_measure}
                                  onChange={(e) => {
                                    const newItems = [...poForm.items];
                                    newItems[index].unit_of_measure = e.target.value;
                                    setPoForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                />
                              </div>
                              <div className="col-span-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newItems = poForm.items.filter((_, i) => i !== index);
                                    setPoForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                >
                                  ×
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPoForm(prev => ({
                                ...prev,
                                items: [...prev.items, {
                                  description: '',
                                  quantity: '',
                                  unit_price: '',
                                  unit_of_measure: 'pcs',
                                }],
                              }));
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="po-tax">Tax Amount</Label>
                          <Input
                            id="po-tax"
                            type="number"
                            step="0.01"
                            value={poForm.tax_amount}
                            onChange={(e) => setPoForm(prev => ({ ...prev, tax_amount: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="po-shipping">Shipping Cost</Label>
                          <Input
                            id="po-shipping"
                            type="number"
                            step="0.01"
                            value={poForm.shipping_cost}
                            onChange={(e) => setPoForm(prev => ({ ...prev, shipping_cost: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="po-discount">Discount</Label>
                          <Input
                            id="po-discount"
                            type="number"
                            step="0.01"
                            value={poForm.discount_amount}
                            onChange={(e) => setPoForm(prev => ({ ...prev, discount_amount: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowPODialog(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreatePO}
                          disabled={loading || !poForm.supplier_id || poForm.items.length === 0}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Purchase Order'
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
                    <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-mono">{po.po_number}</TableCell>
                        <TableCell>{po.supplier_name || po.supplier_code || '-'}</TableCell>
                        <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
                        <TableCell>{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="font-mono">
                          {po.currency} {typeof po.total_amount === 'number' ? po.total_amount.toFixed(2) : (parseFloat(String(po.total_amount || 0))).toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(po.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        </TabsContent>

        {/* Goods Receipts Tab */}
        <TabsContent value="goods-receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Goods Receipts (GRN)</CardTitle>
                  <CardDescription>Record goods received from suppliers</CardDescription>
                </div>
                <Dialog open={showGRNDialog} onOpenChange={setShowGRNDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Goods Receipt
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Goods Receipt (GRN)</DialogTitle>
                      <DialogDescription>Record goods received against a purchase order</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="grn-po">Purchase Order *</Label>
                          <Input
                            id="grn-po"
                            value={grnForm.po_id}
                            onChange={(e) => setGrnForm(prev => ({ ...prev, po_id: e.target.value }))}
                            placeholder="PO ID"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="grn-warehouse">Warehouse *</Label>
                          <Input
                            id="grn-warehouse"
                            value={grnForm.warehouse_id}
                            onChange={(e) => setGrnForm(prev => ({ ...prev, warehouse_id: e.target.value }))}
                            placeholder="Warehouse ID"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Received Items</Label>
                        <div className="space-y-2 border rounded-lg p-4">
                          {grnForm.items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-end border-b pb-2">
                              <div className="col-span-2">
                                <Label className="text-xs">Ordered</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.ordered_quantity}
                                  onChange={(e) => {
                                    const newItems = [...grnForm.items];
                                    newItems[index].ordered_quantity = e.target.value;
                                    setGrnForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">Received</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.received_quantity}
                                  onChange={(e) => {
                                    const newItems = [...grnForm.items];
                                    newItems[index].received_quantity = e.target.value;
                                    newItems[index].accepted_quantity = e.target.value;
                                    setGrnForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">Accepted</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.accepted_quantity}
                                  onChange={(e) => {
                                    const newItems = [...grnForm.items];
                                    newItems[index].accepted_quantity = e.target.value;
                                    const received = parseFloat(newItems[index].received_quantity) || 0;
                                    const accepted = parseFloat(e.target.value) || 0;
                                    newItems[index].rejected_quantity = String(received - accepted);
                                    setGrnForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">Quality</Label>
                                <Select
                                  value={item.quality_status}
                                  onValueChange={(value: 'passed' | 'failed' | 'partial') => {
                                    const newItems = [...grnForm.items];
                                    newItems[index].quality_status = value;
                                    setGrnForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="passed">Passed</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                    <SelectItem value="partial">Partial</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">Batch #</Label>
                                <Input
                                  value={item.batch_number}
                                  onChange={(e) => {
                                    const newItems = [...grnForm.items];
                                    newItems[index].batch_number = e.target.value;
                                    setGrnForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                  placeholder="Batch number"
                                />
                              </div>
                              <div className="col-span-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newItems = grnForm.items.filter((_, i) => i !== index);
                                    setGrnForm(prev => ({ ...prev, items: newItems }));
                                  }}
                                >
                                  ×
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setGrnForm(prev => ({
                                ...prev,
                                items: [...prev.items, {
                                  po_item_id: '',
                                  ordered_quantity: '',
                                  received_quantity: '',
                                  accepted_quantity: '',
                                  rejected_quantity: '0',
                                  quality_status: 'passed',
                                }],
                              }));
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item
                          </Button>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowGRNDialog(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateGRN}
                          disabled={loading || !grnForm.po_id || !grnForm.warehouse_id || grnForm.items.length === 0}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create GRN'
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
                    <TableHead>GRN Number</TableHead>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Received Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goodsReceipts.map((gr) => (
                      <TableRow key={gr.id}>
                        <TableCell className="font-mono">{gr.grn_number}</TableCell>
                        <TableCell className="font-mono">{gr.po_number || '-'}</TableCell>
                        <TableCell>{gr.warehouse_name || gr.warehouse_code || '-'}</TableCell>
                        <TableCell>{new Date(gr.received_date).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(gr.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
