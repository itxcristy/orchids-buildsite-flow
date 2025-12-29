import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/database';
import { useAuth } from "@/hooks/useAuth";
import { Upload, X } from "lucide-react";

interface ReimbursementRequest {
  id: string;
  employee_id: string;
  category_id: string;
  amount: number;
  currency: string;
  expense_date: string;
  description: string;
  business_purpose: string;
  status: string;
}

interface ReimbursementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  request?: ReimbursementRequest | null;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
}

export const ReimbursementFormDialog: React.FC<ReimbursementFormDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  request,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  
  const [formData, setFormData] = useState({
    category_id: "",
    amount: "",
    currency: "USD",
    expense_date: "",
    description: "",
    business_purpose: "",
  });

  const isEditMode = !!request;

  React.useEffect(() => {
    if (open) {
      fetchCategories();
      if (request) {
        // Populate form with existing data
        setFormData({
          category_id: request.category_id || "",
          amount: request.amount?.toString() || "",
          currency: request.currency || "USD",
          expense_date: request.expense_date || "",
          description: request.description || "",
          business_purpose: request.business_purpose || "",
        });
      } else {
        // Reset form for new request
        setFormData({
          category_id: "",
          amount: "",
          currency: "USD",
          expense_date: "",
          description: "",
          business_purpose: "",
        });
      }
      setSelectedFiles(null);
    }
  }, [open, request]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await db
        .from("expense_categories")
        .select("id, name, description")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        throw error;
      }
      
      setCategories((data as any) || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to load expense categories",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const uploadFiles = async (reimbursementId: string) => {
    if (!selectedFiles || !user) return;

    const uploadPromises = Array.from(selectedFiles).map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${reimbursementId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await db.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save file info to database - use reimbursement_id
      const { error: dbError } = await db
        .from('reimbursement_attachments')
        .insert({
          reimbursement_id: reimbursementId,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
          uploaded_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;
    });

    await Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      if (isEditMode && request) {
        // Update existing reimbursement request
        const { data: reimbursement, error: reimbursementError } = await db
          .from("reimbursement_requests")
          .update({
            category_id: formData.category_id,
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            expense_date: formData.expense_date,
            description: formData.description,
            business_purpose: formData.business_purpose || null,
          })
          .eq("id", request.id)
          .select()
          .single();

        if (reimbursementError) throw reimbursementError;

        // Upload new files if any
        if (selectedFiles && selectedFiles.length > 0 && reimbursement) {
          await uploadFiles((reimbursement as any).id);
        }

        toast({
          title: "Success",
          description: "Reimbursement request updated successfully",
        });
      } else {
        // Create new reimbursement request
        const { data: reimbursement, error: reimbursementError } = await db
          .from("reimbursement_requests")
          .insert({
            employee_id: user.id,
            category_id: formData.category_id,
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            expense_date: formData.expense_date,
            description: formData.description,
            business_purpose: formData.business_purpose || null,
            status: "submitted",
            submitted_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (reimbursementError) throw reimbursementError;

        // Upload files if any
        if (selectedFiles && selectedFiles.length > 0 && reimbursement) {
          await uploadFiles((reimbursement as any).id);
        }

        toast({
          title: "Success",
          description: "Reimbursement request submitted successfully",
        });
      }

      // Reset form
      setFormData({
        category_id: "",
        amount: "",
        currency: "USD",
        expense_date: "",
        description: "",
        business_purpose: "",
      });
      setSelectedFiles(null);
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting reimbursement:", error);
      toast({
        title: "Error",
        description: error?.message || `Failed to ${isEditMode ? 'update' : 'submit'} reimbursement request`,
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
          <DialogTitle>{isEditMode ? "Edit Reimbursement Request" : "New Reimbursement Request"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category">Expense Category</Label>
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
                    {loading ? "Loading categories..." : "No categories available"}
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
            {categories.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {categories.length} categories available
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
                required
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border shadow-lg z-50">
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
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
          </div>

          <div>
            <Label htmlFor="expense_date">Expense Date</Label>
            <Input
              id="expense_date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
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
                    <div key={index} className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{file.name}</span>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (isEditMode ? "Updating..." : "Submitting...") : (isEditMode ? "Update Request" : "Submit Request")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};