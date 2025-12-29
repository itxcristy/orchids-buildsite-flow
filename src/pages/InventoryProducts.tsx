/**
 * Inventory Products Page
 * Complete product catalog management interface
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  QrCode,
  Eye,
  Filter,
  Download,
  Upload,
  MoreVertical,
} from 'lucide-react';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductCategories,
  createProductCategory,
  generateProductCode,
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
  DialogTrigger,
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
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';

export default function InventoryProducts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Categories
  const [categories, setCategories] = useState<Array<{ id: string; name: string; description?: string }>>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Product form
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    brand: '',
    unit_of_measure: 'pcs',
    barcode: '',
    weight: '',
    dimensions: '',
    is_trackable: false,
    track_by: 'none' as 'serial' | 'batch' | 'none',
  });

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      try {
        setInitialLoad(true);
        await Promise.all([
          fetchProducts(),
          fetchCategories(),
        ]);
      } catch (error: any) {
        console.error('Error loading products data:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load products',
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
    let filtered = products;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category_id === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p =>
        statusFilter === 'active' ? p.is_active : !p.is_active
      );
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, categoryFilter, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getProductCategories();
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCreateProduct = async () => {
    try {
      setLoading(true);
      if (isEditing && selectedProduct) {
        // Convert weight from string to number if provided
        const productData: Partial<ProductType> = {
          ...productForm,
          weight: productForm.weight ? parseFloat(productForm.weight) || undefined : undefined,
        };
        await updateProduct(selectedProduct.id, productData);
        toast({
          title: 'Success',
          description: 'Product updated successfully',
        });
      } else {
        // Convert weight from string to number if provided
        const productData: Partial<ProductType> = {
          ...productForm,
          weight: productForm.weight ? parseFloat(productForm.weight) || undefined : undefined,
        };
        await createProduct(productData);
        toast({
          title: 'Success',
          description: 'Product created successfully',
        });
      }
      setShowProductDialog(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save product',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async (product: Product) => {
    setSelectedProduct(product);
    setIsEditing(true);
    setProductForm({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category_id: product.category_id || '',
      brand: product.brand || '',
      unit_of_measure: product.unit_of_measure,
      barcode: product.barcode || '',
      weight: product.weight?.toString() || '',
      dimensions: product.dimensions || '',
      is_trackable: product.is_trackable,
      track_by: product.track_by || 'none',
    });
    setShowProductDialog(true);
  };

  const handleViewProduct = async (productId: string) => {
    try {
      const product = await getProductById(productId);
      setSelectedProduct(product);
      setShowViewDialog(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch product details',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteProduct(product.id);
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete product',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async (productId: string, codeType: 'barcode' | 'qr') => {
    try {
      setLoading(true);
      const code = await generateProductCode(productId, codeType);
      toast({
        title: 'Success',
        description: `${codeType.toUpperCase()} code generated: ${code}`,
      });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProductForm({
      sku: '',
      name: '',
      description: '',
      category_id: '',
      brand: '',
      unit_of_measure: 'pcs',
      barcode: '',
      weight: '',
      dimensions: '',
      is_trackable: false,
      track_by: 'none',
    });
    setSelectedProduct(null);
    setIsEditing(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowProductDialog(true);
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
          <h1 className="text-3xl font-bold">Product Catalog</h1>
          <p className="text-muted-foreground mt-1">
            Manage your product catalog, categories, and product information
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">
              {products.filter(p => p.is_active).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trackable Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.is_trackable).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Barcodes</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.barcode).length}
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({filteredProducts.length})</CardTitle>
          <CardDescription>
            Manage your product catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <Alert>
              <AlertDescription>
                No products found. {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' 
                  ? 'Try adjusting your filters.' 
                  : 'Create your first product to get started.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        {categories.find(c => c.id === product.category_id)?.name || '-'}
                      </TableCell>
                      <TableCell>{product.brand || '-'}</TableCell>
                      <TableCell>{product.unit_of_measure}</TableCell>
                      <TableCell>
                        {product.is_trackable ? (
                          <Badge variant="secondary">{product.track_by}</Badge>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                          {product.is_active ? 'Active' : 'Inactive'}
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
                            <DropdownMenuItem onClick={() => handleViewProduct(product.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleGenerateCode(product.id, 'barcode')}
                            >
                              <QrCode className="mr-2 h-4 w-4" />
                              Generate Barcode
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleGenerateCode(product.id, 'qr')}
                            >
                              <QrCode className="mr-2 h-4 w-4" />
                              Generate QR Code
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/inventory/stock-levels?product=${product.id}`)}
                            >
                              View Stock Levels
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteProduct(product)}
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

      {/* Create/Edit Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Product' : 'Create New Product'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update product information' : 'Add a new product to your catalog'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                placeholder="PROD-001"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Enter product name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Product description"
                rows={3}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={productForm.category_id}
                  onValueChange={(value) => setProductForm({ ...productForm, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={productForm.brand}
                  onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                  placeholder="Brand name"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit of Measure</Label>
                <Select
                  value={productForm.unit_of_measure}
                  onValueChange={(value) => setProductForm({ ...productForm, unit_of_measure: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="g">Grams (g)</SelectItem>
                    <SelectItem value="l">Liters (l)</SelectItem>
                    <SelectItem value="ml">Milliliters (ml)</SelectItem>
                    <SelectItem value="m">Meters (m)</SelectItem>
                    <SelectItem value="cm">Centimeters (cm)</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="pack">Pack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  type="number"
                  value={productForm.weight}
                  onChange={(e) => setProductForm({ ...productForm, weight: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input
                  id="dimensions"
                  value={productForm.dimensions}
                  onChange={(e) => setProductForm({ ...productForm, dimensions: e.target.value })}
                  placeholder="L x W x H"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={productForm.barcode}
                onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                placeholder="Barcode number"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="trackable"
                  checked={productForm.is_trackable}
                  onCheckedChange={(checked) =>
                    setProductForm({ ...productForm, is_trackable: checked })
                  }
                />
                <Label htmlFor="trackable">Trackable Product</Label>
              </div>
              {productForm.is_trackable && (
                <div className="grid gap-2">
                  <Label htmlFor="track_by">Track By</Label>
                  <Select
                    value={productForm.track_by}
                    onValueChange={(value: 'serial' | 'batch' | 'none') =>
                      setProductForm({ ...productForm, track_by: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="serial">Serial Number</SelectItem>
                      <SelectItem value="batch">Batch/Lot Number</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProduct} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'} Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Product Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              View complete product information
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-sm font-medium">SKU</Label>
                <p className="font-mono">{selectedProduct.sku}</p>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Name</Label>
                <p>{selectedProduct.name}</p>
              </div>
              {selectedProduct.description && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Brand</Label>
                  <p>{selectedProduct.brand || '-'}</p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Unit of Measure</Label>
                  <p>{selectedProduct.unit_of_measure}</p>
                </div>
              </div>
              {selectedProduct.barcode && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Barcode</Label>
                  <p className="font-mono">{selectedProduct.barcode}</p>
                </div>
              )}
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Status</Label>
                <Badge variant={selectedProduct.is_active ? 'default' : 'secondary'}>
                  {selectedProduct.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {selectedProduct.is_trackable && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Tracking</Label>
                  <Badge variant="secondary">{selectedProduct.track_by}</Badge>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedProduct && (
              <Button onClick={() => {
                setShowViewDialog(false);
                handleEditProduct(selectedProduct);
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

