import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { insertRecord, updateRecord, deleteRecord, selectRecords } from '@/services/api/postgresql-service';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface JobCostItem {
  id?: string;
  job_id: string;
  category: string;
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  vendor?: string | null;
  date_incurred: string;
}

interface JobCostItemsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle?: string;
  onItemsUpdated?: () => void;
}

const JobCostItemsDialog: React.FC<JobCostItemsDialogProps> = ({ 
  isOpen, 
  onClose, 
  jobId,
  jobTitle,
  onItemsUpdated 
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<JobCostItem[]>([]);
  const [editingItem, setEditingItem] = useState<JobCostItem | null>(null);
  const [formData, setFormData] = useState<JobCostItem>({
    job_id: jobId,
    category: '',
    description: '',
    quantity: 1,
    unit_cost: 0,
    total_cost: 0,
    vendor: '',
    date_incurred: new Date().toISOString().split('T')[0],
  });

  const costCategories = [
    'labor',
    'materials',
    'equipment',
    'overhead',
    'other'
  ];

  useEffect(() => {
    if (isOpen && jobId) {
      fetchCostItems();
      resetForm();
    }
  }, [isOpen, jobId]);

  const fetchCostItems = async () => {
    try {
      setLoading(true);
      const costItems = await selectRecords('job_cost_items', {
        where: { job_id: jobId },
        orderBy: 'date_incurred DESC, created_at DESC',
      });
      setItems(costItems || []);
    } catch (error: any) {
      console.error('Error fetching cost items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cost items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      job_id: jobId,
      category: '',
      description: '',
      quantity: 1,
      unit_cost: 0,
      total_cost: 0,
      vendor: '',
      date_incurred: new Date().toISOString().split('T')[0],
    });
    setEditingItem(null);
  };

  const calculateTotal = (quantity: number, unitCost: number) => {
    return quantity * unitCost;
  };

  const handleQuantityChange = (value: number) => {
    const qty = value || 0;
    const unitCost = formData.unit_cost || 0;
    setFormData(prev => ({
      ...prev,
      quantity: qty,
      total_cost: calculateTotal(qty, unitCost),
    }));
  };

  const handleUnitCostChange = (value: number) => {
    const cost = value || 0;
    const qty = formData.quantity || 0;
    setFormData(prev => ({
      ...prev,
      unit_cost: cost,
      total_cost: calculateTotal(qty, cost),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category.trim()) {
      toast({
        title: 'Error',
        description: 'Category is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Error',
        description: 'Description is required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.quantity <= 0) {
      toast({
        title: 'Error',
        description: 'Quantity must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    if (formData.unit_cost <= 0) {
      toast({
        title: 'Error',
        description: 'Unit cost must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const cleanedData: any = {
        job_id: jobId,
        category: formData.category.trim(),
        description: formData.description.trim(),
        quantity: formData.quantity,
        unit_cost: formData.unit_cost,
        total_cost: formData.total_cost,
        vendor: formData.vendor?.trim() || null,
        date_incurred: formData.date_incurred,
      };

      if (editingItem?.id) {
        await updateRecord('job_cost_items', cleanedData, { id: editingItem.id }, user?.id);
        toast({
          title: 'Success',
          description: 'Cost item updated successfully',
        });
      } else {
        await insertRecord('job_cost_items', {
          ...cleanedData,
          created_by: user?.id || null,
        }, user?.id);
        toast({
          title: 'Success',
          description: 'Cost item added successfully',
        });
      }

      await fetchCostItems();
      resetForm();
      // Trigger update of job's actual_cost
      onItemsUpdated?.();
    } catch (error: any) {
      console.error('Error saving cost item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save cost item',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: JobCostItem) => {
    setEditingItem(item);
    setFormData({
      job_id: jobId,
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      total_cost: item.total_cost,
      vendor: item.vendor || '',
      date_incurred: item.date_incurred,
    });
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this cost item?')) {
      return;
    }

    try {
      await deleteRecord('job_cost_items', { id: itemId });
      toast({
        title: 'Success',
        description: 'Cost item deleted successfully',
      });
      await fetchCostItems();
      // Trigger update of job's actual_cost
      onItemsUpdated?.();
    } catch (error: any) {
      console.error('Error deleting cost item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete cost item',
        variant: 'destructive',
      });
    }
  };

  const totalCost = items.reduce((sum, item) => sum + (parseFloat(item.total_cost?.toString() || '0') || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Job Cost Items - {jobTitle || 'Job'}</DialogTitle>
          <DialogDescription>
            Manage cost items for this job. Track labor, materials, equipment, and other expenses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add/Edit Form */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {costCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_incurred">Date Incurred *</Label>
                    <Input
                      id="date_incurred"
                      type="date"
                      value={formData.date_incurred}
                      onChange={(e) => setFormData(prev => ({ ...prev, date_incurred: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    placeholder="Describe the cost item"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={formData.quantity || ''}
                      onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_cost">Unit Cost (₹) *</Label>
                    <Input
                      id="unit_cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.unit_cost || ''}
                      onChange={(e) => handleUnitCostChange(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total_cost">Total Cost (₹)</Label>
                    <Input
                      id="total_cost"
                      type="number"
                      value={formData.total_cost.toFixed(2)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor">Vendor</Label>
                    <Input
                      id="vendor"
                      value={formData.vendor || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                      placeholder="Vendor name (optional)"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                  </Button>
                  {editingItem && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Cost Items List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Cost Items</h3>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            {loading && items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading cost items...</p>
              </div>
            ) : items.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p>No cost items added yet. Add your first cost item above.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{item.category}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(item.date_incurred).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="font-medium">{item.description}</p>
                          {item.vendor && (
                            <p className="text-sm text-muted-foreground">Vendor: {item.vendor}</p>
                          )}
                          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Qty: {item.quantity}</span>
                            <span>Unit: ₹{parseFloat(item.unit_cost?.toString() || '0').toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-4">
                            <p className="font-bold text-lg">
                              ₹{parseFloat(item.total_cost?.toString() || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(item.id!)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JobCostItemsDialog;
