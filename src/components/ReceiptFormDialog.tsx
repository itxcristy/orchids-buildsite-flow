import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertRecord, updateRecord, selectRecords } from '@/services/api/postgresql-service';
import { useAuth } from "@/hooks/useAuth";
import { Upload, X, Loader2 } from "lucide-react";
import { db } from '@/lib/database';

interface Receipt {
  id: string;
  vendor: string;
  category: string;
  amount: number;
  date: string;
  status: string;
  description: string;
  receiptUrl: string | null;
  request_id?: string;
  category_id?: string;
  business_purpose?: string;
}

interface ReceiptFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  receipt?: Receipt | null;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
}

export const ReceiptFormDialog: React.FC<ReceiptFormDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  receipt,
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  
  const [formData, setFormData] = useState({
    category_id: "",
    amount: "",
    expense_date: "",
    description: "",
    business_purpose: "",
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (receipt) {
        // Load receipt data for editing
        setFormData({
          category_id: receipt.category_id || "",
          amount: receipt.amount.toString(),
          expense_date: receipt.date,
          description: receipt.description || "",
          business_purpose: receipt.business_purpose || "",
        });
      } else {
        // Reset form for new receipt
        setFormData({
          category_id: "",
          amount: "",
          expense_date: new Date().toISOString().split('T')[0],
          description: "",
          business_purpose: "",
        });
      }
      setSelectedFiles(null);
    }
  }, [open, receipt]);

  const fetchCategories = async () => {
    try {
      if (!profile?.agency_id) {
        setCategories([]);
        return;
      }

      const categoriesData = await selectRecords('expense_categories', {
        where: { 
          agency_id: profile.agency_id,
          is_active: true 
        },
        orderBy: 'name ASC',
      });
      
      setCategories((categoriesData || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description
      })));
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to load expense categories",
        variant: "destructive",
      });
      setCategories([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const uploadFiles = async (reimbursementRequestId: string) => {
    if (!selectedFiles || !user?.id) return;

    // Set userId for file storage
    (window as any).__currentUserId = user.id;

    const uploadPromises = Array.from(selectedFiles).map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `receipts/${user.id}/${reimbursementRequestId}/${Date.now()}.${fileExt}`;

      // Upload file to storage using the wrapper
      const { data: uploadData, error: uploadError } = await db.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Save file info to database
      await insertRecord('reimbursement_attachments', {
        reimbursement_id: reimbursementRequestId,
        file_name: file.name,
        file_path: fileName,
        file_type: file.type,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
      }, user.id);
    });

    await Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create a receipt",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.agency_id) {
      toast({
        title: "Error",
        description: "Unable to determine agency. Please ensure you are logged in.",
        variant: "destructive",
      });
      return;
    }

    // Validation
    if (!formData.category_id) {
      toast({
        title: "Validation Error",
        description: "Please select an expense category",
        variant: "destructive",
      });
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!formData.expense_date) {
      toast({
        title: "Validation Error",
        description: "Please select an expense date",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a description",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (receipt && receipt.request_id) {
        // Update existing receipt
        await updateRecord('reimbursement_requests', {
          category_id: formData.category_id,
          amount: parseFloat(formData.amount),
          expense_date: formData.expense_date,
          description: formData.description,
          business_purpose: formData.business_purpose || null,
        }, { id: receipt.request_id }, user.id);

        // Upload new files if any
        if (selectedFiles && selectedFiles.length > 0) {
          await uploadFiles(receipt.request_id);
        }

        toast({
          title: "Success",
          description: "Receipt updated successfully",
        });
      } else {
        // Create new receipt
        const reimbursement = await insertRecord('reimbursement_requests', {
          employee_id: user.id,
          category_id: formData.category_id,
          amount: parseFloat(formData.amount),
          currency: "INR",
          expense_date: formData.expense_date,
          description: formData.description,
          business_purpose: formData.business_purpose || null,
          status: "submitted",
          submitted_at: new Date().toISOString(),
          agency_id: profile.agency_id,
        }, user.id);

        // Upload files if any
        if (selectedFiles && selectedFiles.length > 0) {
          await uploadFiles(reimbursement.id);
        }

        toast({
          title: "Success",
          description: "Receipt created successfully",
        });
      }

      // Reset form
      setFormData({
        category_id: "",
        amount: "",
        expense_date: new Date().toISOString().split('T')[0],
        description: "",
        business_purpose: "",
      });
      setSelectedFiles(null);
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving receipt:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save receipt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{receipt ? "Edit Receipt" : "Add New Receipt"}</DialogTitle>
          <DialogDescription>
            {receipt ? "Update receipt information" : "Create a new expense receipt"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category">Expense Category *</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              required
            >
              <SelectTrigger className="bg-background border-input">
                <SelectValue placeholder="Select expense category" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border shadow-lg z-50 max-h-60 overflow-y-auto">
                {categories.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    {profile?.agency_id ? "Loading categories..." : "No categories available"}
                  </div>
                ) : (
                  categories.map((category) => (
                    <SelectItem key={category.id} value={category.id} className="hover:bg-muted cursor-pointer">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{category.name}</span>
                        {category.description && (
                          <span className="text-xs text-muted-foreground line-clamp-2">
                            {category.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Amount (₹) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="expense_date">Expense Date *</Label>
            <Input
              id="expense_date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What was this expense for?"
              required
            />
          </div>

          <div>
            <Label htmlFor="business_purpose">Business Purpose (Optional)</Label>
            <Textarea
              id="business_purpose"
              value={formData.business_purpose}
              onChange={(e) => setFormData({ ...formData, business_purpose: e.target.value })}
              placeholder="How does this relate to business activities?"
            />
          </div>

          <div>
            <Label htmlFor="receipts">Upload Receipts</Label>
            <div className="mt-2">
              <input
                id="receipts"
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('receipts')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Receipts
              </Button>
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {Array.from(selectedFiles).map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-sm text-muted-foreground p-2 bg-muted rounded">
                      <span className="truncate flex-1">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const dt = new DataTransfer();
                          Array.from(selectedFiles).forEach((f, i) => {
                            if (i !== index) dt.items.add(f);
                          });
                          setSelectedFiles(dt.files.length > 0 ? dt.files : null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {receipt ? "Updating..." : "Creating..."}
                </>
              ) : (
                receipt ? "Update Receipt" : "Create Receipt"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
