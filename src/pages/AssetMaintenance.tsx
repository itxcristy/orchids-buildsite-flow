/**
 * Asset Maintenance Page
 * Complete asset maintenance tracking interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Wrench,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Eye,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import {
  getAllMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getAssets,
  type MaintenanceRecord,
  type Asset,
} from '@/services/api/asset-service';
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

export default function AssetMaintenance() {
  const { toast } = useToast();
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAsset, setFilterAsset] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<MaintenanceRecord>>({
    asset_id: '',
    maintenance_type: 'scheduled',
    title: '',
    description: '',
    scheduled_date: '',
    completed_date: '',
    due_date: '',
    status: 'scheduled',
    priority: 'normal',
    cost: 0,
    vendor_id: '',
    technician: '',
    technician_contact: '',
    parts_used: '',
    labor_hours: 0,
    notes: '',
    next_maintenance_date: '',
  });

  useEffect(() => {
    loadAssets();
    loadData();
  }, [filterStatus, filterType, filterPriority, filterAsset]);

  const loadAssets = async () => {
    try {
      setAssetsLoading(true);
      const data = await getAssets();
      setAssets(data);
    } catch (error: any) {
      console.error('Failed to load assets:', error);
    } finally {
      setAssetsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterStatus !== 'all') filters.status = filterStatus;
      if (filterType !== 'all') filters.maintenance_type = filterType;
      if (filterPriority !== 'all') filters.priority = filterPriority;
      if (filterAsset !== 'all') filters.asset_id = filterAsset;
      if (searchTerm) filters.search = searchTerm;

      const data = await getAllMaintenance(filters);
      setMaintenance(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load maintenance records',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      asset_id: '',
      maintenance_type: 'scheduled',
      title: '',
      description: '',
      scheduled_date: '',
      completed_date: '',
      due_date: '',
      status: 'scheduled',
      priority: 'normal',
      cost: 0,
      vendor_id: '',
      technician: '',
      technician_contact: '',
      parts_used: '',
      labor_hours: 0,
      notes: '',
      next_maintenance_date: '',
    });
    setSelectedMaintenance(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (record: MaintenanceRecord) => {
    setFormData({
      ...record,
    });
    setSelectedMaintenance(record);
    setIsDialogOpen(true);
  };

  const handleView = (record: MaintenanceRecord) => {
    setSelectedMaintenance(record);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (record: MaintenanceRecord) => {
    if (!confirm(`Are you sure you want to delete maintenance record "${record.title}"?`)) {
      return;
    }

    try {
      await deleteMaintenance(record.id);
      toast({
        title: 'Success',
        description: 'Maintenance record deleted successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete maintenance record',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_id || !formData.title) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedMaintenance) {
        await updateMaintenance(selectedMaintenance.id, formData);
        toast({
          title: 'Success',
          description: 'Maintenance record updated successfully',
        });
      } else {
        await createMaintenance(formData);
        toast({
          title: 'Success',
          description: 'Maintenance record created successfully',
        });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save maintenance record',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      scheduled: 'outline',
      in_progress: 'default',
      completed: 'default',
      cancelled: 'secondary',
      overdue: 'destructive',
    };
    const icons: Record<string, any> = {
      scheduled: Clock,
      in_progress: AlertCircle,
      completed: CheckCircle2,
      cancelled: XCircle,
      overdue: AlertCircle,
    };
    const Icon = icons[status] || Clock;
    return (
      <Badge variant={variants[status] || 'outline'}>
        <Icon className="mr-1 h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-500',
      normal: 'bg-blue-500',
      high: 'bg-orange-500',
      urgent: 'bg-red-500',
    };
    return (
      <Badge className={colors[priority] || 'bg-gray-500'}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const stats = {
    total: maintenance.length,
    scheduled: maintenance.filter((m) => m.status === 'scheduled').length,
    inProgress: maintenance.filter((m) => m.status === 'in_progress').length,
    completed: maintenance.filter((m) => m.status === 'completed').length,
    overdue: maintenance.filter((m) => m.status === 'overdue').length,
    totalCost: maintenance.reduce((sum, m) => {
      const cost = typeof m.cost === 'number' ? m.cost : parseFloat(String(m.cost || 0));
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0),
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Maintenance</h1>
          <p className="text-muted-foreground">Track and manage asset maintenance records</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Maintenance
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(typeof stats.totalCost === 'number' ? stats.totalCost : parseFloat(String(stats.totalCost || 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  placeholder="Search maintenance..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadData()}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Asset</Label>
              <Select value={filterAsset} onValueChange={setFilterAsset}>
                <SelectTrigger>
                  <SelectValue placeholder="All Assets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assets</SelectItem>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.asset_number} - {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="preventive">Preventive</SelectItem>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
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

      {/* Maintenance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Records</CardTitle>
          <CardDescription>Manage all asset maintenance activities</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : maintenance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No maintenance records found. Create your first maintenance record to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.title}</TableCell>
                    <TableCell>
                      {record.asset_name ? (
                        <div>
                          <div className="font-mono text-sm">{record.asset_number}</div>
                          <div className="text-sm text-muted-foreground">{record.asset_name}</div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.maintenance_type}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>{getPriorityBadge(record.priority)}</TableCell>
                    <TableCell>
                      {record.scheduled_date
                        ? new Date(record.scheduled_date).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {record.cost
                        ? `$${(typeof record.cost === 'number' ? record.cost : parseFloat(String(record.cost || 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {record.technician ? (
                        <div className="text-sm">
                          <div>{record.technician}</div>
                          {record.technician_contact && (
                            <div className="text-muted-foreground">{record.technician_contact}</div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(record)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(record)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMaintenance ? 'Edit Maintenance Record' : 'Create Maintenance Record'}
            </DialogTitle>
            <DialogDescription>
              {selectedMaintenance
                ? 'Update maintenance record details'
                : 'Create a new maintenance record'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="asset_id">Asset *</Label>
                  <Select
                    value={formData.asset_id || ''}
                    onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.asset_number} - {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Maintenance title"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="maintenance_type">Type</Label>
                  <Select
                    value={formData.maintenance_type || 'scheduled'}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, maintenance_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="preventive">Preventive</SelectItem>
                      <SelectItem value="corrective">Corrective</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status || 'scheduled'}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority || 'normal'}
                    onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
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
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">Scheduled Date</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={formData.scheduled_date || ''}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date || ''}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="completed_date">Completed Date</Label>
                  <Input
                    id="completed_date"
                    type="date"
                    value={formData.completed_date || ''}
                    onChange={(e) => setFormData({ ...formData, completed_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Maintenance description..."
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="labor_hours">Labor Hours</Label>
                  <Input
                    id="labor_hours"
                    type="number"
                    step="0.5"
                    value={formData.labor_hours || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, labor_hours: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.0"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="technician">Technician</Label>
                  <Input
                    id="technician"
                    value={formData.technician || ''}
                    onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                    placeholder="Technician name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technician_contact">Technician Contact</Label>
                  <Input
                    id="technician_contact"
                    value={formData.technician_contact || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, technician_contact: e.target.value })
                    }
                    placeholder="Phone or email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parts_used">Parts Used</Label>
                <Textarea
                  id="parts_used"
                  value={formData.parts_used || ''}
                  onChange={(e) => setFormData({ ...formData, parts_used: e.target.value })}
                  placeholder="List parts used..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_maintenance_date">Next Maintenance Date</Label>
                <Input
                  id="next_maintenance_date"
                  type="date"
                  value={formData.next_maintenance_date || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, next_maintenance_date: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedMaintenance ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Maintenance Record Details</DialogTitle>
            <DialogDescription>View maintenance information</DialogDescription>
          </DialogHeader>
          {selectedMaintenance && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Title</Label>
                  <div className="mt-1 font-medium">{selectedMaintenance.title}</div>
                </div>
                <div>
                  <Label>Asset</Label>
                  <div className="mt-1">
                    {selectedMaintenance.asset_name ? (
                      <div>
                        <div className="font-mono text-sm">{selectedMaintenance.asset_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedMaintenance.asset_name}
                        </div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                <div>
                  <Label>Type</Label>
                  <div className="mt-1">
                    <Badge variant="outline">{selectedMaintenance.maintenance_type}</Badge>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedMaintenance.status)}</div>
                </div>
                <div>
                  <Label>Priority</Label>
                  <div className="mt-1">{getPriorityBadge(selectedMaintenance.priority)}</div>
                </div>
                {selectedMaintenance.scheduled_date && (
                  <div>
                    <Label>Scheduled Date</Label>
                    <div className="mt-1">
                      {new Date(selectedMaintenance.scheduled_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {selectedMaintenance.due_date && (
                  <div>
                    <Label>Due Date</Label>
                    <div className="mt-1">
                      {new Date(selectedMaintenance.due_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {selectedMaintenance.completed_date && (
                  <div>
                    <Label>Completed Date</Label>
                    <div className="mt-1">
                      {new Date(selectedMaintenance.completed_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {selectedMaintenance.cost && (
                  <div>
                    <Label>Cost</Label>
                    <div className="mt-1">
                      $
                      {(typeof selectedMaintenance.cost === 'number'
                        ? selectedMaintenance.cost
                        : parseFloat(String(selectedMaintenance.cost || 0))
                      ).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                )}
                {selectedMaintenance.technician && (
                  <div>
                    <Label>Technician</Label>
                    <div className="mt-1">
                      <div>{selectedMaintenance.technician}</div>
                      {selectedMaintenance.technician_contact && (
                        <div className="text-sm text-muted-foreground">
                          {selectedMaintenance.technician_contact}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {selectedMaintenance.labor_hours && (
                  <div>
                    <Label>Labor Hours</Label>
                    <div className="mt-1">{selectedMaintenance.labor_hours}</div>
                  </div>
                )}
                {selectedMaintenance.description && (
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <div className="mt-1">{selectedMaintenance.description}</div>
                  </div>
                )}
                {selectedMaintenance.parts_used && (
                  <div className="md:col-span-2">
                    <Label>Parts Used</Label>
                    <div className="mt-1">{selectedMaintenance.parts_used}</div>
                  </div>
                )}
                {selectedMaintenance.notes && (
                  <div className="md:col-span-2">
                    <Label>Notes</Label>
                    <div className="mt-1">{selectedMaintenance.notes}</div>
                  </div>
                )}
                {selectedMaintenance.next_maintenance_date && (
                  <div>
                    <Label>Next Maintenance Date</Label>
                    <div className="mt-1">
                      {new Date(selectedMaintenance.next_maintenance_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
                <div>
                  <Label>Created</Label>
                  <div className="mt-1">
                    {new Date(selectedMaintenance.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedMaintenance && (
              <Button
                onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEdit(selectedMaintenance);
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

