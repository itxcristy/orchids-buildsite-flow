import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info } from 'lucide-react';
import { GSTTransaction } from '@/services/api/gst-service';

interface GSTTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTransaction?: GSTTransaction | null;
  onSave: (transaction: Omit<GSTTransaction, 'id' | 'agency_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  loading?: boolean;
}

export const GSTTransactionDialog: React.FC<GSTTransactionDialogProps> = ({
  open,
  onOpenChange,
  existingTransaction,
  onSave,
  loading = false
}) => {
  const [formData, setFormData] = useState<Omit<GSTTransaction, 'id' | 'agency_id' | 'created_at' | 'updated_at'>>({
    transaction_type: 'sale',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    customer_gstin: '',
    customer_name: '',
    place_of_supply: '',
    hsn_sac_code: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    taxable_value: 0,
    cgst_rate: 0,
    sgst_rate: 0,
    igst_rate: 0,
    cess_rate: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    cess_amount: 0,
    total_amount: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingTransaction) {
      setFormData({
        transaction_type: existingTransaction.transaction_type,
        invoice_number: existingTransaction.invoice_number || '',
        invoice_date: existingTransaction.invoice_date || new Date().toISOString().split('T')[0],
        customer_gstin: existingTransaction.customer_gstin || '',
        customer_name: existingTransaction.customer_name || '',
        place_of_supply: existingTransaction.place_of_supply || '',
        hsn_sac_code: existingTransaction.hsn_sac_code || '',
        description: existingTransaction.description || '',
        quantity: existingTransaction.quantity || 1,
        unit_price: Number(existingTransaction.unit_price) || 0,
        taxable_value: Number(existingTransaction.taxable_value) || 0,
        cgst_rate: Number(existingTransaction.cgst_rate) || 0,
        sgst_rate: Number(existingTransaction.sgst_rate) || 0,
        igst_rate: Number(existingTransaction.igst_rate) || 0,
        cess_rate: Number(existingTransaction.cess_rate) || 0,
        cgst_amount: Number(existingTransaction.cgst_amount) || 0,
        sgst_amount: Number(existingTransaction.sgst_amount) || 0,
        igst_amount: Number(existingTransaction.igst_amount) || 0,
        cess_amount: Number(existingTransaction.cess_amount) || 0,
        total_amount: Number(existingTransaction.total_amount) || 0
      });
    } else {
      // Reset form
      setFormData({
        transaction_type: 'sale',
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        customer_gstin: '',
        customer_name: '',
        place_of_supply: '',
        hsn_sac_code: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        taxable_value: 0,
        cgst_rate: 0,
        sgst_rate: 0,
        igst_rate: 0,
        cess_rate: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        cess_amount: 0,
        total_amount: 0
      });
    }
    setErrors({});
  }, [existingTransaction, open]);

  const calculateTaxes = () => {
    const taxableValue = Number(formData.quantity || 1) * Number(formData.unit_price || 0);
    const cgstRate = Number(formData.cgst_rate || 0);
    const sgstRate = Number(formData.sgst_rate || 0);
    const igstRate = Number(formData.igst_rate || 0);
    const cessRate = Number(formData.cess_rate || 0);

    const cgstAmount = (taxableValue * cgstRate) / 100;
    const sgstAmount = (taxableValue * sgstRate) / 100;
    const igstAmount = (taxableValue * igstRate) / 100;
    const cessAmount = (taxableValue * cessRate) / 100;
    const totalAmount = taxableValue + cgstAmount + sgstAmount + igstAmount + cessAmount;

    setFormData(prev => ({
      ...prev,
      taxable_value: taxableValue,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      cess_amount: cessAmount,
      total_amount: totalAmount
    }));
  };

  useEffect(() => {
    if (formData.quantity && formData.unit_price) {
      calculateTaxes();
    }
  }, [formData.quantity, formData.unit_price, formData.cgst_rate, formData.sgst_rate, formData.igst_rate, formData.cess_rate]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.invoice_number?.trim()) {
      newErrors.invoice_number = 'Invoice number is required';
    }
    if (!formData.invoice_date) {
      newErrors.invoice_date = 'Invoice date is required';
    }
    if (!formData.customer_name?.trim()) {
      newErrors.customer_name = 'Customer name is required';
    }
    if (!formData.unit_price || formData.unit_price <= 0) {
      newErrors.unit_price = 'Unit price must be greater than 0';
    }
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save GST transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingTransaction ? 'Edit GST Transaction' : 'Add GST Transaction'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Enter GST transaction details. Tax amounts will be calculated automatically based on rates.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_type">Transaction Type *</Label>
              <Select
                value={formData.transaction_type}
                onValueChange={(value: GSTTransaction['transaction_type']) => 
                  setFormData({ ...formData, transaction_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="credit_note">Credit Note</SelectItem>
                  <SelectItem value="debit_note">Debit Note</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_number">Invoice Number *</Label>
              <Input
                id="invoice_number"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                placeholder="INV-001"
                className={errors.invoice_number ? 'border-destructive' : ''}
              />
              {errors.invoice_number && (
                <p className="text-sm text-destructive">{errors.invoice_number}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_date">Invoice Date *</Label>
              <Input
                id="invoice_date"
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className={errors.invoice_date ? 'border-destructive' : ''}
              />
              {errors.invoice_date && (
                <p className="text-sm text-destructive">{errors.invoice_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer/Vendor Name *</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="Enter customer or vendor name"
                className={errors.customer_name ? 'border-destructive' : ''}
              />
              {errors.customer_name && (
                <p className="text-sm text-destructive">{errors.customer_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_gstin">Customer/Vendor GSTIN</Label>
              <Input
                id="customer_gstin"
                value={formData.customer_gstin || ''}
                onChange={(e) => setFormData({ ...formData, customer_gstin: e.target.value.toUpperCase() })}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="place_of_supply">Place of Supply</Label>
              <Input
                id="place_of_supply"
                value={formData.place_of_supply || ''}
                onChange={(e) => setFormData({ ...formData, place_of_supply: e.target.value })}
                placeholder="State name or code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hsn_sac_code">HSN/SAC Code</Label>
              <Input
                id="hsn_sac_code"
                value={formData.hsn_sac_code || ''}
                onChange={(e) => setFormData({ ...formData, hsn_sac_code: e.target.value })}
                placeholder="Enter HSN or SAC code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product or service description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.quantity || 1}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) || 1 })}
                className={errors.quantity ? 'border-destructive' : ''}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_price">Unit Price *</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.unit_price || 0}
                onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) || 0 })}
                className={errors.unit_price ? 'border-destructive' : ''}
              />
              {errors.unit_price && (
                <p className="text-sm text-destructive">{errors.unit_price}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cgst_rate">CGST Rate (%)</Label>
              <Input
                id="cgst_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.cgst_rate || 0}
                onChange={(e) => setFormData({ ...formData, cgst_rate: Number(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sgst_rate">SGST Rate (%)</Label>
              <Input
                id="sgst_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.sgst_rate || 0}
                onChange={(e) => setFormData({ ...formData, sgst_rate: Number(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="igst_rate">IGST Rate (%)</Label>
              <Input
                id="igst_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.igst_rate || 0}
                onChange={(e) => setFormData({ ...formData, igst_rate: Number(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cess_rate">Cess Rate (%)</Label>
              <Input
                id="cess_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.cess_rate || 0}
                onChange={(e) => setFormData({ ...formData, cess_rate: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Calculated Values Display */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-sm text-muted-foreground">Taxable Value</Label>
              <p className="text-lg font-semibold">₹{Number(formData.taxable_value || 0).toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">CGST</Label>
              <p className="text-lg font-semibold">₹{Number(formData.cgst_amount || 0).toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">SGST</Label>
              <p className="text-lg font-semibold">₹{Number(formData.sgst_amount || 0).toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">IGST</Label>
              <p className="text-lg font-semibold">₹{Number(formData.igst_amount || 0).toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Cess</Label>
              <p className="text-lg font-semibold">₹{Number(formData.cess_amount || 0).toFixed(2)}</p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label className="text-sm text-muted-foreground">Total Amount</Label>
              <p className="text-lg font-semibold text-primary">₹{Number(formData.total_amount || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSubmitting || loading}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingTransaction ? 'Update' : 'Create'} Transaction
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
