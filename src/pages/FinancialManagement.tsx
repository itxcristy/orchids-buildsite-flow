import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calculator, FileText, BookOpen, TrendingUp, Briefcase, Clock, DollarSign, Target, Edit, Trash2, Download, Calendar, ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { selectRecords, selectOne, rawQuery, deleteRecord, executeTransaction } from '@/services/api/postgresql-service';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getAgencyId } from '@/utils/agencyUtils';
import JobFormDialog from '@/components/JobFormDialog';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import ChartOfAccountFormDialog from '@/components/ChartOfAccountFormDialog';
import JournalEntryFormDialog from '@/components/JournalEntryFormDialog';
import JobCostItemsDialog from '@/components/JobCostItemsDialog';
import { logDebug, logWarn, logError } from '@/utils/consoleLogger';
import { projectService } from '@/services/api/project-service';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
const FinancialManagement = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reportGenerating, setReportGenerating] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<any>(null);
  const [accountToDelete, setAccountToDelete] = useState<any>(null);
  const [entryToDelete, setEntryToDelete] = useState<any>(null);
  const [costItemsDialogOpen, setCostItemsDialogOpen] = useState(false);
  const [selectedJobForCosts, setSelectedJobForCosts] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [transactionDetailsOpen, setTransactionDetailsOpen] = useState(false);
  const [reportViewOpen, setReportViewOpen] = useState(false);
  const [reportViewData, setReportViewData] = useState<{ title: string; data: any } | null>(null);
  const [currentPage, setCurrentPage] = useState({ accounts: 1, entries: 1, transactions: 1, jobs: 1 });
  const [pageSize] = useState(10);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  // Calculate account balances from journal entries
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      // Reset pagination when search changes
      setCurrentPage({ accounts: 1, entries: 1, transactions: 1, jobs: 1 });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const initializeAgency = async () => {
      // In multi-database architecture, agency_database in localStorage is the primary identifier
      const agencyDatabase = localStorage.getItem('agency_database');
      
      // Try to get agency_id from multiple sources
      let id: string | null = null;
      
      // First, try from localStorage (set during login)
      const storedAgencyId = localStorage.getItem('agency_id');
      if (storedAgencyId) {
        id = storedAgencyId;
      } else {
        // Fallback to getAgencyId utility
        id = await getAgencyId(profile, user?.id);
      }
      
      // If we have agency_database, we can proceed even without agency_id
      // (agency_id is mainly for backward compatibility)
      if (agencyDatabase || id) {
        setAgencyId(id || '00000000-0000-0000-0000-000000000000');
        fetchAllData(id || '00000000-0000-0000-0000-000000000000');
      }
    };

    if (user?.id) {
      initializeAgency();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.agency_id]); // Depend on user.id and profile.agency_id

  const fetchAllData = async (agencyIdParam?: string | null) => {
    const effectiveAgencyId = agencyIdParam || agencyId;
    
    if (!effectiveAgencyId) {
      logWarn('No agency_id available, cannot fetch data');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch all data in parallel but with individual loading states
      await Promise.all([
        fetchJobs(effectiveAgencyId),
        fetchProjects(effectiveAgencyId),
        fetchChartOfAccounts(effectiveAgencyId),
        fetchJournalEntries(effectiveAgencyId),
        fetchTransactions(effectiveAgencyId),
      ]);
    } catch (error) {
      logError('Error fetching financial data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load financial data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async (agencyIdParam?: string | null) => {
    const effectiveAgencyId = agencyIdParam || agencyId;
    setJobsLoading(true);
    try {
      let jobsData: any[] = [];
      if (effectiveAgencyId) {
        try {
          jobsData = await selectRecords('jobs', {
            where: { agency_id: effectiveAgencyId },
            orderBy: 'created_at DESC',
          });
        } catch (err: any) {
          // Fallback if agency_id column does not exist in current schema
          if (err?.code === '42703' || String(err?.message || '').includes('agency_id')) {
            logWarn('jobs has no agency_id column, falling back to all jobs');
            jobsData = await selectRecords('jobs', {
              orderBy: 'created_at DESC',
            });
          } else {
            throw err;
          }
        }
      } else {
        // If no agency_id available, fetch all jobs as a last resort
        jobsData = await selectRecords('jobs', {
          orderBy: 'created_at DESC',
        });
      }
      setJobs(jobsData || []);
    } catch (error: any) {
      logError('Error fetching jobs:', error);
      // Do not toast on schema issues; just show empty state
      if (error?.code !== '42703') {
        toast({
          title: 'Error',
          description: 'Failed to fetch jobs',
          variant: 'destructive',
        });
      }
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchProjects = async (agencyIdParam?: string | null) => {
    const effectiveAgencyId = agencyIdParam || agencyId;
    setProjectsLoading(true);
    try {
      // Fetch projects with financial data
      const projectsData = await projectService.getProjects({}, profile, user?.id);
      
      // Enhance each project with financial summary
      const projectsWithFinancials = await Promise.all(
        projectsData.map(async (project: any) => {
          try {
            const projectWithFinancials = await projectService.getProjectWithFinancials(project.id, profile, user?.id);
            return projectWithFinancials || project;
          } catch (error) {
            console.error(`Error fetching financials for project ${project.id}:`, error);
            return project;
          }
        })
      );
      
      setProjects(projectsWithFinancials);
    } catch (error: any) {
      logError('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchChartOfAccounts = async (agencyIdParam?: string | null) => {
    const effectiveAgencyId = agencyIdParam || agencyId;
    setAccountsLoading(true);
    try {
      if (!effectiveAgencyId) {
        // If no agency_id available, try fetching global accounts
        const accounts = await selectRecords('chart_of_accounts', {
          where: { is_active: true },
          orderBy: 'account_code ASC',
        });
        setChartOfAccounts(accounts || []);
        return;
      }
      let accounts: any[] = [];
      try {
        accounts = await selectRecords('chart_of_accounts', {
          where: { agency_id: effectiveAgencyId },
          orderBy: 'account_code ASC',
        });
      } catch (err: any) {
        // Fallback if agency_id column does not exist in current schema
        if (err?.code === '42703' || String(err?.message || '').includes('agency_id')) {
          logWarn('chart_of_accounts has no agency_id column, falling back to global accounts');
          accounts = await selectRecords('chart_of_accounts', {
            where: { is_active: true },
            orderBy: 'account_code ASC',
          });
        } else {
          throw err;
        }
      }
      setChartOfAccounts(accounts || []);
    } catch (error) {
      logError('Error fetching chart of accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch chart of accounts',
        variant: 'destructive',
      });
      setChartOfAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchJournalEntries = async (agencyIdParam?: string | null) => {
    const effectiveAgencyId = agencyIdParam || agencyId;
    setEntriesLoading(true);
    try {
      let entries: any[] = [];
      
      // Try multiple strategies to fetch journal entries
      if (effectiveAgencyId && effectiveAgencyId !== '00000000-0000-0000-0000-000000000000') {
        try {
          // Strategy 1: Fetch with agency_id filter
          entries = await selectRecords('journal_entries', {
            where: { agency_id: effectiveAgencyId },
            orderBy: 'entry_date DESC, created_at DESC',
          });
          logDebug(`Fetched journal entries with agency_id filter: ${entries?.length || 0} entries`);
        } catch (err: any) {
          // Fallback if agency_id column does not exist in current schema
          if (err?.code === '42703' || String(err?.message || '').includes('agency_id') || String(err?.message || '').includes('does not exist')) {
            logWarn('journal_entries has no agency_id column, trying fallback strategies');
            try {
              // Strategy 2: Fetch all entries and filter in memory
              const allEntries = await selectRecords('journal_entries', {
                orderBy: 'entry_date DESC, created_at DESC',
              });
              entries = (allEntries || []).filter((e: any) => 
                !e.agency_id || e.agency_id === effectiveAgencyId
              );
              logDebug(`Fetched journal entries (fallback): ${entries?.length || 0} entries from ${allEntries?.length || 0} total`);
            } catch (fallbackErr: any) {
              logError('Fallback fetch also failed:', fallbackErr);
              entries = [];
            }
          } else {
            throw err;
          }
        }
      } else {
        // If no agency_id available, fetch all entries
        try {
          entries = await selectRecords('journal_entries', {
            orderBy: 'entry_date DESC, created_at DESC',
          });
          logDebug(`Fetched journal entries (no agency filter): ${entries?.length || 0} entries`);
        } catch (err: any) {
          logError('Error fetching journal entries without agency filter:', err);
          entries = [];
        }
      }
      
      setJournalEntries(entries || []);
      
      if ((entries || []).length === 0) {
        logWarn('No journal entries found. This may be normal if no entries have been created yet.');
      }
    } catch (error: any) {
      logError('Error fetching journal entries:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch journal entries: ${error?.message || 'Unknown error'}`,
        variant: 'destructive',
      });
      setJournalEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  };

  const fetchTransactions = async (agencyIdParam?: string | null) => {
    const effectiveAgencyId = agencyIdParam || agencyId;
    setTransactionsLoading(true);
    try {
      let query: string;
      let params: any[] = [];
      
      // Try to use agency_id if available, with fallback if column doesn't exist
      if (effectiveAgencyId) {
        query = `
          SELECT 
            jel.id,
            je.entry_date as date,
            COALESCE(jel.description, je.description) as description,
            COALESCE(coa.account_type, 'Other') as category,
            CASE WHEN jel.debit_amount > 0 THEN 'debit' ELSE 'credit' END as type,
            COALESCE(jel.debit_amount, jel.credit_amount, 0) as amount,
            je.reference,
            je.entry_number,
            coa.account_name,
            coa.account_code
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.journal_entry_id = je.id
          LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
          WHERE je.status = 'posted' AND je.agency_id = $1
          ORDER BY je.entry_date DESC, COALESCE(jel.line_number, 1), jel.id ASC
        `;
        params = [effectiveAgencyId];
      } else {
        query = `
          SELECT 
            jel.id,
            je.entry_date as date,
            COALESCE(jel.description, je.description) as description,
            COALESCE(coa.account_type, 'Other') as category,
            CASE WHEN jel.debit_amount > 0 THEN 'debit' ELSE 'credit' END as type,
            COALESCE(jel.debit_amount, jel.credit_amount, 0) as amount,
            je.reference,
            je.entry_number,
            coa.account_name,
            coa.account_code
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.journal_entry_id = je.id
          LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
          WHERE je.status = 'posted'
          ORDER BY je.entry_date DESC, COALESCE(jel.line_number, 1), jel.id ASC
        `;
      }
      
      let txnData: any[] = [];
      try {
        txnData = await rawQuery(query, params);
      } catch (err: any) {
        const message = String(err?.message || '');
        // Fallbacks for missing columns in older schemas
        if (err?.code === '42703' || message.includes('column')) {
          if (message.includes('agency_id')) {
            logWarn('journal_entries has no agency_id column, falling back to all transactions');
            query = `
              SELECT 
                jel.id,
                je.entry_date as date,
                COALESCE(jel.description, je.description) as description,
                COALESCE(coa.account_type, 'Other') as category,
                CASE WHEN jel.debit_amount > 0 THEN 'debit' ELSE 'credit' END as type,
                COALESCE(jel.debit_amount, jel.credit_amount, 0) as amount,
                je.reference,
                je.entry_number,
                coa.account_name,
                coa.account_code
              FROM journal_entry_lines jel
              JOIN journal_entries je ON jel.journal_entry_id = je.id
              LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
              WHERE je.status = 'posted'
              ORDER BY je.entry_date DESC, COALESCE(jel.line_number, 1), jel.id ASC
            `;
            txnData = await rawQuery(query, []);
          } else if (message.includes('line_number')) {
            logWarn('journal_entry_lines has no line_number column, falling back to ordering by id');
            // Re-run the original query but order by jel.id instead of line_number
            if (effectiveAgencyId) {
              query = `
                SELECT 
                  jel.id,
                  je.entry_date as date,
                  COALESCE(jel.description, je.description) as description,
                  COALESCE(coa.account_type, 'Other') as category,
                  CASE WHEN jel.debit_amount > 0 THEN 'debit' ELSE 'credit' END as type,
                  COALESCE(jel.debit_amount, jel.credit_amount, 0) as amount,
                  je.reference,
                  je.entry_number,
                  coa.account_name,
                  coa.account_code
                FROM journal_entry_lines jel
                JOIN journal_entries je ON jel.journal_entry_id = je.id
                LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
                WHERE je.status = 'posted' AND je.agency_id = $1
                ORDER BY je.entry_date DESC, jel.id ASC
              `;
              txnData = await rawQuery(query, [effectiveAgencyId]);
            } else {
              query = `
                SELECT 
                  jel.id,
                  je.entry_date as date,
                  COALESCE(jel.description, je.description) as description,
                  COALESCE(coa.account_type, 'Other') as category,
                  CASE WHEN jel.debit_amount > 0 THEN 'debit' ELSE 'credit' END as type,
                  COALESCE(jel.debit_amount, jel.credit_amount, 0) as amount,
                  je.reference,
                  je.entry_number,
                  coa.account_name,
                  coa.account_code
                FROM journal_entry_lines jel
                JOIN journal_entries je ON jel.journal_entry_id = je.id
                LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
                WHERE je.status = 'posted'
                ORDER BY je.entry_date DESC, jel.id ASC
              `;
              txnData = await rawQuery(query, []);
            }
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
      setTransactions(txnData || []);
      logDebug(`Fetched transactions: ${txnData?.length || 0} transactions`);
      
      if ((txnData || []).length === 0) {
        logWarn('No transactions found. This may be normal if no journal entries have been posted yet.');
      }
    } catch (error: any) {
      logError('Error fetching transactions:', error);
      toast({
        title: 'Warning',
        description: `Could not fetch transactions: ${error?.message || 'Unknown error'}. Financial stats may be incomplete.`,
        variant: 'default',
      });
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Fetch and calculate account balances - using useMemo and useEffect with proper dependencies
  useEffect(() => {
    const calculateAccountBalances = async () => {
      // Prevent running if already loading or no data
      const effectiveAgencyId = agencyId;
      if (!effectiveAgencyId || chartOfAccounts.length === 0) {
        if (chartOfAccounts.length === 0) {
          setAccountBalances({});
        }
        return;
      }

      // Prevent race conditions by checking if already loading
      if (balancesLoading) {
        return;
      }

      setBalancesLoading(true);
      try {
        // Use parameterized query - filter by journal_entries.agency_id
        // Also filter chart_of_accounts by agency_id if the column exists
        let query = `
          SELECT 
            coa.id as account_id,
            coa.account_type,
            COALESCE(SUM(jel.debit_amount), 0) as total_debits,
            COALESCE(SUM(jel.credit_amount), 0) as total_credits
          FROM chart_of_accounts coa
          LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
          LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
            AND je.status = 'posted' 
            AND je.agency_id = $1
          WHERE (coa.agency_id = $1 OR coa.agency_id IS NULL)
          GROUP BY coa.id, coa.account_type
        `;
        
        let balancesData: any[] = [];
        try {
          balancesData = await rawQuery(query, [effectiveAgencyId]);
          logDebug(`Calculated account balances for ${balancesData.length} accounts`);
        } catch (err: any) {
          const message = String(err?.message || '');
          // Fallback if agency_id column does not exist in current schema
          if (err?.code === '42703' || message.includes('agency_id') || message.includes('does not exist')) {
            logWarn('agency_id column missing, using fallback query for balance calculation');
            // Try without agency_id filter on chart_of_accounts
            query = `
              SELECT 
                coa.id as account_id,
                coa.account_type,
                COALESCE(SUM(jel.debit_amount), 0) as total_debits,
                COALESCE(SUM(jel.credit_amount), 0) as total_credits
              FROM chart_of_accounts coa
              LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
              LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
                AND je.status = 'posted'
                AND je.agency_id = $1
              GROUP BY coa.id, coa.account_type
            `;
            try {
              balancesData = await rawQuery(query, [effectiveAgencyId]);
              logDebug(`Calculated account balances (fallback 1) for ${balancesData.length} accounts`);
            } catch (err2: any) {
              // Final fallback - no agency filtering
              logWarn('Using final fallback - no agency filtering for balances');
              query = `
                SELECT 
                  coa.id as account_id,
                  coa.account_type,
                  COALESCE(SUM(jel.debit_amount), 0) as total_debits,
                  COALESCE(SUM(jel.credit_amount), 0) as total_credits
                FROM chart_of_accounts coa
                LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
                LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
                  AND je.status = 'posted'
                GROUP BY coa.id, coa.account_type
              `;
              balancesData = await rawQuery(query, []);
              logDebug(`Calculated account balances (fallback 2) for ${balancesData.length} accounts`);
            }
          } else {
            throw err;
          }
        }
        
        const balances: Record<string, number> = {};
        let totalAssets = 0;
        let totalLiabilities = 0;
        let totalEquity = 0;
        
        balancesData.forEach((row: any) => {
          const { account_id, account_type, total_debits, total_credits } = row;
          // For asset and expense: balance = debits - credits
          // For liability, equity, revenue: balance = credits - debits
          let balance = 0;
          if (account_type === 'asset' || account_type === 'expense') {
            balance = parseFloat(total_debits || 0) - parseFloat(total_credits || 0);
          } else {
            balance = parseFloat(total_credits || 0) - parseFloat(total_debits || 0);
          }
          balances[account_id] = balance;
          
          // Track totals for logging
          if (account_type === 'asset') totalAssets += balance;
          else if (account_type === 'liability') totalLiabilities += balance;
          else if (account_type === 'equity') totalEquity += balance;
        });
        
        logDebug(`Account balances calculated - Assets: ₹${totalAssets.toLocaleString()}, Liabilities: ₹${totalLiabilities.toLocaleString()}, Equity: ₹${totalEquity.toLocaleString()}`);
        setAccountBalances(balances);
      } catch (error) {
        logError('Error calculating account balances:', error);
        setAccountBalances({});
      } finally {
        setBalancesLoading(false);
      }
    };

    // Only calculate if we have accounts and agency_id, and not already loading
    if (chartOfAccounts.length > 0 && agencyId && !balancesLoading) {
      calculateAccountBalances();
    } else if (chartOfAccounts.length === 0) {
      setAccountBalances({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartOfAccounts.length, agencyId, balancesLoading]); // Include balancesLoading to prevent race conditions

  // Calculate ledger summary first (needed by accountingStats)
  const ledgerSummary = React.useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTxns = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });

    const monthlyIncome = monthlyTxns
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + (parseFloat(t.amount || 0)), 0);
    
    const monthlyExpenses = monthlyTxns
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + (parseFloat(t.amount || 0)), 0);

    const totalBalance = transactions.reduce((sum, t) => {
      return sum + (t.type === 'credit' ? parseFloat(t.amount || 0) : -parseFloat(t.amount || 0));
    }, 0);

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      netProfit: monthlyIncome - monthlyExpenses
    };
  }, [transactions]);

  // Calculate stats from real data (after ledgerSummary is defined)
  const accountingStats = React.useMemo(() => {
    const assets = chartOfAccounts
      .filter(acc => acc.account_type === 'asset')
      .reduce((sum, acc) => sum + (accountBalances[acc.id] || 0), 0);
    
    const liabilities = chartOfAccounts
      .filter(acc => acc.account_type === 'liability')
      .reduce((sum, acc) => sum + (accountBalances[acc.id] || 0), 0);
    
    const equity = chartOfAccounts
      .filter(acc => acc.account_type === 'equity')
      .reduce((sum, acc) => sum + (accountBalances[acc.id] || 0), 0);
    
    const revenue = ledgerSummary.monthlyIncome;

    return {
      totalAssets: assets,
      totalLiabilities: liabilities,
      totalEquity: equity,
      monthlyRevenue: revenue,
    };
  }, [chartOfAccounts, accountBalances, ledgerSummary]);

  const jobStats = {
    totalJobs: jobs.length,
    activeJobs: jobs.filter(job => job.status === 'in_progress').length,
    totalBudget: jobs.reduce((sum, job) => sum + (parseFloat(job.budget || 0)), 0),
    actualCosts: jobs.reduce((sum, job) => sum + (parseFloat(job.actual_cost || 0)), 0),
  };

  const handleNewJob = () => {
    setSelectedJob(null);
    setJobFormOpen(true);
  };

  const handleEditJob = (job: any) => {
    setSelectedJob(job);
    setJobFormOpen(true);
  };

  const handleDeleteJob = (job: any) => {
    setJobToDelete(job);
    setDeleteDialogOpen(true);
  };

  const handleJobSaved = async () => {
    // Optimistic update: refetch to get latest data
    await fetchJobs(agencyId);
  };

  const handleJobDeleted = async () => {
    if (jobToDelete) {
      setDeleteLoading(true);
      // Optimistic update: remove from UI immediately
      const originalJobs = [...jobs];
      setJobs(prev => prev.filter(job => job.id !== jobToDelete.id));
      
      try {
        await deleteRecord('jobs', { id: jobToDelete.id });
        toast({
          title: 'Success',
          description: 'Job deleted successfully',
        });
        // Refetch to ensure consistency
        await fetchJobs(agencyId);
      } catch (error: any) {
        // Rollback on error
        setJobs(originalJobs);
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete job',
          variant: 'destructive',
        });
      } finally {
        setDeleteLoading(false);
      }
    }
    setJobToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleExportReport = async () => {
    setExportLoading(true);
    try {
      // Export current view data to CSV
      const exportData = {
        accounts: filteredAccounts,
        entries: filteredEntries,
        transactions: filteredTransactions,
        jobs: filteredJobs,
      };

      // Create CSV content
      const csvRows: string[] = [];
      
      // Accounts
      csvRows.push('Chart of Accounts');
      csvRows.push('Account Code,Account Name,Type,Balance,Status');
      filteredAccounts.forEach(acc => {
        const balance = accountBalances[acc.id] || 0;
        csvRows.push(`"${acc.account_code}","${acc.account_name}","${acc.account_type}",${balance},"${acc.is_active ? 'Active' : 'Inactive'}"`);
      });
      csvRows.push('');

      // Journal Entries
      csvRows.push('Journal Entries');
      csvRows.push('Entry Number,Date,Description,Reference,Status,Total Debit,Total Credit');
      filteredEntries.forEach(entry => {
        csvRows.push(`"${entry.entry_number}","${entry.entry_date}","${entry.description}","${entry.reference || ''}","${entry.status}",${entry.total_debit || 0},${entry.total_credit || 0}`);
      });
      csvRows.push('');

      // Transactions
      csvRows.push('Transactions');
      csvRows.push('Date,Description,Type,Amount,Category,Reference');
      filteredTransactions.forEach(txn => {
        csvRows.push(`"${txn.date}","${txn.description}","${txn.type}",${txn.amount},"${txn.category || 'Other'}","${txn.reference || ''}"`);
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `financial_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Financial data exported to CSV successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export report',
        variant: 'destructive',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleGenerateReport = async (reportType: string) => {
    setReportGenerating(reportType);
    try {
      let reportData: any = {};
      let reportTitle = '';

      switch (reportType) {
        case 'balance-sheet':
          reportTitle = 'Balance Sheet';
          // Calculate assets, liabilities, equity
          const assets = chartOfAccounts
            .filter(acc => acc.account_type === 'asset')
            .map(acc => ({
              account: `${acc.account_code} - ${acc.account_name}`,
              balance: accountBalances[acc.id] || 0
            }));
          const liabilities = chartOfAccounts
            .filter(acc => acc.account_type === 'liability')
            .map(acc => ({
              account: `${acc.account_code} - ${acc.account_name}`,
              balance: accountBalances[acc.id] || 0
            }));
          const equity = chartOfAccounts
            .filter(acc => acc.account_type === 'equity')
            .map(acc => ({
              account: `${acc.account_code} - ${acc.account_name}`,
              balance: accountBalances[acc.id] || 0
            }));
          
          reportData = {
            assets,
            liabilities,
            equity,
            totalAssets: accountingStats.totalAssets,
            totalLiabilities: accountingStats.totalLiabilities,
            totalEquity: accountingStats.totalEquity,
          };
          break;

        case 'profit-loss':
          reportTitle = 'Profit & Loss Statement';
          const revenue = chartOfAccounts
            .filter(acc => acc.account_type === 'revenue')
            .map(acc => ({
              account: `${acc.account_code} - ${acc.account_name}`,
              balance: accountBalances[acc.id] || 0
            }));
          const expenses = chartOfAccounts
            .filter(acc => acc.account_type === 'expense')
            .map(acc => ({
              account: `${acc.account_code} - ${acc.account_name}`,
              balance: accountBalances[acc.id] || 0
            }));
          
          reportData = {
            revenue,
            expenses,
            totalRevenue: revenue.reduce((sum, r) => sum + r.balance, 0),
            totalExpenses: expenses.reduce((sum, e) => sum + e.balance, 0),
            netIncome: revenue.reduce((sum, r) => sum + r.balance, 0) - expenses.reduce((sum, e) => sum + e.balance, 0),
          };
          break;

        case 'trial-balance':
          reportTitle = 'Trial Balance';
          reportData = chartOfAccounts.map(acc => ({
            account_code: acc.account_code,
            account_name: acc.account_name,
            account_type: acc.account_type,
            balance: accountBalances[acc.id] || 0,
          }));
          break;

        case 'job-profitability':
          reportTitle = 'Job Profitability Report';
          reportData = jobs.map(job => ({
            job_number: job.job_number,
            title: job.title,
            budget: parseFloat(job.budget || 0),
            actual_cost: parseFloat(job.actual_cost || 0),
            profit: parseFloat(job.budget || 0) - parseFloat(job.actual_cost || 0),
            profit_margin: job.profit_margin || 0,
            status: job.status,
          }));
          break;

        case 'cash-flow':
          reportTitle = 'Cash Flow Statement';
          const cashAccounts = chartOfAccounts.filter(acc => 
            acc.account_type === 'asset' && 
            (acc.account_name.toLowerCase().includes('cash') || acc.account_name.toLowerCase().includes('bank'))
          );
          reportData = {
            cashAccounts: cashAccounts.map(acc => ({
              account: `${acc.account_code} - ${acc.account_name}`,
              balance: accountBalances[acc.id] || 0
            })),
            totalCash: cashAccounts.reduce((sum, acc) => sum + (accountBalances[acc.id] || 0), 0),
          };
          break;

        case 'monthly-summary':
          reportTitle = 'Monthly Summary';
          reportData = {
            monthlyIncome: ledgerSummary.monthlyIncome,
            monthlyExpenses: ledgerSummary.monthlyExpenses,
            netProfit: ledgerSummary.netProfit,
            totalBalance: ledgerSummary.totalBalance,
          };
          break;

        default:
          return;
      }

      // Save report to database and navigate to reports page
      try {
        const { ReportService } = await import('@/services/api/reports');
        
        // Map report types to valid ReportService types
        // ReportService accepts: 'attendance' | 'payroll' | 'leave' | 'employee' | 'project' | 'financial' | 'gst' | 'custom'
        // All financial reports should use 'financial' type
        const validReportType: 'attendance' | 'payroll' | 'leave' | 'employee' | 'project' | 'financial' | 'gst' | 'custom' = 'financial';
        
        // Store the actual report type in parameters for reference
        const reportDataWithType = {
          ...reportData,
          _reportType: reportType, // Store original type for reference
          _generatedAt: new Date().toISOString(),
          _agencyId: agencyId,
        };
        
        const response = await ReportService.createReport({
          name: reportTitle,
          description: `Generated ${reportType} report from Financial Management`,
          report_type: validReportType,
          parameters: reportDataWithType,
          generated_by: user?.id,
          is_public: false,
          agency_id: agencyId || undefined,
        }, { showLoading: true, showErrorToast: true });
        
        if (response.success) {
          toast({
            title: 'Report Generated',
            description: `${reportTitle} has been saved. Redirecting to Reports page...`,
          });
          
          // Navigate to reports page after a short delay
          setTimeout(() => {
            navigate('/reports');
          }, 1500);
        } else {
          throw new Error(response.error || 'Failed to save report');
        }
      } catch (error: any) {
        // If reports table doesn't exist or save fails, show in dialog instead of preview window
        logWarn('Could not save report to database:', error);
        
        // Display report in a proper dialog component instead of preview window
        setReportViewData({ title: reportTitle, data: reportData });
        setReportViewOpen(true);

        toast({
          title: 'Report Generated',
          description: `${reportTitle} has been generated. View it below or navigate to Reports page.`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setReportGenerating(null);
    }
  };

  const handleNewAccount = () => {
    setSelectedAccount(null);
    setAccountFormOpen(true);
  };

  const handleEditAccount = (account: any) => {
    setSelectedAccount(account);
    setAccountFormOpen(true);
  };

  const handleDeleteAccount = (account: any) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const handleAccountSaved = async () => {
    // Optimistic update: refetch to get latest data
    await fetchChartOfAccounts(agencyId);
    // Reset account balances to trigger recalculation
    setAccountBalances({});
  };

  const handleAccountDeleted = async () => {
    if (accountToDelete) {
      setDeleteLoading(true);
      try {
        // Check if account has associated journal entry lines
        const lines = await selectRecords('journal_entry_lines', {
          where: { account_id: accountToDelete.id },
          limit: 1,
        });
        
        if (lines && lines.length > 0) {
          toast({
            title: 'Cannot Delete Account',
            description: 'This account has associated journal entry lines. Please remove or reassign those entries before deleting the account.',
            variant: 'destructive',
          });
          setAccountToDelete(null);
          setDeleteDialogOpen(false);
          setDeleteLoading(false);
          return;
        }

        // Optimistic update: remove from UI immediately
        const originalAccounts = [...chartOfAccounts];
        setChartOfAccounts(prev => prev.filter(acc => acc.id !== accountToDelete.id));

        await deleteRecord('chart_of_accounts', { id: accountToDelete.id });
        toast({
          title: 'Success',
          description: 'Account deleted successfully',
        });
        // Refetch to ensure consistency
        await fetchChartOfAccounts(agencyId);
      } catch (error: any) {
        // Rollback on error
        setChartOfAccounts(prev => {
          const found = chartOfAccounts.find(acc => acc.id === accountToDelete.id);
          return found ? [...prev, found] : prev;
        });
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete account',
          variant: 'destructive',
        });
      } finally {
        setDeleteLoading(false);
      }
    }
    setAccountToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleNewEntry = () => {
    // Navigate to the CreateJournalEntry page instead of opening a dialog
    // Pass state to indicate we came from financial-management
    navigate('/ledger/create-entry', { state: { from: 'financial-management' } });
  };

  const handleEditEntry = async (entry: any) => {
    try {
      // Fetch entry with lines
      const lines = await selectRecords('journal_entry_lines', {
        where: { journal_entry_id: entry.id },
        orderBy: 'line_number ASC',
      });
      setSelectedEntry({ ...entry, lines: lines || [] });
      setEntryFormOpen(true);
    } catch (error) {
      logError('Error fetching entry lines:', error);
      setSelectedEntry(entry);
      setEntryFormOpen(true);
    }
  };

  const handleDeleteEntry = (entry: any) => {
    // Extra confirmation for posted entries
    if (entry.status === 'posted') {
      const confirmed = window.confirm(
        `Warning: This journal entry is POSTED and may affect your financial records.\n\n` +
        `Entry: ${entry.entry_number}\n` +
        `Date: ${new Date(entry.entry_date).toLocaleDateString()}\n\n` +
        `Are you sure you want to delete this posted entry? This action cannot be undone.`
      );
      if (!confirmed) {
        return;
      }
    }
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const handleEntrySaved = async () => {
    // Optimistic update: refetch to get latest data
    await Promise.all([
      fetchJournalEntries(agencyId),
      fetchTransactions(agencyId)
    ]);
    // Reset account balances to trigger recalculation
    setAccountBalances({});
  };

  const handleEntryDeleted = async () => {
    if (entryToDelete) {
      setDeleteLoading(true);
      // Optimistic update: remove from UI immediately
      const originalEntries = [...journalEntries];
      const originalTransactions = [...transactions];
      setJournalEntries(prev => prev.filter(entry => entry.id !== entryToDelete.id));
      setTransactions(prev => prev.filter(txn => txn.entry_number !== entryToDelete.entry_number));
      
      try {
        await executeTransaction(async (client) => {
          // Delete lines first
          await client.query(
            'DELETE FROM public.journal_entry_lines WHERE journal_entry_id = $1',
            [entryToDelete.id]
          );
          // Delete entry
          await client.query(
            'DELETE FROM public.journal_entries WHERE id = $1',
            [entryToDelete.id]
          );
        });
        toast({
          title: 'Success',
          description: 'Journal entry deleted successfully',
        });
        // Refetch to ensure consistency
        await fetchJournalEntries(agencyId);
        await fetchTransactions(agencyId);
        // Reset account balances to trigger recalculation
        setAccountBalances({});
      } catch (error: any) {
        // Rollback on error
        setJournalEntries(originalEntries);
        setTransactions(originalTransactions);
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete journal entry',
          variant: 'destructive',
        });
      } finally {
        setDeleteLoading(false);
      }
    }
    setEntryToDelete(null);
    setDeleteDialogOpen(false);
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-green-100 text-green-800';
      case 'liability': return 'bg-red-100 text-red-800';
      case 'equity': return 'bg-blue-100 text-blue-800';
      case 'revenue': return 'bg-purple-100 text-purple-800';
      case 'expense': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'posted': return 'bg-green-100 text-green-800';
      case 'reversed': return 'bg-red-100 text-red-800';
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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

  const filteredAccounts = chartOfAccounts.filter(account => {
    const matchesSearch = (account.account_name || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (account.account_code || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const matchesType = accountTypeFilter === 'all' || account.account_type === accountTypeFilter;
    return matchesSearch && matchesType;
  });

  const paginatedAccounts = filteredAccounts.slice(
    (currentPage.accounts - 1) * pageSize,
    currentPage.accounts * pageSize
  );
  const totalPagesAccounts = Math.ceil(filteredAccounts.length / pageSize);

  const filteredEntries = journalEntries.filter(entry => {
    const matchesSearch = (entry.description || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (entry.entry_number || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    const matchesDateRange = (!dateRange.start || new Date(entry.entry_date) >= new Date(dateRange.start)) &&
      (!dateRange.end || new Date(entry.entry_date) <= new Date(dateRange.end));
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  const paginatedEntries = filteredEntries.slice(
    (currentPage.entries - 1) * pageSize,
    currentPage.entries * pageSize
  );
  const totalPagesEntries = Math.ceil(filteredEntries.length / pageSize);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      job.job_number?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      job.client_id?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesDateRange = (!dateRange.start || (job.start_date && new Date(job.start_date) >= new Date(dateRange.start))) &&
      (!dateRange.end || (job.end_date && new Date(job.end_date) <= new Date(dateRange.end)) || 
       (job.start_date && new Date(job.start_date) <= new Date(dateRange.end)));
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  const paginatedJobs = filteredJobs.slice(
    (currentPage.jobs - 1) * pageSize,
    currentPage.jobs * pageSize
  );
  const totalPagesJobs = Math.ceil(filteredJobs.length / pageSize);

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = (transaction.description || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (transaction.reference || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (transaction.entry_number || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const matchesDateRange = (!dateRange.start || new Date(transaction.date) >= new Date(dateRange.start)) &&
      (!dateRange.end || new Date(transaction.date) <= new Date(dateRange.end));
    return matchesSearch && matchesDateRange;
  });

  const paginatedTransactions = filteredTransactions.slice(
    (currentPage.transactions - 1) * pageSize,
    currentPage.transactions * pageSize
  );
  const totalPagesTransactions = Math.ceil(filteredTransactions.length / pageSize);

  // Show loading or error state if no agency
  // Check both agencyId and agency_database in localStorage
  const agencyDatabase = typeof window !== 'undefined' ? localStorage.getItem('agency_database') : null;
  const hasAgencyContext = agencyId || agencyDatabase;
  
  if (!hasAgencyContext && !loading && user?.id) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Unable to determine agency. Please ensure you are logged in and have an agency assigned.
              {!agencyDatabase && ' If you just created a new agency, please log out and log back in to refresh your session.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={async () => {
                // Check localStorage first
                const storedAgencyId = localStorage.getItem('agency_id');
                const storedAgencyDatabase = localStorage.getItem('agency_database');
                
                let id: string | null = null;
                
                if (storedAgencyId) {
                  id = storedAgencyId;
                } else if (storedAgencyDatabase) {
                  // If we have database but no ID, use placeholder (database isolation handles multi-tenancy)
                  id = '00000000-0000-0000-0000-000000000000';
                } else {
                  // Try to fetch from profile
                  id = await getAgencyId(profile, user?.id);
                }
                
                if (id || storedAgencyDatabase) {
                  setAgencyId(id || '00000000-0000-0000-0000-000000000000');
                  fetchAllData(id || '00000000-0000-0000-0000-000000000000');
                } else {
                  toast({
                    title: 'Error',
                    description: 'Could not find agency. If you just created a new agency, please log out and log back in.',
                    variant: 'destructive',
                  });
                }
              }}>
                Retry
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  // Refresh the page to reload localStorage values
                  window.location.reload();
                }}
              >
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Financial Management</h1>
          <p className="text-muted-foreground">Complete financial oversight: accounting, job costing, and general ledger</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/ledger')}>
            <BookOpen className="h-4 w-4 mr-2" />
            View Ledger
          </Button>
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Button variant="outline" onClick={handleExportReport} disabled={exportLoading}>
            <Download className="h-4 w-4 mr-2" />
            {exportLoading ? 'Exporting...' : 'Export Report'}
          </Button>
          <Button onClick={handleNewEntry}>
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Unified Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold">₹{accountingStats.totalAssets.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold">₹{ledgerSummary.totalBalance.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Briefcase className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Jobs</p>
                <p className="text-2xl font-bold">{jobStats.activeJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                <p className="text-2xl font-bold">₹{ledgerSummary.netProfit.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search across all financial data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Date Range (Start)</Label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => {
                      setDateRange(prev => ({ start: e.target.value, end: prev.end }));
                      setCurrentPage({ accounts: 1, entries: 1, transactions: 1, jobs: 1 });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date Range (End)</Label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => {
                      setDateRange(prev => ({ start: prev.start, end: e.target.value }));
                      setCurrentPage({ accounts: 1, entries: 1, transactions: 1, jobs: 1 });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select value={accountTypeFilter} onValueChange={(value) => {
                    setAccountTypeFilter(value);
                    setCurrentPage({ accounts: 1, entries: 1, transactions: 1, jobs: 1 });
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage({ accounts: 1, entries: 1, transactions: 1, jobs: 1 });
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="posted">Posted</SelectItem>
                      <SelectItem value="reversed">Reversed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setDateRange({ start: '', end: '' });
                    setAccountTypeFilter('all');
                    setStatusFilter('all');
                    setSearchTerm('');
                    setCurrentPage({ accounts: 1, entries: 1, transactions: 1, jobs: 1 });
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Financial Management Tabs */}
      <Tabs defaultValue="accounting" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="accounting">Accounting</TabsTrigger>
          <TabsTrigger value="job-costing">Job Costing</TabsTrigger>
          <TabsTrigger value="ledger">General Ledger</TabsTrigger>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
        </TabsList>
        
        {/* Accounting Tab */}
        <TabsContent value="accounting" className="space-y-4">
          <Tabs defaultValue="chart-of-accounts" className="space-y-4">
            <TabsList>
              <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
              <TabsTrigger value="journal-entries">Journal Entries</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chart-of-accounts" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Chart of Accounts</h3>
                <Button variant="outline" onClick={handleNewAccount}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Account
                </Button>
              </div>
              
              {loading || accountsLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-muted-foreground">Loading accounts...</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredAccounts.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No accounts found</p>
                        <p>Create your first account to get started with financial management.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    paginatedAccounts.map((account) => {
                      const balance = accountBalances[account.id] || 0;
                      const balanceColor = balance >= 0 ? 'text-green-600' : 'text-red-600';
                      return (
                        <Card key={account.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h4 className="font-semibold">{account.account_code} - {account.account_name}</h4>
                                  <Badge className={getAccountTypeColor(account.account_type)}>
                                    {account.account_type}
                                  </Badge>
                                </div>
                                {account.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{account.description}</p>
                                )}
                                <div className="mt-2">
                                  <p className={`text-sm font-semibold ${balanceColor}`}>
                                    Balance: ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right mr-4">
                                  <p className="text-sm text-muted-foreground">
                                    {account.is_active ? 'Active' : 'Inactive'}
                                  </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => handleEditAccount(account)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleDeleteAccount(account)}
                                  disabled={deleteLoading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              )}
              {totalPagesAccounts > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage.accounts - 1) * pageSize + 1} to {Math.min(currentPage.accounts * pageSize, filteredAccounts.length)} of {filteredAccounts.length} accounts
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => ({ ...prev, accounts: Math.max(1, prev.accounts - 1) }))}
                      disabled={currentPage.accounts === 1}
                    >
                      Previous
                    </Button>
                    <div className="text-sm">Page {currentPage.accounts} of {totalPagesAccounts}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => ({ ...prev, accounts: Math.min(totalPagesAccounts, prev.accounts + 1) }))}
                      disabled={currentPage.accounts === totalPagesAccounts}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="journal-entries" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Journal Entries</h3>
                <Button variant="outline" onClick={handleNewEntry}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Entry
                </Button>
              </div>
              
              {loading || entriesLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-muted-foreground">Loading journal entries...</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredEntries.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No journal entries found</p>
                        <p>Create your first journal entry to record financial transactions.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    paginatedEntries.map((entry) => (
                      <Card key={entry.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{entry.entry_number}</CardTitle>
                              <p className="text-sm text-muted-foreground">{entry.description}</p>
                            </div>
                            <Badge className={getStatusColor(entry.status)}>
                              {entry.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Entry Date</p>
                              <p className="font-medium">{new Date(entry.entry_date).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Reference</p>
                              <p className="font-medium">{entry.reference || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Debit</p>
                              <p className="font-semibold">₹{parseFloat(entry.total_debit || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Credit</p>
                              <p className="font-semibold">₹{parseFloat(entry.total_credit || 0).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="mt-4 flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditEntry(entry)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDeleteEntry(entry)}
                              disabled={deleteLoading}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
              {totalPagesEntries > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage.entries - 1) * pageSize + 1} to {Math.min(currentPage.entries * pageSize, filteredEntries.length)} of {filteredEntries.length} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => ({ ...prev, entries: Math.max(1, prev.entries - 1) }))}
                      disabled={currentPage.entries === 1}
                    >
                      Previous
                    </Button>
                    <div className="text-sm">Page {currentPage.entries} of {totalPagesEntries}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => ({ ...prev, entries: Math.min(totalPagesEntries, prev.entries + 1) }))}
                      disabled={currentPage.entries === totalPagesEntries}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        {/* Job Costing Tab */}
        <TabsContent value="job-costing" className="space-y-4">
          <Tabs defaultValue="jobs" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
              <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="jobs" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Job Cost Management</h3>
                <Button onClick={handleNewJob}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Job
                </Button>
              </div>
          
          {loading || jobsLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading jobs...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredJobs.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No jobs found</p>
                    <p>Create your first job to start tracking project costs and profitability.</p>
                  </CardContent>
                </Card>
              ) : (
                paginatedJobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{job.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {job.job_number} • {job.client_id || 'No client assigned'}
                          </p>
                        </div>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Budget</p>
                          <p className="font-semibold">₹{(job.budget || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Actual Cost</p>
                          <p className="font-semibold">₹{(job.actual_cost || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Hours (Est/Act)</p>
                          <p className="font-semibold">{job.estimated_hours || 0}/{job.actual_hours || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Profit Margin</p>
                          <p className="font-semibold">{job.profit_margin || 0}%</p>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditJob(job)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelectedJobForCosts(job);
                          setCostItemsDialogOpen(true);
                        }}>
                          <Calculator className="h-4 w-4 mr-1" />
                          Manage Costs
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/jobs/${job.id}`)}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteJob(job)}
                          disabled={deleteLoading}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
          {totalPagesJobs > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage.jobs - 1) * pageSize + 1} to {Math.min(currentPage.jobs * pageSize, filteredJobs.length)} of {filteredJobs.length} jobs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => ({ ...prev, jobs: Math.max(1, prev.jobs - 1) }))}
                  disabled={currentPage.jobs === 1}
                >
                  Previous
                </Button>
                <div className="text-sm">Page {currentPage.jobs} of {totalPagesJobs}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => ({ ...prev, jobs: Math.min(totalPagesJobs, prev.jobs + 1) }))}
                  disabled={currentPage.jobs === totalPagesJobs}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
            </TabsContent>

            <TabsContent value="projects" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Project Financials</h3>
                <Button variant="outline" onClick={() => navigate('/project-management')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View All Projects
                </Button>
              </div>

              {projectsLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-muted-foreground">Loading projects...</p>
                </div>
              ) : projects.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No projects found</p>
                    <p>Projects will appear here once they are created.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {projects.map((project: any) => {
                    const budgetVariance = project.budget && project.actual_cost
                      ? ((project.actual_cost - project.budget) / project.budget) * 100
                      : 0;
                    const profit = project.financials?.totalPaid - (project.actual_cost || 0);
                    const profitMargin = project.budget && project.budget > 0
                      ? ((profit / project.budget) * 100)
                      : 0;

                    return (
                      <Card key={project.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{project.name}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                {project.project_code && (
                                  <Badge variant="outline">{project.project_code}</Badge>
                                )}
                                <Badge variant={
                                  project.status === 'completed' ? 'default' :
                                  project.status === 'in_progress' ? 'secondary' :
                                  'outline'
                                }>
                                  {project.status}
                                </Badge>
                                {project.client && (
                                  <span className="text-sm text-muted-foreground">
                                    • {project.client.company_name || project.client.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/project-management/${project.id}`)}
                            >
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Budget</p>
                              <p className="font-semibold">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: project.currency || 'USD'
                                }).format(project.budget || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Actual Cost</p>
                              <p className="font-semibold">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: project.currency || 'USD'
                                }).format(project.actual_cost || 0)}
                              </p>
                              {budgetVariance !== 0 && (
                                <p className={`text-xs ${budgetVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {budgetVariance > 0 ? '+' : ''}{budgetVariance.toFixed(1)}% variance
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Revenue</p>
                              <p className="font-semibold text-green-600">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: project.currency || 'USD'
                                }).format(project.financials?.totalPaid || 0)}
                              </p>
                              {project.financials?.invoiceCount > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {project.financials.invoiceCount} invoices
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Profit Margin</p>
                              <p className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: project.currency || 'USD'
                                }).format(profit || 0)}
                              </p>
                              {project.budget && project.budget > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {profitMargin.toFixed(1)}% margin
                                </p>
                              )}
                            </div>
                          </div>
                          {project.budget && project.actual_cost && (
                            <div className="mt-4">
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Budget Utilization</span>
                                <span>{Math.min((project.actual_cost / project.budget) * 100, 100).toFixed(1)}%</span>
                              </div>
                              <Progress value={Math.min((project.actual_cost / project.budget) * 100, 100)} className="h-2" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        {/* General Ledger Tab */}
        <TabsContent value="ledger" className="space-y-4">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Transactions</TabsTrigger>
              <TabsTrigger value="credits">Credits</TabsTrigger>
              <TabsTrigger value="debits">Debits</TabsTrigger>
              <TabsTrigger value="summary">Account Summary</TabsTrigger>
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
                      <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                          <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">No transactions found</p>
                          <p>Transactions will appear here once journal entries are posted.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      paginatedTransactions.map((transaction) => (
                      <div 
                        key={transaction.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={async () => {
                          try {
                            // Fetch full journal entry details
                            const entry = await selectOne('journal_entries', { entry_number: transaction.entry_number });
                            if (entry) {
                              const lines = await selectRecords('journal_entry_lines', {
                                where: { journal_entry_id: entry.id },
                                orderBy: 'line_number ASC',
                              });
                              setSelectedTransaction({ ...entry, lines: lines || [] });
                              setTransactionDetailsOpen(true);
                            }
                          } catch (error) {
                            logError('Error fetching transaction details:', error);
                          }
                        }}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div>
                            <h3 className="font-semibold">{transaction.description}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{transaction.entry_number || transaction.id}</span>
                              {transaction.reference && (
                                <>
                                  <span>•</span>
                                  <span>Ref: {transaction.reference}</span>
                                </>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(transaction.category || 'Other')}`}>
                              {transaction.category || 'Other'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${getTransactionColor(transaction.type)}`}>
                            {transaction.type === 'credit' ? '+' : '-'}₹{parseFloat(transaction.amount || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      ))
                    )}
                  </div>
                  {totalPagesTransactions > 1 && (
                    <div className="flex items-center justify-between p-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {(currentPage.transactions - 1) * pageSize + 1} to {Math.min(currentPage.transactions * pageSize, filteredTransactions.length)} of {filteredTransactions.length} transactions
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => ({ ...prev, transactions: Math.max(1, prev.transactions - 1) }))}
                          disabled={currentPage.transactions === 1}
                        >
                          Previous
                        </Button>
                        <div className="text-sm">Page {currentPage.transactions} of {totalPagesTransactions}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => ({ ...prev, transactions: Math.min(totalPagesTransactions, prev.transactions + 1) }))}
                          disabled={currentPage.transactions === totalPagesTransactions}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
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
                    {filteredTransactions.filter(t => t.type === 'credit').length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                          <ArrowUpRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">No credit transactions found</p>
                          <p>Credit transactions will appear here once journal entries are posted.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      filteredTransactions.filter(t => t.type === 'credit').map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div>
                              <h3 className="font-semibold">{transaction.description || 'No description'}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{transaction.entry_number || transaction.id}</span>
                                {transaction.reference && (
                                  <>
                                    <span>•</span>
                                    <span>Ref: {transaction.reference}</span>
                                  </>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(transaction.category || 'Other')}`}>
                                {transaction.category || 'Other'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-green-600">
                              +₹{parseFloat(transaction.amount || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString()}
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
                    {filteredTransactions.filter(t => t.type === 'debit').length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                          <ArrowDownRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">No debit transactions found</p>
                          <p>Debit transactions will appear here once journal entries are posted.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      filteredTransactions.filter(t => t.type === 'debit').map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div>
                              <h3 className="font-semibold">{transaction.description || 'No description'}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{transaction.entry_number || transaction.id}</span>
                                {transaction.reference && (
                                  <>
                                    <span>•</span>
                                    <span>Ref: {transaction.reference}</span>
                                  </>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(transaction.category || 'Other')}`}>
                                {transaction.category || 'Other'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-red-600">
                              -₹{parseFloat(transaction.amount || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString()}
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
              <Card>
                <CardHeader>
                  <CardTitle>Account Summary</CardTitle>
                  <CardDescription>Overview of account balances and performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 border rounded-lg">
                      <h3 className="font-semibold text-lg">Revenue</h3>
                      <p className="text-3xl font-bold text-green-600">₹{ledgerSummary.monthlyIncome.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">This month</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <h3 className="font-semibold text-lg">Expenses</h3>
                      <p className="text-3xl font-bold text-red-600">₹{ledgerSummary.monthlyExpenses.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">This month</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <h3 className="font-semibold text-lg">Net Income</h3>
                      <p className="text-3xl font-bold text-blue-600">₹{ledgerSummary.netProfit.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">This month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        {/* Financial Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              <p className="text-muted-foreground">Generate and view comprehensive financial statements</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${reportGenerating === 'balance-sheet' ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => handleGenerateReport('balance-sheet')}
                >
                  <CardContent className="p-6 text-center">
                    <BookOpen className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Balance Sheet</h3>
                    <p className="text-sm text-muted-foreground">
                      {reportGenerating === 'balance-sheet' ? 'Generating...' : 'Assets, liabilities, and equity statement'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${reportGenerating === 'profit-loss' ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => handleGenerateReport('profit-loss')}
                >
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Profit & Loss</h3>
                    <p className="text-sm text-muted-foreground">
                      {reportGenerating === 'profit-loss' ? 'Generating...' : 'Income and expenses statement'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${reportGenerating === 'trial-balance' ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => handleGenerateReport('trial-balance')}
                >
                  <CardContent className="p-6 text-center">
                    <FileText className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Trial Balance</h3>
                    <p className="text-sm text-muted-foreground">
                      {reportGenerating === 'trial-balance' ? 'Generating...' : 'List of all account balances'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${reportGenerating === 'job-profitability' ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => handleGenerateReport('job-profitability')}
                >
                  <CardContent className="p-6 text-center">
                    <Calculator className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Job Profitability</h3>
                    <p className="text-sm text-muted-foreground">
                      {reportGenerating === 'job-profitability' ? 'Generating...' : 'Job cost analysis and margins'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${reportGenerating === 'cash-flow' ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => handleGenerateReport('cash-flow')}
                >
                  <CardContent className="p-6 text-center">
                    <DollarSign className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Cash Flow</h3>
                    <p className="text-sm text-muted-foreground">
                      {reportGenerating === 'cash-flow' ? 'Generating...' : 'Cash receipts and payments'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${reportGenerating === 'monthly-summary' ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => handleGenerateReport('monthly-summary')}
                >
                  <CardContent className="p-6 text-center">
                    <Calendar className="h-12 w-12 text-pink-600 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Monthly Summary</h3>
                    <p className="text-sm text-muted-foreground">
                      {reportGenerating === 'monthly-summary' ? 'Generating...' : 'Monthly financial overview'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <JobFormDialog
        isOpen={jobFormOpen}
        onClose={() => setJobFormOpen(false)}
        job={selectedJob}
        onJobSaved={handleJobSaved}
      />

      <ChartOfAccountFormDialog
        isOpen={accountFormOpen}
        onClose={() => setAccountFormOpen(false)}
        account={selectedAccount}
        onAccountSaved={handleAccountSaved}
      />

      <JournalEntryFormDialog
        isOpen={entryFormOpen}
        onClose={() => setEntryFormOpen(false)}
        entry={selectedEntry}
        onEntrySaved={handleEntrySaved}
      />

      {/* Report View Dialog - Replaces preview window */}
      <Dialog open={reportViewOpen} onOpenChange={setReportViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{reportViewData?.title || 'Financial Report'}</DialogTitle>
            <DialogDescription>
              Generated on: {new Date().toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {reportViewData?.data && (
              <div className="space-y-4">
                {/* Render report data in a readable format */}
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(reportViewData.data, null, 2)}
                  </pre>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Export as JSON
                      const blob = new Blob([JSON.stringify(reportViewData.data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `${reportViewData.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReportViewOpen(false);
                      navigate('/reports');
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Go to Reports
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setReportViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setJobToDelete(null);
          setAccountToDelete(null);
          setEntryToDelete(null);
        }}
        onDeleted={async () => {
          if (jobToDelete) {
            await handleJobDeleted();
          } else if (accountToDelete) {
            await handleAccountDeleted();
          } else if (entryToDelete) {
            await handleEntryDeleted();
          }
        }}
        itemType={jobToDelete ? "Job" : accountToDelete ? "Account" : "Journal Entry"}
        itemName={jobToDelete?.title || accountToDelete?.account_name || entryToDelete?.entry_number || ''}
        itemId={jobToDelete?.id || accountToDelete?.id || entryToDelete?.id || ''}
        tableName={jobToDelete ? "jobs" : accountToDelete ? "chart_of_accounts" : "journal_entries"}
      />

      <JobCostItemsDialog
        isOpen={costItemsDialogOpen}
        onClose={() => {
          setCostItemsDialogOpen(false);
          setSelectedJobForCosts(null);
        }}
        jobId={selectedJobForCosts?.id || ''}
        jobTitle={selectedJobForCosts?.title}
        onItemsUpdated={async () => {
          await fetchJobs(agencyId);
        }}
      />

      {/* Transaction Details Dialog */}
      <Dialog open={transactionDetailsOpen} onOpenChange={setTransactionDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Journal Entry: {selectedTransaction?.entry_number || 'N/A'}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Entry Date</Label>
                  <p className="text-sm font-semibold">
                    {new Date(selectedTransaction.entry_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge className={getStatusColor(selectedTransaction.status)}>
                    {selectedTransaction.status}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm">{selectedTransaction.description || 'N/A'}</p>
                </div>
                {selectedTransaction.reference && (
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-muted-foreground">Reference</Label>
                    <p className="text-sm">{selectedTransaction.reference}</p>
                  </div>
                )}
              </div>

              {selectedTransaction.lines && selectedTransaction.lines.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-3 block">Journal Entry Lines</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium">Account</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Description</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Debit</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTransaction.lines.map((line: any, index: number) => {
                          const account = chartOfAccounts.find(acc => acc.id === line.account_id);
                          return (
                            <tr key={line.id || index} className="border-t">
                              <td className="px-4 py-2 text-sm">
                                {account ? `${account.account_code} - ${account.account_name}` : 'N/A'}
                              </td>
                              <td className="px-4 py-2 text-sm">{line.description || 'N/A'}</td>
                              <td className="px-4 py-2 text-sm text-right">
                                {line.debit_amount > 0 ? `₹${parseFloat(line.debit_amount || 0).toLocaleString()}` : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-right">
                                {line.credit_amount > 0 ? `₹${parseFloat(line.credit_amount || 0).toLocaleString()}` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-muted font-semibold">
                        <tr>
                          <td colSpan={2} className="px-4 py-2 text-sm">Total</td>
                          <td className="px-4 py-2 text-sm text-right">
                            ₹{selectedTransaction.total_debit ? parseFloat(selectedTransaction.total_debit).toLocaleString() : '0.00'}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            ₹{selectedTransaction.total_credit ? parseFloat(selectedTransaction.total_credit).toLocaleString() : '0.00'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setTransactionDetailsOpen(false);
              setSelectedTransaction(null);
            }}>
              Close
            </Button>
            {selectedTransaction && (
              <Button onClick={() => {
                setTransactionDetailsOpen(false);
                handleEditEntry(selectedTransaction);
              }}>
                Edit Entry
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialManagement;