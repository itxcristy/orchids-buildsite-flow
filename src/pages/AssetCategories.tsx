/**
 * Asset Categories Page
 * Complete asset category management interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  FolderTree,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Eye,
  Filter,
  TrendingDown,
} from 'lucide-react';
import {
  getAssetCategories,
  createAssetCategory,
  updateAssetCategory,
  deleteAssetCategory,
  type AssetCategory,
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export default function AssetCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<AssetCategory>>({
    code: '',
    name: '',
    description: '',
    parent_id: '',
    depreciation_method: 'straight_line',
    default_useful_life_years: undefined,
    default_depreciation_rate: undefined,
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, [filterActive]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAssetCategories();
      setCategories(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load categories',
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
      description: '',
      parent_id: '',
      depreciation_method: 'straight_line',
      default_useful_life_years: undefined,
      default_depreciation_rate: undefined,
      is_active: true,
    });
    setSelectedCategory(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (category: AssetCategory) => {
    setFormData({
      ...category,
    });
    setSelectedCategory(category);
    setIsDialogOpen(true);
  };

  const handleView = (category: AssetCategory) => {
    setSelectedCategory(category);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (category: AssetCategory) => {
    if (!confirm(`Are you sure you want to delete category "${category.name}"?`)) {
      return;
    }

    try {
      await deleteAssetCategory(category.id);
      toast({
        title: 'Success',
        description: 'Category deleted successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete category',
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
      if (selectedCategory) {
        await updateAssetCategory(selectedCategory.id, formData);
        toast({
          title: 'Success',
          description: 'Category updated successfully',
        });
      } else {
        await createAssetCategory(formData);
        toast({
          title: 'Success',
          description: 'Category created successfully',
        });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save category',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((category) => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterActive === undefined || category.is_active === filterActive;
    return matchesSearch && matchesFilter;
  });

  // Build category tree for display
  const getCategoryPath = (category: AssetCategory): string => {
    const parent = categories.find((c) => c.id === category.parent_id);
    if (parent) {
      return `${getCategoryPath(parent)} > ${category.name}`;
    }
    return category.name;
  };

  const stats = {
    total: categories.length,
    active: categories.filter((c) => c.is_active).length,
    inactive: categories.filter((c) => !c.is_active).length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Categories</h1>
          <p className="text-muted-foreground">Manage asset categories and depreciation settings</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Category
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Categories</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Categories</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
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
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filterActive === undefined ? 'all' : filterActive ? 'active' : 'inactive'}
                onValueChange={(value) =>
                  setFilterActive(value === 'all' ? undefined : value === 'active')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Categories List</CardTitle>
          <CardDescription>Manage all asset categories</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No categories found. Create your first category to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Depreciation Method</TableHead>
                  <TableHead>Useful Life</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-mono">{category.code}</TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      {category.parent_id
                        ? categories.find((c) => c.id === category.parent_id)?.name || '-'
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {category.depreciation_method || 'straight_line'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {category.default_useful_life_years
                        ? `${category.default_useful_life_years} years`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.is_active ? 'default' : 'secondary'}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(category.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(category)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category)}
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
            <DialogTitle>{selectedCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
            <DialogDescription>
              {selectedCategory
                ? 'Update category details'
                : 'Create a new asset category'}
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
                    placeholder="e.g., IT-EQUIP"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., IT Equipment"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Category description..."
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="parent_id">Parent Category</Label>
                  <Select
                    value={formData.parent_id || 'none'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        parent_id: value === 'none' ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (Top Level)" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="none">None (Top Level)</SelectItem>
                      {categories
                        .filter((c) => c.id !== selectedCategory?.id)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name} ({category.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depreciation_method">Depreciation Method</Label>
                  <Select
                    value={formData.depreciation_method || 'straight_line'}
                    onValueChange={(value) =>
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
                      <SelectItem value="sum_of_years">Sum of Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="default_useful_life_years">Default Useful Life (Years)</Label>
                  <Input
                    id="default_useful_life_years"
                    type="number"
                    min="0"
                    value={formData.default_useful_life_years || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        default_useful_life_years: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="e.g., 5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_depreciation_rate">Default Depreciation Rate (%)</Label>
                  <Input
                    id="default_depreciation_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.default_depreciation_rate || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        default_depreciation_rate: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="e.g., 20"
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
                {selectedCategory ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Category Details</DialogTitle>
            <DialogDescription>View category information</DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Code</Label>
                  <div className="mt-1 font-mono">{selectedCategory.code}</div>
                </div>
                <div>
                  <Label>Name</Label>
                  <div className="mt-1 font-medium">{selectedCategory.name}</div>
                </div>
                <div>
                  <Label>Parent Category</Label>
                  <div className="mt-1">
                    {selectedCategory.parent_id
                      ? categories.find((c) => c.id === selectedCategory.parent_id)?.name || '-'
                      : '-'}
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge variant={selectedCategory.is_active ? 'default' : 'secondary'}>
                      {selectedCategory.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Depreciation Method</Label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {selectedCategory.depreciation_method || 'straight_line'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Default Useful Life</Label>
                  <div className="mt-1">
                    {selectedCategory.default_useful_life_years
                      ? `${selectedCategory.default_useful_life_years} years`
                      : '-'}
                  </div>
                </div>
                <div>
                  <Label>Default Depreciation Rate</Label>
                  <div className="mt-1">
                    {selectedCategory.default_depreciation_rate
                      ? `${selectedCategory.default_depreciation_rate}%`
                      : '-'}
                  </div>
                </div>
                <div>
                  <Label>Created</Label>
                  <div className="mt-1">
                    {new Date(selectedCategory.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              {selectedCategory.description && (
                <div>
                  <Label>Description</Label>
                  <div className="mt-1 text-sm">{selectedCategory.description}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedCategory && (
              <Button
                onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEdit(selectedCategory);
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

