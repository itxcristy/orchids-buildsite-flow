import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Filter, Download, CreditCard, DollarSign, TrendingUp, Calendar, Loader2, Edit, Trash2, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { selectRecords, rawQuery, deleteRecord, updateRecord } from '@/services/api/postgresql-service';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { getAgencyId } from '@/utils/agencyUtils';
import PaymentFormDialog from "@/components/PaymentFormDialog";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { logError } from '@/utils/consoleLogger';

interface Payment {
  id: string;
  journal_entry_id: string;
  invoice_id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string;
  status: string;
  notes?: string;
}

interface PaymentStats {
  totalReceived: number;
  pendingPayments: number;
  thisMonth: number;
  avgPaymentTime: number;
}

const Payments = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState('all');
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    totalReceived: 0,
    pendingPayments: 0,
    thisMonth: 0,
    avgPaymentTime: 0
  });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  useEffect(() => {
    const initializeAgency = async () => {
      const id = await getAgencyId(profile, user?.id);
      setAgencyId(id);
      if (id) {
        fetchPayments(id);
      }
    };

    if (user?.id) {
      initializeAgency();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.agency_id]);

  const fetchPayments = async (agencyIdParam?: string | null) => {
    const effectiveAgencyId = agencyIdParam || agencyId;
    try {
      setLoading(true);

      if (!effectiveAgencyId) {
        setPayments([]);
        setPaymentStats({
          totalReceived: 0,
          pendingPayments: 0,
          thisMonth: 0,
          avgPaymentTime: 0
        });
        return;
      }

      // Fetch payments from journal entries linked to invoices
      // Payments are journal entries with cash/bank accounts debited and AR credited
      const query = `
        SELECT DISTINCT
          je.id as journal_entry_id,
          je.entry_date as payment_date,
          je.created_at,
          je.reference,
          je.description,
          je.entry_number,
          jel.debit_amount as amount,
          inv.id as invoice_id,
          inv.invoice_number,
          inv.issue_date,
          inv.due_date,
          inv.status as invoice_status,
          inv.total_amount as invoice_total,
          COALESCE(c.name, c.company_name, 'Unknown Client') as client_name,
          CASE 
            WHEN je.reference ILIKE '%cash%' THEN 'cash'
            WHEN je.reference ILIKE '%cheque%' OR je.reference ILIKE '%check%' THEN 'cheque'
            WHEN je.reference ILIKE '%card%' THEN 'credit_card'
            WHEN je.reference ILIKE '%upi%' THEN 'upi'
            WHEN je.reference ILIKE '%online%' THEN 'online'
            ELSE 'bank_transfer'
          END as payment_method,
          CASE 
            WHEN inv.status = 'paid' THEN 'completed'
            WHEN inv.status = 'partial' THEN 'partial'
            WHEN inv.status = 'overdue' THEN 'pending'
            ELSE 'pending'
          END as status
        FROM journal_entries je
        JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        LEFT JOIN invoices inv ON je.reference LIKE '%' || inv.invoice_number || '%'
        LEFT JOIN clients c ON inv.client_id = c.id
        WHERE je.agency_id = $1
        AND je.status = 'posted'
        AND coa.account_type = 'Asset'
        AND (coa.account_name ILIKE '%cash%' OR coa.account_name ILIKE '%bank%')
        AND jel.debit_amount > 0
        AND inv.id IS NOT NULL
        ORDER BY je.entry_date DESC, je.created_at DESC
      `;

      const paymentData = await rawQuery(query, [effectiveAgencyId]);

      // Transform to Payment interface
      const transformedPayments: Payment[] = (paymentData || []).map((p: any) => ({
        id: p.journal_entry_id,
        journal_entry_id: p.journal_entry_id,
        invoice_id: p.invoice_id,
        invoice_number: p.invoice_number || 'N/A',
        client_name: p.client_name || 'Unknown Client',
        amount: Number(p.amount) || 0,
        payment_date: p.payment_date,
        payment_method: p.payment_method || 'bank_transfer',
        reference: p.reference || p.entry_number || '',
        status: p.status || 'completed',
        notes: p.description || '',
      }));

      setPayments(transformedPayments);

      // Calculate stats
      const completedPayments = transformedPayments.filter(p => p.status === 'completed');
      const totalReceived = completedPayments.reduce((sum, p) => sum + p.amount, 0);
      
      // Get pending invoices to calculate pending payments
      const pendingInvoices = await selectRecords('invoices', {
        where: {
          agency_id: effectiveAgencyId,
          status: { operator: 'in', value: ['sent', 'overdue', 'partial'] }
        },
      });

      const pendingPayments = pendingInvoices.reduce((sum: number, inv: any) => {
        const total = inv.total_amount || 
          (inv.subtotal * (1 + (inv.tax_rate || 0) / 100) - (inv.discount || 0));
        return sum + Number(total);
      }, 0);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const thisMonth = completedPayments.filter(p => {
        const paymentDate = new Date(p.payment_date);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      }).reduce((sum, p) => sum + p.amount, 0);

      // Calculate average payment time (days between invoice issue and payment)
      let totalDays = 0;
      let count = 0;
      completedPayments.forEach(payment => {
        const paymentDataItem = paymentData.find((p: any) => p.journal_entry_id === payment.journal_entry_id);
        if (paymentDataItem?.issue_date) {
          const issueDate = new Date(paymentDataItem.issue_date);
          const payDate = new Date(payment.payment_date);
          const days = Math.ceil((payDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
          if (days > 0) {
            totalDays += days;
            count++;
          }
        }
      });
      const avgPaymentTime = count > 0 ? Math.round(totalDays / count) : 0;

      setPaymentStats({
        totalReceived: Math.round(totalReceived),
        pendingPayments: Math.round(pendingPayments),
        thisMonth: Math.round(thisMonth),
        avgPaymentTime
      });

    } catch (error: any) {
      logError('Error fetching payments:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load payments. Please try again.",
        variant: "destructive",
      });
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSaved = () => {
    fetchPayments();
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete || !user?.id) {
      return;
    }

    try {
      // Delete journal entry (which will cascade delete lines)
      await deleteRecord('journal_entries', { id: paymentToDelete.journal_entry_id });

      // Update invoice status back to unpaid/partial
      const invoice = await selectRecords('invoices', {
        where: { id: paymentToDelete.invoice_id },
        limit: 1,
      });

      if (invoice && invoice[0]) {
        const inv = invoice[0];
        // Recalculate payment status
        const paymentsQuery = `
          SELECT COALESCE(SUM(jel.debit_amount), 0) as total_paid
          FROM journal_entries je
          JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
          JOIN chart_of_accounts coa ON jel.account_id = coa.id
          WHERE je.reference LIKE $1
          AND coa.account_type = 'Asset'
          AND (coa.account_name ILIKE '%cash%' OR coa.account_name ILIKE '%bank%')
          AND je.agency_id = $2
          AND je.id != $3
        `;

        const cashAccounts = await selectRecords('chart_of_accounts', {
          where: {
            agency_id: agencyId,
            account_type: 'Asset',
            account_name: { operator: 'ILIKE', value: '%cash%' }
          },
          limit: 1,
        });

        if (cashAccounts && cashAccounts.length > 0) {
          const existingPayments = await rawQuery(paymentsQuery, [
            `%${inv.invoice_number}%`,
            agencyId,
            paymentToDelete.journal_entry_id
          ]);

          const totalPaid = Number(existingPayments[0]?.total_paid || 0);
          const invoiceTotal = inv.total_amount || 
            (inv.subtotal * (1 + (inv.tax_rate || 0) / 100) - (inv.discount || 0));

          let newStatus = inv.status;
          if (totalPaid >= invoiceTotal) {
            newStatus = 'paid';
          } else if (totalPaid > 0) {
            newStatus = 'partial';
          } else {
            newStatus = 'sent';
          }

          await updateRecord('invoices', inv.id, {
            status: newStatus,
          }, user.id);
        }
      }

      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });

      await fetchPayments(agencyId);
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
    } catch (error: any) {
      logError('Error deleting payment:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredPayments = payments.filter(payment =>
    payment.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFilteredByStatus = (status: string) => {
    if (status === 'all') return filteredPayments;
    return filteredPayments.filter(p => p.status === status);
  };

  const handleExportReport = () => {
    // TODO: Implement export functionality
    toast({
      title: "Export",
      description: "Export functionality will be implemented soon",
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading payments...</span>
        </div>
      </div>
    );
  }

  if (!agencyId && !loading && user?.id) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Unable to load payments. Please ensure you are logged in.</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'partial': return 'secondary';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      case 'refunded': return 'outline';
      default: return 'secondary';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'credit_card':
      case 'debit_card':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'bank_transfer': return 'Bank Transfer';
      case 'cash': return 'Cash';
      case 'credit_card': return 'Credit Card';
      case 'debit_card': return 'Debit Card';
      case 'cheque': return 'Cheque';
      case 'upi': return 'UPI';
      case 'online': return 'Online';
      default: return method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Track and manage incoming payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button onClick={() => {
            setSelectedPayment(null);
            setSelectedInvoiceId(null);
            setPaymentFormOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Received</p>
                <p className="text-2xl font-bold">₹{paymentStats.totalReceived.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">₹{paymentStats.pendingPayments.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">₹{paymentStats.thisMonth.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg. Payment Time</p>
                <p className="text-2xl font-bold">{paymentStats.avgPaymentTime} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search payments..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({payments.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({payments.filter(p => p.status === 'completed').length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({payments.filter(p => p.status === 'pending' || p.status === 'partial').length})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({payments.filter(p => p.status === 'failed').length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value={selectedTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Complete list of all payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getFilteredByStatus(selectedTab).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm 
                        ? 'No payments found matching your search.' 
                        : `No ${selectedTab === 'all' ? '' : selectedTab} payments found.`}
                    </p>
                  </div>
                ) : (
                  getFilteredByStatus(selectedTab).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        {getMethodIcon(payment.payment_method)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{payment.client_name}</h3>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          <span>Invoice: {payment.invoice_number}</span>
                          <span>•</span>
                          <span>Ref: {payment.reference}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{getMethodLabel(payment.payment_method)}</p>
                      </div>
                    </div>
                    <div className="text-right mr-4">
                      <p className="font-bold text-lg">₹{payment.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          // Fetch payment details with invoice
                          try {
                            const invoice = await selectRecords('invoices', {
                              where: { id: payment.invoice_id },
                              limit: 1,
                            });
                            if (invoice && invoice[0]) {
                              setSelectedInvoiceId(invoice[0].id);
                            }
                            setSelectedPayment(payment);
                            setPaymentFormOpen(true);
                          } catch (error) {
                            logError('Error fetching payment details:', error);
                            setSelectedPayment(payment);
                            setPaymentFormOpen(true);
                          }
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPaymentToDelete(payment);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PaymentFormDialog
        isOpen={paymentFormOpen}
        onClose={() => {
          setPaymentFormOpen(false);
          setSelectedPayment(null);
          setSelectedInvoiceId(null);
        }}
        payment={selectedPayment}
        invoiceId={selectedInvoiceId}
        onPaymentSaved={handlePaymentSaved}
      />

      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setPaymentToDelete(null);
        }}
        onDeleted={handleDeletePayment}
        itemType="Payment"
        itemName={`Payment of ₹${paymentToDelete?.amount.toLocaleString()}`}
        itemId={paymentToDelete?.journal_entry_id || ''}
        tableName="journal_entries"
      />
    </div>
  );
};

export default Payments;
