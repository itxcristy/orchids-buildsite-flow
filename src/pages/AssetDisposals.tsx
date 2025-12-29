/**
 * Asset Disposals Page
 * Manage asset disposals and write-offs
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Trash2,
  Plus,
  Search,
  Loader2,
  Edit,
  Eye,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  TrendingDown,
} from 'lucide-react';
import {
  getAllDisposals,
  getDisposalById,
  createDisposal,
  updateDisposal,
  deleteDisposal,
  approveDisposal,
  getAssets,
  type DisposalRecord,
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

export default function AssetDisposals() {
  const { toast } = useToast();
  const [disposals, setDisposals] = useState<DisposalRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDisposal, setSelectedDisposal] = useState<DisposalRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<DisposalRecord>>({
    asset_id: '',
    disposal_date: '',
    disposal_type: 'sale',
    disposal_reason: '',
    disposal_value: 0,
    buyer_name: '',
    buyer_contact: '',
    disposal_method: '',
    approval_status: 'pending',
    disposal_cost: 0,
    notes: '',
    document_url: '',
  });

  useEffect(() => {
    loadData();
    loadAssets();
  }, [filterType, filterStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterType !== 'all') filters.disposal_type = filterType;
      if (filterStatus !== 'all') filters.approval_status = filterStatus;

      const data = await getAllDisposals(filters);
      let filteredData = data;

      if (searchTerm) {
        filteredData = data.filter(
          (disposal) =>
            disposal.disposal_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            disposal.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            disposal.asset_number?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setDisposals(filteredData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load disposals',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAssets = async () => {
    try {
      const data = await getAssets({ status: 'active' });
      setAssets(data);
    } catch (error: any) {
      console.error('Failed to load assets:', error);
    }
  };

  const handleCreate = () => {
    setFormData({
      asset_id: '',
      disposal_date: '',
      disposal_type: 'sale',
      disposal_reason: '',
      disposal_value: 0,
      buyer_name: '',
      buyer_contact: '',
      disposal_method: '',
      approval_status: 'pending',
      disposal_cost: 0,
      notes: '',
      document_url: '',
    });
    setSelectedDisposal(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (disposal: DisposalRecord) => {
    setFormData({
      ...disposal,
    });
    setSelectedDisposal(disposal);
    setIsDialogOpen(true);
  };

  const handleView = async (disposal: DisposalRecord) => {
    try {
      const fullDisposal = await getDisposalById(disposal.id);
      setSelectedDisposal(fullDisposal);
      setIsViewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load disposal details',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (disposal: DisposalRecord) => {
    if (!confirm(`Are you sure you want to approve disposal "${disposal.disposal_number}"?`)) {
      return;
    }

    try {
      await approveDisposal(disposal.id);
      toast({
        title: 'Success',
        description: 'Disposal approved successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve disposal',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (selectedDisposal) {
        await updateDisposal(selectedDisposal.id, formData);
        toast({
          title: 'Success',
          description: 'Disposal updated successfully',
        });
      } else {
        await createDisposal(formData);
        toast({
          title: 'Success',
          description: 'Disposal created successfully',
        });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save disposal',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (disposal: DisposalRecord) => {
    if (!confirm(`Are you sure you want to delete disposal "${disposal.disposal_number}"?`)) {
      return;
    }

    try {
      await deleteDisposal(disposal.id);
      toast({
        title: 'Success',
        description: 'Disposal deleted successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete disposal',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      approved: 'default',
      pending: 'secondary',
      rejected: 'destructive',
    };
    const icons: Record<string, any> = {
      approved: CheckCircle2,
      pending: Clock,
      rejected: XCircle,
    };
    const Icon = icons[status] || FileText;

    return (
      <Badge variant={variants[status] || 'secondary'}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      sale: 'bg-green-100 text-green-800',
      scrap: 'bg-gray-100 text-gray-800',
      donation: 'bg-blue-100 text-blue-800',
      write_off: 'bg-red-100 text-red-800',
      transfer: 'bg-purple-100 text-purple-800',
    };
    return (
      <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>
        {type.replace('_', ' ')}
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
    total: disposals.length,
    pending: disposals.filter((d) => d.approval_status === 'pending').length,
    approved: disposals.filter((d) => d.approval_status === 'approved').length,
    totalValue: disposals.reduce((sum, d) => {
      const value = typeof d.disposal_value === 'number' ? d.disposal_value : parseFloat(String(d.disposal_value || 0));
      return sum + value;
    }, 0),
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Disposals</h1>
          <p className="text-muted-foreground">Manage asset disposals and write-offs</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Disposal
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disposals</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
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
              <CardTitle>Disposals</CardTitle>
              <CardDescription>Asset disposal records and approvals</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search disposals..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    loadData();
                  }}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="scrap">Scrap</SelectItem>
                <SelectItem value="donation">Donation</SelectItem>
                <SelectItem value="write_off">Write Off</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : disposals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No disposals found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Disposal Number</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Net Proceeds</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disposals.map((disposal) => (
                  <TableRow key={disposal.id}>
                    <TableCell className="font-medium">{disposal.disposal_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{disposal.asset_name || '-'}</div>
                        <div className="text-sm text-muted-foreground">
                          {disposal.asset_number || '-'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(disposal.disposal_type)}</TableCell>
                    <TableCell>
                      {disposal.disposal_date
                        ? new Date(disposal.disposal_date).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>{formatCurrency(disposal.disposal_value)}</TableCell>
                    <TableCell>{formatCurrency(disposal.net_proceeds)}</TableCell>
                    <TableCell>{getStatusBadge(disposal.approval_status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(disposal)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {disposal.approval_status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(disposal)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(disposal)}
                              className="text-green-600"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(disposal)}
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
              {selectedDisposal ? 'Edit Disposal' : 'Create Disposal'}
            </DialogTitle>
            <DialogDescription>
              {selectedDisposal
                ? 'Update disposal details'
                : 'Create a new asset disposal record'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Asset *</Label>
              <Select
                value={formData.asset_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, asset_id: value })
                }
                disabled={!!selectedDisposal}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} ({asset.asset_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Disposal Date *</Label>
                <Input
                  type="date"
                  value={formData.disposal_date}
                  onChange={(e) =>
                    setFormData({ ...formData, disposal_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Disposal Type *</Label>
                <Select
                  value={formData.disposal_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, disposal_type: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="scrap">Scrap</SelectItem>
                    <SelectItem value="donation">Donation</SelectItem>
                    <SelectItem value="write_off">Write Off</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Disposal Reason</Label>
              <Textarea
                value={formData.disposal_reason}
                onChange={(e) =>
                  setFormData({ ...formData, disposal_reason: e.target.value })
                }
                placeholder="Reason for disposal"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Disposal Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.disposal_value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      disposal_value: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Disposal Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.disposal_cost}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      disposal_cost: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            {formData.disposal_type === 'sale' && (
              <>
                <div>
                  <Label>Buyer Name</Label>
                  <Input
                    value={formData.buyer_name}
                    onChange={(e) =>
                      setFormData({ ...formData, buyer_name: e.target.value })
                    }
                    placeholder="Buyer name"
                  />
                </div>
                <div>
                  <Label>Buyer Contact</Label>
                  <Input
                    value={formData.buyer_contact}
                    onChange={(e) =>
                      setFormData({ ...formData, buyer_contact: e.target.value })
                    }
                    placeholder="Contact information"
                  />
                </div>
                <div>
                  <Label>Disposal Method</Label>
                  <Select
                    value={formData.disposal_method}
                    onValueChange={(value) =>
                      setFormData({ ...formData, disposal_method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auction">Auction</SelectItem>
                      <SelectItem value="direct_sale">Direct Sale</SelectItem>
                      <SelectItem value="scrap_dealer">Scrap Dealer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div>
              <Label>Document URL</Label>
              <Input
                value={formData.document_url}
                onChange={(e) =>
                  setFormData({ ...formData, document_url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedDisposal ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Disposal Details</DialogTitle>
            <DialogDescription>View disposal information</DialogDescription>
          </DialogHeader>
          {selectedDisposal && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Disposal Number</Label>
                <p className="font-medium">{selectedDisposal.disposal_number}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Asset</Label>
                <p className="font-medium">
                  {selectedDisposal.asset_name} ({selectedDisposal.asset_number})
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Disposal Type</Label>
                  <div className="mt-1">{getTypeBadge(selectedDisposal.disposal_type)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedDisposal.approval_status)}</div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Disposal Date</Label>
                <p>
                  {selectedDisposal.disposal_date
                    ? new Date(selectedDisposal.disposal_date).toLocaleDateString()
                    : '-'}
                </p>
              </div>
              {selectedDisposal.disposal_reason && (
                <div>
                  <Label className="text-muted-foreground">Reason</Label>
                  <p className="whitespace-pre-wrap">{selectedDisposal.disposal_reason}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Disposal Value</Label>
                  <p className="font-medium">{formatCurrency(selectedDisposal.disposal_value)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Disposal Cost</Label>
                  <p className="font-medium">{formatCurrency(selectedDisposal.disposal_cost)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Net Proceeds</Label>
                  <p className="font-medium">{formatCurrency(selectedDisposal.net_proceeds)}</p>
                </div>
              </div>
              {selectedDisposal.buyer_name && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Buyer Name</Label>
                    <p>{selectedDisposal.buyer_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Buyer Contact</Label>
                    <p>{selectedDisposal.buyer_contact}</p>
                  </div>
                </div>
              )}
              {selectedDisposal.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="whitespace-pre-wrap">{selectedDisposal.notes}</p>
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

