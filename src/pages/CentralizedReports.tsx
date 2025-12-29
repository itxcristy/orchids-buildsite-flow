import React, { useState, useEffect } from 'react';
import { Download, Plus, Calendar, Filter, BarChart3, FileText, DollarSign, Users, Briefcase, Loader2, Search, Eye, Trash2, Edit, Clock, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ReportService, Report, CustomReport } from '@/services/api/reports';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { pgClient } from '@/integrations/postgresql/client';
import { selectOne } from '@/services/api/postgresql-service';

// Report Template Interface
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Financial' | 'HR' | 'Project' | 'Custom';
  report_type: 'financial' | 'attendance' | 'payroll' | 'leave' | 'employee' | 'project' | 'gst' | 'custom';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  route?: string; // Route to related page
}

// Predefined Report Templates
const REPORT_TEMPLATES: ReportTemplate[] = [
  // Financial Reports
  {
    id: 'balance-sheet',
    name: 'Balance Sheet',
    description: 'Assets, liabilities, and equity statement',
    category: 'Financial',
    report_type: 'financial',
    icon: FileText,
    color: 'blue',
    route: '/financial-management'
  },
  {
    id: 'profit-loss',
    name: 'Profit & Loss',
    description: 'Income and expenses statement',
    category: 'Financial',
    report_type: 'financial',
    icon: BarChart3,
    color: 'green',
    route: '/financial-management'
  },
  {
    id: 'cash-flow',
    name: 'Cash Flow Statement',
    description: 'Cash receipts and payments',
    category: 'Financial',
    report_type: 'financial',
    icon: DollarSign,
    color: 'purple',
    route: '/financial-management'
  },
  {
    id: 'job-profitability',
    name: 'Job Profitability',
    description: 'Job cost analysis and margins',
    category: 'Financial',
    report_type: 'financial',
    icon: Briefcase,
    color: 'orange',
    route: '/jobs'
  },
  // HR Reports
  {
    id: 'attendance-summary',
    name: 'Employee Attendance Summary',
    description: 'Monthly attendance tracking',
    category: 'HR',
    report_type: 'attendance',
    icon: Users,
    color: 'indigo',
    route: '/attendance'
  },
  {
    id: 'payroll-summary',
    name: 'Payroll Summary',
    description: 'Salary and compensation overview',
    category: 'HR',
    report_type: 'payroll',
    icon: DollarSign,
    color: 'pink',
    route: '/payroll'
  },
  {
    id: 'leave-report',
    name: 'Leave Report',
    description: 'Leave requests and balances',
    category: 'HR',
    report_type: 'leave',
    icon: Calendar,
    color: 'teal',
    route: '/leave-requests'
  },
  {
    id: 'employee-performance',
    name: 'Employee Performance',
    description: 'Performance metrics and reviews',
    category: 'HR',
    report_type: 'employee',
    icon: BarChart3,
    color: 'cyan',
    route: '/employee-management'
  },
  // Project Reports
  {
    id: 'project-status',
    name: 'Project Status Overview',
    description: 'Current status of all projects',
    category: 'Project',
    report_type: 'project',
    icon: Briefcase,
    color: 'violet',
    route: '/projects'
  },
  {
    id: 'resource-utilization',
    name: 'Resource Utilization',
    description: 'Team and resource allocation',
    category: 'Project',
    report_type: 'project',
    icon: Users,
    color: 'amber',
    route: '/projects'
  },
  {
    id: 'budget-vs-actual',
    name: 'Budget vs Actual',
    description: 'Project budget performance',
    category: 'Project',
    report_type: 'project',
    icon: DollarSign,
    color: 'emerald',
    route: '/projects'
  }
];

const CentralizedReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Use both hooks for maximum compatibility
  const authHook = useAuth();
  const authStore = useAuthStore();
  // Prefer useAuth hook, fallback to store
  const user = authHook.user || authStore.user;
  const profile = authHook.profile || authStore.profile;
  const isAuthenticated = authHook.user || authStore.isAuthenticated;
  const { addNotification } = useAppStore();
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  
  // Data states
  const [generatedReports, setGeneratedReports] = useState<Report[]>([]);
  const [customReports, setCustomReports] = useState<CustomReport[]>([]);
  const [loading, setLoading] = useState({
    reports: false,
    custom: false,
    generating: false
  });
  
  // Dialog states
  const [createCustomOpen, setCreateCustomOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | CustomReport | null>(null);
  
  // Form states
  const [newCustomReport, setNewCustomReport] = useState({
    name: '',
    description: '',
    report_type: 'custom' as const
  });
  const [scheduleConfig, setScheduleConfig] = useState({
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    day: '1',
    time: '09:00',
    email: profile?.user_id || ''
  });

  // Sync auth state and fetch data
  useEffect(() => {
    // Check if user is authenticated via token or store
    const token = localStorage.getItem('auth_token');
    const hasUser = user?.id || (token && token.length > 0);
    
    if (hasUser) {
      fetchGeneratedReports();
      fetchCustomReports();
    }
  }, [user, isAuthenticated]);
  
  // Helper function to get user ID from various sources
  const getUserId = (): string | null => {
    // Try useAuth hook first
    if (authHook.user?.id) return authHook.user.id;
    // Try authStore
    if (authStore.user?.id) return authStore.user.id;
    // Try token
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        let decoded: { userId?: string; email?: string; exp?: number };
        if (token.includes('.')) {
          decoded = JSON.parse(atob(token.split('.')[1]));
        } else {
          decoded = JSON.parse(atob(token));
        }
        if (decoded.userId) return decoded.userId;
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }
    return null;
  };

  const fetchGeneratedReports = async () => {
    // Check authentication
    const userId = getUserId();
    const token = localStorage.getItem('auth_token');
    if (!userId && !token) {
      return;
    }
    
    setLoading(prev => ({ ...prev, reports: true }));
    try {
      const response = await ReportService.getReports({}, { showLoading: false });
      if (response.success && response.data) {
        setGeneratedReports(response.data);
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: response.error || 'Failed to load reports'
        });
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to load reports'
      });
    } finally {
      setLoading(prev => ({ ...prev, reports: false }));
    }
  };

  const fetchCustomReports = async () => {
    // Check authentication
    const userId = getUserId();
    const token = localStorage.getItem('auth_token');
    if (!userId && !token) {
      return;
    }
    
    if (!userId) {
      return;
    }
    
    setLoading(prev => ({ ...prev, custom: true }));
    try {
      // Get profile ID first
      const profileData = await selectOne('profiles', { user_id: userId });
      
      if (profileData?.id) {
        const response = await ReportService.getCustomReports(profileData.id, { showLoading: false });
        if (response.success && response.data) {
          setCustomReports(response.data);
        }
      }
    } catch (error: any) {
      console.error('Failed to load custom reports:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load custom reports: ' + (error.message || 'Unknown error')
      });
    } finally {
      setLoading(prev => ({ ...prev, custom: false }));
    }
  };

  // Get last generated date for a template
  const getLastGenerated = (templateId: string): string | null => {
    const report = generatedReports
      .filter(r => r.parameters?.templateId === templateId)
      .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())[0];
    
    return report ? report.generated_at : null;
  };

  // Generate report
  const handleGenerateReport = async (template: ReportTemplate) => {
    // Get user ID from various sources
    const userId = getUserId();
    const token = localStorage.getItem('auth_token');
    
    if (!userId && !token) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to generate reports. Please log in and try again.',
        variant: 'destructive'
      });
      return;
    }

    if (!userId) {
      toast({
        title: 'User Not Found',
        description: 'Unable to identify user. Please refresh the page or log out and log back in.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(prev => ({ ...prev, generating: true }));
    try {
      // Get profile ID
      const profileData = await selectOne('profiles', { user_id: userId });
      
      if (!profileData?.id) {
        throw new Error('Profile not found. Please ensure your profile is set up correctly.');
      }

      // Generate report data based on type
      let reportData: any = {};
      const agencyId = profile?.agency_id;

      switch (template.report_type) {
        case 'financial':
          reportData = await generateFinancialReport(template.id, agencyId);
          break;
        case 'attendance':
          reportData = await generateAttendanceReport(agencyId);
          break;
        case 'payroll':
          reportData = await generatePayrollReport(agencyId);
          break;
        case 'leave':
          reportData = await generateLeaveReport(agencyId);
          break;
        case 'employee':
          reportData = await generateEmployeeReport(agencyId);
          break;
        case 'project':
          reportData = await generateProjectReport(agencyId);
          break;
        default:
          reportData = { message: 'Report generated' };
      }

      // Create report record
      const reportResponse = await ReportService.createReport({
        name: template.name,
        description: template.description,
        report_type: template.report_type,
        parameters: {
          templateId: template.id,
          ...reportData,
          month: selectedMonth,
          year: selectedYear
        },
        generated_by: userId,
        is_public: false
      }, { showLoading: false });

      if (reportResponse.success) {
        toast({
          title: 'Success',
          description: `${template.name} report generated successfully`
        });
        fetchGeneratedReports();
      } else {
        throw new Error(reportResponse.error || 'Failed to save report');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate report',
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, generating: false }));
    }
  };

  // Report generation functions
  const generateFinancialReport = async (templateId: string, agencyId?: string) => {
    const [month, year] = selectedMonth.split('-').map(Number);
    
    switch (templateId) {
      case 'balance-sheet':
        // Get assets, liabilities, equity from chart of accounts
        // Note: chart_of_accounts doesn't have agency_id, filter through journal_entries
        const balanceSheetQuery = `
          SELECT 
            coa.account_type,
            coa.account_code,
            coa.account_name,
            COALESCE(SUM(CASE WHEN coa.account_type IN ('asset', 'expense') THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) as debit_balance,
            COALESCE(SUM(CASE WHEN coa.account_type IN ('liability', 'equity', 'revenue') THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0) as credit_balance
          FROM chart_of_accounts coa
          LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
          LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
            AND je.status = 'posted'
            ${agencyId ? 'AND je.agency_id = $1' : ''}
          GROUP BY coa.id, coa.account_type, coa.account_code, coa.account_name
          ORDER BY coa.account_type, coa.account_code
        `;
        const result = await pgClient.query(balanceSheetQuery, agencyId ? [agencyId] : []);
        return { accounts: result.rows };
        
      case 'profit-loss':
        // Note: chart_of_accounts doesn't have agency_id, filter through journal_entries
        const plQuery = `
          SELECT 
            coa.account_type,
            coa.account_name,
            COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0) as revenue,
            COALESCE(SUM(CASE WHEN coa.account_type = 'expense' THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) as expense
          FROM chart_of_accounts coa
          LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
          LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
            AND je.status = 'posted'
            ${agencyId ? 'AND je.agency_id = $3' : ''}
            AND EXTRACT(MONTH FROM je.entry_date) = $1
            AND EXTRACT(YEAR FROM je.entry_date) = $2
          WHERE coa.account_type IN ('revenue', 'expense')
          GROUP BY coa.id, coa.account_type, coa.account_name
        `;
        const plParams = agencyId ? [month, year, agencyId] : [month, year];
        const plResult = await pgClient.query(plQuery, plParams);
        return { accounts: plResult.rows };
        
      case 'job-profitability':
        const jobQuery = `
          SELECT 
            j.job_number,
            j.title,
            j.budget,
            j.actual_cost,
            j.profit_margin,
            j.status,
            c.name as client_name
          FROM jobs j
          LEFT JOIN clients c ON j.client_id = c.id
          WHERE 1=1
            ${agencyId ? 'AND j.agency_id = $1' : ''}
          ORDER BY j.created_at DESC
        `;
        const jobResult = await pgClient.query(jobQuery, agencyId ? [agencyId] : []);
        return { jobs: jobResult.rows };
        
      default:
        return {};
    }
  };

  const generateAttendanceReport = async (agencyId?: string) => {
    const [month, year] = selectedMonth.split('-').map(Number);
    
    const query = `
      SELECT 
        p.full_name,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_days,
        COUNT(*) as total_days,
        ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as attendance_rate
      FROM attendance a
      JOIN profiles p ON a.employee_id = p.user_id
      WHERE EXTRACT(MONTH FROM a.date) = $1
        AND EXTRACT(YEAR FROM a.date) = $2
        ${agencyId ? 'AND a.agency_id = $3' : ''}
      GROUP BY p.id, p.full_name
      ORDER BY attendance_rate DESC
    `;
    
    const result = await pgClient.query(query, agencyId ? [month, year, agencyId] : [month, year]);
    return { attendance: result.rows };
  };

  const generatePayrollReport = async (agencyId?: string) => {
    const [month, year] = selectedMonth.split('-').map(Number);
    
    const query = `
      SELECT 
        p.full_name,
        pp.name as period_name,
        py.base_salary,
        py.overtime_pay,
        py.bonuses,
        py.deductions,
        py.gross_pay,
        py.tax_deductions,
        py.net_pay,
        py.hours_worked
      FROM payroll py
      JOIN profiles p ON py.employee_id = p.user_id
      JOIN payroll_periods pp ON py.payroll_period_id = pp.id
      WHERE EXTRACT(MONTH FROM pp.pay_date) = $1
        AND EXTRACT(YEAR FROM pp.pay_date) = $2
        ${agencyId ? 'AND py.agency_id = $3' : ''}
      ORDER BY p.full_name
    `;
    
    const result = await pgClient.query(query, agencyId ? [month, year, agencyId] : [month, year]);
    return { payroll: result.rows };
  };

  const generateLeaveReport = async (agencyId?: string) => {
    const query = `
      SELECT 
        p.full_name,
        lt.name as leave_type,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.status,
        lr.reason
      FROM leave_requests lr
      JOIN profiles p ON lr.employee_id = p.user_id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.created_at >= CURRENT_DATE - INTERVAL '3 months'
        ${agencyId ? 'AND lr.agency_id = $1' : ''}
      ORDER BY lr.created_at DESC
    `;
    
    const result = await pgClient.query(query, agencyId ? [agencyId] : []);
    return { leaves: result.rows };
  };

  const generateEmployeeReport = async (agencyId?: string) => {
    const query = `
      SELECT 
        p.full_name,
        p.position,
        d.name as department,
        ed.hire_date,
        ed.is_active,
        COUNT(DISTINCT t.id) as tasks_assigned,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as tasks_completed
      FROM profiles p
      JOIN employee_details ed ON p.user_id = ed.user_id
      LEFT JOIN departments d ON ed.department_id = d.id
      LEFT JOIN task_assignments ta ON p.user_id = ta.user_id
      LEFT JOIN tasks t ON ta.task_id = t.id
      WHERE 1=1
        ${agencyId ? 'AND ed.agency_id = $1' : ''}
      GROUP BY p.id, p.full_name, p.position, d.name, ed.hire_date, ed.is_active
      ORDER BY p.full_name
    `;
    
    const result = await pgClient.query(query, agencyId ? [agencyId] : []);
    return { employees: result.rows };
  };

  const generateProjectReport = async (agencyId?: string) => {
    const query = `
      SELECT 
        p.name as project_name,
        p.status,
        p.budget,
        p.start_date,
        p.end_date,
        c.name as client_name,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
        COALESCE(SUM(tt.hours_logged), 0) as total_hours
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN task_time_tracking tt ON t.id = tt.task_id
      WHERE 1=1
        ${agencyId ? 'AND p.agency_id = $1' : ''}
      GROUP BY p.id, p.name, p.status, p.budget, p.start_date, p.end_date, c.name
      ORDER BY p.created_at DESC
    `;
    
    const result = await pgClient.query(query, agencyId ? [agencyId] : []);
    return { projects: result.rows };
  };

  // Create custom report
  const handleCreateCustomReport = async () => {
    if (!newCustomReport.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a report name',
        variant: 'destructive'
      });
      return;
    }

    // Get user ID from various sources
    const userId = getUserId();
    const token = localStorage.getItem('auth_token');
    
    if (!userId && !token) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to create reports. Please log in and try again.',
        variant: 'destructive'
      });
      return;
    }

    if (!userId) {
      toast({
        title: 'User Not Found',
        description: 'Unable to identify user. Please refresh the page or log out and log back in.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const profileData = await selectOne('profiles', { user_id: userId });
      
      if (!profileData?.id) {
        throw new Error('Profile not found');
      }

      const response = await ReportService.createCustomReport({
        name: newCustomReport.name,
        description: newCustomReport.description,
        report_type: newCustomReport.report_type,
        parameters: {},
        created_by: profileData.id,
        agency_id: profile?.agency_id || undefined
      }, { showLoading: false });

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Custom report created successfully'
        });
        setCreateCustomOpen(false);
        setNewCustomReport({ name: '', description: '', report_type: 'custom' });
        fetchCustomReports();
      } else {
        throw new Error(response.error || 'Failed to create report');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create custom report',
        variant: 'destructive'
      });
    }
  };

  // Delete report
  const handleDeleteReport = async () => {
    if (!selectedReport) return;

    try {
      let response;
      if ('created_by' in selectedReport) {
        // Custom report
        response = await ReportService.deleteCustomReport(selectedReport.id, { showLoading: false });
      } else {
        // Generated report
        response = await ReportService.deleteReport(selectedReport.id, { showLoading: false });
      }

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Report deleted successfully'
        });
        fetchGeneratedReports();
        fetchCustomReports();
      } else {
        throw new Error(response.error || 'Failed to delete report');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete report',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedReport(null);
    }
  };

  // Download report
  const handleDownloadReport = (report: Report | CustomReport) => {
    // In a real implementation, this would download the file
    // For now, we'll show a message
    toast({
      title: 'Download',
      description: `Downloading ${report.name}...`
    });
  };

  // Filter reports
  const getFilteredReports = () => {
    let filtered = [...REPORT_TEMPLATES];
    
    // Filter by category
    if (categoryFilter !== 'all') {
      const categoryMap: Record<string, string> = {
        financial: 'Financial',
        hr: 'HR',
        project: 'Project',
        custom: 'Custom'
      };
      filtered = filtered.filter(r => r.category === categoryMap[categoryFilter]);
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term)
      );
    }
    
    // Filter by active tab
    if (activeTab !== 'all') {
      const tabMap: Record<string, string> = {
        financial: 'Financial',
        hr: 'HR',
        project: 'Project',
        custom: 'Custom'
      };
      filtered = filtered.filter(r => r.category === tabMap[activeTab]);
    }
    
    return filtered;
  };

  // Get stats
  const stats = {
    total: REPORT_TEMPLATES.length,
    financial: REPORT_TEMPLATES.filter(r => r.category === 'Financial').length,
    hr: REPORT_TEMPLATES.filter(r => r.category === 'HR').length,
    project: REPORT_TEMPLATES.filter(r => r.category === 'Project').length,
    custom: customReports.length,
    generated: generatedReports.length
  };

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: string } = {
      blue: 'h-6 w-6 text-blue-600 dark:text-blue-400',
      green: 'h-6 w-6 text-green-600 dark:text-green-400',
      purple: 'h-6 w-6 text-purple-600 dark:text-purple-400',
      orange: 'h-6 w-6 text-orange-600 dark:text-orange-400',
      indigo: 'h-6 w-6 text-indigo-600 dark:text-indigo-400',
      pink: 'h-6 w-6 text-pink-600 dark:text-pink-400',
      teal: 'h-6 w-6 text-teal-600 dark:text-teal-400',
      cyan: 'h-6 w-6 text-cyan-600 dark:text-cyan-400',
      violet: 'h-6 w-6 text-violet-600 dark:text-violet-400',
      amber: 'h-6 w-6 text-amber-600 dark:text-amber-400',
      emerald: 'h-6 w-6 text-emerald-600 dark:text-emerald-400',
      rose: 'h-6 w-6 text-rose-600 dark:text-rose-400',
      slate: 'h-6 w-6 text-slate-600 dark:text-slate-400'
    };
    return colorMap[color] || 'h-6 w-6 text-gray-600 dark:text-gray-400';
  };

  const getIconBgClasses = (color: string) => {
    const bgMap: { [key: string]: string } = {
      blue: 'bg-blue-50 dark:bg-blue-900/20',
      green: 'bg-green-50 dark:bg-green-900/20',
      purple: 'bg-purple-50 dark:bg-purple-900/20',
      orange: 'bg-orange-50 dark:bg-orange-900/20',
      indigo: 'bg-indigo-50 dark:bg-indigo-900/20',
      pink: 'bg-pink-50 dark:bg-pink-900/20',
      teal: 'bg-teal-50 dark:bg-teal-900/20',
      cyan: 'bg-cyan-50 dark:bg-cyan-900/20',
      violet: 'bg-violet-50 dark:bg-violet-900/20',
      amber: 'bg-amber-50 dark:bg-amber-900/20',
      emerald: 'bg-emerald-50 dark:bg-emerald-900/20',
      rose: 'bg-rose-50 dark:bg-rose-900/20',
      slate: 'bg-slate-50 dark:bg-slate-900/20'
    };
    return bgMap[color] || 'bg-gray-50 dark:bg-gray-900/20';
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'Financial': return 'bg-green-100 text-green-800';
      case 'HR': return 'bg-blue-100 text-blue-800';
      case 'Project': return 'bg-purple-100 text-purple-800';
      case 'Custom': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReports = getFilteredReports();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold">Centralized Reports</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Generate, view, and manage all your business reports in one place</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => navigate('/reports')} className="w-full sm:w-auto">
            <Eye className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">View All Generated</span>
            <span className="sm:hidden">View Generated</span>
          </Button>
          <Button onClick={() => setCreateCustomOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Create Custom Report</span>
            <span className="sm:hidden">Create Report</span>
          </Button>
        </div>
      </div>

      {/* Report Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex-shrink-0">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total Templates</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 flex-shrink-0">
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Financial Reports</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{stats.financial}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex-shrink-0">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">HR Reports</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{stats.hr}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex-shrink-0">
                <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Project Reports</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{stats.project}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const date = new Date(parseInt(selectedYear), month - 1);
                return (
                  <SelectItem key={month} value={`${selectedYear}-${String(month).padStart(2, '0')}`}>
                    {date.toLocaleString('default', { month: 'long' })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
          <TabsTrigger value="all" className="text-xs sm:text-sm">All Reports</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs sm:text-sm">Financial</TabsTrigger>
          <TabsTrigger value="hr" className="text-xs sm:text-sm">HR Reports</TabsTrigger>
          <TabsTrigger value="project" className="text-xs sm:text-sm">Project</TabsTrigger>
          <TabsTrigger value="custom" className="text-xs sm:text-sm">Custom ({customReports.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-0">
          {loading.reports || loading.custom ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReports.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No reports found matching your criteria</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mt-4">
              {filteredReports.map((template) => {
                const lastGenerated = getLastGenerated(template.id);
                const Icon = template.icon;
                
                return (
                  <Card 
                    key={template.id} 
                    className="group cursor-pointer hover:shadow-lg border hover:border-primary/20 flex flex-col h-full overflow-hidden"
                  >
                    <CardHeader className="pb-3 space-y-2 flex-shrink-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg ${getIconBgClasses(template.color)} flex-shrink-0`}>
                            <Icon className={getColorClasses(template.color)} />
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <CardTitle className="text-sm sm:text-base font-semibold leading-tight mb-1 line-clamp-2 break-words">
                              {template.name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                              {template.description}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          className={`${getCategoryBadgeColor(template.category)} flex-shrink-0 text-xs px-1.5 py-0.5 whitespace-nowrap`}
                          variant="secondary"
                        >
                          {template.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3 flex-1 flex flex-col justify-end overflow-hidden">
                      <div className="space-y-2.5 w-full">
                        {lastGenerated && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">Last: <span className="font-medium text-foreground">{new Date(lastGenerated).toLocaleDateString()}</span></span>
                          </div>
                        )}
                        <div className="flex flex-col gap-2 w-full">
                          <Button 
                            size="sm" 
                            onClick={() => handleGenerateReport(template)}
                            disabled={loading.generating}
                            className="w-full text-xs h-8"
                          >
                            {loading.generating ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                            ) : null}
                            Generate
                          </Button>
                          <div className="flex gap-2 w-full">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setSelectedTemplate(template);
                                setScheduleDialogOpen(true);
                              }}
                              className="flex-1 text-xs h-8"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Schedule</span>
                            </Button>
                            {template.route && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(template.route!)}
                                className="text-xs h-8 px-2"
                                title="View related page"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        {/* Other tabs use same rendering logic */}
        {['financial', 'hr', 'project'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0">
            {loading.reports || loading.custom ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredReports.filter(r => r.category.toLowerCase() === tab || (tab === 'hr' && r.category === 'HR')).length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No {tab} reports found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mt-4">
                {filteredReports
                  .filter(r => r.category.toLowerCase() === tab || (tab === 'hr' && r.category === 'HR'))
                  .map((template) => {
                    const lastGenerated = getLastGenerated(template.id);
                    const Icon = template.icon;
                    
                    return (
                      <Card 
                        key={template.id} 
                        className="group cursor-pointer hover:shadow-lg border hover:border-primary/20 flex flex-col h-full overflow-hidden"
                      >
                        <CardHeader className="pb-3 space-y-2 flex-shrink-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <div className={`p-2 rounded-lg ${getIconBgClasses(template.color)} flex-shrink-0`}>
                                <Icon className={getColorClasses(template.color)} />
                              </div>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <CardTitle className="text-sm sm:text-base font-semibold leading-tight mb-1 line-clamp-2 break-words">
                                  {template.name}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                                  {template.description}
                                </p>
                              </div>
                            </div>
                            <Badge 
                              className={`${getCategoryBadgeColor(template.category)} flex-shrink-0 text-xs px-1.5 py-0.5 whitespace-nowrap`}
                              variant="secondary"
                            >
                              {template.category}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3 flex-1 flex flex-col justify-end overflow-hidden">
                          <div className="space-y-2.5 w-full">
                            {lastGenerated && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">Last: <span className="font-medium text-foreground">{new Date(lastGenerated).toLocaleDateString()}</span></span>
                              </div>
                            )}
                            <div className="flex flex-col gap-2 w-full">
                              <Button 
                                size="sm" 
                                onClick={() => handleGenerateReport(template)}
                                disabled={loading.generating}
                                className="w-full text-xs h-8"
                              >
                                {loading.generating ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                                ) : null}
                                Generate
                              </Button>
                              <div className="flex gap-2 w-full">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedTemplate(template);
                                    setScheduleDialogOpen(true);
                                  }}
                                  className="flex-1 text-xs h-8"
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  <span className="hidden sm:inline">Schedule</span>
                                </Button>
                                {template.route && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => navigate(template.route!)}
                                    className="text-xs h-8 px-2"
                                    title="View related page"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>
        ))}
        
        <TabsContent value="custom" className="mt-0">
          {loading.custom ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : customReports.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No custom reports created yet</p>
                <Button onClick={() => setCreateCustomOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom Report
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mt-4">
              {customReports.map((report) => (
                <Card 
                  key={report.id} 
                  className="group cursor-pointer hover:shadow-lg border hover:border-orange-200 dark:hover:border-orange-800 flex flex-col h-full overflow-hidden"
                >
                  <CardHeader className="pb-3 space-y-2 flex-shrink-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex-shrink-0">
                          <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <CardTitle className="text-sm sm:text-base font-semibold leading-tight mb-1 line-clamp-2 break-words">
                            {report.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                            {report.description || 'Custom report'}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 flex-shrink-0 text-xs px-1.5 py-0.5 whitespace-nowrap" variant="secondary">
                        Custom
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 flex-1 flex flex-col justify-end overflow-hidden">
                    <div className="space-y-2.5 w-full">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">Created: <span className="font-medium text-foreground">{new Date(report.created_at).toLocaleDateString()}</span></span>
                      </div>
                      <div className="flex gap-2 w-full">
                        <Button size="sm" variant="outline" className="flex-1 text-xs h-8">
                          <Edit className="h-3 w-3 mr-1.5" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedReport(report);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-xs h-8 px-2"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Custom Report Dialog */}
      <Dialog open={createCustomOpen} onOpenChange={setCreateCustomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Report</DialogTitle>
            <DialogDescription>
              Create a new custom report template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Report Name</Label>
              <Input
                id="name"
                value={newCustomReport.name}
                onChange={(e) => setNewCustomReport({ ...newCustomReport, name: e.target.value })}
                placeholder="Enter report name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newCustomReport.description}
                onChange={(e) => setNewCustomReport({ ...newCustomReport, description: e.target.value })}
                placeholder="Enter report description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="type">Report Type</Label>
              <Select 
                value={newCustomReport.report_type} 
                onValueChange={(value: any) => setNewCustomReport({ ...newCustomReport, report_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="payroll">Payroll</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCustomOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomReport}>
              Create Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Report Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Report</DialogTitle>
            <DialogDescription>
              Configure automatic report generation schedule
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Frequency</Label>
              <Select 
                value={scheduleConfig.frequency} 
                onValueChange={(value: any) => setScheduleConfig({ ...scheduleConfig, frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scheduleConfig.frequency === 'monthly' && (
              <div>
                <Label>Day of Month</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={scheduleConfig.day}
                  onChange={(e) => setScheduleConfig({ ...scheduleConfig, day: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label>Time</Label>
              <Input
                type="time"
                value={scheduleConfig.time}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, time: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({
                title: 'Scheduled',
                description: `Report scheduled for ${scheduleConfig.frequency} generation`
              });
              setScheduleDialogOpen(false);
            }}>
              Schedule Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedReport?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReport} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CentralizedReports;
