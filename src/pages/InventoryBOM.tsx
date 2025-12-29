/**
 * Inventory BOM (Bill of Materials) Page
 * Complete BOM management interface
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Filter,
  Package,
  X,
  Save,
} from 'lucide-react';
import {
  getBoms,
  getBomById,
  createBom,
  updateBom,
  deleteBom,
  getProducts,
  type Bom,
  type BomItem,
  type Product,
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

export default function InventoryBOM() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [boms, setBoms] = useState<Bom[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedBom, setSelectedBom] = useState<Bom | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Bom>>({
    product_id: '',
    name: '',
    version: '',
    is_active: true,
    notes: '',
    items: [],
  });

  useEffect(() => {
    loadData();
  }, [filterActive, selectedProduct]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bomsData, productsData] = await Promise.all([
        getBoms({
          product_id: selectedProduct === 'all' ? undefined : selectedProduct,
          is_active: filterActive,
        }),
        getProducts(),
      ]);
      setBoms(bomsData);
      setProducts(productsData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load BOMs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      product_id: '',
      name: '',
      version: '',
      is_active: true,
      notes: '',
      items: [],
    });
    setSelectedBom(null);
    setIsDialogOpen(true);
  };

  const handleEdit = async (bom: Bom) => {
    try {
      const fullBom = await getBomById(bom.id);
      setFormData({
        ...fullBom,
        items: fullBom.items || [],
      });
      setSelectedBom(fullBom);
      setIsDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load BOM details',
        variant: 'destructive',
      });
    }
  };

  const handleView = async (bom: Bom) => {
    try {
      const fullBom = await getBomById(bom.id);
      setSelectedBom(fullBom);
      setIsViewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load BOM details',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (bom: Bom) => {
    if (!confirm(`Are you sure you want to delete BOM "${bom.name}"?`)) {
      return;
    }

    try {
      await deleteBom(bom.id);
      toast({
        title: 'Success',
        description: 'BOM deleted successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete BOM',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || !formData.name) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedBom) {
        await updateBom(selectedBom.id, formData);
        toast({
          title: 'Success',
          description: 'BOM updated successfully',
        });
      } else {
        await createBom(formData);
        toast({
          title: 'Success',
          description: 'BOM created successfully',
        });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save BOM',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addBomItem = () => {
    setFormData({
      ...formData,
      items: [
        ...(formData.items || []),
        {
          id: '',
          bom_id: '',
          component_product_id: '',
          quantity: 1,
          unit_of_measure: 'pcs',
          sequence: (formData.items?.length || 0) + 1,
          notes: '',
        } as BomItem,
      ],
    });
  };

  const removeBomItem = (index: number) => {
    const newItems = [...(formData.items || [])];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const updateBomItem = (index: number, field: keyof BomItem, value: any) => {
    const newItems = [...(formData.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const filteredBoms = boms.filter((bom) => {
    const matchesSearch =
      bom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bom.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bom.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bom.version?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    total: boms.length,
    active: boms.filter((b) => b.is_active).length,
    inactive: boms.filter((b) => !b.is_active).length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bill of Materials</h1>
          <p className="text-muted-foreground">Manage product BOMs and component lists</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create BOM
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total BOMs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active BOMs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive BOMs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search BOMs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* BOMs Table */}
      <Card>
        <CardHeader>
          <CardTitle>BOMs List</CardTitle>
          <CardDescription>Manage all Bill of Materials</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBoms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No BOMs found. Create your first BOM to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>BOM Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBoms.map((bom) => (
                  <TableRow key={bom.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{bom.product_name}</div>
                        <div className="text-sm text-muted-foreground">{bom.product_sku}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{bom.name}</TableCell>
                    <TableCell>{bom.version || '-'}</TableCell>
                    <TableCell>{bom.item_count || 0} items</TableCell>
                    <TableCell>
                      <Badge variant={bom.is_active ? 'default' : 'secondary'}>
                        {bom.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(bom.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(bom)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(bom)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(bom)}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBom ? 'Edit BOM' : 'Create BOM'}</DialogTitle>
            <DialogDescription>
              {selectedBom ? 'Update BOM details' : 'Create a new Bill of Materials'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="product_id">Product *</Label>
                  <Select
                    value={formData.product_id || ''}
                    onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">BOM Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Assembly BOM"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={formData.version || ''}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="e.g., v1.0"
                  />
                </div>
                <div className="space-y-2 flex items-center gap-4 pt-6">
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

              {/* BOM Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>BOM Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addBomItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
                {formData.items && formData.items.length > 0 ? (
                  <div className="space-y-2">
                    {formData.items.map((item, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="grid gap-4 md:grid-cols-5">
                            <div className="space-y-2">
                              <Label>Component Product *</Label>
                              <Select
                                value={item.component_product_id}
                                onValueChange={(value) =>
                                  updateBomItem(index, 'component_product_id', value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products
                                    .filter((p) => p.id !== formData.product_id)
                                    .map((product) => (
                                      <SelectItem key={product.id} value={product.id}>
                                        {product.name} ({product.sku})
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Quantity *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateBomItem(
                                    index,
                                    'quantity',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Unit</Label>
                              <Input
                                value={item.unit_of_measure}
                                onChange={(e) =>
                                  updateBomItem(index, 'unit_of_measure', e.target.value)
                                }
                                placeholder="pcs"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Sequence</Label>
                              <Input
                                type="number"
                                value={item.sequence}
                                onChange={(e) =>
                                  updateBomItem(index, 'sequence', parseInt(e.target.value) || 0)
                                }
                              />
                            </div>
                            <div className="space-y-2 flex items-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeBomItem(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground border rounded">
                    No items added. Click "Add Item" to add components.
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedBom ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>BOM Details</DialogTitle>
            <DialogDescription>View BOM information and components</DialogDescription>
          </DialogHeader>
          {selectedBom && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Product</Label>
                  <div className="mt-1">
                    <div className="font-medium">{selectedBom.product_name}</div>
                    <div className="text-sm text-muted-foreground">{selectedBom.product_sku}</div>
                  </div>
                </div>
                <div>
                  <Label>BOM Name</Label>
                  <div className="mt-1 font-medium">{selectedBom.name}</div>
                </div>
                <div>
                  <Label>Version</Label>
                  <div className="mt-1">{selectedBom.version || '-'}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge variant={selectedBom.is_active ? 'default' : 'secondary'}>
                      {selectedBom.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
              {selectedBom.notes && (
                <div>
                  <Label>Notes</Label>
                  <div className="mt-1 text-sm">{selectedBom.notes}</div>
                </div>
              )}
              {selectedBom.items && selectedBom.items.length > 0 && (
                <div>
                  <Label>Components</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Sequence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBom.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.component_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.component_sku}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit_of_measure}</TableCell>
                          <TableCell>{item.sequence}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedBom && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                handleEdit(selectedBom);
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

