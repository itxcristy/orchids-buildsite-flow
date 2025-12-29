import { useState, useEffect } from 'react';
import { db } from '@/lib/database';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { countRecords } from '@/services/api/postgresql-service';
import { logWarn, logError } from '@/utils/consoleLogger';

export interface AgencyMetrics {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  activeProjects: number;
  totalClients: number;
  totalInvoices: number;
  totalRevenue: number;
  monthlyRevenue: number;
  attendanceRecords: number;
  leaveRequests: {
    pending: number;
    approved: number;
    total: number;
  };
  recentActivity: {
    newUsers: number;
    newProjects: number;
    newInvoices: number;
  };
}

export const useAgencyAnalytics = () => {
  const { userRole, user, profile: authProfile } = useAuth();
  const [metrics, setMetrics] = useState<AgencyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAgencyMetrics = async () => {
    try {
      setLoading(true);

      // Only allow agency-level roles to access this data
      if (userRole === 'super_admin') {
        throw new Error('Super admin should use system analytics');
      }

      // Get agency ID from auth profile or fetch it
      let agencyId = authProfile?.agency_id;
      
      if (!agencyId && user?.id) {
        const { data: profile } = await db
          .from('profiles')
          .select('agency_id')
          .eq('user_id', user.id)
          .single();
        agencyId = profile?.agency_id;
      }

      if (!agencyId) {
        logWarn('No agency_id available for analytics');
        setLoading(false);
        return;
      }

      // Helper function to safely execute queries
      const safeQuery = async (queryPromise: PromiseLike<any> | Promise<any>, fallback: any = null) => {
        try {
          const result = await queryPromise;
          if (result && typeof result === 'object' && 'error' in result && result.error) {
            logWarn('[Agency Analytics] Query error:', result.error);
            return fallback;
          }
          if (result && typeof result === 'object' && 'data' in result) {
            return result.data || fallback;
          }
          return result || fallback;
        } catch (error: any) {
          logWarn('[Agency Analytics] Query exception:', error);
          return fallback;
        }
      };

      // Helper function to safely count records
      const safeCount = async (table: string, filters: any, fallback: number = 0) => {
        try {
          return await countRecords(table, filters);
        } catch (error: any) {
          logWarn(`[Agency Analytics] Count error for ${table}:`, error);
          return fallback;
        }
      };

      // Fetch agency-specific metrics
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // Fetch counts with error handling
      const [
        totalUsers,
        activeUsers,
        totalProjects,
        activeProjects,
        totalClients,
        attendanceRecords
      ] = await Promise.all([
        safeCount('profiles', { agency_id: agencyId }),
        safeCount('profiles', { agency_id: agencyId, is_active: true }),
        safeCount('projects', { agency_id: agencyId }),
        safeCount('projects', { agency_id: agencyId, status: 'active' }),
        safeCount('clients', { agency_id: agencyId }),
        safeCount('attendance', { agency_id: agencyId })
      ]);

      // Fetch data that needs processing with error handling
      const [
        invoicesResult,
        leaveRequestsResult,
        recentUsersResult,
        recentProjectsResult,
        recentInvoicesResult
      ] = await Promise.all([
        safeQuery(db.from('invoices').select('total_amount').eq('agency_id', agencyId), { data: [] }),
        safeQuery(db.from('leave_requests').select('status').eq('agency_id', agencyId), { data: [] }),
        safeQuery(db.from('profiles').select('id').eq('agency_id', agencyId).gte('created_at', thirtyDaysAgo), { data: [] }),
        safeQuery(db.from('projects').select('id').eq('agency_id', agencyId).gte('created_at', thirtyDaysAgo), { data: [] }),
        safeQuery(db.from('invoices').select('total_amount').eq('agency_id', agencyId).gte('created_at', thirtyDaysAgo), { data: [] })
      ]);

      // Calculate revenue metrics with safe array handling
      const invoicesData = Array.isArray(invoicesResult.data) ? invoicesResult.data : [];
      const recentInvoicesData = Array.isArray(recentInvoicesResult.data) ? recentInvoicesResult.data : [];
      
      const totalRevenue = invoicesData.reduce((sum, invoice) => sum + (Number(invoice.total_amount) || 0), 0);
      const monthlyRevenue = recentInvoicesData.reduce((sum, invoice) => sum + (Number(invoice.total_amount) || 0), 0);

      // Process leave requests with safe array handling
      const leaveRequestsData = Array.isArray(leaveRequestsResult.data) ? leaveRequestsResult.data : [];
      const leaveRequests = {
        pending: leaveRequestsData.filter(lr => lr.status === 'pending').length,
        approved: leaveRequestsData.filter(lr => lr.status === 'approved').length,
        total: leaveRequestsData.length
      };

      const agencyMetrics: AgencyMetrics = {
        totalUsers,
        activeUsers,
        totalProjects,
        activeProjects,
        totalClients,
        totalInvoices: invoicesData.length,
        totalRevenue,
        monthlyRevenue,
        attendanceRecords,
        leaveRequests,
        recentActivity: {
          newUsers: Array.isArray(recentUsersResult.data) ? recentUsersResult.data.length : 0,
          newProjects: Array.isArray(recentProjectsResult.data) ? recentProjectsResult.data.length : 0,
          newInvoices: recentInvoicesData.length,
        }
      };

      setMetrics(agencyMetrics);

    } catch (error: any) {
      logError('Error fetching agency metrics:', error);
      toast({
        title: "Error loading agency metrics",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole && userRole !== 'super_admin') {
      fetchAgencyMetrics();
    } else if (userRole === 'super_admin') {
      setLoading(false);
    }
  }, [userRole]);

  const refreshMetrics = () => {
    fetchAgencyMetrics();
  };

  return {
    metrics,
    loading,
    refreshMetrics,
  };
};