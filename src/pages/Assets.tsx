/**
 * Assets Page
 * Fixed asset management interface
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
  Eye,
  Trash2,
  MoreVertical,
  MapPin,
  Tag,
  DollarSign,
  Calendar,
  User,
  Package,
  AlertCircle,
} from 'lucide-react';
import {
  getAssets,
  createAsset,
  updateAsset,
  getAssetCategories,
  getAssetLocations,
  type Asset,
  type AssetCategory,
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Assets() {
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();

  // Assets
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Related data
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [locations, setLocations] = useState<AssetLocation[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  // Asset form
  const [assetForm, setAssetForm] = useState({
    asset_number: '',
    name: '',
    description: '',
    category_id: '',
    location_id: '',
    purchase_date: '',
    purchase_cost: '',
    current_value: '',
    serial_number: '',
    model_number: '',
    manufacturer: '',
    status: 'active' as 'active' | 'maintenance' | 'disposed' | 'written_off',
    condition_status: 'good' as 'excellent' | 'good' | 'fair' | 'poor',
    warranty_start_date: '',
    warranty_end_date: '',
    notes: '',
  });

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      try {
        setInitialLoad(true);
        await Promise.all([
          fetchAssets(),
          fetchCategories(),
          fetchLocations(),
        ]);
      } catch (error: any) {
        console.error('Error loading assets data:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load assets',
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
    let filtered = assets;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.asset_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(asset => asset.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(asset => asset.category_id === categoryFilter);
    }

    // Location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(asset => asset.location_id === locationFilter);
    }

    setFilteredAssets(filtered);
  }, [assets, searchTerm, statusFilter, categoryFilter, locationFilter]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const data = await getAssets();
      setAssets(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch assets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getAssetCategories();
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const data = await getAssetLocations();
      setLocations(data || []);
    } catch (error: any) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleCreateAsset = async () => {
    try {
      if (!assetForm.name || !assetForm.asset_number) {
        toast({
          title: 'Validation Error',
          description: 'Please provide asset name and number',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);
      const assetData: any = {
        ...assetForm,
        purchase_cost: assetForm.purchase_cost ? parseFloat(assetForm.purchase_cost.toString()) : 0,
        current_value: assetForm.current_value ? parseFloat(assetForm.current_value.toString()) : assetForm.purchase_cost ? parseFloat(assetForm.purchase_cost.toString()) : 0,
        category_id: assetForm.category_id || undefined,
        location_id: assetForm.location_id || undefined,
        purchase_date: assetForm.purchase_date || undefined,
        warranty_start_date: assetForm.warranty_start_date || undefined,
        warranty_end_date: assetForm.warranty_end_date || undefined,
      };

      if (isEditing && selectedAsset) {
        await updateAsset(selectedAsset.id, assetData);
        toast({
          title: 'Success',
          description: 'Asset updated successfully',
        });
      } else {
        await createAsset(assetData);
        toast({
          title: 'Success',
          description: 'Asset created successfully',
        });
      }

      setShowAssetDialog(false);
      resetForm();
      fetchAssets();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} asset`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setAssetForm({
      asset_number: asset.asset_number || '',
      name: asset.name || '',
      description: asset.description || '',
      category_id: asset.category_id || '',
      location_id: asset.location_id || '',
      purchase_date: asset.purchase_date ? asset.purchase_date.split('T')[0] : '',
      purchase_cost: typeof asset.purchase_cost === 'number' ? asset.purchase_cost.toString() : asset.purchase_cost || '',
      current_value: typeof asset.current_value === 'number' ? asset.current_value.toString() : asset.current_value || '',
      serial_number: asset.serial_number || '',
      model_number: asset.model_number || '',
      manufacturer: asset.manufacturer || '',
      status: asset.status || 'active',
      condition_status: asset.condition_status || 'good',
      warranty_start_date: asset.warranty_start_date ? asset.warranty_start_date.split('T')[0] : '',
      warranty_end_date: asset.warranty_end_date ? asset.warranty_end_date.split('T')[0] : '',
      notes: asset.notes || '',
    });
    setIsEditing(true);
    setShowAssetDialog(true);
  };

  const handleViewAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowViewDialog(true);
  };

  const resetForm = () => {
    setAssetForm({
      asset_number: '',
      name: '',
      description: '',
      category_id: '',
      location_id: '',
      purchase_date: '',
      purchase_cost: '',
      current_value: '',
      serial_number: '',
      model_number: '',
      manufacturer: '',
      status: 'active',
      condition_status: 'good',
      warranty_start_date: '',
      warranty_end_date: '',
      notes: '',
    });
    setSelectedAsset(null);
    setIsEditing(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowAssetDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      maintenance: { variant: 'outline', label: 'Maintenance' },
      disposed: { variant: 'secondary', label: 'Disposed' },
      written_off: { variant: 'destructive', label: 'Written Off' },
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getConditionBadge = (condition?: string) => {
    if (!condition) return null;
    const conditionConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      excellent: { variant: 'default', label: 'Excellent' },
      good: { variant: 'default', label: 'Good' },
      fair: { variant: 'outline', label: 'Fair' },
      poor: { variant: 'destructive', label: 'Poor' },
    };

    const config = conditionConfig[condition] || { variant: 'secondary', label: condition };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Calculate statistics
  const totalAssets = assets.length;
  const activeAssets = assets.filter(asset => asset.status === 'active').length;
  const totalValue = assets.reduce((sum, asset) => {
    const value = typeof asset.current_value === 'number' ? asset.current_value : parseFloat(String(asset.current_value || 0));
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
  const maintenanceAssets = assets.filter(asset => asset.status === 'maintenance').length;

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
          <h1 className="text-3xl font-bold">Asset Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage fixed assets, depreciation, and maintenance
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssets}</div>
            <p className="text-xs text-muted-foreground">
              All assets
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAssets}</div>
            <p className="text-xs text-muted-foreground">
              In use
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Maintenance</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maintenanceAssets}</div>
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
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
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
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                  <SelectItem value="written_off">Written Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assets ({filteredAssets.length})</CardTitle>
          <CardDescription>
            Manage your fixed assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && filteredAssets.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <Alert>
              <AlertDescription>
                No assets found. {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || locationFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Create your first asset to get started.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Purchase Cost</TableHead>
                    <TableHead>Current Value</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-mono font-medium">{asset.asset_number}</TableCell>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>{asset.category_name || '-'}</TableCell>
                      <TableCell>
                        {asset.location_name ? (
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                            {asset.location_name}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {(typeof asset.purchase_cost === 'number' ? asset.purchase_cost : parseFloat(String(asset.purchase_cost || 0))).toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {(typeof asset.current_value === 'number' ? asset.current_value : parseFloat(String(asset.current_value || 0))).toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        })}
                      </TableCell>
                      <TableCell>{getConditionBadge(asset.condition_status)}</TableCell>
                      <TableCell>{getStatusBadge(asset.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewAsset(asset)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditAsset(asset)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
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

      {/* Create/Edit Asset Dialog */}
      <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update asset information' : 'Create a new fixed asset record'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="asset_number">Asset Number *</Label>
                <Input
                  id="asset_number"
                  value={assetForm.asset_number}
                  onChange={(e) => setAssetForm({ ...assetForm, asset_number: e.target.value })}
                  placeholder="ASSET-001"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Asset Name *</Label>
                <Input
                  id="name"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  placeholder="Enter asset name"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={assetForm.description}
                onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                placeholder="Asset description"
                rows={3}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="category_id">Category</Label>
                <Select
                  value={assetForm.category_id}
                  onValueChange={(value) => setAssetForm({ ...assetForm, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location_id">Location</Label>
                <Select
                  value={assetForm.location_id}
                  onValueChange={(value) => setAssetForm({ ...assetForm, location_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={assetForm.purchase_date}
                  onChange={(e) => setAssetForm({ ...assetForm, purchase_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="purchase_cost">Purchase Cost</Label>
                <Input
                  id="purchase_cost"
                  type="number"
                  step="0.01"
                  value={assetForm.purchase_cost}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAssetForm({ ...assetForm, purchase_cost: value });
                    if (!assetForm.current_value) {
                      setAssetForm(prev => ({ ...prev, current_value: value }));
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="current_value">Current Value</Label>
                <Input
                  id="current_value"
                  type="number"
                  step="0.01"
                  value={assetForm.current_value}
                  onChange={(e) => setAssetForm({ ...assetForm, current_value: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input
                  id="serial_number"
                  value={assetForm.serial_number}
                  onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                  placeholder="SN-12345"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model_number">Model Number</Label>
                <Input
                  id="model_number"
                  value={assetForm.model_number}
                  onChange={(e) => setAssetForm({ ...assetForm, model_number: e.target.value })}
                  placeholder="Model-001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={assetForm.manufacturer}
                  onChange={(e) => setAssetForm({ ...assetForm, manufacturer: e.target.value })}
                  placeholder="Manufacturer name"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={assetForm.status}
                  onValueChange={(value: 'active' | 'maintenance' | 'disposed' | 'written_off') =>
                    setAssetForm({ ...assetForm, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="disposed">Disposed</SelectItem>
                    <SelectItem value="written_off">Written Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="condition_status">Condition</Label>
                <Select
                  value={assetForm.condition_status}
                  onValueChange={(value: 'excellent' | 'good' | 'fair' | 'poor') =>
                    setAssetForm({ ...assetForm, condition_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="warranty_start_date">Warranty Start Date</Label>
                <Input
                  id="warranty_start_date"
                  type="date"
                  value={assetForm.warranty_start_date}
                  onChange={(e) => setAssetForm({ ...assetForm, warranty_start_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="warranty_end_date">Warranty End Date</Label>
                <Input
                  id="warranty_end_date"
                  type="date"
                  value={assetForm.warranty_end_date}
                  onChange={(e) => setAssetForm({ ...assetForm, warranty_end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={assetForm.notes}
                onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                placeholder="Additional notes"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssetDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAsset} disabled={loading || !assetForm.name || !assetForm.asset_number}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'} Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Asset Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
            <DialogDescription>
              View complete asset information
            </DialogDescription>
          </DialogHeader>
          {selectedAsset && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Asset Number</Label>
                  <p className="font-mono">{selectedAsset.asset_number}</p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Status</Label>
                  {getStatusBadge(selectedAsset.status)}
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="font-medium">{selectedAsset.name}</p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Condition</Label>
                  {getConditionBadge(selectedAsset.condition_status)}
                </div>
                {selectedAsset.category_name && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Category</Label>
                    <p>{selectedAsset.category_name}</p>
                  </div>
                )}
                {selectedAsset.location_name && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Location</Label>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <p>{selectedAsset.location_name}</p>
                    </div>
                  </div>
                )}
                {selectedAsset.purchase_date && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Purchase Date</Label>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <p>{new Date(selectedAsset.purchase_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Purchase Cost</Label>
                  <p className="font-medium">
                    {(typeof selectedAsset.purchase_cost === 'number' ? selectedAsset.purchase_cost : parseFloat(String(selectedAsset.purchase_cost || 0))).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                    })}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Current Value</Label>
                  <p className="font-medium text-lg">
                    {(typeof selectedAsset.current_value === 'number' ? selectedAsset.current_value : parseFloat(String(selectedAsset.current_value || 0))).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                    })}
                  </p>
                </div>
                {selectedAsset.serial_number && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Serial Number</Label>
                    <p className="font-mono">{selectedAsset.serial_number}</p>
                  </div>
                )}
                {selectedAsset.model_number && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Model Number</Label>
                    <p>{selectedAsset.model_number}</p>
                  </div>
                )}
                {selectedAsset.manufacturer && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Manufacturer</Label>
                    <p>{selectedAsset.manufacturer}</p>
                  </div>
                )}
              </div>
              {selectedAsset.description && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">{selectedAsset.description}</p>
                </div>
              )}
              {selectedAsset.notes && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedAsset.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedAsset && (
              <Button onClick={() => {
                setShowViewDialog(false);
                handleEditAsset(selectedAsset);
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

