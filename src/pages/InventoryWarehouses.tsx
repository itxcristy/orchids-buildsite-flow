/**
 * Inventory Warehouses Page
 * Multi-warehouse management interface
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Warehouse,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Building2,
  MoreVertical,
  Eye,
} from 'lucide-react';
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  type Warehouse as WarehouseType,
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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function InventoryWarehouses() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();

  // Warehouses
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState<WarehouseType[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType | null>(null);
  const [showWarehouseDialog, setShowWarehouseDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Warehouse form
  const [warehouseForm, setWarehouseForm] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    contact_person: '',
    phone: '',
    email: '',
    is_primary: false,
  });

  // Fetch data
  useEffect(() => {
    fetchWarehouses();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = warehouses;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(w =>
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.city && w.city.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(w =>
        statusFilter === 'active' ? w.is_active : !w.is_active
      );
    }

    setFilteredWarehouses(filtered);
  }, [warehouses, searchTerm, statusFilter]);

  const fetchWarehouses = async () => {
    try {
      setInitialLoad(true);
      setLoading(true);
      const data = await getWarehouses();
      setWarehouses(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch warehouses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const handleCreateWarehouse = async () => {
    try {
      setLoading(true);
      if (isEditing && selectedWarehouse) {
        await updateWarehouse(selectedWarehouse.id, warehouseForm);
        toast({
          title: 'Success',
          description: 'Warehouse updated successfully',
        });
      } else {
        await createWarehouse(warehouseForm);
        toast({
          title: 'Success',
          description: 'Warehouse created successfully',
        });
      }
      setShowWarehouseDialog(false);
      resetForm();
      fetchWarehouses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save warehouse',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditWarehouse = (warehouse: WarehouseType) => {
    setSelectedWarehouse(warehouse);
    setIsEditing(true);
    setWarehouseForm({
      code: warehouse.code,
      name: warehouse.name,
      address: warehouse.address || '',
      city: warehouse.city || '',
      state: warehouse.state || '',
      postal_code: warehouse.postal_code || '',
      country: warehouse.country || 'India',
      contact_person: warehouse.contact_person || '',
      phone: warehouse.phone || '',
      email: warehouse.email || '',
      is_primary: warehouse.is_primary,
    });
    setShowWarehouseDialog(true);
  };

  const handleViewWarehouse = (warehouse: WarehouseType) => {
    setSelectedWarehouse(warehouse);
    setShowViewDialog(true);
  };

  const handleDeleteWarehouse = async (warehouse: WarehouseType) => {
    if (!confirm(`Are you sure you want to delete "${warehouse.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteWarehouse(warehouse.id);
      toast({
        title: 'Success',
        description: 'Warehouse deleted successfully',
      });
      fetchWarehouses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete warehouse',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setWarehouseForm({
      code: '',
      name: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
      contact_person: '',
      phone: '',
      email: '',
      is_primary: false,
    });
    setSelectedWarehouse(null);
    setIsEditing(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowWarehouseDialog(true);
  };

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
          <h1 className="text-3xl font-bold">Warehouse Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your warehouse locations and inventory storage
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Warehouse
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Warehouses</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouses.length}</div>
            <p className="text-xs text-muted-foreground">
              {warehouses.filter(w => w.is_active).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Primary Warehouse</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {warehouses.filter(w => w.is_primary).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Warehouses</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {warehouses.filter(w => w.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(warehouses.map(w => w.city).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique cities</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search warehouses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warehouses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Warehouses ({filteredWarehouses.length})</CardTitle>
          <CardDescription>
            Manage your warehouse locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && filteredWarehouses.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredWarehouses.length === 0 ? (
            <Alert>
              <AlertDescription>
                No warehouses found. {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Create your first warehouse to get started.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWarehouses.map((warehouse) => (
                    <TableRow key={warehouse.id}>
                      <TableCell className="font-mono text-sm">{warehouse.code}</TableCell>
                      <TableCell className="font-medium">{warehouse.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {warehouse.city && <span>{warehouse.city}</span>}
                          {warehouse.state && (
                            <span className="text-xs text-muted-foreground">
                              {warehouse.state}, {warehouse.country}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {warehouse.contact_person && (
                            <span className="text-sm">{warehouse.contact_person}</span>
                          )}
                          {warehouse.phone && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {warehouse.phone}
                            </span>
                          )}
                          {warehouse.email && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {warehouse.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {warehouse.is_primary ? (
                          <Badge variant="default">Primary</Badge>
                        ) : (
                          <span className="text-muted-foreground">Standard</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={warehouse.is_active ? 'default' : 'secondary'}>
                          {warehouse.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewWarehouse(warehouse)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditWarehouse(warehouse)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/inventory/stock-levels?warehouse=${warehouse.id}`)}
                            >
                              View Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteWarehouse(warehouse)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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

      {/* Create/Edit Warehouse Dialog */}
      <Dialog open={showWarehouseDialog} onOpenChange={setShowWarehouseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Warehouse' : 'Create New Warehouse'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update warehouse information' : 'Add a new warehouse location'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="code">Warehouse Code *</Label>
                <Input
                  id="code"
                  value={warehouseForm.code}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                  placeholder="WH-001"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Warehouse Name *</Label>
                <Input
                  id="name"
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  placeholder="Main Warehouse"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={warehouseForm.address}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                placeholder="Street address"
                rows={2}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={warehouseForm.city}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={warehouseForm.state}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, state: e.target.value })}
                  placeholder="State"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={warehouseForm.postal_code}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, postal_code: e.target.value })}
                  placeholder="123456"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={warehouseForm.country}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, country: e.target.value })}
                placeholder="Country"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={warehouseForm.contact_person}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, contact_person: e.target.value })}
                placeholder="Contact person name"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={warehouseForm.phone}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, phone: e.target.value })}
                  placeholder="+91 1234567890"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={warehouseForm.email}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, email: e.target.value })}
                  placeholder="warehouse@example.com"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="primary"
                checked={warehouseForm.is_primary}
                onCheckedChange={(checked) =>
                  setWarehouseForm({ ...warehouseForm, is_primary: checked })
                }
              />
              <Label htmlFor="primary">Set as Primary Warehouse</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWarehouseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWarehouse} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'} Warehouse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Warehouse Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Warehouse Details</DialogTitle>
            <DialogDescription>
              View complete warehouse information
            </DialogDescription>
          </DialogHeader>
          {selectedWarehouse && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Code</Label>
                <p className="font-mono">{selectedWarehouse.code}</p>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Name</Label>
                <p>{selectedWarehouse.name}</p>
              </div>
              {selectedWarehouse.address && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Address</Label>
                  <p className="text-sm text-muted-foreground">{selectedWarehouse.address}</p>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">City</Label>
                  <p>{selectedWarehouse.city || '-'}</p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">State</Label>
                  <p>{selectedWarehouse.state || '-'}</p>
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Country</Label>
                <p>{selectedWarehouse.country || '-'}</p>
              </div>
              {selectedWarehouse.contact_person && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Contact Person</Label>
                  <p>{selectedWarehouse.contact_person}</p>
                </div>
              )}
              {(selectedWarehouse.phone || selectedWarehouse.email) && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Contact Information</Label>
                  <div className="space-y-1">
                    {selectedWarehouse.phone && (
                      <p className="text-sm flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        {selectedWarehouse.phone}
                      </p>
                    )}
                    {selectedWarehouse.email && (
                      <p className="text-sm flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        {selectedWarehouse.email}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex gap-2">
                  <Badge variant={selectedWarehouse.is_active ? 'default' : 'secondary'}>
                    {selectedWarehouse.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {selectedWarehouse.is_primary && (
                    <Badge variant="default">Primary</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedWarehouse && (
              <Button onClick={() => {
                setShowViewDialog(false);
                handleEditWarehouse(selectedWarehouse);
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

