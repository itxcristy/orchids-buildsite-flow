/**
 * Page Catalog Management Component
 * Super admin interface for managing the page catalog, pricing, and recommendations
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Save, Trash2, DollarSign, Settings, Loader2, Edit, X, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePageCatalog } from '@/hooks/usePageCatalog';
import type { PageCatalog, PageCategory } from '@/types/pageCatalog';

const CATEGORIES: PageCategory[] = [
  'dashboard', 'management', 'finance', 'hr', 'projects', 'reports',
  'personal', 'settings', 'system', 'inventory', 'procurement',
  'assets', 'workflows', 'automation'
];

export default function PageCatalogManagement() {
  const { toast } = useToast();
  const { pages, loading, createPage, updatePage, deletePage, createRecommendationRule } = usePageCatalog();
  
  const [selectedPage, setSelectedPage] = useState<PageCatalog | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  
  const [pageForm, setPageForm] = useState<Partial<PageCatalog>>({
    path: '',
    title: '',
    description: '',
    icon: '',
    category: 'dashboard',
    base_cost: 0,
    is_active: true,
    requires_approval: false,
    metadata: {}
  });

  const filteredPages = pages.filter(page => {
    const matchesSearch = !searchQuery || 
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (page.description && page.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = filterCategory === 'all' || page.category === filterCategory;
    const matchesActive = filterActive === 'all' || 
      (filterActive === 'active' && page.is_active) ||
      (filterActive === 'inactive' && !page.is_active);
    
    return matchesSearch && matchesCategory && matchesActive;
  });

  const handleCreatePage = () => {
    setSelectedPage(null);
    setPageForm({
      path: '',
      title: '',
      description: '',
      icon: '',
      category: 'dashboard',
      base_cost: 0,
      is_active: true,
      requires_approval: false,
      metadata: {}
    });
    setIsDialogOpen(true);
  };

  const handleEditPage = (page: PageCatalog) => {
    setSelectedPage(page);
    setPageForm({
      path: page.path,
      title: page.title,
      description: page.description || '',
      icon: page.icon || '',
      category: page.category,
      base_cost: page.base_cost,
      is_active: page.is_active,
      requires_approval: page.requires_approval,
      metadata: page.metadata || {}
    });
    setIsDialogOpen(true);
  };

  const handleSavePage = async () => {
    if (!pageForm.path || !pageForm.title || !pageForm.category) {
      toast({
        title: 'Validation Error',
        description: 'Path, title, and category are required',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (selectedPage) {
        await updatePage(selectedPage.id, pageForm);
      } else {
        await createPage(pageForm);
      }
      setIsDialogOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDeletePage = async (page: PageCatalog) => {
    if (!confirm(`Are you sure you want to deactivate "${page.title}"?`)) {
      return;
    }

    try {
      await deletePage(page.id);
    } catch (error) {
      // Error handled in hook
    }
  };

  const groupedPages = filteredPages.reduce((acc, page) => {
    if (!acc[page.category]) {
      acc[page.category] = [];
    }
    acc[page.category].push(page);
    return acc;
  }, {} as Record<string, PageCatalog[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Page Catalog Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage available pages, pricing, and recommendation rules
          </p>
        </div>
        <Button onClick={handleCreatePage}>
          <Plus className="mr-2 h-4 w-4" />
          Add Page
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pages ({filteredPages.length})</CardTitle>
          <CardDescription>
            All available pages in the system catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pages found
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPages).map(([category, categoryPages]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3 capitalize">{category}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Path</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryPages.map((page) => (
                        <TableRow key={page.id}>
                          <TableCell className="font-mono text-sm">{page.path}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{page.title}</div>
                              {page.description && (
                                <div className="text-sm text-muted-foreground">
                                  {page.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{page.category}</Badge>
                          </TableCell>
                          <TableCell>
                            ${page.base_cost.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={page.is_active ? 'default' : 'secondary'}>
                              {page.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {page.assigned_agencies_count || 0} agencies
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPage(page)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePage(page)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Page Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPage ? 'Edit Page' : 'Create New Page'}
            </DialogTitle>
            <DialogDescription>
              {selectedPage 
                ? 'Update page information and settings'
                : 'Add a new page to the catalog'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="path">Path *</Label>
                <Input
                  id="path"
                  value={pageForm.path}
                  onChange={(e) => setPageForm({ ...pageForm, path: e.target.value })}
                  placeholder="/example-page"
                />
              </div>
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={pageForm.title}
                  onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                  placeholder="Page Title"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={pageForm.description}
                onChange={(e) => setPageForm({ ...pageForm, description: e.target.value })}
                placeholder="Page description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="icon">Icon</Label>
                <Input
                  id="icon"
                  value={pageForm.icon}
                  onChange={(e) => setPageForm({ ...pageForm, icon: e.target.value })}
                  placeholder="Icon name"
                />
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={pageForm.category}
                  onValueChange={(value) => setPageForm({ ...pageForm, category: value as PageCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="base_cost">Base Cost ($)</Label>
              <Input
                id="base_cost"
                type="number"
                step="0.01"
                min="0"
                value={pageForm.base_cost}
                onChange={(e) => setPageForm({ ...pageForm, base_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={pageForm.is_active}
                  onCheckedChange={(checked) => setPageForm({ ...pageForm, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="requires_approval"
                  checked={pageForm.requires_approval}
                  onCheckedChange={(checked) => setPageForm({ ...pageForm, requires_approval: checked })}
                />
                <Label htmlFor="requires_approval">Requires Approval</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePage}>
              {selectedPage ? 'Update' : 'Create'} Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

