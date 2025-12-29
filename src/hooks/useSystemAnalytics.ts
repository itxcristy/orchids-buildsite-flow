import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { fetchSystemMetrics as fetchSystemMetricsApi } from '@/services/system-dashboard';
import type { SystemMetrics, AgencySummary as AgencyData } from '@/types/system';
import { logError } from '@/utils/consoleLogger';

interface UseSystemAnalyticsProps {
  userId: string;
  userRole: string;
}

export const useSystemAnalytics = ({ userId, userRole }: UseSystemAnalyticsProps) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [agencies, setAgencies] = useState<AgencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadSystemMetrics = async () => {
    try {
      setLoading(true);

      // Check if user has super_admin role (passed from component)
      if (userRole !== 'super_admin') {
        throw new Error('Access denied: Super admin role required');
      }

      const { metrics, agencies } = await fetchSystemMetricsApi();

      setMetrics(metrics);
      setAgencies(agencies);

    } catch (error: any) {
      logError('Error fetching system metrics:', error);
      toast({
        title: "Error loading system metrics",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && userRole) {
      loadSystemMetrics();
    }
  }, [userId, userRole]);

  const refreshMetrics = () => {
    loadSystemMetrics();
  };

  return {
    metrics,
    agencies,
    loading,
    refreshMetrics,
  };
};