/**
 * Asset Depreciation Page
 * Complete asset depreciation tracking interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingDown,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Eye,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Calculator,
} from 'lucide-react';
import {
  getAllDepreciation,
  createDepreciation,
  updateDepreciation,
  deleteDepreciation,
  getAssets,
  type DepreciationRecord,
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

export default function AssetDepreciation() {
  const { toast } = useToast();
  const [depreciation, setDepreciation] = useState<DepreciationRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAsset, setFilterAsset] = useState<string>('all');
  const [filterPosted, setFilterPosted] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDepreciation, setSelectedDepreciation] = useState<DepreciationRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<DepreciationRecord>>({
    asset_id: '',
    depreciation_date: '',
    period_start: '',
    period_end: '',
    depreciation_amount: 0,
    accumulated_depreciation: 0,
    book_value: 0,
    depreciation_method: 'straight_line',
    is_posted: false,
    journal_entry_id: '',
    notes: '',
  });

  useEffect(() => {
    loadAssets();
    loadData();
  }, [filterAsset, filterPosted, filterMethod, dateFrom, dateTo]);

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
      if (filterAsset !== 'all') filters.asset_id = filterAsset;
      if (filterPosted !== 'all') filters.is_posted = filterPosted === 'posted';
      if (filterMethod !== 'all') filters.depreciation_method = filterMethod;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (searchTerm) filters.search = searchTerm;

      const data = await getAllDepreciation(filters);
      setDepreciation(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load depreciation records',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      asset_id: '',
      depreciation_date: '',
      period_start: '',
      period_end: '',
      depreciation_amount: 0,
      accumulated_depreciation: 0,
      book_value: 0,
      depreciation_method: 'straight_line',
      is_posted: false,
      journal_entry_id: '',
      notes: '',
    });
    setSelectedDepreciation(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (record: DepreciationRecord) => {
    setFormData({
      ...record,
    });
    setSelectedDepreciation(record);
    setIsDialogOpen(true);
  };

  const handleView = (record: DepreciationRecord) => {
    setSelectedDepreciation(record);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (record: DepreciationRecord) => {
    if (!confirm(`Are you sure you want to delete depreciation record for ${record.asset_name || 'asset'}?`)) {
      return;
    }

    try {
      await deleteDepreciation(record.id);
      toast({
        title: 'Success',
        description: 'Depreciation record deleted successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete depreciation record',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_id || !formData.depreciation_date || !formData.period_start || !formData.period_end) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedDepreciation) {
        await updateDepreciation(selectedDepreciation.id, formData);
        toast({
          title: 'Success',
          description: 'Depreciation record updated successfully',
        });
      } else {
        await createDepreciation(formData);
        toast({
          title: 'Success',
          description: 'Depreciation record created successfully',
        });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save depreciation record',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = {
    total: depreciation.length,
    posted: depreciation.filter((d) => d.is_posted).length,
    unposted: depreciation.filter((d) => !d.is_posted).length,
    totalDepreciation: depreciation.reduce((sum, d) => {
      const amount = typeof d.depreciation_amount === 'number' ? d.depreciation_amount : parseFloat(String(d.depreciation_amount || 0));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0),
    totalAccumulated: depreciation.length > 0
      ? (typeof depreciation[0].accumulated_depreciation === 'number'
          ? depreciation[0].accumulated_depreciation
          : parseFloat(String(depreciation[0].accumulated_depreciation || 0)))
      : 0,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Depreciation</h1>
          <p className="text-muted-foreground">Track and manage asset depreciation records</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Depreciation
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.posted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unposted</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unposted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Depreciation</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(typeof stats.totalDepreciation === 'number' ? stats.totalDepreciation : parseFloat(String(stats.totalDepreciation || 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          <div className="grid gap-4 md:grid-cols-6">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
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
              <Label>Posted Status</Label>
              <Select value={filterPosted} onValueChange={setFilterPosted}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                  <SelectItem value="unposted">Unposted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={filterMethod} onValueChange={setFilterMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="straight_line">Straight Line</SelectItem>
                  <SelectItem value="declining_balance">Declining Balance</SelectItem>
                  <SelectItem value="units_of_production">Units of Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Depreciation Table */}
      <Card>
        <CardHeader>
          <CardTitle>Depreciation Records</CardTitle>
          <CardDescription>Manage all asset depreciation calculations</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : depreciation.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No depreciation records found. Create your first depreciation record to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Depreciation Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Depreciation Amount</TableHead>
                  <TableHead>Accumulated</TableHead>
                  <TableHead>Book Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depreciation.map((record) => (
                  <TableRow key={record.id}>
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
                      {new Date(record.depreciation_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(record.period_start).toLocaleDateString()}</div>
                        <div className="text-muted-foreground">to</div>
                        <div>{new Date(record.period_end).toLocaleDateString()}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {record.depreciation_method.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      ${(typeof record.depreciation_amount === 'number' ? record.depreciation_amount : parseFloat(String(record.depreciation_amount || 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      ${(typeof record.accumulated_depreciation === 'number' ? record.accumulated_depreciation : parseFloat(String(record.accumulated_depreciation || 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      ${(typeof record.book_value === 'number' ? record.book_value : parseFloat(String(record.book_value || 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.is_posted ? 'default' : 'secondary'}>
                        {record.is_posted ? (
                          <>
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Posted
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-1 h-3 w-3" />
                            Unposted
                          </>
                        )}
                      </Badge>
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
                        {!record.is_posted && (
                          <>
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
                          </>
                        )}
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
              {selectedDepreciation ? 'Edit Depreciation Record' : 'Create Depreciation Record'}
            </DialogTitle>
            <DialogDescription>
              {selectedDepreciation
                ? 'Update depreciation record details'
                : 'Create a new depreciation record'}
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
                    disabled={!!selectedDepreciation}
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
                  <Label htmlFor="depreciation_date">Depreciation Date *</Label>
                  <Input
                    id="depreciation_date"
                    type="date"
                    value={formData.depreciation_date || ''}
                    onChange={(e) => setFormData({ ...formData, depreciation_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="period_start">Period Start *</Label>
                  <Input
                    id="period_start"
                    type="date"
                    value={formData.period_start || ''}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period_end">Period End *</Label>
                  <Input
                    id="period_end"
                    type="date"
                    value={formData.period_end || ''}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="depreciation_method">Method</Label>
                  <Select
                    value={formData.depreciation_method || 'straight_line'}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, depreciation_method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="straight_line">Straight Line</SelectItem>
                      <SelectItem value="declining_balance">Declining Balance</SelectItem>
                      <SelectItem value="units_of_production">Units of Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depreciation_amount">Depreciation Amount</Label>
                  <Input
                    id="depreciation_amount"
                    type="number"
                    step="0.01"
                    value={formData.depreciation_amount || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        depreciation_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accumulated_depreciation">Accumulated Depreciation</Label>
                  <Input
                    id="accumulated_depreciation"
                    type="number"
                    step="0.01"
                    value={formData.accumulated_depreciation || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accumulated_depreciation: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="book_value">Book Value</Label>
                  <Input
                    id="book_value"
                    type="number"
                    step="0.01"
                    value={formData.book_value || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, book_value: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="journal_entry_id">Journal Entry ID</Label>
                  <Input
                    id="journal_entry_id"
                    value={formData.journal_entry_id || ''}
                    onChange={(e) => setFormData({ ...formData, journal_entry_id: e.target.value })}
                    placeholder="Journal entry reference"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
              {selectedDepreciation && (
                <div className="space-y-2 flex items-center gap-4 pt-2">
                  <Label htmlFor="is_posted">Posted to Ledger</Label>
                  <Badge variant={formData.is_posted ? 'default' : 'secondary'}>
                    {formData.is_posted ? 'Posted' : 'Unposted'}
                  </Badge>
                </div>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedDepreciation ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Depreciation Record Details</DialogTitle>
            <DialogDescription>View depreciation information</DialogDescription>
          </DialogHeader>
          {selectedDepreciation && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Asset</Label>
                  <div className="mt-1">
                    {selectedDepreciation.asset_name ? (
                      <div>
                        <div className="font-mono text-sm">{selectedDepreciation.asset_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedDepreciation.asset_name}
                        </div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                <div>
                  <Label>Depreciation Date</Label>
                  <div className="mt-1">
                    {new Date(selectedDepreciation.depreciation_date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <Label>Period Start</Label>
                  <div className="mt-1">
                    {new Date(selectedDepreciation.period_start).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <Label>Period End</Label>
                  <div className="mt-1">
                    {new Date(selectedDepreciation.period_end).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <Label>Method</Label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {selectedDepreciation.depreciation_method.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge variant={selectedDepreciation.is_posted ? 'default' : 'secondary'}>
                      {selectedDepreciation.is_posted ? 'Posted' : 'Unposted'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Depreciation Amount</Label>
                  <div className="mt-1">
                    $
                    {(typeof selectedDepreciation.depreciation_amount === 'number'
                      ? selectedDepreciation.depreciation_amount
                      : parseFloat(String(selectedDepreciation.depreciation_amount || 0))
                    ).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div>
                  <Label>Accumulated Depreciation</Label>
                  <div className="mt-1">
                    $
                    {(typeof selectedDepreciation.accumulated_depreciation === 'number'
                      ? selectedDepreciation.accumulated_depreciation
                      : parseFloat(String(selectedDepreciation.accumulated_depreciation || 0))
                    ).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div>
                  <Label>Book Value</Label>
                  <div className="mt-1">
                    $
                    {(typeof selectedDepreciation.book_value === 'number'
                      ? selectedDepreciation.book_value
                      : parseFloat(String(selectedDepreciation.book_value || 0))
                    ).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                {selectedDepreciation.journal_entry_id && (
                  <div>
                    <Label>Journal Entry ID</Label>
                    <div className="mt-1 font-mono text-sm">
                      {selectedDepreciation.journal_entry_id}
                    </div>
                  </div>
                )}
                {selectedDepreciation.posted_at && (
                  <div>
                    <Label>Posted At</Label>
                    <div className="mt-1">
                      {new Date(selectedDepreciation.posted_at).toLocaleString()}
                    </div>
                  </div>
                )}
                {selectedDepreciation.posted_by_email && (
                  <div>
                    <Label>Posted By</Label>
                    <div className="mt-1">{selectedDepreciation.posted_by_email}</div>
                  </div>
                )}
                {selectedDepreciation.notes && (
                  <div className="md:col-span-2">
                    <Label>Notes</Label>
                    <div className="mt-1">{selectedDepreciation.notes}</div>
                  </div>
                )}
                <div>
                  <Label>Created</Label>
                  <div className="mt-1">
                    {new Date(selectedDepreciation.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedDepreciation && !selectedDepreciation.is_posted && (
              <Button
                onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEdit(selectedDepreciation);
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

