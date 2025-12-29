import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { insertRecord, updateRecord, selectRecords, selectOne, rawQuery, deleteRecord } from '@/services/api/postgresql-service';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface Payment {
  id?: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  status?: string;
}

interface PaymentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment?: Payment | null;
  invoiceId?: string | null;
  onPaymentSaved: () => void;
}

const PaymentFormDialog: React.FC<PaymentFormDialogProps> = ({ 
  isOpen, 
  onClose, 
  payment, 
  invoiceId,
  onPaymentSaved 
}) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [formData, setFormData] = useState<Payment>({
    invoice_id: payment?.invoice_id || invoiceId || '',
    payment_date: payment?.payment_date || new Date().toISOString().split('T')[0],
    amount: payment?.amount || 0,
    payment_method: payment?.payment_method || 'bank_transfer',
    reference_number: payment?.reference_number || '',
    notes: payment?.notes || '',
    status: payment?.status || 'completed',
  });

  useEffect(() => {
    if (isOpen) {
      fetchInvoices();
      if (payment) {
        setFormData({
          invoice_id: payment.invoice_id || '',
          payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
          amount: payment.amount || 0,
          payment_method: payment.payment_method || 'bank_transfer',
          reference_number: payment.reference_number || '',
          notes: payment.notes || '',
          status: payment.status || 'completed',
        });
      } else if (invoiceId) {
        setFormData(prev => ({
          ...prev,
          invoice_id: invoiceId,
        }));
      } else {
        setFormData({
          invoice_id: '',
          payment_date: new Date().toISOString().split('T')[0],
          amount: 0,
          payment_method: 'bank_transfer',
          reference_number: '',
          notes: '',
          status: 'completed',
        });
      }
    }
  }, [isOpen, payment, invoiceId]);

  useEffect(() => {
    if (formData.invoice_id && invoices.length > 0) {
      const invoice = invoices.find((inv: any) => inv.id === formData.invoice_id);
      if (invoice) {
        setSelectedInvoice(invoice);
        // Auto-fill amount if not set and not editing
        if (!payment && formData.amount === 0) {
          const totalAmount = invoice.total_amount || 
            (invoice.subtotal * (1 + (invoice.tax_rate || 0) / 100) - (invoice.discount || 0));
          setFormData(prev => ({ ...prev, amount: Number(totalAmount) || 0 }));
        }
      }
    } else if (payment && payment.invoice_id) {
      // If editing, fetch the invoice
      selectOne('invoices', { id: payment.invoice_id }).then((invoice: any) => {
        if (invoice) {
          setSelectedInvoice(invoice);
          setFormData(prev => ({
            ...prev,
            invoice_id: invoice.id,
            amount: payment.amount || 0,
          }));
        }
      }).catch(console.error);
    }
  }, [formData.invoice_id, invoices, payment]);

  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      if (!profile?.agency_id) {
        setInvoices([]);
        return;
      }

      // Fetch unpaid or partially paid invoices
      const invoicesData = await selectRecords('invoices', {
        where: { 
          agency_id: profile.agency_id,
          status: { operator: 'in', value: ['draft', 'sent', 'overdue', 'partial'] }
        },
        orderBy: 'issue_date DESC',
      });
      
      setInvoices(invoicesData || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invoices',
        variant: 'destructive',
      });
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.invoice_id) {
      toast({
        title: 'Validation Error',
        description: 'Please select an invoice',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.payment_date) {
      toast({
        title: 'Validation Error',
        description: 'Please select a payment date',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.amount || formData.amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.payment_method) {
      toast({
        title: 'Validation Error',
        description: 'Please select a payment method',
        variant: 'destructive',
      });
      return false;
    }

    // Check if payment amount exceeds invoice balance
    if (selectedInvoice) {
      const invoiceTotal = selectedInvoice.total_amount || 
        (selectedInvoice.subtotal * (1 + (selectedInvoice.tax_rate || 0) / 100) - (selectedInvoice.discount || 0));
      
      // Get existing payments for this invoice
      const existingPaymentsQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_paid
        FROM journal_entries je
        JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE je.reference LIKE $1
        AND coa.account_type = 'Asset'
        AND coa.account_name ILIKE '%cash%'
        AND je.agency_id = $2
      `;
      
      // For now, we'll allow the payment and validate in the backend
      // The actual validation should check against all previous payments
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!user?.id || !profile?.agency_id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to record a payment',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (!selectedInvoice && !payment) {
        toast({
          title: 'Error',
          description: 'Please select a valid invoice',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const invoice = selectedInvoice || (payment ? await selectOne('invoices', { id: payment.invoice_id }) : null);
      if (!invoice) {
        toast({
          title: 'Error',
          description: 'Invoice not found',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Get cash/bank account for payment
      const cashAccounts = await selectRecords('chart_of_accounts', {
        where: {
          agency_id: profile.agency_id,
          account_type: 'Asset',
          account_name: { operator: 'ILIKE', value: '%cash%' }
        },
        limit: 1,
      });

      if (!cashAccounts || cashAccounts.length === 0) {
        toast({
          title: 'Error',
          description: 'No cash account found. Please create a cash account in Chart of Accounts first.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const cashAccount = cashAccounts[0];

      // Get accounts receivable account
      const arAccounts = await selectRecords('chart_of_accounts', {
        where: {
          agency_id: profile.agency_id,
          account_type: 'Asset',
          account_name: { operator: 'ILIKE', value: '%receivable%' }
        },
        limit: 1,
      });

      const arAccount = arAccounts && arAccounts.length > 0 ? arAccounts[0] : cashAccount;

      if (payment && payment.id) {
        // Update existing payment (journal entry)
        // Get existing journal entry
        const existingEntry = await selectOne('journal_entries', { id: payment.id });
        if (!existingEntry) {
          throw new Error('Payment entry not found');
        }

        // Update journal entry
        await updateRecord('journal_entries', {
          entry_date: formData.payment_date,
          description: `Payment for Invoice ${invoice.invoice_number}${formData.notes ? ` - ${formData.notes}` : ''}`,
          reference: formData.reference_number || existingEntry.reference || `PAY-${invoice.invoice_number}`,
          total_debit: formData.amount,
          total_credit: formData.amount,
        }, { id: payment.id }, user.id);

        // Delete existing lines
        const existingLines = await selectRecords('journal_entry_lines', {
          where: { journal_entry_id: payment.id },
        });
        for (const line of existingLines || []) {
          await deleteRecord('journal_entry_lines', line.id, user.id);
        }

        // Create new lines
        await insertRecord('journal_entry_lines', {
          journal_entry_id: payment.id,
          account_id: cashAccount.id,
          description: `Payment received for Invoice ${invoice.invoice_number}`,
          debit_amount: formData.amount,
          credit_amount: 0,
          line_number: 1,
        }, user.id);

        await insertRecord('journal_entry_lines', {
          journal_entry_id: payment.id,
          account_id: arAccount.id,
          description: `Payment for Invoice ${invoice.invoice_number}`,
          debit_amount: 0,
          credit_amount: formData.amount,
          line_number: 2,
        }, user.id);
      } else {
        // Create new payment
        // Generate journal entry number
        const year = new Date().getFullYear();
        const timestamp = String(Date.now()).slice(-6);
        const entryNumber = `PAY-${year}-${timestamp}`;
        const reference = formData.reference_number || `PAY-${invoice.invoice_number}`;

        // Create journal entry for payment
        const journalEntry = await insertRecord('journal_entries', {
          entry_number: entryNumber,
          entry_date: formData.payment_date,
          description: `Payment for Invoice ${invoice.invoice_number}${formData.notes ? ` - ${formData.notes}` : ''}`,
          reference: reference,
          status: 'posted',
          total_debit: formData.amount,
          total_credit: formData.amount,
          created_by: user.id,
          agency_id: profile.agency_id,
        }, user.id);

        // Create debit line (Cash/Bank account)
        await insertRecord('journal_entry_lines', {
          journal_entry_id: journalEntry.id,
          account_id: cashAccount.id,
          description: `Payment received for Invoice ${invoice.invoice_number}`,
          debit_amount: formData.amount,
          credit_amount: 0,
          line_number: 1,
        }, user.id);

        // Create credit line (Accounts Receivable)
        await insertRecord('journal_entry_lines', {
          journal_entry_id: journalEntry.id,
          account_id: arAccount.id,
          description: `Payment for Invoice ${invoice.invoice_number}`,
          debit_amount: 0,
          credit_amount: formData.amount,
          line_number: 2,
        }, user.id);
      }

      // Update invoice status
      const invoiceTotal = invoice.total_amount || 
        (invoice.subtotal * (1 + (invoice.tax_rate || 0) / 100) - (invoice.discount || 0));
      
      // Get total payments for this invoice
      const paymentsQuery = `
        SELECT COALESCE(SUM(jel.debit_amount), 0) as total_paid
        FROM journal_entries je
        JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
        WHERE je.reference LIKE $1
        AND jel.account_id = $2
        AND je.agency_id = $3
        ${payment && payment.id ? `AND je.id != $4` : ''}
      `;
      
      const queryParams: any[] = [
        `%${invoice.invoice_number}%`,
        cashAccount.id,
        profile.agency_id
      ];
      if (payment && payment.id) {
        queryParams.push(payment.id);
      }
      
      const existingPayments = await rawQuery(paymentsQuery, queryParams);

      // Calculate total paid including this payment
      let totalPaid = Number(existingPayments[0]?.total_paid || 0);
      if (payment && payment.id) {
        // For updates, we need to subtract old amount and add new amount
        // But for simplicity, we'll recalculate from all payments
        totalPaid = totalPaid - (payment.amount || 0) + formData.amount;
      } else {
        totalPaid = totalPaid + formData.amount;
      }
      
      let newStatus = invoice.status;
      if (totalPaid >= invoiceTotal) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'sent';
      }

      await updateRecord('invoices', {
        status: newStatus,
      }, { id: invoice.id }, user.id);

      toast({
        title: 'Success',
        description: `Payment of ₹${formData.amount.toLocaleString()} ${payment ? 'updated' : 'recorded'} successfully`,
      });

      onPaymentSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving payment:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to record payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{payment ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
          <DialogDescription>
            {payment ? 'Update payment details' : 'Record a new payment for an invoice'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_id">Invoice *</Label>
              <Select
                value={formData.invoice_id}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, invoice_id: value }));
                }}
                disabled={!!invoiceId || !!payment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice">
                    {invoicesLoading ? (
                      <span className="text-muted-foreground">Loading...</span>
                    ) : selectedInvoice ? (
                      `${selectedInvoice.invoice_number} - ${selectedInvoice.title}`
                    ) : (
                      'Select invoice'
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((inv: any) => {
                    const total = inv.total_amount || 
                      (inv.subtotal * (1 + (inv.tax_rate || 0) / 100) - (inv.discount || 0));
                    return (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} - {inv.title} (₹{Number(total).toLocaleString()})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedInvoice && (
                <p className="text-xs text-muted-foreground">
                  Total: ₹{Number(selectedInvoice.total_amount || 
                    (selectedInvoice.subtotal * (1 + (selectedInvoice.tax_rate || 0) / 100) - (selectedInvoice.discount || 0))
                  ).toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) || 0 }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference Number</Label>
            <Input
              id="reference_number"
              value={formData.reference_number}
              onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
              placeholder="Transaction ID, Cheque Number, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this payment..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {payment ? 'Update Payment' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentFormDialog;

