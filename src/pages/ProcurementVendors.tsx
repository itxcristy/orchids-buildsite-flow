/**
 * Procurement Vendors Page
 * Complete vendor/supplier management interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Star,
  TrendingUp,
  MoreVertical,
  Eye,
  FileText,
} from 'lucide-react';
import {
  getSuppliers,
  createSupplier,
  getSupplierById,
  updateSupplier,
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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ProcurementVendors() {
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();

  // Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  // Supplier form
  const [supplierForm, setSupplierForm] = useState({
    code: '',
    name: '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    alternate_phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    tax_id: '',
    payment_terms: '',
    credit_limit: '',
    rating: 0,
    is_preferred: false,
    notes: '',
  });

  // Fetch data
  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = suppliers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s =>
        statusFilter === 'active' ? s.is_active : !s.is_active
      );
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      const minRating = parseInt(ratingFilter);
      filtered = filtered.filter(s => (s.rating || 0) >= minRating);
    }

    setFilteredSuppliers(filtered);
  }, [suppliers, searchTerm, statusFilter, ratingFilter]);

  const fetchSuppliers = async () => {
    try {
      setInitialLoad(true);
      setLoading(true);
      const data = await getSuppliers();
      setSuppliers(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch suppliers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const handleCreateSupplier = async () => {
    try {
      setLoading(true);
      const supplierData = {
        ...supplierForm,
        credit_limit: supplierForm.credit_limit ? parseFloat(supplierForm.credit_limit) : null,
        rating: supplierForm.rating || 0,
      };

      if (isEditing && selectedSupplier) {
        await updateSupplier(selectedSupplier.id, supplierData);
        toast({
          title: 'Success',
          description: 'Supplier updated successfully',
        });
      } else {
        await createSupplier(supplierData);
        toast({
          title: 'Success',
          description: 'Supplier created successfully',
        });
      }
      setShowSupplierDialog(false);
      resetForm();
      fetchSuppliers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save supplier',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSupplier = async (supplier: Supplier) => {
    try {
      const fullSupplier = await getSupplierById(supplier.id);
      setSelectedSupplier(fullSupplier);
      setIsEditing(true);
      setSupplierForm({
        code: fullSupplier.code || '',
        name: fullSupplier.name,
        company_name: fullSupplier.company_name || '',
        contact_person: fullSupplier.contact_person || '',
        email: fullSupplier.email || '',
        phone: fullSupplier.phone || '',
        alternate_phone: fullSupplier.alternate_phone || '',
        address: fullSupplier.address || '',
        city: fullSupplier.city || '',
        state: fullSupplier.state || '',
        postal_code: fullSupplier.postal_code || '',
        country: fullSupplier.country || 'India',
        tax_id: fullSupplier.tax_id || '',
        payment_terms: fullSupplier.payment_terms || '',
        credit_limit: fullSupplier.credit_limit?.toString() || '',
        rating: fullSupplier.rating || 0,
        is_preferred: fullSupplier.is_preferred,
        notes: fullSupplier.notes || '',
      });
      setShowSupplierDialog(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load supplier details',
        variant: 'destructive',
      });
    }
  };

  const handleViewSupplier = async (supplier: Supplier) => {
    try {
      const fullSupplier = await getSupplierById(supplier.id);
      setSelectedSupplier(fullSupplier);
      setShowViewDialog(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load supplier details',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setSupplierForm({
      code: '',
      name: '',
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      alternate_phone: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
      tax_id: '',
      payment_terms: '',
      credit_limit: '',
      rating: 0,
      is_preferred: false,
      notes: '',
    });
    setSelectedSupplier(null);
    setIsEditing(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowSupplierDialog(true);
  };

  // Calculate statistics
  const activeSuppliers = suppliers.filter(s => s.is_active).length;
  const preferredSuppliers = suppliers.filter(s => s.is_preferred).length;
  const averageRating = suppliers.length > 0
    ? suppliers.reduce((sum, s) => {
        const rating = typeof s.rating === 'number' ? s.rating : parseFloat(String(s.rating || 0));
        return sum + (isNaN(rating) ? 0 : rating);
      }, 0) / suppliers.length
    : 0;

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
          <h1 className="text-3xl font-bold">Vendor Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your suppliers and vendor relationships
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeSuppliers} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preferred Vendors</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{preferredSuppliers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Out of 5.0
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              {((activeSuppliers / suppliers.length) * 100).toFixed(0)}% of total
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
                  placeholder="Search vendors..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Minimum Rating</Label>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All ratings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="4">4+ Stars</SelectItem>
                  <SelectItem value="3">3+ Stars</SelectItem>
                  <SelectItem value="2">2+ Stars</SelectItem>
                  <SelectItem value="1">1+ Star</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendors ({filteredSuppliers.length})</CardTitle>
          <CardDescription>
            Manage your supplier relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && filteredSuppliers.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <Alert>
              <AlertDescription>
                No vendors found. {searchTerm || statusFilter !== 'all' || ratingFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Create your first vendor to get started.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-mono text-sm">{supplier.code || '-'}</TableCell>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.company_name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {supplier.contact_person && (
                            <span className="text-sm">{supplier.contact_person}</span>
                          )}
                          {supplier.phone && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {supplier.phone}
                            </span>
                          )}
                          {supplier.email && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {supplier.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.city && (
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                            <span className="text-sm">
                              {supplier.city}
                              {supplier.state && `, ${supplier.state}`}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className={`h-4 w-4 mr-1 ${(supplier.rating || 0) >= 4 ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                          <span className="text-sm">{supplier.rating || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                            {supplier.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {supplier.is_preferred && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                              Preferred
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewSupplier(supplier)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditSupplier(supplier)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" />
                              View Contracts
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <TrendingUp className="mr-2 h-4 w-4" />
                              View Performance
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

      {/* Create/Edit Supplier Dialog */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Vendor' : 'Create New Vendor'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update vendor information' : 'Add a new vendor/supplier'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="code">Vendor Code</Label>
                <Input
                  id="code"
                  value={supplierForm.code}
                  onChange={(e) => setSupplierForm({ ...supplierForm, code: e.target.value })}
                  placeholder="VENDOR-001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Vendor Name *</Label>
                <Input
                  id="name"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="Vendor name"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={supplierForm.company_name}
                onChange={(e) => setSupplierForm({ ...supplierForm, company_name: e.target.value })}
                placeholder="Company name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={supplierForm.contact_person}
                onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                placeholder="Contact person name"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  placeholder="+91 1234567890"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  placeholder="vendor@example.com"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={supplierForm.address}
                onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                placeholder="Street address"
                rows={2}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={supplierForm.city}
                  onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={supplierForm.state}
                  onChange={(e) => setSupplierForm({ ...supplierForm, state: e.target.value })}
                  placeholder="State"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={supplierForm.postal_code}
                  onChange={(e) => setSupplierForm({ ...supplierForm, postal_code: e.target.value })}
                  placeholder="123456"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="tax_id">Tax ID / GSTIN</Label>
                <Input
                  id="tax_id"
                  value={supplierForm.tax_id}
                  onChange={(e) => setSupplierForm({ ...supplierForm, tax_id: e.target.value })}
                  placeholder="GSTIN or Tax ID"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Input
                  id="payment_terms"
                  value={supplierForm.payment_terms}
                  onChange={(e) => setSupplierForm({ ...supplierForm, payment_terms: e.target.value })}
                  placeholder="e.g., Net 30"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="credit_limit">Credit Limit</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  value={supplierForm.credit_limit}
                  onChange={(e) => setSupplierForm({ ...supplierForm, credit_limit: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="rating">Rating (0-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={supplierForm.rating}
                  onChange={(e) => setSupplierForm({ ...supplierForm, rating: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="preferred"
                  checked={supplierForm.is_preferred}
                  onCheckedChange={(checked) =>
                    setSupplierForm({ ...supplierForm, is_preferred: checked })
                  }
                />
                <Label htmlFor="preferred">Preferred Vendor</Label>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={supplierForm.notes}
                onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                placeholder="Additional notes"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSupplier} disabled={loading || !supplierForm.name}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'} Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Supplier Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
            <DialogDescription>
              View complete vendor information
            </DialogDescription>
          </DialogHeader>
          {selectedSupplier && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Name</Label>
                <p>{selectedSupplier.name}</p>
              </div>
              {selectedSupplier.company_name && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Company</Label>
                  <p>{selectedSupplier.company_name}</p>
                </div>
              )}
              {selectedSupplier.contact_person && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Contact Person</Label>
                  <p>{selectedSupplier.contact_person}</p>
                </div>
              )}
              {(selectedSupplier.phone || selectedSupplier.email) && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Contact Information</Label>
                  <div className="space-y-1">
                    {selectedSupplier.phone && (
                      <p className="text-sm flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        {selectedSupplier.phone}
                      </p>
                    )}
                    {selectedSupplier.email && (
                      <p className="text-sm flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        {selectedSupplier.email}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {selectedSupplier.address && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Address</Label>
                  <p className="text-sm text-muted-foreground">{selectedSupplier.address}</p>
                </div>
              )}
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex gap-2">
                  <Badge variant={selectedSupplier.is_active ? 'default' : 'secondary'}>
                    {selectedSupplier.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {selectedSupplier.is_preferred && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                      Preferred
                    </Badge>
                  )}
                  {selectedSupplier.rating && (
                    <Badge variant="outline">
                      <Star className="h-3 w-3 mr-1" />
                      {selectedSupplier.rating}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedSupplier && (
              <Button onClick={() => {
                setShowViewDialog(false);
                handleEditSupplier(selectedSupplier);
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

