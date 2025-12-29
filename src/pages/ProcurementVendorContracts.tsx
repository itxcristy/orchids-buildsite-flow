/**
 * Vendor Contracts Page
 * Manage vendor contracts and agreements
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
  Trash2,
  Eye,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileSignature,
} from 'lucide-react';
import {
  getVendorContracts,
  getVendorContractById,
  createVendorContract,
  updateVendorContract,
  deleteVendorContract,
  getSuppliers,
  type VendorContract,
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

export default function ProcurementVendorContracts() {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<VendorContract | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<VendorContract>>({
    supplier_id: '',
    title: '',
    contract_type: '',
    start_date: '',
    end_date: '',
    value: undefined,
    currency: 'INR',
    terms_conditions: '',
    renewal_terms: '',
    status: 'draft',
    signed_date: '',
    document_url: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
    loadSuppliers();
  }, [filterStatus, filterType]);

  const loadData = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterStatus !== 'all') filters.status = filterStatus;
      if (filterType !== 'all') filters.contract_type = filterType;

      const data = await getVendorContracts(filters);
      let filteredData = data;

      if (searchTerm) {
        filteredData = data.filter(
          (contract) =>
            contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contract.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setContracts(filteredData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load vendor contracts',
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
      title: '',
      contract_type: '',
      start_date: '',
      end_date: '',
      value: undefined,
      currency: 'INR',
      terms_conditions: '',
      renewal_terms: '',
      status: 'draft',
      signed_date: '',
      document_url: '',
      notes: '',
    });
    setSelectedContract(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (contract: VendorContract) => {
    setFormData({
      ...contract,
    });
    setSelectedContract(contract);
    setIsDialogOpen(true);
  };

  const handleView = async (contract: VendorContract) => {
    try {
      const fullContract = await getVendorContractById(contract.id);
      setSelectedContract(fullContract);
      setIsViewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load contract details',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (selectedContract) {
        await updateVendorContract(selectedContract.id, formData);
        toast({
          title: 'Success',
          description: 'Contract updated successfully',
        });
      } else {
        await createVendorContract(formData);
        toast({
          title: 'Success',
          description: 'Contract created successfully',
        });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save contract',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (contract: VendorContract) => {
    if (!confirm(`Are you sure you want to delete "${contract.title}"?`)) {
      return;
    }

    try {
      await deleteVendorContract(contract.id);
      toast({
        title: 'Success',
        description: 'Contract deleted successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete contract',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      draft: 'secondary',
      expired: 'destructive',
      terminated: 'outline',
    };
    const icons: Record<string, any> = {
      active: CheckCircle2,
      draft: Clock,
      expired: XCircle,
      terminated: AlertTriangle,
    };
    const Icon = icons[status] || FileText;

    return (
      <Badge variant={variants[status] || 'secondary'}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
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
    total: contracts.length,
    active: contracts.filter((c) => c.status === 'active').length,
    expired: contracts.filter((c) => c.status === 'expired').length,
    draft: contracts.filter((c) => c.status === 'draft').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendor Contracts</h1>
          <p className="text-muted-foreground">Manage vendor contracts and agreements</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Contract
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
            <FileSignature className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contracts</CardTitle>
              <CardDescription>Manage vendor contracts and agreements</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contracts..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    loadData();
                  }}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="goods">Goods</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contracts found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{contract.contract_number}</TableCell>
                    <TableCell>{contract.title}</TableCell>
                    <TableCell>{contract.supplier_name || '-'}</TableCell>
                    <TableCell>{contract.contract_type || '-'}</TableCell>
                    <TableCell>{formatCurrency(contract.value)}</TableCell>
                    <TableCell>
                      {contract.start_date
                        ? new Date(contract.start_date).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {contract.end_date
                        ? new Date(contract.end_date).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(contract.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(contract)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(contract)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(contract)}
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
              {selectedContract ? 'Edit Contract' : 'Create Contract'}
            </DialogTitle>
            <DialogDescription>
              {selectedContract
                ? 'Update contract details'
                : 'Create a new vendor contract'}
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
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Contract title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contract Type</Label>
                <Select
                  value={formData.contract_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, contract_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="goods">Goods</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      value: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
                  }
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
            <div>
              <Label>Terms & Conditions</Label>
              <Textarea
                value={formData.terms_conditions}
                onChange={(e) =>
                  setFormData({ ...formData, terms_conditions: e.target.value })
                }
                placeholder="Contract terms and conditions"
                rows={4}
              />
            </div>
            <div>
              <Label>Renewal Terms</Label>
              <Textarea
                value={formData.renewal_terms}
                onChange={(e) =>
                  setFormData({ ...formData, renewal_terms: e.target.value })
                }
                placeholder="Renewal terms and conditions"
                rows={3}
              />
            </div>
            <div>
              <Label>Signed Date</Label>
              <Input
                type="date"
                value={formData.signed_date}
                onChange={(e) =>
                  setFormData({ ...formData, signed_date: e.target.value })
                }
              />
            </div>
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
              {selectedContract ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contract Details</DialogTitle>
            <DialogDescription>View contract information</DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Contract Number</Label>
                <p className="font-medium">{selectedContract.contract_number}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Title</Label>
                <p className="font-medium">{selectedContract.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Supplier</Label>
                  <p>{selectedContract.supplier_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p>{selectedContract.contract_type || '-'}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">{getStatusBadge(selectedContract.status)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Start Date</Label>
                  <p>
                    {selectedContract.start_date
                      ? new Date(selectedContract.start_date).toLocaleDateString()
                      : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">End Date</Label>
                  <p>
                    {selectedContract.end_date
                      ? new Date(selectedContract.end_date).toLocaleDateString()
                      : '-'}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Value</Label>
                <p className="font-medium">{formatCurrency(selectedContract.value)}</p>
              </div>
              {selectedContract.terms_conditions && (
                <div>
                  <Label className="text-muted-foreground">Terms & Conditions</Label>
                  <p className="whitespace-pre-wrap">{selectedContract.terms_conditions}</p>
                </div>
              )}
              {selectedContract.renewal_terms && (
                <div>
                  <Label className="text-muted-foreground">Renewal Terms</Label>
                  <p className="whitespace-pre-wrap">{selectedContract.renewal_terms}</p>
                </div>
              )}
              {selectedContract.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="whitespace-pre-wrap">{selectedContract.notes}</p>
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

