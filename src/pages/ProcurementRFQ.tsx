/**
 * Procurement RFQ/RFP Page
 * Request for Quotation/Proposal management interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  FileSearch,
  Plus,
  Search,
  Loader2,
  Edit,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  MoreVertical,
  Calendar,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import {
  getRfqRfp,
  createRfqRfp,
  type RfqRfp,
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

interface RfqItem {
  product_id?: string;
  description: string;
  quantity: number;
  unit_of_measure: string;
  specifications?: string;
}

export default function ProcurementRFQ() {
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();

  // RFQ/RFP
  const [rfqs, setRfqs] = useState<RfqRfp[]>([]);
  const [filteredRfqs, setFilteredRfqs] = useState<RfqRfp[]>([]);
  const [selectedRfq, setSelectedRfq] = useState<RfqRfp | null>(null);
  const [showRfqDialog, setShowRfqDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Products
  const [products, setProducts] = useState<Product[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // RFQ form
  const [rfqForm, setRfqForm] = useState({
    title: '',
    description: '',
    type: 'RFQ' as 'RFQ' | 'RFP',
    status: 'draft',
    published_date: '',
    closing_date: '',
    currency: 'INR',
    terms_conditions: '',
    items: [] as RfqItem[],
  });

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      try {
        setInitialLoad(true);
        await Promise.all([
          fetchRfqs(),
          fetchProducts(),
        ]);
      } catch (error: any) {
        console.error('Error loading RFQ data:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load RFQ/RFP',
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
    let filtered = rfqs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(rfq =>
        rfq.rfq_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rfq.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rfq.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(rfq => rfq.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(rfq => rfq.type === typeFilter);
    }

    setFilteredRfqs(filtered);
  }, [rfqs, searchTerm, statusFilter, typeFilter]);

  const fetchRfqs = async () => {
    try {
      setLoading(true);
      const data = await getRfqRfp();
      setRfqs(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch RFQ/RFP',
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

  const handleCreateRfq = async () => {
    try {
      if (!rfqForm.title) {
        toast({
          title: 'Validation Error',
          description: 'Please provide a title for the RFQ/RFP',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);
      await createRfqRfp({
        title: rfqForm.title,
        description: rfqForm.description || undefined,
        type: rfqForm.type,
        status: rfqForm.status,
        published_date: rfqForm.published_date || undefined,
        closing_date: rfqForm.closing_date || undefined,
        currency: rfqForm.currency,
        terms_conditions: rfqForm.terms_conditions || undefined,
        items: rfqForm.items.map(item => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_of_measure: item.unit_of_measure || 'pcs',
          specifications: item.specifications,
        })),
      });

      toast({
        title: 'Success',
        description: `${rfqForm.type} created successfully`,
      });

      setShowRfqDialog(false);
      resetForm();
      fetchRfqs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create RFQ/RFP',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewRfq = (rfq: RfqRfp) => {
    setSelectedRfq(rfq);
    setShowViewDialog(true);
  };

  const addItem = () => {
    setRfqForm({
      ...rfqForm,
      items: [
        ...rfqForm.items,
        {
          description: '',
          quantity: 1,
          unit_of_measure: 'pcs',
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    setRfqForm({
      ...rfqForm,
      items: rfqForm.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: keyof RfqItem, value: any) => {
    const updatedItems = [...rfqForm.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    setRfqForm({ ...rfqForm, items: updatedItems });
  };

  const resetForm = () => {
    setRfqForm({
      title: '',
      description: '',
      type: 'RFQ',
      status: 'draft',
      published_date: '',
      closing_date: '',
      currency: 'INR',
      terms_conditions: '',
      items: [],
    });
    setSelectedRfq(null);
    setIsEditing(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowRfqDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: any; label: string }> = {
      draft: { variant: 'secondary', icon: FileSearch, label: 'Draft' },
      published: { variant: 'default', icon: CheckCircle2, label: 'Published' },
      closed: { variant: 'outline', icon: XCircle, label: 'Closed' },
      cancelled: { variant: 'destructive', icon: XCircle, label: 'Cancelled' },
    };

    const config = statusConfig[status] || { variant: 'secondary', icon: FileSearch, label: status };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Calculate statistics
  const totalRfqs = rfqs.length;
  const rfqCount = rfqs.filter(rfq => rfq.type === 'RFQ').length;
  const rfpCount = rfqs.filter(rfq => rfq.type === 'RFP').length;
  const publishedCount = rfqs.filter(rfq => rfq.status === 'published').length;

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
          <h1 className="text-3xl font-bold">RFQ / RFP Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage Request for Quotation and Request for Proposal
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create RFQ/RFP
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total RFQ/RFP</CardTitle>
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRfqs}</div>
            <p className="text-xs text-muted-foreground">
              All requests
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RFQ</CardTitle>
            <FileSearch className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rfqCount}</div>
            <p className="text-xs text-muted-foreground">
              Quotations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RFP</CardTitle>
            <FileSearch className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rfpCount}</div>
            <p className="text-xs text-muted-foreground">
              Proposals
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedCount}</div>
            <p className="text-xs text-muted-foreground">
              Active requests
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
                  placeholder="Search RFQ/RFP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="RFQ">RFQ</SelectItem>
                  <SelectItem value="RFP">RFP</SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RFQ/RFP Table */}
      <Card>
        <CardHeader>
          <CardTitle>RFQ / RFP ({filteredRfqs.length})</CardTitle>
          <CardDescription>
            Manage your request for quotations and proposals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && filteredRfqs.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredRfqs.length === 0 ? (
            <Alert>
              <AlertDescription>
                No RFQ/RFP found. {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Create your first RFQ/RFP to get started.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFQ/RFP Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Published Date</TableHead>
                    <TableHead>Closing Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRfqs.map((rfq) => (
                    <TableRow key={rfq.id}>
                      <TableCell className="font-mono font-medium">{rfq.rfq_number}</TableCell>
                      <TableCell className="font-medium">{rfq.title}</TableCell>
                      <TableCell>
                        <Badge variant={rfq.type === 'RFQ' ? 'default' : 'outline'}>
                          {rfq.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rfq.published_date
                          ? new Date(rfq.published_date).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {rfq.closing_date
                          ? new Date(rfq.closing_date).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(rfq.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewRfq(rfq)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            {rfq.status === 'draft' && (
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

      {/* Create RFQ/RFP Dialog */}
      <Dialog open={showRfqDialog} onOpenChange={setShowRfqDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit RFQ/RFP' : 'Create RFQ/RFP'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update RFQ/RFP information' : 'Create a new Request for Quotation or Proposal'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={rfqForm.type}
                  onValueChange={(value: 'RFQ' | 'RFP') =>
                    setRfqForm({ ...rfqForm, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RFQ">RFQ (Request for Quotation)</SelectItem>
                    <SelectItem value="RFP">RFP (Request for Proposal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={rfqForm.status}
                  onValueChange={(value) => setRfqForm({ ...rfqForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={rfqForm.title}
                onChange={(e) => setRfqForm({ ...rfqForm, title: e.target.value })}
                placeholder="Enter RFQ/RFP title"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={rfqForm.description}
                onChange={(e) => setRfqForm({ ...rfqForm, description: e.target.value })}
                placeholder="Detailed description of requirements"
                rows={4}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="published_date">Published Date</Label>
                <Input
                  id="published_date"
                  type="date"
                  value={rfqForm.published_date}
                  onChange={(e) => setRfqForm({ ...rfqForm, published_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="closing_date">Closing Date</Label>
                <Input
                  id="closing_date"
                  type="date"
                  value={rfqForm.closing_date}
                  onChange={(e) => setRfqForm({ ...rfqForm, closing_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={rfqForm.currency}
                  onValueChange={(value) => setRfqForm({ ...rfqForm, currency: value })}
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
            </div>

            {/* Items Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items / Requirements</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              {rfqForm.items.length === 0 ? (
                <Alert>
                  <AlertDescription>No items added. Click "Add Item" to add requirements to this RFQ/RFP.</AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Specifications</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rfqForm.items.map((item, index) => (
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
                              value={item.unit_of_measure}
                              onChange={(e) => updateItem(index, 'unit_of_measure', e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.specifications || ''}
                              onChange={(e) => updateItem(index, 'specifications', e.target.value)}
                              placeholder="Specifications"
                            />
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

            <div className="grid gap-2">
              <Label htmlFor="terms_conditions">Terms & Conditions</Label>
              <Textarea
                id="terms_conditions"
                value={rfqForm.terms_conditions}
                onChange={(e) => setRfqForm({ ...rfqForm, terms_conditions: e.target.value })}
                placeholder="Terms and conditions for vendors"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRfqDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRfq} disabled={loading || !rfqForm.title}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'} {rfqForm.type}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View RFQ/RFP Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>RFQ/RFP Details</DialogTitle>
            <DialogDescription>
              View complete RFQ/RFP information
            </DialogDescription>
          </DialogHeader>
          {selectedRfq && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">RFQ/RFP Number</Label>
                  <p className="font-mono">{selectedRfq.rfq_number}</p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Type</Label>
                  <Badge variant={selectedRfq.type === 'RFQ' ? 'default' : 'outline'}>
                    {selectedRfq.type}
                  </Badge>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Status</Label>
                  {getStatusBadge(selectedRfq.status)}
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Currency</Label>
                  <p>{selectedRfq.currency}</p>
                </div>
                {selectedRfq.published_date && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Published Date</Label>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <p>{new Date(selectedRfq.published_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
                {selectedRfq.closing_date && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Closing Date</Label>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <p>{new Date(selectedRfq.closing_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Title</Label>
                <p className="font-medium">{selectedRfq.title}</p>
              </div>
              {selectedRfq.description && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">{selectedRfq.description}</p>
                </div>
              )}
              {selectedRfq.terms_conditions && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Terms & Conditions</Label>
                  <p className="text-sm text-muted-foreground">{selectedRfq.terms_conditions}</p>
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

