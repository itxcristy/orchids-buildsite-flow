/**
 * Asset Locations Page
 * Complete asset location management interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  MapPin,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Eye,
  Building,
  Phone,
  Mail,
} from 'lucide-react';
import {
  getAssetLocations,
  createAssetLocation,
  updateAssetLocation,
  deleteAssetLocation,
  type AssetLocation,
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
import { Switch } from '@/components/ui/switch';

export default function AssetLocations() {
  const { toast } = useToast();
  const [locations, setLocations] = useState<AssetLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<AssetLocation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<AssetLocation>>({
    code: '',
    name: '',
    address: '',
    building: '',
    floor: '',
    room: '',
    contact_person: '',
    phone: '',
    email: '',
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, [filterActive]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAssetLocations();
      setLocations(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load locations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      code: '',
      name: '',
      address: '',
      building: '',
      floor: '',
      room: '',
      contact_person: '',
      phone: '',
      email: '',
      is_active: true,
    });
    setSelectedLocation(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (location: AssetLocation) => {
    setFormData({
      ...location,
    });
    setSelectedLocation(location);
    setIsDialogOpen(true);
  };

  const handleView = (location: AssetLocation) => {
    setSelectedLocation(location);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (location: AssetLocation) => {
    if (!confirm(`Are you sure you want to delete location "${location.name}"?`)) {
      return;
    }

    try {
      await deleteAssetLocation(location.id);
      toast({
        title: 'Success',
        description: 'Location deleted successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete location',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedLocation) {
        await updateAssetLocation(selectedLocation.id, formData);
        toast({
          title: 'Success',
          description: 'Location updated successfully',
        });
      } else {
        await createAssetLocation(formData);
        toast({
          title: 'Success',
          description: 'Location created successfully',
        });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save location',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLocations = locations.filter((location) => {
    const matchesSearch =
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.building?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterActive === undefined || location.is_active === filterActive;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: locations.length,
    active: locations.filter((l) => l.is_active).length,
    inactive: locations.filter((l) => !l.is_active).length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Locations</h1>
          <p className="text-muted-foreground">Manage asset locations and physical addresses</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Location
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
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
                  placeholder="Search locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={filterActive === undefined ? 'all' : filterActive ? 'active' : 'inactive'}
                onChange={(e) =>
                  setFilterActive(e.target.value === 'all' ? undefined : e.target.value === 'active')
                }
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Locations List</CardTitle>
          <CardDescription>Manage all asset locations</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No locations found. Create your first location to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Building/Floor/Room</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-mono">{location.code}</TableCell>
                    <TableCell className="font-medium">{location.name}</TableCell>
                    <TableCell>
                      {location.address ? (
                        <div className="max-w-xs truncate" title={location.address}>
                          {location.address}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {location.building || location.floor || location.room ? (
                        <div className="text-sm">
                          {location.building && <div>{location.building}</div>}
                          {location.floor && <div>Floor: {location.floor}</div>}
                          {location.room && <div>Room: {location.room}</div>}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {location.contact_person ? (
                        <div className="text-sm">
                          <div className="font-medium">{location.contact_person}</div>
                          {location.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {location.phone}
                            </div>
                          )}
                          {location.email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {location.email}
                            </div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={location.is_active ? 'default' : 'secondary'}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(location.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(location)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(location)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(location)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLocation ? 'Edit Location' : 'Create Location'}</DialogTitle>
            <DialogDescription>
              {selectedLocation
                ? 'Update location details'
                : 'Create a new asset location'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., HQ-FLOOR1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Headquarters - Floor 1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address..."
                  rows={2}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="building">Building</Label>
                  <Input
                    id="building"
                    value={formData.building || ''}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    placeholder="Building name/number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    value={formData.floor || ''}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    placeholder="Floor number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room">Room</Label>
                  <Input
                    id="room"
                    value={formData.room || ''}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    placeholder="Room number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person || ''}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Contact person name"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email address"
                  />
                </div>
              </div>
              <div className="space-y-2 flex items-center gap-4 pt-2">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
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
                {selectedLocation ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Location Details</DialogTitle>
            <DialogDescription>View location information</DialogDescription>
          </DialogHeader>
          {selectedLocation && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Code</Label>
                  <div className="mt-1 font-mono">{selectedLocation.code}</div>
                </div>
                <div>
                  <Label>Name</Label>
                  <div className="mt-1 font-medium">{selectedLocation.name}</div>
                </div>
                {selectedLocation.address && (
                  <div className="md:col-span-2">
                    <Label>Address</Label>
                    <div className="mt-1">{selectedLocation.address}</div>
                  </div>
                )}
                {selectedLocation.building && (
                  <div>
                    <Label>Building</Label>
                    <div className="mt-1">{selectedLocation.building}</div>
                  </div>
                )}
                {selectedLocation.floor && (
                  <div>
                    <Label>Floor</Label>
                    <div className="mt-1">{selectedLocation.floor}</div>
                  </div>
                )}
                {selectedLocation.room && (
                  <div>
                    <Label>Room</Label>
                    <div className="mt-1">{selectedLocation.room}</div>
                  </div>
                )}
                {selectedLocation.contact_person && (
                  <div>
                    <Label>Contact Person</Label>
                    <div className="mt-1">{selectedLocation.contact_person}</div>
                  </div>
                )}
                {selectedLocation.phone && (
                  <div>
                    <Label>Phone</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {selectedLocation.phone}
                    </div>
                  </div>
                )}
                {selectedLocation.email && (
                  <div>
                    <Label>Email</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {selectedLocation.email}
                    </div>
                  </div>
                )}
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge variant={selectedLocation.is_active ? 'default' : 'secondary'}>
                      {selectedLocation.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Created</Label>
                  <div className="mt-1">
                    {new Date(selectedLocation.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedLocation && (
              <Button
                onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEdit(selectedLocation);
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

