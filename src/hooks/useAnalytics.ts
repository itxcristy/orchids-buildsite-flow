import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { selectRecords, rawQuery } from '@/services/api/postgresql-service';

export interface AnalyticsData {
  revenue: {
    current: number;
    previous: number;
    growth: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    growth: number;
  };
  employees: {
    total: number;
    active: number;
    growth: number;
  };
  expenses: {
    total: number;
    pending: number;
    growth: number;
  };
}

export interface ChartDataPoint {
  period: string;
  value: number;
  label?: string;
}

export interface TimeSeriesData {
  revenue: ChartDataPoint[];
  expenses: ChartDataPoint[];
  projects: ChartDataPoint[];
  employees: ChartDataPoint[];
}

export function useAnalytics(dateRange?: { from: Date; to: Date }, refreshInterval?: number) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const fromDate = dateRange?.from || new Date(now.getFullYear(), now.getMonth(), 1);
      const toDate = dateRange?.to || now;

      // Fetch data from multiple tables
      const [invoices, jobs, profiles, reimbursements] = await Promise.all([
        selectRecords('invoices', {
          where: {
            created_at: `>='${fromDate.toISOString()}'`
          }
        }),
        selectRecords('jobs', { select: 'id, status, created_at, updated_at' }),
        selectRecords('profiles', { select: 'id, created_at, is_active' }),
        selectRecords('reimbursement_requests', {
          where: {
            created_at: `>='${fromDate.toISOString()}'`
          }
        })
      ]);

      // Calculate revenue metrics
      const currentRevenue = (invoices as any[])?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      
      // Calculate previous period
      const previousFromDate = new Date(fromDate);
      previousFromDate.setMonth(previousFromDate.getMonth() - 1);
      const previousToDate = new Date(toDate);
      previousToDate.setMonth(previousToDate.getMonth() - 1);

      const previousInvoices = await selectRecords('invoices', {
        select: 'total_amount',
        where: {
          created_at: `>='${previousFromDate.toISOString()}'`
        }
      });

      const previousRevenue = (previousInvoices as any[])?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 1;
      const revenueGrowth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;

      // Calculate metrics
      const totalProjects = (jobs as any[])?.length || 0;
      const activeProjects = (jobs as any[])?.filter(p => p.status === 'in_progress').length || 0;
      const completedProjects = (jobs as any[])?.filter(p => p.status === 'completed').length || 0;
      const totalEmployees = (profiles as any[])?.length || 0;
      const activeEmployees = (profiles as any[])?.filter(e => e.is_active).length || 0;
      const totalExpenses = (reimbursements as any[])?.reduce((sum, reimb) => sum + (reimb.amount || 0), 0) || 0;
      const pendingExpenses = (reimbursements as any[])?.filter(r => r.status === 'submitted').length || 0;

      const analyticsData: AnalyticsData = {
        revenue: {
          current: currentRevenue,
          previous: previousRevenue,
          growth: revenueGrowth
        },
        projects: {
          total: totalProjects,
          active: activeProjects,
          completed: completedProjects,
          growth: 12.5
        },
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          growth: 5.2
        },
        expenses: {
          total: totalExpenses,
          pending: pendingExpenses,
          growth: -8.1
        }
      };

      // Generate time series data
      const timeSeries = generateTimeSeriesData(invoices as any[], reimbursements as any[], jobs as any[], profiles as any[]);

      setData(analyticsData);
      setTimeSeriesData(timeSeries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  const generateTimeSeriesData = (
    invoices: any[],
    reimbursements: any[],
    projects: any[],
    employees: any[]
  ): TimeSeriesData => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        date,
        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      });
    }

    const revenueData = months.map(({ date, label }) => {
      const monthlyRevenue = invoices?.filter(inv => {
        const invDate = new Date(inv.created_at);
        return invDate.getMonth() === date.getMonth() && 
               invDate.getFullYear() === date.getFullYear();
      }).reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

      return {
        period: label,
        value: monthlyRevenue,
        label
      };
    });

    const expenseData = months.map(({ date, label }) => {
      const monthlyExpenses = reimbursements?.filter(reimb => {
        const reimbDate = new Date(reimb.created_at);
        return reimbDate.getMonth() === date.getMonth() && 
               reimbDate.getFullYear() === date.getFullYear();
      }).reduce((sum, reimb) => sum + (reimb.amount || 0), 0) || 0;

      return {
        period: label,
        value: monthlyExpenses,
        label
      };
    });

    const projectData = months.map(({ date, label }) => {
      const monthlyProjects = projects?.filter(proj => {
        const projDate = new Date(proj.created_at);
        return projDate.getMonth() === date.getMonth() && 
               projDate.getFullYear() === date.getFullYear();
      }).length || 0;

      return {
        period: label,
        value: monthlyProjects,
        label
      };
    });

    const employeeData = months.map(({ date, label }) => {
      const monthlyEmployees = employees?.filter(emp => {
        const empDate = new Date(emp.created_at);
        return empDate <= date;
      }).length || 0;

      return {
        period: label,
        value: monthlyEmployees,
        label
      };
    });

    return {
      revenue: revenueData,
      expenses: expenseData,
      projects: projectData,
      employees: employeeData
    };
  };

  const refreshData = useCallback(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshData, refreshInterval]);

  return {
    data,
    timeSeriesData,
    loading,
    error,
    refresh: refreshData
  };
}

export function useRealtimeAnalytics() {
  const [realtimeMetrics, setRealtimeMetrics] = useState({
    activeUsers: 0,
    newLeads: 0,
    pendingApprovals: 0,
    systemHealth: 'good'
  });

  useEffect(() => {
    // Fetch initial metrics
    const fetchMetrics = async () => {
      try {
        const leads = await selectRecords('leads');
        const reimbursements = await selectRecords('reimbursement_requests', {
          where: { status: 'submitted' }
        });

        setRealtimeMetrics({
          activeUsers: 0,
          newLeads: (leads as any[])?.length || 0,
          pendingApprovals: (reimbursements as any[])?.length || 0,
          systemHealth: 'good'
        });
      } catch (error) {
        console.error('Error fetching realtime metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return realtimeMetrics;
}
