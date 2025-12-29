import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/database';
import { DollarSign, CreditCard, Banknote } from "lucide-react";
import { format } from "date-fns";

interface ReimbursementRequest {
  id: string;
  employee_id: string;
  amount: number;
  currency: string;
  expense_date: string;
  description: string;
  business_purpose: string;
  status: string;
  profiles?: {
    full_name: string;
  };
  expense_categories: {
    name: string;
  };
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ReimbursementRequest | null;
  onSuccess?: () => void;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  onOpenChange,
  request,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [notes, setNotes] = useState("");

  const handleProcessPayment = async () => {
    if (!request) return;

    setLoading(true);
    try {
      // Update reimbursement request status to paid
      const { data, error } = await db
        .from("reimbursement_requests")
        .update({
          status: "paid",
          payment_date: new Date().toISOString(),
        })
        .eq("id", request.id)
        .select()
        .single();

      if (error) throw error;

      const paymentReference = `PAY-${request.id.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      toast({
        title: "Success",
        description: `Payment processed successfully. Reference: ${paymentReference}`,
      });

      setNotes("");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error processing payment:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'stripe':
        return <CreditCard className="h-4 w-4" />;
      case 'bank_transfer':
        return <Banknote className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Process Reimbursement Payment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Request Summary */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{request.profiles?.full_name}</h4>
                <p className="text-sm text-muted-foreground">{request.expense_categories?.name}</p>
              </div>
              <Badge variant="secondary">Approved</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Amount</Label>
                <p className="font-medium text-lg">{request.currency} {Number(request.amount).toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Expense Date</Label>
                <p className="font-medium">{format(new Date(request.expense_date), "MMM dd, yyyy")}</p>
              </div>
            </div>
            
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="text-sm">{request.description}</p>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Bank Transfer
                  </div>
                </SelectItem>
                <SelectItem value="stripe">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Stripe Payment
                  </div>
                </SelectItem>
                <SelectItem value="check">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Check
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Payment Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this payment..."
              rows={3}
            />
          </div>

          {/* Payment Warning */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md dark:bg-amber-950 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ This action will mark the reimbursement as paid and cannot be undone. 
              Make sure you have processed the actual payment before confirming.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          
          <Button
            onClick={handleProcessPayment}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {getPaymentMethodIcon(paymentMethod)}
            {loading ? "Processing..." : "Process Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};