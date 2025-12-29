import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Filter, Download, TrendingUp, TrendingDown, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db } from '@/lib/database';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { selectRecords, selectOne } from '@/services/api/postgresql-service';
import { logDebug, logWarn, logError } from '@/utils/consoleLogger';

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'credit' | 'debit';
  amount: number;
  balance: number;
  reference: string;
}

interface LedgerSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netProfit: number;
}

const Ledger = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    netProfit: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchLedgerData = useCallback(async () => {
    
    try {
      setLoading(true);
      setError(null);
      
      // Get agency_id - try profile first, then try to fetch from database
      let agencyId = profile?.agency_id;
      
      if (!agencyId && user?.id) {
        try {
          const userProfile = await selectOne('profiles', { user_id: user.id });
          agencyId = userProfile?.agency_id;
        } catch (err) {
          logWarn('Could not fetch profile:', err);
        }
      }

      // Fetch all posted journal entries
      let query = db
        .from('journal_entries')
        .select('*')
        .eq('status', 'posted')
        .order('entry_date', { ascending: false })
        .limit(500);

      const { data: entries, error: entriesError } = await query;

      logDebug('Fetched journal entries:', entries?.length || 0, 'entries');

      if (entriesError) {
        logError('Error fetching journal entries:', entriesError);
        throw entriesError;
      }

      // If no entries, still show the page with empty state
      if (!entries || entries.length === 0) {
        logDebug('No journal entries found');
        setTransactions([]);
        setLedgerSummary({
          totalBalance: 0,
          monthlyIncome: 0,
          monthlyExpenses: 0,
          netProfit: 0
        });
        setLoading(false);
        return;
      }

      // Filter by agency_id if available
      const agencyEntries = (entries || []).filter((e: any) => 
        !agencyId || !e.agency_id || e.agency_id === agencyId
      );

      // Fetch journal entry lines to get account details
      const entryIds = agencyEntries.map((e: any) => e.id) || [];
      let lines: any[] = [];
      
      if (entryIds.length > 0) {
        const { data: linesData, error: linesError } = await db
          .from('journal_entry_lines')
          .select('*')
          .in('journal_entry_id', entryIds);

        if (linesError) {
          logError('Error fetching journal entry lines:', linesError);
          throw linesError;
        }
        lines = linesData || [];
      }

      // Fetch chart of accounts for category mapping
      let accounts: any[] = [];
      try {
        const where: Record<string, any> = { is_active: true };
        if (agencyId) {
          // Prefer agency scoped data when column exists
          where.agency_id = agencyId;
        }
        accounts = await selectRecords('chart_of_accounts', {
          where,
          orderBy: 'account_code ASC'
        });
      } catch (err: any) {
        // Fallback if agency_id column does not exist in current schema
        if (err?.code === '42703' || String(err?.message || '').includes('agency_id')) {
          logWarn('chart_of_accounts has no agency_id column, falling back to global accounts');
          accounts = await selectRecords('chart_of_accounts', {
            where: { is_active: true },
            orderBy: 'account_code ASC'
          });
        } else {
          throw err;
        }
      }

      const accountMap = new Map((accounts || []).map((acc: any) => [acc.id, acc]));

      // Calculate total balance from all posted entries
      let totalBalance = 0;
      const accountBalances: Record<string, number> = {};

      // Calculate balances per account
      lines.forEach((line: any) => {
        if (!line || !line.account_id) return;
        
        const account = accountMap.get(line.account_id);
        if (!account) return;

        const accountType = String(account.account_type || '').toLowerCase();
        const debit = parseFloat(line.debit_amount || 0);
        const credit = parseFloat(line.credit_amount || 0);

        if (!accountBalances[line.account_id]) {
          accountBalances[line.account_id] = 0;
        }

        // For asset and expense: balance = debits - credits
        // For liability, equity, revenue: balance = credits - debits
        if (accountType === 'asset' || accountType === 'expense') {
          accountBalances[line.account_id] += (debit - credit);
        } else {
          accountBalances[line.account_id] += (credit - debit);
        }
      });

      // Sum all asset account balances (excluding expenses)
      Object.entries(accountBalances).forEach(([accountId, balance]) => {
        const account = accountMap.get(accountId);
        if (account) {
          const accountType = String(account.account_type || '').toLowerCase();
          if (accountType === 'asset') {
            totalBalance += balance;
          }
        }
      });

      // Transform journal entries to transactions for display
      const transformedTransactions: Transaction[] = [];
      let runningBalance = 0;

      agencyEntries.forEach((entry: any) => {
        if (!entry || !entry.id) return;
        
        const entryLines = lines.filter((l: any) => l && l.journal_entry_id === entry.id);
        
        entryLines.forEach((line: any) => {
          if (!line || !line.id) return;
          
          const account = line.account_id ? accountMap.get(line.account_id) : null;
          const isCredit = (line.credit_amount || 0) > 0;
          const amount = isCredit ? (line.credit_amount || 0) : (line.debit_amount || 0);
          
          if (amount > 0) {
            runningBalance += isCredit ? amount : -amount;
            
            // Determine category from account type
            let category = 'Other';
            if (account?.account_type) {
              const accountType = String(account.account_type).toLowerCase();
              if (accountType.includes('revenue') || accountType.includes('income')) {
                category = 'Revenue';
              } else if (accountType.includes('expense')) {
                category = 'Operating Expenses';
              } else if (accountType.includes('payroll') || accountType.includes('salary')) {
                category = 'Payroll';
              }
            }

            const entryDate = entry.entry_date || entry.created_at || new Date().toISOString();
            const description = line.description || entry.description || 'Transaction';
            const reference = entry.reference || entry.entry_number || `JE-${String(entry.id).substring(0, 8)}`;

            transformedTransactions.push({
              id: String(line.id),
              date: entryDate,
              description: description,
              category,
              type: isCredit ? 'credit' : 'debit',
              amount,
              balance: runningBalance,
              reference: reference
            });
          }
        });
      });

      // Sort by date descending
      transformedTransactions.sort((a, b) => {
        try {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        } catch {
          return 0;
        }
      });

      setTransactions(transformedTransactions);

      // Calculate summary for current month
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlyTransactions = transformedTransactions.filter(t => {
        try {
          const tDate = new Date(t.date);
          return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        } catch {
          return false;
        }
      });

      const monthlyIncome = monthlyTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const monthlyExpenses = monthlyTransactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      setLedgerSummary({
        totalBalance: totalBalance || 0,
        monthlyIncome: monthlyIncome || 0,
        monthlyExpenses: monthlyExpenses || 0,
        netProfit: (monthlyIncome || 0) - (monthlyExpenses || 0)
      });

    } catch (error: any) {
      logError('Error fetching ledger data:', error);
      const errorMessage = error?.message || 'Failed to load ledger data. Please try again.';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.agency_id, user?.id, toast]);

  useEffect(() => {
    // Try to fetch data - don't wait indefinitely for profile
    const timer = setTimeout(() => {
      fetchLedgerData();
    }, 100);

    return () => clearTimeout(timer);
  }, [fetchLedgerData]);

  const handleExportLedger = () => {
    try {
      const headers = [
        'Date',
        'Reference',
        'Description',
        'Category',
        'Type',
        'Amount',
        'Balance'
      ];

      const rows = transactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.reference,
        t.description,
        t.category,
        t.type.toUpperCase(),
        (typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0).toFixed(2),
        (typeof t.balance === 'number' ? t.balance : parseFloat(t.balance) || 0).toFixed(2)
      ]);

      const csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `ledger_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Ledger exported successfully",
      });
    } catch (error: any) {
      logError('Error exporting ledger:', error);
      toast({
        title: "Error",
        description: "Failed to export ledger. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddTransaction = () => {
    navigate('/ledger/create-entry');
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (!transaction) return false;
    const searchLower = searchTerm.toLowerCase();
    return (
      (transaction.description || '').toLowerCase().includes(searchLower) ||
      (transaction.reference || '').toLowerCase().includes(searchLower) ||
      (transaction.category || '').toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex flex-col justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-muted-foreground mt-4">Loading ledger data...</span>
          {!profile?.agency_id && (
            <p className="text-sm text-muted-foreground mt-2">
              Waiting for user profile...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex flex-col justify-center items-center min-h-[400px]">
          <p className="text-lg font-semibold text-destructive mb-2">Error Loading Ledger</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchLedgerData}>Retry</Button>
        </div>
      </div>
    );
  }

  const getTransactionIcon = (type: string) => {
    return type === 'credit' ? (
      <ArrowUpRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-600" />
    );
  };

  const getTransactionColor = (type: string) => {
    return type === 'credit' ? 'text-green-600' : 'text-red-600';
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'revenue': return 'bg-green-100 text-green-800';
      case 'operating expenses': return 'bg-red-100 text-red-800';
      case 'payroll': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">General Ledger</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Track all financial transactions and account balances
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={handleExportLedger}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Ledger
          </Button>
          <Button 
            onClick={handleAddTransaction}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Summary Cards - Improved Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="overflow-hidden">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                  Total Balance
                </p>
                <p className="text-xl sm:text-2xl font-bold truncate" title={formatCurrency(ledgerSummary.totalBalance)}>
                  {formatCurrency(ledgerSummary.totalBalance)}
                </p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                  Monthly Income
                </p>
                <p className="text-xl sm:text-2xl font-bold text-green-600 truncate" title={formatCurrency(ledgerSummary.monthlyIncome)}>
                  {formatCurrency(ledgerSummary.monthlyIncome)}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                  Monthly Expenses
                </p>
                <p className="text-xl sm:text-2xl font-bold text-red-600 truncate" title={formatCurrency(ledgerSummary.monthlyExpenses)}>
                  {formatCurrency(ledgerSummary.monthlyExpenses)}
                </p>
              </div>
              <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                  Net Profit
                </p>
                <p className={`text-xl sm:text-2xl font-bold truncate ${
                  ledgerSummary.netProfit >= 0 ? 'text-purple-600' : 'text-red-600'
                }`} title={formatCurrency(ledgerSummary.netProfit)}>
                  {formatCurrency(ledgerSummary.netProfit)}
                </p>
              </div>
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search transactions..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="w-full sm:w-auto">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="all" className="text-xs sm:text-sm">All Transactions</TabsTrigger>
          <TabsTrigger value="credits" className="text-xs sm:text-sm">Credits</TabsTrigger>
          <TabsTrigger value="debits" className="text-xs sm:text-sm">Debits</TabsTrigger>
          <TabsTrigger value="summary" className="text-xs sm:text-sm">Account Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Complete record of all financial transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No transactions found matching your search.' : 'No transactions found.'}
                    </p>
                  </div>
                ) : (
                  filteredTransactions
                    .filter(transaction => transaction != null)
                    .map((transaction) => (
                      <div key={transaction.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{transaction.description}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                              <span className="truncate">{transaction.id.substring(0, 8)}</span>
                              <span>•</span>
                              <span className="truncate">Ref: {transaction.reference}</span>
                            </div>
                            <span className={`inline-block text-xs px-2 py-1 rounded-full mt-1 ${getCategoryColor(transaction.category)}`}>
                              {transaction.category}
                            </span>
                          </div>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                          <p className={`font-bold text-lg ${getTransactionColor(transaction.type)}`}>
                            {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Balance: {formatCurrency(transaction.balance)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(() => {
                              try {
                                return new Date(transaction.date).toLocaleDateString();
                              } catch {
                                return 'Invalid Date';
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="credits" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Credit Transactions</CardTitle>
              <CardDescription>Income and credit entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTransactions.filter(t => t && t.type === 'credit').length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No credit transactions found.</p>
                  </div>
                ) : (
                  filteredTransactions
                    .filter(t => t != null && t.type === 'credit')
                    .map((transaction) => (
                      <div key={transaction.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{transaction.description}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                              <span className="truncate">{transaction.id.substring(0, 8)}</span>
                              <span>•</span>
                              <span className="truncate">Ref: {transaction.reference}</span>
                            </div>
                            <span className={`inline-block text-xs px-2 py-1 rounded-full mt-1 ${getCategoryColor(transaction.category)}`}>
                              {transaction.category}
                            </span>
                          </div>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                          <p className="font-bold text-lg text-green-600">
                            +{formatCurrency(transaction.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Balance: {formatCurrency(transaction.balance)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(() => {
                              try {
                                return new Date(transaction.date).toLocaleDateString();
                              } catch {
                                return 'Invalid Date';
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="debits" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Debit Transactions</CardTitle>
              <CardDescription>Expenses and debit entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTransactions.filter(t => t && t.type === 'debit').length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No debit transactions found.</p>
                  </div>
                ) : (
                  filteredTransactions
                    .filter(t => t != null && t.type === 'debit')
                    .map((transaction) => (
                      <div key={transaction.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{transaction.description}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                              <span className="truncate">{transaction.id.substring(0, 8)}</span>
                              <span>•</span>
                              <span className="truncate">Ref: {transaction.reference}</span>
                            </div>
                            <span className={`inline-block text-xs px-2 py-1 rounded-full mt-1 ${getCategoryColor(transaction.category)}`}>
                              {transaction.category}
                            </span>
                          </div>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                          <p className="font-bold text-lg text-red-600">
                            -{formatCurrency(transaction.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Balance: {formatCurrency(transaction.balance)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(() => {
                              try {
                                return new Date(transaction.date).toLocaleDateString();
                              } catch {
                                return 'Invalid Date';
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="summary" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Summary</CardTitle>
                <CardDescription>Overview of account balances and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg">Revenue</h3>
                    <p className="text-2xl sm:text-3xl font-bold text-green-600">
                      {formatCurrency(ledgerSummary.monthlyIncome)}
                    </p>
                    <p className="text-sm text-muted-foreground">This month</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg">Expenses</h3>
                    <p className="text-2xl sm:text-3xl font-bold text-red-600">
                      {formatCurrency(ledgerSummary.monthlyExpenses)}
                    </p>
                    <p className="text-sm text-muted-foreground">This month</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg">Net Income</h3>
                    <p className={`text-2xl sm:text-3xl font-bold ${
                      ledgerSummary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(ledgerSummary.netProfit)}
                    </p>
                    <p className="text-sm text-muted-foreground">This month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

    </div>
  );
};

export default Ledger;
