import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Settings, 
  FileText, 
  TrendingUp, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter
} from 'lucide-react';
import { useGST, GSTReturn, GSTTransaction } from '@/hooks/useGST';
import { GSTSettingsDialog } from './GSTSettingsDialog';
import { GSTTransactionDialog } from './GSTTransactionDialog';
import { GSTReturnDialog } from './GSTReturnDialog';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const GSTDashboard: React.FC = () => {
  const { 
    settings, 
    returns, 
    transactions,
    liability, 
    loading, 
    saveSettings, 
    fetchLiability,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    generateReturn,
    updateReturn,
    isAuthenticated 
  } = useGST();
  const { user, userRole, loading: authLoading } = useAuth();
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<GSTTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<GSTTransaction | null>(null);
  const [viewingReturn, setViewingReturn] = useState<GSTReturn | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionFilter, setTransactionFilter] = useState<string>('all');
  
  // Simple currency formatter
  const formatCurrency = (amount: number, currency: string = 'INR'): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };
  
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [lastFetchedPeriod, setLastFetchedPeriod] = useState<string | null>(null);
  
  useEffect(() => {
    // Only fetch liability if user is authenticated and has selected a period
    // AND we haven't already fetched for this period
    if (isAuthenticated && selectedPeriod && selectedPeriod !== lastFetchedPeriod) {
      const [year, month] = selectedPeriod.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      
      setLastFetchedPeriod(selectedPeriod);
      
      // Use a delay to prevent rapid-fire requests
      const timeoutId = setTimeout(() => {
        fetchLiability(startDate, endDate);
        fetchTransactions({ start_date: startDate, end_date: endDate });
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedPeriod, isAuthenticated, lastFetchedPeriod]); // Track last fetched period

  const getStatusColor = (status: GSTReturn['status']) => {
    switch (status) {
      case 'filed': return 'bg-green-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      case 'late': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: GSTReturn['status']) => {
    switch (status) {
      case 'filed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'late': return <AlertTriangle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleCreateTransaction = async (transaction: Omit<GSTTransaction, 'id' | 'agency_id' | 'created_at' | 'updated_at'>) => {
    await createTransaction(transaction);
    setShowTransactionDialog(false);
    setEditingTransaction(null);
  };

  const handleUpdateTransaction = async (transaction: Omit<GSTTransaction, 'id' | 'agency_id' | 'created_at' | 'updated_at'>) => {
    if (editingTransaction?.id) {
      await updateTransaction(editingTransaction.id, transaction);
      setShowTransactionDialog(false);
      setEditingTransaction(null);
    }
  };

  const handleDeleteTransaction = async () => {
    if (deletingTransaction?.id) {
      await deleteTransaction(deletingTransaction.id);
      setDeletingTransaction(null);
    }
  };

  const handleMarkReturnAsFiled = async (returnItem: GSTReturn) => {
    if (returnItem.id) {
      await updateReturn(returnItem.id, {
        status: 'filed',
        filed_date: new Date().toISOString()
      });
    }
  };

  const filteredTransactions = (transactions || []).filter(t => {
    const matchesSearch = !searchTerm || 
      t.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = transactionFilter === 'all' || t.transaction_type === transactionFilter;
    
    return matchesSearch && matchesFilter;
  });

  // Show loading state while auth is loading or GST data is loading
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show authentication required message if user is not authenticated
  // Allow super_admin even if isAuthenticated is false (they might not have agency_id in profile)
  // userRole is already declared on line 57, no need to redeclare
  const hasAgencyContext = typeof window !== 'undefined' && localStorage.getItem('agency_database');
  const canAccess = user && (isAuthenticated || (userRole === 'super_admin' && hasAgencyContext));
  
  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access GST compliance features.</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">GST Compliance</h1>
            <p className="text-muted-foreground">
              Configure your GST settings to start managing compliance and returns
            </p>
          </div>
          
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="space-y-4 text-center">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">GST Settings Required</h3>
                  <p className="text-sm text-muted-foreground">
                    Please configure your GST registration details to continue
                  </p>
                </div>
                <Button onClick={() => setShowSettingsDialog(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configure GST Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <GSTSettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
          existingSettings={settings}
          onSave={saveSettings}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">GST Compliance</h1>
          <p className="text-muted-foreground">
            Manage your GST returns, liability, and compliance
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tax Liability</p>
                <p className="text-2xl font-bold">
                  {liability ? formatCurrency(liability.total_tax, 'INR') : '₹0'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxable Value</p>
                <p className="text-2xl font-bold">
                  {liability ? formatCurrency(liability.total_taxable_value, 'INR') : '₹0'}
                </p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Returns</p>
                <p className="text-2xl font-bold">
                  {(returns || []).filter(r => r.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">
                  {(transactions || []).length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="returns" className="space-y-6">
        <TabsList>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="liability">Tax Liability</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="returns" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>GST Returns</CardTitle>
              <Button size="sm" onClick={() => setShowReturnDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Generate Return
              </Button>
            </CardHeader>
            <CardContent>
              {(returns || []).length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Returns Found</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by generating your first GST return
                  </p>
                  <Button onClick={() => setShowReturnDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate Return
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {(returns || []).map((returnItem) => (
                    <div key={returnItem.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(returnItem.status)}
                        <div>
                          <div className="font-medium">{returnItem.return_type}</div>
                          <div className="text-sm text-muted-foreground">
                            Period: {new Date(returnItem.filing_period).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Due: {new Date(returnItem.due_date).toLocaleDateString()}
                          </div>
                          {returnItem.filed_date && (
                            <div className="text-sm text-muted-foreground">
                              Filed: {new Date(returnItem.filed_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(returnItem.total_tax_amount || 0, 'INR')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(returnItem.total_taxable_value || 0, 'INR')} taxable
                          </div>
                        </div>
                        <Badge className={getStatusColor(returnItem.status)}>
                          {returnItem.status}
                        </Badge>
                        {returnItem.status === 'pending' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleMarkReturnAsFiled(returnItem)}
                          >
                            Mark as Filed
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setViewingReturn(returnItem)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="liability" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tax Liability Summary</CardTitle>
                <Input
                  type="month"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-48"
                />
              </div>
            </CardHeader>
            <CardContent>
              {liability ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">CGST</h4>
                    <p className="text-2xl font-bold">{formatCurrency(liability.total_cgst, 'INR')}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">SGST</h4>
                    <p className="text-2xl font-bold">{formatCurrency(liability.total_sgst, 'INR')}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">IGST</h4>
                    <p className="text-2xl font-bold">{formatCurrency(liability.total_igst, 'INR')}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Cess</h4>
                    <p className="text-2xl font-bold">{formatCurrency(liability.total_cess, 'INR')}</p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-medium mb-2">Total Tax</h4>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(liability.total_tax, 'INR')}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Taxable Value</h4>
                    <p className="text-2xl font-bold">{formatCurrency(liability.total_taxable_value, 'INR')}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Liability Data</h3>
                  <p className="text-muted-foreground">
                    No transactions found for the selected period
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>GST Transactions</CardTitle>
              <Button size="sm" onClick={() => {
                setEditingTransaction(null);
                setShowTransactionDialog(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search and Filter */}
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by invoice number, customer name, or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={transactionFilter}
                    onChange={(e) => setTransactionFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Types</option>
                    <option value="sale">Sale</option>
                    <option value="purchase">Purchase</option>
                    <option value="credit_note">Credit Note</option>
                    <option value="debit_note">Debit Note</option>
                  </select>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No Transactions Found</h3>
                    <p className="text-muted-foreground mb-4">
                      {(transactions || []).length === 0 
                        ? 'Start by adding your first GST transaction'
                        : 'No transactions match your search criteria'}
                    </p>
                    {(transactions || []).length === 0 && (
                      <Button onClick={() => {
                        setEditingTransaction(null);
                        setShowTransactionDialog(true);
                      }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Transaction
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(filteredTransactions || []).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{transaction.transaction_type}</Badge>
                            <div className="font-medium">{transaction.invoice_number}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(transaction.invoice_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {transaction.customer_name}
                            {transaction.customer_gstin && ` (${transaction.customer_gstin})`}
                          </div>
                          {transaction.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {transaction.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium">
                              {formatCurrency(transaction.total_amount || 0, 'INR')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Tax: {formatCurrency(
                                (transaction.cgst_amount || 0) + 
                                (transaction.sgst_amount || 0) + 
                                (transaction.igst_amount || 0) + 
                                (transaction.cess_amount || 0), 
                                'INR'
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTransaction(transaction);
                              setShowTransactionDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingTransaction(transaction)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <GSTSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        existingSettings={settings}
        onSave={saveSettings}
        loading={loading}
      />

      <GSTTransactionDialog
        open={showTransactionDialog}
        onOpenChange={(open) => {
          setShowTransactionDialog(open);
          if (!open) setEditingTransaction(null);
        }}
        existingTransaction={editingTransaction}
        onSave={editingTransaction ? handleUpdateTransaction : handleCreateTransaction}
        loading={loading}
      />

      <GSTReturnDialog
        open={showReturnDialog}
        onOpenChange={setShowReturnDialog}
        onGenerate={generateReturn}
        loading={loading}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTransaction} onOpenChange={(open) => !open && setDeletingTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete transaction {deletingTransaction?.invoice_number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransaction} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Return Dialog */}
      {viewingReturn && (
        <Dialog open={!!viewingReturn} onOpenChange={(open) => !open && setViewingReturn(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>GST Return Details - {viewingReturn.return_type}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Filing Period</Label>
                  <p className="font-medium">
                    {new Date(viewingReturn.filing_period).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Due Date</Label>
                  <p className="font-medium">{new Date(viewingReturn.due_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <Badge className={getStatusColor(viewingReturn.status)}>
                    {viewingReturn.status}
                  </Badge>
                </div>
                {viewingReturn.filed_date && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Filed Date</Label>
                    <p className="font-medium">{new Date(viewingReturn.filed_date).toLocaleDateString()}</p>
                  </div>
                )}
                {viewingReturn.acknowledgment_number && (
                  <div className="col-span-2">
                    <Label className="text-sm text-muted-foreground">Acknowledgment Number</Label>
                    <p className="font-medium">{viewingReturn.acknowledgment_number}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-sm text-muted-foreground">Taxable Value</Label>
                  <p className="text-xl font-bold">{formatCurrency(viewingReturn.total_taxable_value || 0, 'INR')}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Total Tax</Label>
                  <p className="text-xl font-bold text-primary">{formatCurrency(viewingReturn.total_tax_amount || 0, 'INR')}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">CGST</Label>
                  <p className="font-medium">{formatCurrency(viewingReturn.cgst_amount || 0, 'INR')}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">SGST</Label>
                  <p className="font-medium">{formatCurrency(viewingReturn.sgst_amount || 0, 'INR')}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">IGST</Label>
                  <p className="font-medium">{formatCurrency(viewingReturn.igst_amount || 0, 'INR')}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Cess</Label>
                  <p className="font-medium">{formatCurrency(viewingReturn.cess_amount || 0, 'INR')}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
