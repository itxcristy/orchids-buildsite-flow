import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Clock, 
  FileText,
  Download,
  RefreshCw,
  ArrowRight,
  Building2,
  Calendar,
  Briefcase,
  UserCheck,
  Receipt
} from "lucide-react";
import { db } from '@/lib/database';
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DateRange } from "react-day-picker";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { getAgencyId } from "@/utils/agencyUtils";
import { logWarn } from '@/utils/consoleLogger';

interface DashboardMetrics {
  totalRevenue: number;
  totalEmployees: number;
  activeProjects: number;
  pendingReimbursements: number;
  revenueGrowth: number;
  employeeGrowth: number;
  projectsGrowth: number;
  reimbursementGrowth: number;
}

interface ChartData {
  name: string;
  value: number;
  revenue?: number;
  expenses?: number;
  projects?: number;
  employees?: number;
  attendance?: number;
  present?: number;
  absent?: number;
  late?: number;
}

interface WorkforceData {
  totalEmployees: number;
  activeEmployees: number;
  onLeave: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  departmentStats: Array<{
    department: string;
    employees: number;
    present: number;
    attendanceRate: number;
  }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function Analytics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<ChartData[]>([]);
  const [expenseData, setExpenseData] = useState<ChartData[]>([]);
  const [projectStatusData, setProjectStatusData] = useState<ChartData[]>([]);
  const [leaveData, setLeaveData] = useState<ChartData[]>([]);
  const [workforceData, setWorkforceData] = useState<WorkforceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get agency_id
      const agencyId = await getAgencyId(profile, user?.id || null);
      if (!agencyId) {
        toast({
          title: "Error",
          description: "Agency ID not found. Please ensure you're assigned to an agency.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Calculate date range based on selected period
      const now = new Date();
      let fromDate: Date;
      let toDate = now;

      switch (selectedPeriod) {
        case "week":
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          const quarter = Math.floor(now.getMonth() / 3);
          fromDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case "year":
          fromDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Use custom date range if provided
      if (dateRange?.from && dateRange?.to) {
        fromDate = dateRange.from;
        toDate = dateRange.to;
      }

      const fromDateStr = fromDate.toISOString();
      const toDateStr = toDate.toISOString();

      // Calculate previous period for growth comparison
      const periodDiff = toDate.getTime() - fromDate.getTime();
      const previousToDate = new Date(fromDate.getTime() - 1);
      const previousFromDate = new Date(previousToDate.getTime() - periodDiff);
      const previousFromDateStr = previousFromDate.toISOString();
      const previousToDateStr = previousToDate.toISOString();

      // Helper function to safely execute queries with error handling
      const safeQuery = async (queryPromise: PromiseLike<any> | Promise<any>, fallback: any = null) => {
        try {
          const result = await queryPromise;
          if (result && typeof result === 'object' && 'error' in result && result.error) {
            logWarn('[Analytics] Query error:', result.error);
            return fallback;
          }
          if (result && typeof result === 'object' && 'data' in result) {
            return result.data || fallback;
          }
          return result || fallback;
        } catch (error: any) {
          logWarn('[Analytics] Query exception:', error);
          return fallback;
        }
      };

      // Fetch key metrics with agency_id filtering and date range
      // All queries are wrapped in safeQuery to handle missing tables/columns gracefully
      const [
        invoices,
        previousInvoices,
        employees,
        previousEmployees,
        projects,
        previousProjects,
        reimbursements,
        previousReimbursements
      ] = await Promise.all([
        safeQuery(
        db.from('invoices')
          .select('total_amount, created_at')
          .eq('agency_id', agencyId)
          .gte('created_at', fromDateStr)
          .lte('created_at', toDateStr),
          []
        ),
        safeQuery(
        db.from('invoices')
          .select('total_amount, created_at')
          .eq('agency_id', agencyId)
          .gte('created_at', previousFromDateStr)
          .lte('created_at', previousToDateStr),
          []
        ),
        safeQuery(
        db.from('profiles')
          .select('id, created_at, is_active')
          .eq('agency_id', agencyId),
          []
        ),
        safeQuery(
        db.from('profiles')
          .select('id, created_at')
          .eq('agency_id', agencyId)
          .lte('created_at', previousToDateStr),
          []
        ),
        safeQuery(
        db.from('projects')
          .select('id, status, created_at')
          .eq('agency_id', agencyId),
          []
        ),
        safeQuery(
        db.from('projects')
          .select('id, status, created_at')
          .eq('agency_id', agencyId)
          .lte('created_at', previousToDateStr),
          []
        ),
        safeQuery(
          db.from('reimbursement_requests')
          .select('amount, status, created_at')
            .eq('agency_id', agencyId)
          .gte('created_at', fromDateStr)
            .lte('created_at', toDateStr),
          []
        ),
        safeQuery(
          db.from('reimbursement_requests')
          .select('amount, status, created_at')
            .eq('agency_id', agencyId)
          .gte('created_at', previousFromDateStr)
            .lte('created_at', previousToDateStr),
          []
        )
      ]);

      // Calculate metrics with safe array handling
      const totalRevenue = Array.isArray(invoices) ? invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) : 0;
      const previousRevenue = Array.isArray(previousInvoices) ? previousInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) : 0;
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      const totalEmployees = Array.isArray(employees) ? employees.length : 0;
      const previousTotalEmployees = Array.isArray(previousEmployees) ? previousEmployees.length : 0;
      const employeeGrowth = previousTotalEmployees > 0 ? ((totalEmployees - previousTotalEmployees) / previousTotalEmployees) * 100 : 0;

      const activeProjects = Array.isArray(projects) ? projects.filter(p => p.status === 'in_progress' || p.status === 'active').length : 0;
      const previousActiveProjects = Array.isArray(previousProjects) ? previousProjects.filter(p => p.status === 'in_progress' || p.status === 'active').length : 0;
      const projectsGrowth = previousActiveProjects > 0 ? ((activeProjects - previousActiveProjects) / previousActiveProjects) * 100 : 0;

      const pendingReimbursements = Array.isArray(reimbursements) ? reimbursements.filter(r => r.status === 'submitted' || r.status === 'pending').length : 0;
      const previousPendingReimbursements = Array.isArray(previousReimbursements) ? previousReimbursements.filter(r => r.status === 'submitted' || r.status === 'pending').length : 0;
      const reimbursementGrowth = previousPendingReimbursements > 0 ? ((pendingReimbursements - previousPendingReimbursements) / previousPendingReimbursements) * 100 : 0;

      setMetrics({
        totalRevenue,
        totalEmployees,
        activeProjects,
        pendingReimbursements,
        revenueGrowth,
        employeeGrowth,
        projectsGrowth,
        reimbursementGrowth
      });

      // Generate chart data (uses all historical data, not just date range)
      await generateChartData(invoices, reimbursements, projects, agencyId);
      await fetchWorkforceData(agencyId);
      
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = async (invoices: any[], reimbursements: any[], projects: any[], agencyId: string) => {
    // Helper function to safely execute queries
    const safeQuery = async (queryPromise: Promise<any>, fallback: any = []) => {
      try {
        const result = await queryPromise;
        if (result.error) {
          console.warn('[Analytics] Chart data query error:', result.error);
          return fallback;
        }
        return result.data || fallback;
      } catch (error: any) {
        console.warn('[Analytics] Chart data query exception:', error);
        return fallback;
      }
    };

    // Fetch ALL historical invoices for revenue trend (not just date range)
    const allInvoices = await safeQuery(
      db.from('invoices')
      .select('total_amount, created_at')
      .eq('agency_id', agencyId)
        .order('created_at', { ascending: true }),
      []
    );

    // Fetch ALL historical reimbursements for expense trend
    const allReimbursements = await safeQuery(
      db.from('reimbursement_requests')
      .select('amount, created_at')
      .eq('agency_id', agencyId)
        .order('created_at', { ascending: true }),
      []
    );

    // Revenue trend (last 12 months for better historical view)
    const monthlyRevenue = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      const monthlyInvoices = Array.isArray(allInvoices) ? allInvoices.filter(inv => {
        if (!inv.created_at) return false;
        const invDate = new Date(inv.created_at);
        return invDate.getMonth() === date.getMonth() && invDate.getFullYear() === date.getFullYear();
      }) : [];
      
      const revenue = monthlyInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
      
      monthlyRevenue.push({
        name: monthName,
        revenue,
        value: revenue
      });
    }
    setRevenueData(monthlyRevenue);

    // Expense data (reimbursements by month - last 12 months)
    const monthlyExpenses = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      const monthlyReimbursements = Array.isArray(allReimbursements) ? allReimbursements.filter(reimb => {
        if (!reimb.created_at) return false;
        const reimbDate = new Date(reimb.created_at);
        return reimbDate.getMonth() === date.getMonth() && reimbDate.getFullYear() === date.getFullYear();
      }) : [];
      
      const expenses = monthlyReimbursements.reduce((sum, reimb) => sum + (Number(reimb.amount) || 0), 0);
      
      monthlyExpenses.push({
        name: monthName,
        expenses,
        value: expenses
      });
    }
    setExpenseData(monthlyExpenses);

    // Project status distribution
    const statusCounts = Array.isArray(projects) ? projects.reduce((acc, project) => {
      const status = project.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) : {};

    const projectData = Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: Number(count)
    }));
    setProjectStatusData(projectData);

    // Leave requests data (real data from database - ALL leave requests)
    try {
      const leaveResult = await db
        .from('leave_requests')
        .select('status')
        .eq('agency_id', agencyId);

      if (leaveResult.error) {
        console.warn('[Analytics] Leave requests query error:', leaveResult.error);
        setLeaveData([]);
        return;
      }

      const leaveRequests = leaveResult.data || [];
      const leaveCounts = Array.isArray(leaveRequests) ? leaveRequests.reduce((acc, req) => {
        const status = req.status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) : {};

      const leaveDataArray = Object.entries(leaveCounts)
        .map(([status, count]) => ({
          name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
          value: Number(count)
        }))
        .filter(item => item.value > 0); // Only show statuses that have data

      // Always set real data, even if empty array
      setLeaveData(leaveDataArray.length > 0 ? leaveDataArray : []);
    } catch (error) {
      console.error('[Analytics] Error fetching leave data:', error);
      // On error, set empty array instead of mock zeros
      setLeaveData([]);
    }
  };

  const fetchWorkforceData = async (agencyId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // Helper function to safely execute queries
      const safeQuery = async (queryPromise: Promise<any>, fallback: any = []) => {
        try {
          const result = await queryPromise;
          if (result.error) {
            console.warn('[Analytics] Workforce query error:', result.error);
            return fallback;
          }
          return result.data || fallback;
        } catch (error: any) {
          console.warn('[Analytics] Workforce query exception:', error);
          return fallback;
        }
      };

      // Fetch employees
      const employees = await safeQuery(
        db.from('profiles')
        .select('id, is_active, department')
          .eq('agency_id', agencyId),
        []
      );

      // Fetch attendance for today
      const attendanceToday = await safeQuery(
        db.from('attendance')
        .select('employee_id, status, check_in_time')
        .eq('agency_id', agencyId)
        .gte('date', todayStr)
          .lte('date', todayStr),
        []
      );

      // Fetch leave requests for today (where today is between start_date and end_date)
      const leaveRequests = await safeQuery(
        db.from('leave_requests')
        .select('employee_id, status, start_date, end_date')
        .eq('agency_id', agencyId)
        .eq('status', 'approved')
        .lte('start_date', todayStr)
          .gte('end_date', todayStr),
        []
      );

      const totalEmployees = Array.isArray(employees) ? employees.length : 0;
      const activeEmployees = Array.isArray(employees) ? employees.filter(e => e.is_active).length : 0;
      const onLeave = Array.isArray(leaveRequests) ? leaveRequests.length : 0;

      // Calculate attendance stats
      const presentToday = Array.isArray(attendanceToday) ? attendanceToday.filter(a => a.status === 'present' || a.status === 'checked_in').length : 0;
      const absentToday = totalEmployees - presentToday - onLeave;
      const lateToday = Array.isArray(attendanceToday) ? attendanceToday.filter(a => {
        if (!a.check_in_time) return false;
        const checkIn = new Date(a.check_in_time);
        return checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 0);
      }).length : 0;

      // Department stats
      const departmentMap = new Map<string, { employees: number; present: number }>();
      
      if (Array.isArray(employees)) {
        employees.forEach(emp => {
        const dept = emp.department || 'Unassigned';
        if (!departmentMap.has(dept)) {
          departmentMap.set(dept, { employees: 0, present: 0 });
        }
        const deptData = departmentMap.get(dept)!;
        deptData.employees++;
        
          const isPresent = Array.isArray(attendanceToday) && attendanceToday.some(a => a.employee_id === emp.id && (a.status === 'present' || a.status === 'checked_in'));
        if (isPresent) {
          deptData.present++;
        }
      });
      }

      const departmentStats = Array.from(departmentMap.entries()).map(([department, data]) => ({
        department,
        employees: data.employees,
        present: data.present,
        attendanceRate: data.employees > 0 ? (data.present / data.employees) * 100 : 0
      }));

      setWorkforceData({
        totalEmployees,
        activeEmployees,
        onLeave,
        presentToday,
        absentToday,
        lateToday,
        departmentStats
      });
    } catch (error) {
      console.error('Error fetching workforce data:', error);
    }
  };

  const exportReport = async (type: string) => {
    try {
      // Navigate to Reports page with the report type
      navigate(`/reports?type=${type}&from=${dateRange?.from?.toISOString() || ''}&to=${dateRange?.to?.toISOString() || ''}`);
      toast({
        title: "Redirecting",
        description: `Opening ${type} report in Reports page`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open report",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, selectedPeriod]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time insights into your agency's performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Navigation Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-start space-y-2"
          onClick={() => navigate('/reports')}
        >
          <FileText className="h-5 w-5" />
          <div className="text-left">
            <div className="font-semibold">Reports</div>
            <div className="text-xs text-muted-foreground">View detailed reports</div>
          </div>
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-start space-y-2"
          onClick={() => navigate('/attendance')}
        >
          <Calendar className="h-5 w-5" />
          <div className="text-left">
            <div className="font-semibold">Attendance</div>
            <div className="text-xs text-muted-foreground">View attendance records</div>
          </div>
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-start space-y-2"
          onClick={() => navigate('/projects')}
        >
          <Briefcase className="h-5 w-5" />
          <div className="text-left">
            <div className="font-semibold">Projects</div>
            <div className="text-xs text-muted-foreground">Manage projects</div>
          </div>
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-start space-y-2"
          onClick={() => navigate('/employee-management')}
        >
          <UserCheck className="h-5 w-5" />
          <div className="text-left">
            <div className="font-semibold">Employees</div>
            <div className="text-xs text-muted-foreground">Manage workforce</div>
          </div>
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics?.totalRevenue.toLocaleString() || '0'}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics?.revenueGrowth && metrics.revenueGrowth > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              {Math.abs(metrics?.revenueGrowth || 0).toFixed(1)}% from previous period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalEmployees || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics?.employeeGrowth && metrics.employeeGrowth > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              {Math.abs(metrics?.employeeGrowth || 0).toFixed(1)}% from previous period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeProjects || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics?.projectsGrowth && metrics.projectsGrowth > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              {Math.abs(metrics?.projectsGrowth || 0).toFixed(1)}% from previous period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reimbursements</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.pendingReimbursements || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics?.reimbursementGrowth && metrics.reimbursementGrowth > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              {Math.abs(metrics?.reimbursementGrowth || 0).toFixed(1)}% from previous period
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="revenue">Revenue & Expenses</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="workforce">Workforce</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          <Button variant="outline" onClick={() => exportReport('dashboard')}>
            <Download className="h-4 w-4 mr-2" />
            Export Dashboard
          </Button>
        </div>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Trend</CardTitle>
                <CardDescription>Monthly expenses over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expenseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Expenses']} />
                    <Bar dataKey="expenses" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Status Distribution</CardTitle>
                <CardDescription>Current status of all projects</CardDescription>
              </CardHeader>
              <CardContent>
                {projectStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={projectStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {projectStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No project data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leave Requests</CardTitle>
                <CardDescription>Leave request status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {leaveData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={leaveData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {leaveData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No leave request data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workforce" className="space-y-4">
          {workforceData ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Attendance</CardTitle>
                  <CardDescription>Current day workforce status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Present</span>
                    <span className="text-2xl font-bold text-green-600">{workforceData.presentToday}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Absent</span>
                    <span className="text-2xl font-bold text-red-600">{workforceData.absentToday}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">On Leave</span>
                    <span className="text-2xl font-bold text-blue-600">{workforceData.onLeave}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Late</span>
                    <span className="text-2xl font-bold text-orange-600">{workforceData.lateToday}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => navigate('/attendance')}
                  >
                    View Attendance <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workforce Overview</CardTitle>
                  <CardDescription>Employee statistics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Employees</span>
                    <span className="text-2xl font-bold">{workforceData.totalEmployees}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Employees</span>
                    <span className="text-2xl font-bold text-green-600">{workforceData.activeEmployees}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Attendance Rate</span>
                    <span className="text-2xl font-bold">
                      {workforceData.totalEmployees > 0 
                        ? ((workforceData.presentToday / workforceData.totalEmployees) * 100).toFixed(1)
                        : '0'}%
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => navigate('/employee-management')}
                  >
                    Manage Employees <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Department Stats</CardTitle>
                  <CardDescription>Attendance by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {workforceData.departmentStats.map((dept, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{dept.department}</span>
                          <span className="text-muted-foreground">{dept.present}/{dept.employees}</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${dept.attendanceRate}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dept.attendanceRate.toFixed(1)}% attendance
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Workforce Analytics</CardTitle>
                <CardDescription>Employee metrics and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  {loading ? 'Loading workforce data...' : 'No workforce data available'}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Center</CardTitle>
              <CardDescription>Generate and download detailed reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2"
                  onClick={() => exportReport('financial')}
                >
                  <DollarSign className="h-6 w-6" />
                  <span>Financial Report</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2"
                  onClick={() => exportReport('projects')}
                >
                  <Clock className="h-6 w-6" />
                  <span>Project Report</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-24 flex-col space-y-2"
                  onClick={() => exportReport('workforce')}
                >
                  <Users className="h-6 w-6" />
                  <span>Workforce Report</span>
                </Button>
              </div>
              <div className="mt-4">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => navigate('/reports')}
                >
                  View All Reports <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
