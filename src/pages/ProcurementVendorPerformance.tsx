/**
 * Vendor Performance Page
 * Track and evaluate vendor performance metrics
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Eye,
  Star,
  Calendar,
  Package,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  getVendorPerformance,
  getVendorPerformanceById,
  createVendorPerformance,
  updateVendorPerformance,
  deleteVendorPerformance,
  getSuppliers,
  type VendorPerformance,
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ProcurementVendorPerformance() {
  const { toast } = useToast();
  const [performance, setPerformance] = useState<VendorPerformance[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPerformance, setSelectedPerformance] = useState<VendorPerformance | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<VendorPerformance>>({
    supplier_id: '',
    period_start: '',
    period_end: '',
    total_orders: 0,
    total_order_value: 0,
    on_time_delivery_rate: 0,
    quality_rating: 0,
    cost_rating: 0,
    communication_rating: 0,
    overall_rating: 0,
    late_deliveries: 0,
    rejected_items: 0,
    notes: '',
  });

  useEffect(() => {
    loadData();
    loadSuppliers();
  }, [filterSupplier]);

  const loadData = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterSupplier !== 'all') filters.supplier_id = filterSupplier;

      const data = await getVendorPerformance(filters);
      let filteredData = data;

      if (searchTerm) {
        filteredData = data.filter(
          (perf) =>
            perf.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setPerformance(filteredData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load vendor performance',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers({ is_active: true });
      setSuppliers(data);
    } catch (error: any) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const handleCreate = () => {
    setFormData({
      supplier_id: '',
      period_start: '',
      period_end: '',
      total_orders: 0,
      total_order_value: 0,
      on_time_delivery_rate: 0,
      quality_rating: 0,
      cost_rating: 0,
      communication_rating: 0,
      overall_rating: 0,
      late_deliveries: 0,
      rejected_items: 0,
      notes: '',
    });
    setSelectedPerformance(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (perf: VendorPerformance) => {
    setFormData({
      ...perf,
    });
    setSelectedPerformance(perf);
    setIsDialogOpen(true);
  };

  const handleView = async (perf: VendorPerformance) => {
    try {
      const fullPerformance = await getVendorPerformanceById(perf.id);
      setSelectedPerformance(fullPerformance);
      setIsViewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load performance details',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (selectedPerformance) {
        await updateVendorPerformance(selectedPerformance.id, formData);
        toast({
          title: 'Success',
          description: 'Performance record updated successfully',
        });
      } else {
        await createVendorPerformance(formData);
        toast({
          title: 'Success',
          description: 'Performance record created successfully',
        });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save performance record',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (perf: VendorPerformance) => {
    if (!confirm(`Are you sure you want to delete this performance record?`)) {
      return;
    }

    try {
      await deleteVendorPerformance(perf.id);
      toast({
        title: 'Success',
        description: 'Performance record deleted successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete performance record',
        variant: 'destructive',
      });
    }
  };

  const getRatingBadge = (rating: number) => {
    const numRating = typeof rating === 'number' ? rating : parseFloat(String(rating || 0));
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
    if (numRating >= 4) variant = 'default';
    else if (numRating >= 3) variant = 'secondary';
    else if (numRating >= 2) variant = 'outline';
    else variant = 'destructive';

    return (
      <Badge variant={variant}>
        <Star className="w-3 h-3 mr-1 fill-current" />
        {numRating.toFixed(1)}/5.0
      </Badge>
    );
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return '-';
    const numValue = typeof value === 'number' ? value : parseFloat(String(value || 0));
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
    }).format(numValue);
  };

  // Statistics
  const stats = {
    total: performance.length,
    avgRating: performance.length > 0
      ? performance.reduce((sum, p) => {
          const rating = typeof p.overall_rating === 'number' ? p.overall_rating : parseFloat(String(p.overall_rating || 0));
          return sum + rating;
        }, 0) / performance.length
      : 0,
    totalOrders: performance.reduce((sum, p) => sum + (p.total_orders || 0), 0),
    totalValue: performance.reduce((sum, p) => {
      const value = typeof p.total_order_value === 'number' ? p.total_order_value : parseFloat(String(p.total_order_value || 0));
      return sum + value;
    }, 0),
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendor Performance</h1>
          <p className="text-muted-foreground">Track and evaluate vendor performance metrics</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Performance Record
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}/5.0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Performance Records</CardTitle>
              <CardDescription>Vendor performance evaluation and metrics</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    loadData();
                  }}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterSupplier} onValueChange={setFilterSupplier}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="All Suppliers" />
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

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : performance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No performance records found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Order Value</TableHead>
                  <TableHead>On-Time Rate</TableHead>
                  <TableHead>Overall Rating</TableHead>
                  <TableHead>Late Deliveries</TableHead>
                  <TableHead>Rejected Items</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.map((perf) => (
                  <TableRow key={perf.id}>
                    <TableCell className="font-medium">
                      {perf.supplier_name || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(perf.period_start).toLocaleDateString()} -{' '}
                        {new Date(perf.period_end).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>{perf.total_orders || 0}</TableCell>
                    <TableCell>{formatCurrency(perf.total_order_value)}</TableCell>
                    <TableCell>
                      {typeof perf.on_time_delivery_rate === 'number'
                        ? perf.on_time_delivery_rate.toFixed(1)
                        : parseFloat(String(perf.on_time_delivery_rate || 0)).toFixed(1)}
                      %
                    </TableCell>
                    <TableCell>{getRatingBadge(perf.overall_rating)}</TableCell>
                    <TableCell>
                      <Badge variant={perf.late_deliveries > 0 ? 'destructive' : 'secondary'}>
                        {perf.late_deliveries || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={perf.rejected_items > 0 ? 'destructive' : 'secondary'}>
                        {perf.rejected_items || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(perf)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(perf)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(perf)}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPerformance ? 'Edit Performance Record' : 'Create Performance Record'}
            </DialogTitle>
            <DialogDescription>
              {selectedPerformance
                ? 'Update vendor performance metrics'
                : 'Create a new vendor performance evaluation'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Supplier *</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, supplier_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period Start *</Label>
                <Input
                  type="date"
                  value={formData.period_start}
                  onChange={(e) =>
                    setFormData({ ...formData, period_start: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Period End *</Label>
                <Input
                  type="date"
                  value={formData.period_end}
                  onChange={(e) =>
                    setFormData({ ...formData, period_end: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Orders</Label>
                <Input
                  type="number"
                  value={formData.total_orders}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      total_orders: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>Total Order Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_order_value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      total_order_value: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>On-Time Delivery Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.on_time_delivery_rate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    on_time_delivery_rate: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Quality Rating (0-5)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.quality_rating}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quality_rating: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>Cost Rating (0-5)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.cost_rating}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cost_rating: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>Communication Rating (0-5)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.communication_rating}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      communication_rating: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>Overall Rating (0-5)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.overall_rating}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      overall_rating: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Late Deliveries</Label>
                <Input
                  type="number"
                  value={formData.late_deliveries}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      late_deliveries: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>Rejected Items</Label>
                <Input
                  type="number"
                  value={formData.rejected_items}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rejected_items: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Performance evaluation notes"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedPerformance ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Performance Details</DialogTitle>
            <DialogDescription>View vendor performance metrics</DialogDescription>
          </DialogHeader>
          {selectedPerformance && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Supplier</Label>
                <p className="font-medium">{selectedPerformance.supplier_name || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Period Start</Label>
                  <p>
                    {new Date(selectedPerformance.period_start).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Period End</Label>
                  <p>
                    {new Date(selectedPerformance.period_end).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Total Orders</Label>
                  <p className="font-medium">{selectedPerformance.total_orders || 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Order Value</Label>
                  <p className="font-medium">{formatCurrency(selectedPerformance.total_order_value)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">On-Time Delivery Rate</Label>
                <p className="font-medium">
                  {typeof selectedPerformance.on_time_delivery_rate === 'number'
                    ? selectedPerformance.on_time_delivery_rate.toFixed(1)
                    : parseFloat(String(selectedPerformance.on_time_delivery_rate || 0)).toFixed(1)}
                  %
                </p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-muted-foreground">Quality Rating</Label>
                  <div className="mt-1">
                    {getRatingBadge(selectedPerformance.quality_rating)}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cost Rating</Label>
                  <div className="mt-1">
                    {getRatingBadge(selectedPerformance.cost_rating)}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Communication Rating</Label>
                  <div className="mt-1">
                    {getRatingBadge(selectedPerformance.communication_rating)}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Overall Rating</Label>
                  <div className="mt-1">
                    {getRatingBadge(selectedPerformance.overall_rating)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Late Deliveries</Label>
                  <p className="font-medium">{selectedPerformance.late_deliveries || 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Rejected Items</Label>
                  <p className="font-medium">{selectedPerformance.rejected_items || 0}</p>
                </div>
              </div>
              {selectedPerformance.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="whitespace-pre-wrap">{selectedPerformance.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

