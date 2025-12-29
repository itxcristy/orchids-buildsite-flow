import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import * as permissionsService from '@/services/permissions';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function CategoryManager() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await permissionsService.getPermissionCategories();
      setCategories(data);
    } catch (error: any) {
      // If API is not available, show empty state gracefully
      console.warn('Categories API not available:', error);
      setCategories([]);
      // Don't show error toast for 404s - API might not be set up yet
      if (!error.message?.includes('404')) {
        toast.error(error.message || 'Failed to load categories');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Category name is required');
      return;
    }

    if (categories.includes(newCategory.trim())) {
      toast.error('Category already exists');
      return;
    }

    try {
      // Note: Category creation would need a backend endpoint
      // For now, we'll just show a message
      toast.success('Category management feature coming soon');
      setNewCategory('');
      setShowAddDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create category');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Permission Categories</CardTitle>
            <CardDescription>
              Organize permissions by functional categories
            </CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>
                  Create a new permission category to organize permissions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Category Name</Label>
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g., Financial, HR, Projects"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCategory}>
                    Create Category
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(category => (
              <Card key={category}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold capitalize">{category}</h3>
                      <p className="text-sm text-muted-foreground">
                        {category} permissions
                      </p>
                    </div>
                    <Badge variant="outline">{category}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {categories.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No categories found. Create your first category to get started.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
