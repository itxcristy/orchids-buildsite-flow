/**
 * Procurement Requisitions Page
 * Purchase requisition management interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Plus,
  Search,
  Loader2,
  Edit,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  MoreVertical,
  DollarSign,
  Calendar,
  User,
} from 'lucide-react';
import {
  getPurchaseRequisitions,
  createPurchaseRequisition,
  type PurchaseRequisition,
} from '@/services/api/procurement-service';
import {
  getProducts,
  type Product,
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

interface RequisitionItem {
  product_id?: string;
  description: string;
  quantity: number;
  unit_price?: number;
  unit_of_measure: string;
  notes?: string;
}

export default function ProcurementRequisitions() {
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();

  // Requisitions
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [filteredRequisitions, setFilteredRequisitions] = useState<PurchaseRequisition[]>([]);
  const [selectedRequisition, setSelectedRequisition] = useState<PurchaseRequisition | null>(null);
  const [showRequisitionDialog, setShowRequisitionDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Products
  const [products, setProducts] = useState<Product[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Requisition form
  const [requisitionForm, setRequisitionForm] = useState({
    department_id: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    required_date: '',
    notes: '',
    items: [] as RequisitionItem[],
  });

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      try {
        setInitialLoad(true);
        await Promise.all([
          fetchRequisitions(),
          fetchProducts(),
        ]);
      } catch (error: any) {
        console.error('Error loading requisitions data:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load requisitions',
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
    let filtered = requisitions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.requisition_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.requested_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.requested_by_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(req => req.priority === priorityFilter);
    }

    setFilteredRequisitions(filtered);
  }, [requisitions, searchTerm, statusFilter, priorityFilter]);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const data = await getPurchaseRequisitions();
      setRequisitions(data || []);
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

  const fetchProducts = async () => {
    try {
      const data = await getProducts({ is_active: true });
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
    }
  };

  const handleCreateRequisition = async () => {
    try {
      if (requisitionForm.items.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Please add at least one item to the requisition',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);
      await createPurchaseRequisition({
        department_id: requisitionForm.department_id || undefined,
        priority: requisitionForm.priority,
        required_date: requisitionForm.required_date || undefined,
        notes: requisitionForm.notes || undefined,
        items: requisitionForm.items.map(item => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_of_measure: item.unit_of_measure || 'pcs',
          notes: item.notes,
        })),
      });

      toast({
        title: 'Success',
        description: 'Purchase requisition created successfully',
      });

      setShowRequisitionDialog(false);
      resetForm();
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

  const handleViewRequisition = (requisition: PurchaseRequisition) => {
    setSelectedRequisition(requisition);
    setShowViewDialog(true);
  };

  const addItem = () => {
    setRequisitionForm({
      ...requisitionForm,
      items: [
        ...requisitionForm.items,
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
    setRequisitionForm({
      ...requisitionForm,
      items: requisitionForm.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: keyof RequisitionItem, value: any) => {
    const updatedItems = [...requisitionForm.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    setRequisitionForm({ ...requisitionForm, items: updatedItems });
  };

  const calculateTotal = () => {
    return requisitionForm.items.reduce((sum, item) => {
      const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity || 0));
      const price = typeof item.unit_price === 'number' ? item.unit_price : parseFloat(String(item.unit_price || 0));
      return sum + (qty * price);
    }, 0);
  };

  const resetForm = () => {
    setRequisitionForm({
      department_id: '',
      priority: 'normal',
      required_date: '',
      notes: '',
      items: [],
    });
    setSelectedRequisition(null);
    setIsEditing(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowRequisitionDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: any; label: string }> = {
      draft: { variant: 'secondary', icon: FileText, label: 'Draft' },
      pending: { variant: 'outline', icon: Clock, label: 'Pending' },
      approved: { variant: 'default', icon: CheckCircle2, label: 'Approved' },
      rejected: { variant: 'destructive', icon: XCircle, label: 'Rejected' },
      cancelled: { variant: 'secondary', icon: XCircle, label: 'Cancelled' },
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

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      low: { variant: 'secondary', label: 'Low' },
      normal: { variant: 'outline', label: 'Normal' },
      high: { variant: 'default', label: 'High' },
      urgent: { variant: 'destructive', label: 'Urgent' },
    };

    const config = priorityConfig[priority] || { variant: 'secondary', label: priority };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Calculate statistics
  const totalRequisitions = requisitions.length;
  const pendingRequisitions = requisitions.filter(req => req.status === 'pending').length;
  const approvedRequisitions = requisitions.filter(req => req.status === 'approved').length;
  const totalValue = requisitions.reduce((sum, req) => {
    const amount = typeof req.total_amount === 'number' ? req.total_amount : parseFloat(String(req.total_amount || 0));
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
          <h1 className="text-3xl font-bold">Purchase Requisitions</h1>
          <p className="text-muted-foreground mt-1">
            Manage purchase requisitions and approval workflow
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Requisition
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requisitions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequisitions}</div>
            <p className="text-xs text-muted-foreground">
              All requisitions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequisitions}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedRequisitions}</div>
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
                  placeholder="Search requisitions..."
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requisitions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Requisitions ({filteredRequisitions.length})</CardTitle>
          <CardDescription>
            Manage your purchase requisitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && filteredRequisitions.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredRequisitions.length === 0 ? (
            <Alert>
              <AlertDescription>
                No requisitions found. {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Create your first requisition to get started.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requisition #</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Required Date</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequisitions.map((requisition) => (
                    <TableRow key={requisition.id}>
                      <TableCell className="font-mono font-medium">{requisition.requisition_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          {requisition.requested_by_name || requisition.requested_by_email || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(requisition.priority)}</TableCell>
                      <TableCell>
                        {requisition.required_date
                          ? new Date(requisition.required_date).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(typeof requisition.total_amount === 'number' ? requisition.total_amount : parseFloat(String(requisition.total_amount || 0))).toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        })}
                      </TableCell>
                      <TableCell>{getStatusBadge(requisition.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewRequisition(requisition)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            {requisition.status === 'draft' && (
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
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

      {/* Create Requisition Dialog */}
      <Dialog open={showRequisitionDialog} onOpenChange={setShowRequisitionDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Requisition' : 'Create Purchase Requisition'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update requisition information' : 'Create a new purchase requisition'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={requisitionForm.priority}
                  onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') =>
                    setRequisitionForm({ ...requisitionForm, priority: value })
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
              <div className="grid gap-2">
                <Label htmlFor="required_date">Required Date</Label>
                <Input
                  id="required_date"
                  type="date"
                  value={requisitionForm.required_date}
                  onChange={(e) => setRequisitionForm({ ...requisitionForm, required_date: e.target.value })}
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
              {requisitionForm.items.length === 0 ? (
                <Alert>
                  <AlertDescription>No items added. Click "Add Item" to add items to this requisition.</AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requisitionForm.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={item.product_id || ''}
                              onValueChange={(value) => {
                                const product = products.find(p => p.id === value);
                                updateItem(index, 'product_id', value);
                                if (product) {
                                  updateItem(index, 'description', product.name);
                                }
                              }}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} ({product.sku})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
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
                              value={item.unit_price || ''}
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
                            {((typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity || 0))) *
                              (typeof item.unit_price === 'number' ? item.unit_price : parseFloat(String(item.unit_price || 0)))).toLocaleString('en-IN', {
                              style: 'currency',
                              currency: 'INR',
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

            {/* Total */}
            <div className="flex justify-end border-t pt-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Total:</span>
                <span className="text-lg font-bold">
                  {calculateTotal().toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  })}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={requisitionForm.notes}
                onChange={(e) => setRequisitionForm({ ...requisitionForm, notes: e.target.value })}
                placeholder="Additional notes about this requisition"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequisitionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRequisition} disabled={loading || requisitionForm.items.length === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'} Requisition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Requisition Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Requisition Details</DialogTitle>
            <DialogDescription>
              View complete requisition information
            </DialogDescription>
          </DialogHeader>
          {selectedRequisition && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Requisition Number</Label>
                  <p className="font-mono">{selectedRequisition.requisition_number}</p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Status</Label>
                  {getStatusBadge(selectedRequisition.status)}
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Priority</Label>
                  {getPriorityBadge(selectedRequisition.priority)}
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Requested By</Label>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p>{selectedRequisition.requested_by_name || selectedRequisition.requested_by_email || 'N/A'}</p>
                  </div>
                </div>
                {selectedRequisition.required_date && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Required Date</Label>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <p>{new Date(selectedRequisition.required_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Total Amount</Label>
                  <p className="font-bold text-lg">
                    {(typeof selectedRequisition.total_amount === 'number' ? selectedRequisition.total_amount : parseFloat(String(selectedRequisition.total_amount || 0))).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                    })}
                  </p>
                </div>
              </div>
              {selectedRequisition.notes && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedRequisition.notes}</p>
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

