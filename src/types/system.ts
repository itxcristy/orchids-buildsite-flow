import { z } from 'zod';

export interface SystemMetrics {
  totalAgencies: number;
  activeAgencies: number;
  totalUsers: number;
  activeUsers: number;
  subscriptionPlans: {
    basic: number;
    pro: number;
    enterprise: number;
  };
  revenueMetrics: {
    mrr: number;
    arr: number;
  };
  usageStats: {
    totalProjects: number;
    totalInvoices: number;
    totalClients: number;
    totalAttendanceRecords: number;
  };
  systemHealth: {
    uptime: string;
    responseTime: number;
    errorRate: number;
  };
}

export interface AgencySummary {
  id: string;
  name: string;
  domain: string;
  subscription_plan: string;
  max_users: number;
  is_active: boolean;
  created_at: string;
  user_count: number;
  project_count: number;
  invoice_count: number;
}

export interface SystemMetricsResponse {
  metrics: SystemMetrics;
  agencies: AgencySummary[];
}

// Zod schemas for runtime validation
export const SystemMetricsSchema = z.object({
  totalAgencies: z.number(),
  activeAgencies: z.number(),
  totalUsers: z.number(),
  activeUsers: z.number(),
  subscriptionPlans: z.object({
    basic: z.number(),
    pro: z.number(),
    enterprise: z.number(),
  }),
  revenueMetrics: z.object({
    mrr: z.number(),
    arr: z.number(),
  }),
  usageStats: z.object({
    totalProjects: z.number(),
    totalInvoices: z.number(),
    totalClients: z.number(),
    totalAttendanceRecords: z.number(),
  }),
  systemHealth: z.object({
    uptime: z.string(),
    responseTime: z.number(),
    errorRate: z.number(),
  }),
});

export const AgencySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  subscription_plan: z.string(),
  max_users: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
  user_count: z.number(),
  project_count: z.number(),
  invoice_count: z.number(),
});

export const SystemMetricsResponseSchema = z.object({
  metrics: SystemMetricsSchema,
  agencies: z.array(AgencySummarySchema),
});

