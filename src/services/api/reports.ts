import { BaseApiService, ApiResponse, ApiOptions } from './base';
import { pgClient } from '@/integrations/postgresql/client';
import { getApiBaseUrl } from '@/config/api';

// Helper function to safely access localStorage (handles SSR)
const getStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    // Use console.error here as this is a utility function in a service file
    // and logError may not be available in all contexts
    if (typeof window !== 'undefined' && (window as any).logError) {
      (window as any).logError(`Error accessing localStorage key ${key}:`, error);
    } else {
      // eslint-disable-next-line no-console
      console.error(`Error accessing localStorage key ${key}:`, error);
    }
    return null;
  }
};

export interface MonthlyReportData {
  revenue: number;
  expenses: number;
  profit: number;
  employees: number;
  activeProjects: number;
  completedProjects: number;
  newClients: number;
  invoicesSent: number;
  paymentsReceived: number;
  attendanceRate: number;
}

export interface YearlyReportData {
  revenue: number;
  expenses: number;
  profit: number;
  employeesHired: number;
  projectsCompleted: number;
  newClients: number;
  totalInvoices: number;
  totalPayments: number;
  avgAttendance: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface DepartmentReport {
  name: string;
  employees: number;
  budget: number;
  utilization: number;
}

export interface ProjectReport {
  name: string;
  status: string;
  budget: number;
  actual: number;
  margin: number;
}

export interface CustomReport {
  id: string;
  name: string;
  description?: string;
  report_type: string;
  parameters: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  report_type: 'attendance' | 'payroll' | 'leave' | 'employee' | 'project' | 'financial' | 'gst' | 'custom';
  parameters: Record<string, any>;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  generated_by?: string;
  generated_at: string;
  expires_at?: string;
  is_public?: boolean;
  created_at: string;
}

export interface ScheduledReport {
  id: string;
  agency_id: string;
  report_template_id?: string;
  schedule_name: string;
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  cron_expression?: string;
  day_of_week?: number;
  day_of_month?: number;
  time?: string;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
  filters?: Record<string, any>;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_by?: string;
  created_by_email?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportExport {
  id: string;
  agency_id: string;
  report_id?: string;
  schedule_id?: string;
  name: string;
  report_type: string;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  file_path?: string;
  file_name?: string;
  file_size?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  generated_by?: string;
  generated_by_email?: string;
  generated_at: string;
  expires_at?: string;
  download_count: number;
  parameters?: Record<string, any>;
}

export interface AnalyticsMetrics {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  revenue_growth: number;
  expense_growth: number;
  profit_margin: number;
  inventory_value: number;
  inventory_turnover: number;
  procurement_spend: number;
  asset_value: number;
  active_projects: number;
  employee_count: number;
  top_performers: Array<{
    name: string;
    metric: string;
    value: number;
    change: number;
  }>;
  trends: Array<{
    period: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
}

export class ReportService extends BaseApiService {
  /**
   * Get monthly report data
   */
  static async getMonthlyReport(
    month: string,
    year: string,
    agencyId?: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<MonthlyReportData>> {
    return this.execute(async () => {
      const [monthNum, yearNum] = month.split('-').map(Number);
      
      // Calculate revenue from invoices
      const revenueQuery = `
        SELECT COALESCE(SUM(total_amount), 0) as revenue
        FROM invoices
        WHERE EXTRACT(MONTH FROM issue_date) = $1
          AND EXTRACT(YEAR FROM issue_date) = $2
          AND status = 'paid'
          ${agencyId ? 'AND agency_id = $3' : ''}
      `;
      
      // Calculate expenses from journal entries (expenses are debits)
      const expensesQuery = `
        SELECT COALESCE(SUM(jel.debit_amount), 0) as expenses
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE EXTRACT(MONTH FROM je.entry_date) = $1
          AND EXTRACT(YEAR FROM je.entry_date) = $2
          AND coa.account_type = 'expense'
        ${agencyId ? 'AND je.agency_id = $3' : ''}
      `;
      
      // Count employees
      const employeesQuery = `
        SELECT COUNT(DISTINCT ed.id) as count
        FROM employee_details ed
        JOIN profiles p ON ed.user_id = p.id
        WHERE ed.is_active = true
        ${agencyId ? 'AND ed.agency_id = $1' : ''}
      `;
      
      // Count active projects
      const activeProjectsQuery = `
        SELECT COUNT(*) as count
        FROM projects
        WHERE status IN ('in-progress', 'planning')
          AND EXTRACT(MONTH FROM start_date) <= $1
          AND EXTRACT(YEAR FROM start_date) = $2
          ${agencyId ? 'AND agency_id = $3' : ''}
      `;
      
      // Count completed projects
      const completedProjectsQuery = `
        SELECT COUNT(*) as count
        FROM projects
        WHERE status = 'completed'
          AND EXTRACT(MONTH FROM end_date) = $1
          AND EXTRACT(YEAR FROM end_date) = $2
          ${agencyId ? 'AND agency_id = $3' : ''}
      `;
      
      // Count new clients
      const newClientsQuery = `
        SELECT COUNT(*) as count
        FROM clients
        WHERE EXTRACT(MONTH FROM created_at) = $1
          AND EXTRACT(YEAR FROM created_at) = $2
          ${agencyId ? 'AND agency_id = $3' : ''}
      `;
      
      // Count invoices sent
      const invoicesSentQuery = `
        SELECT COUNT(*) as count
        FROM invoices
        WHERE EXTRACT(MONTH FROM issue_date) = $1
          AND EXTRACT(YEAR FROM issue_date) = $2
          ${agencyId ? 'AND agency_id = $3' : ''}
      `;
      
      // Count payments received
      const paymentsReceivedQuery = `
        SELECT COUNT(*) as count
        FROM invoices
        WHERE EXTRACT(MONTH FROM issue_date) = $1
          AND EXTRACT(YEAR FROM issue_date) = $2
          AND status = 'paid'
          ${agencyId ? 'AND agency_id = $3' : ''}
      `;
      
      // Calculate attendance rate
      const attendanceQuery = `
        SELECT 
          COALESCE(
            ROUND(
              (COUNT(CASE WHEN status = 'present' THEN 1 END)::numeric / 
               NULLIF(COUNT(*), 0)) * 100, 
              2
            ), 
            0
          ) as rate
        FROM attendance
        WHERE EXTRACT(MONTH FROM date) = $1
          AND EXTRACT(YEAR FROM date) = $2
          ${agencyId ? 'AND agency_id = $3' : ''}
      `;
      
      // Build parameter arrays for each query individually
      const revenueParams = agencyId ? [monthNum, yearNum, agencyId] : [monthNum, yearNum];
      const expensesParams = agencyId ? [monthNum, yearNum, agencyId] : [monthNum, yearNum];
      const employeesParams = agencyId ? [agencyId] : [];
      const activeProjectsParams = agencyId ? [monthNum, yearNum, agencyId] : [monthNum, yearNum];
      const completedProjectsParams = agencyId ? [monthNum, yearNum, agencyId] : [monthNum, yearNum];
      const newClientsParams = agencyId ? [monthNum, yearNum, agencyId] : [monthNum, yearNum];
      const invoicesSentParams = agencyId ? [monthNum, yearNum, agencyId] : [monthNum, yearNum];
      const paymentsReceivedParams = agencyId ? [monthNum, yearNum, agencyId] : [monthNum, yearNum];
      const attendanceParams = agencyId ? [monthNum, yearNum, agencyId] : [monthNum, yearNum];
      
      const [revenue, expenses, employees, activeProjects, completedProjects, 
             newClients, invoicesSent, paymentsReceived, attendance] = await Promise.all([
        pgClient.query(revenueQuery, revenueParams),
        pgClient.query(expensesQuery, expensesParams),
        pgClient.query(employeesQuery, employeesParams),
        pgClient.query(activeProjectsQuery, activeProjectsParams),
        pgClient.query(completedProjectsQuery, completedProjectsParams),
        pgClient.query(newClientsQuery, newClientsParams),
        pgClient.query(invoicesSentQuery, invoicesSentParams),
        pgClient.query(paymentsReceivedQuery, paymentsReceivedParams),
        pgClient.query(attendanceQuery, attendanceParams),
      ]);
      
      return {
        revenue: parseFloat(revenue.rows[0]?.revenue || '0'),
        expenses: parseFloat(expenses.rows[0]?.expenses || '0'),
        profit: parseFloat(revenue.rows[0]?.revenue || '0') - parseFloat(expenses.rows[0]?.expenses || '0'),
        employees: parseInt(employees.rows[0]?.count || '0'),
        activeProjects: parseInt(activeProjects.rows[0]?.count || '0'),
        completedProjects: parseInt(completedProjects.rows[0]?.count || '0'),
        newClients: parseInt(newClients.rows[0]?.count || '0'),
        invoicesSent: parseInt(invoicesSent.rows[0]?.count || '0'),
        paymentsReceived: parseInt(paymentsReceived.rows[0]?.count || '0'),
        attendanceRate: parseFloat(attendance.rows[0]?.rate || '0'),
      };
    }, options);
  }

  /**
   * Get yearly report data
   */
  static async getYearlyReport(
    year: string,
    agencyId?: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<YearlyReportData>> {
    return this.execute(async () => {
      const yearNum = parseInt(year);
      
      // Calculate annual revenue
      const revenueQuery = `
        SELECT COALESCE(SUM(total_amount), 0) as revenue
        FROM invoices
        WHERE EXTRACT(YEAR FROM issue_date) = $1
          AND status = 'paid'
          ${agencyId ? 'AND agency_id = $2' : ''}
      `;
      
      // Calculate annual expenses (expenses are debits)
      const expensesQuery = `
        SELECT COALESCE(SUM(jel.debit_amount), 0) as expenses
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE EXTRACT(YEAR FROM je.entry_date) = $1
          AND coa.account_type = 'expense'
        ${agencyId ? 'AND je.agency_id = $2' : ''}
      `;
      
      // Count employees hired this year
      const employeesHiredQuery = `
        SELECT COUNT(*) as count
        FROM employee_details ed
        WHERE EXTRACT(YEAR FROM ed.created_at) = $1
          ${agencyId ? 'AND ed.agency_id = $2' : ''}
      `;
      
      // Count projects completed
      const projectsCompletedQuery = `
        SELECT COUNT(*) as count
        FROM projects
        WHERE status = 'completed'
          AND EXTRACT(YEAR FROM end_date) = $1
          ${agencyId ? 'AND agency_id = $2' : ''}
      `;
      
      // Count new clients
      const newClientsQuery = `
        SELECT COUNT(*) as count
        FROM clients
        WHERE EXTRACT(YEAR FROM created_at) = $1
          ${agencyId ? 'AND agency_id = $2' : ''}
      `;
      
      // Count total invoices
      const totalInvoicesQuery = `
        SELECT COUNT(*) as count
        FROM invoices
        WHERE EXTRACT(YEAR FROM issue_date) = $1
          ${agencyId ? 'AND agency_id = $2' : ''}
      `;
      
      // Count total payments
      const totalPaymentsQuery = `
        SELECT COUNT(*) as count
        FROM invoices
        WHERE EXTRACT(YEAR FROM issue_date) = $1
          AND status = 'paid'
          ${agencyId ? 'AND agency_id = $2' : ''}
      `;
      
      // Calculate average attendance
      const avgAttendanceQuery = `
        SELECT 
          COALESCE(
            ROUND(
              AVG(
                CASE WHEN status = 'present' THEN 100 ELSE 0 END
              ), 
              2
            ), 
            0
          ) as rate
        FROM attendance
        WHERE EXTRACT(YEAR FROM date) = $1
          ${agencyId ? 'AND agency_id = $2' : ''}
      `;
      
      const params = agencyId ? [yearNum, agencyId] : [yearNum];
      
      const [revenue, expenses, employeesHired, projectsCompleted, newClients,
             totalInvoices, totalPayments, avgAttendance] = await Promise.all([
        pgClient.query(revenueQuery, params),
        pgClient.query(expensesQuery, params),
        pgClient.query(employeesHiredQuery, params),
        pgClient.query(projectsCompletedQuery, params),
        pgClient.query(newClientsQuery, params),
        pgClient.query(totalInvoicesQuery, params),
        pgClient.query(totalPaymentsQuery, params),
        pgClient.query(avgAttendanceQuery, params),
      ]);
      
      return {
        revenue: parseFloat(revenue.rows[0]?.revenue || '0'),
        expenses: parseFloat(expenses.rows[0]?.expenses || '0'),
        profit: parseFloat(revenue.rows[0]?.revenue || '0') - parseFloat(expenses.rows[0]?.expenses || '0'),
        employeesHired: parseInt(employeesHired.rows[0]?.count || '0'),
        projectsCompleted: parseInt(projectsCompleted.rows[0]?.count || '0'),
        newClients: parseInt(newClients.rows[0]?.count || '0'),
        totalInvoices: parseInt(totalInvoices.rows[0]?.count || '0'),
        totalPayments: parseInt(totalPayments.rows[0]?.count || '0'),
        avgAttendance: parseFloat(avgAttendance.rows[0]?.rate || '0'),
      };
    }, options);
  }

  /**
   * Get monthly trends for the past 12 months
   */
  static async getMonthlyTrends(
    year: string,
    agencyId?: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<MonthlyTrend[]>> {
    return this.execute(async () => {
      const yearNum = parseInt(year);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const trendsQuery = `
        SELECT 
          EXTRACT(MONTH FROM issue_date)::int as month,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue
        FROM invoices
        WHERE EXTRACT(YEAR FROM issue_date) = $1
          ${agencyId ? 'AND agency_id = $2' : ''}
        GROUP BY EXTRACT(MONTH FROM issue_date)
        ORDER BY month
      `;
      
      const expensesQuery = `
        SELECT 
          EXTRACT(MONTH FROM je.entry_date)::int as month,
          COALESCE(SUM(jel.debit_amount), 0) as expenses
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE EXTRACT(YEAR FROM je.entry_date) = $1
          AND coa.account_type = 'expense'
        ${agencyId ? 'AND je.agency_id = $2' : ''}
        GROUP BY EXTRACT(MONTH FROM je.entry_date)
        ORDER BY month
      `;
      
      const params = agencyId ? [yearNum, agencyId] : [yearNum];
      
      const [revenueData, expensesData] = await Promise.all([
        pgClient.query(trendsQuery, params),
        pgClient.query(expensesQuery, params),
      ]);
      
      // Create a map for quick lookup
      const revenueMap = new Map(revenueData.rows.map((r: any) => [r.month, parseFloat(r.revenue || '0')]));
      const expensesMap = new Map(expensesData.rows.map((r: any) => [r.month, parseFloat(r.expenses || '0')]));
      
      // Build trends array for all 12 months
      const trends: MonthlyTrend[] = [];
      for (let month = 1; month <= 12; month++) {
        const revenue = revenueMap.get(month) || 0;
        const expenses = expensesMap.get(month) || 0;
        trends.push({
          month: monthNames[month - 1],
          revenue,
          expenses,
          profit: revenue - expenses,
        });
      }
      
      return trends;
    }, options);
  }

  /**
   * Get department reports
   */
  static async getDepartmentReports(
    agencyId?: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<DepartmentReport[]>> {
    return this.execute(async () => {
      const query = `
        SELECT 
          d.name,
          COUNT(DISTINCT ta.user_id) as employees,
          COALESCE(SUM(esd.salary), 0) as budget,
          COALESCE(
            ROUND(
              (COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END)::numeric / 
               NULLIF(COUNT(DISTINCT a.id), 0)) * 100, 
              2
            ), 
            0
          ) as utilization
        FROM departments d
        LEFT JOIN team_assignments ta ON d.id = ta.department_id
        LEFT JOIN employee_details ed ON ta.user_id = ed.user_id
        LEFT JOIN employee_salary_details esd ON ed.id = esd.employee_id
        LEFT JOIN attendance a ON ed.user_id = a.employee_id
          AND a.date >= CURRENT_DATE - INTERVAL '30 days'
        ${agencyId ? 'WHERE d.agency_id = $1' : ''}
        GROUP BY d.id, d.name
        ORDER BY d.name
      `;
      
      const params = agencyId ? [agencyId] : [];
      const result = await pgClient.query(query, params);
      
      return result.rows.map((row: any) => ({
        name: row.name,
        employees: parseInt(row.employees || '0'),
        budget: parseFloat(row.budget || '0'),
        utilization: parseFloat(row.utilization || '0'),
      }));
    }, options);
  }

  /**
   * Get project reports
   */
  static async getProjectReports(
    agencyId?: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<ProjectReport[]>> {
    return this.execute(async () => {
      // Calculate actual costs from task time tracking (estimated hourly rate * hours)
      // For now, we'll use a simplified approach - actual costs can be calculated from
      // task time tracking or set to 0 if not available
      const query = `
        SELECT 
          p.name,
          p.status,
          COALESCE(p.budget, 0) as budget,
          COALESCE(
            (SELECT SUM(tt.hours_logged * 1000)
             FROM task_time_tracking tt
             JOIN tasks t ON tt.task_id = t.id
             WHERE t.project_id = p.id),
            0
          ) as actual,
          CASE 
            WHEN COALESCE(p.budget, 0) > 0 THEN
              ROUND(
                ((COALESCE(p.budget, 0) - 
                  COALESCE(
                    (SELECT SUM(tt.hours_logged * 1000)
                     FROM task_time_tracking tt
                     JOIN tasks t ON tt.task_id = t.id
                     WHERE t.project_id = p.id),
                    0
                  )) / COALESCE(p.budget, 1)) * 100,
                2
              )
            ELSE 100
          END as margin
        FROM projects p
        ${agencyId ? 'WHERE p.agency_id = $1' : ''}
        ORDER BY p.created_at DESC
        LIMIT 50
      `;
      
      const params = agencyId ? [agencyId] : [];
      const result = await pgClient.query(query, params);
      
      return result.rows.map((row: any) => ({
        name: row.name,
        status: row.status || 'planning',
        budget: parseFloat(row.budget || '0'),
        actual: parseFloat(row.actual || '0'),
        margin: parseFloat(row.margin || '0'),
      }));
    }, options);
  }

  /**
   * Get all custom reports
   */
  static async getCustomReports(
    userId?: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<CustomReport[]>> {
    return this.query<CustomReport[]>('custom_reports', {
      filters: userId ? { created_by: userId } : {},
      orderBy: { column: 'created_at', ascending: false },
    }, options);
  }

  /**
   * Get a single custom report
   */
  static async getCustomReport(
    reportId: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<CustomReport>> {
    return this.query<CustomReport>('custom_reports', {
      filters: { id: reportId },
      single: true,
    }, options);
  }

  /**
   * Create a custom report
   */
  static async createCustomReport(
    data: {
      name: string;
      description?: string;
      report_type: string;
      parameters: Record<string, any>;
      created_by: string;
      agency_id?: string;
    },
    options: ApiOptions = {}
  ): Promise<ApiResponse<CustomReport>> {
    return this.execute<CustomReport>(async () => {
      const { pgClient } = await import('@/integrations/postgresql/client');
      
      // Prepare parameters as JSONB
      const parametersJson = JSON.stringify(data.parameters || {});
      
      const query = `
        INSERT INTO public.custom_reports (name, description, report_type, parameters, created_by, agency_id)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6)
        RETURNING *
      `;
      
      const values = [
        data.name,
        data.description || null,
        data.report_type,
        parametersJson,
        data.created_by,
        data.agency_id || null,
      ];
      
      try {
        const result = await pgClient.query(query, values);
        return result.rows[0] as CustomReport;
      } catch (error: any) {
        logError('Error inserting custom report:', error);
        throw error;
      }
    }, options);
  }

  /**
   * Update a custom report
   */
  static async updateCustomReport(
    reportId: string,
    data: Partial<{
      name: string;
      description: string;
      parameters: Record<string, any>;
    }>,
    options: ApiOptions = {}
  ): Promise<ApiResponse<CustomReport>> {
    return this.update<CustomReport>('custom_reports', {
      ...data,
      updated_at: new Date().toISOString(),
    }, { id: reportId }, options);
  }

  /**
   * Delete a custom report
   */
  static async deleteCustomReport(
    reportId: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<void>> {
    return this.delete<void>('custom_reports', { id: reportId }, options);
  }

  // ==================== REPORTS TABLE CRUD OPERATIONS ====================

  /**
   * Get all reports from reports table
   */
  static async getReports(
    filters?: {
      report_type?: string;
      generated_by?: string;
      is_public?: boolean;
      agency_id?: string;
    },
    options: ApiOptions = {}
  ): Promise<ApiResponse<Report[]>> {
    return this.query<Report[]>('reports', {
      filters: filters || {},
      orderBy: { column: 'generated_at', ascending: false },
    }, options);
  }

  /**
   * Get a single report by ID
   */
  static async getReport(
    reportId: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<Report>> {
    return this.query<Report>('reports', {
      filters: { id: reportId },
      single: true,
    }, options);
  }

  /**
   * Create a new report in reports table
   */
  static async createReport(
    data: {
      name: string;
      description?: string;
      report_type: 'attendance' | 'payroll' | 'leave' | 'employee' | 'project' | 'financial' | 'gst' | 'custom';
      parameters?: Record<string, any>;
      file_path?: string;
      file_name?: string;
      file_size?: number;
      generated_by?: string;
      expires_at?: string;
      is_public?: boolean;
      agency_id?: string;
    },
    options: ApiOptions = {}
  ): Promise<ApiResponse<Report>> {
    return this.execute<Report>(async () => {
      const parametersJson = JSON.stringify(data.parameters || {});
      
      const query = `
        INSERT INTO public.reports (
          name, description, report_type, parameters, file_path, file_name, 
          file_size, generated_by, expires_at, is_public, agency_id
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        data.name,
        data.description || null,
        data.report_type,
        parametersJson,
        data.file_path || null,
        data.file_name || null,
        data.file_size || null,
        data.generated_by || null,
        data.expires_at || null,
        data.is_public ?? false,
        data.agency_id || null,
      ];
      
      const result = await pgClient.query(query, values);
      return result.rows[0] as Report;
    }, options);
  }

  /**
   * Update a report
   */
  static async updateReport(
    reportId: string,
    data: Partial<{
      name: string;
      description: string;
      parameters: Record<string, any>;
      file_path: string;
      file_name: string;
      file_size: number;
      expires_at: string;
      is_public: boolean;
    }>,
    options: ApiOptions = {}
  ): Promise<ApiResponse<Report>> {
    return this.execute<Report>(async () => {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.parameters !== undefined) {
        updateFields.push(`parameters = $${paramIndex++}::jsonb`);
        values.push(JSON.stringify(data.parameters));
      }
      if (data.file_path !== undefined) {
        updateFields.push(`file_path = $${paramIndex++}`);
        values.push(data.file_path);
      }
      if (data.file_name !== undefined) {
        updateFields.push(`file_name = $${paramIndex++}`);
        values.push(data.file_name);
      }
      if (data.file_size !== undefined) {
        updateFields.push(`file_size = $${paramIndex++}`);
        values.push(data.file_size);
      }
      if (data.expires_at !== undefined) {
        updateFields.push(`expires_at = $${paramIndex++}`);
        values.push(data.expires_at);
      }
      if (data.is_public !== undefined) {
        updateFields.push(`is_public = $${paramIndex++}`);
        values.push(data.is_public);
      }

      if (updateFields.length === 0) {
        // No fields to update, just return the existing report
        const getResult = await pgClient.query('SELECT * FROM reports WHERE id = $1', [reportId]);
        return getResult.rows[0] as Report;
      }

      values.push(reportId);
      const query = `
        UPDATE public.reports
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pgClient.query(query, values);
      return result.rows[0] as Report;
    }, options);
  }

  /**
   * Delete a report
   */
  static async deleteReport(
    reportId: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<void>> {
    return this.delete<void>('reports', { id: reportId }, options);
  }

  /**
   * Get reports by type
   */
  static async getReportsByType(
    reportType: 'attendance' | 'payroll' | 'leave' | 'employee' | 'project' | 'financial' | 'gst' | 'custom',
    agencyId?: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<Report[]>> {
    const filters: any = { report_type: reportType };
    if (agencyId) {
      // Note: reports table doesn't have agency_id, but we can filter by generated_by's agency
      // For now, we'll just filter by type
    }
    return this.getReports(filters, options);
  }

  /**
   * Get comprehensive dashboard data
   */
  static async getDashboardData(
    filters?: {
      date_from?: string;
      date_to?: string;
    },
    options: ApiOptions = {}
  ): Promise<ApiResponse<any>> {
    return this.execute(async () => {
      const API_BASE = getApiBaseUrl();
      
      // Safely access localStorage (handles SSR)
      const getStorageItem = (key: string): string | null => {
        if (typeof window === 'undefined') return null;
        try {
          return localStorage.getItem(key);
        } catch (error) {
          // Use console.error here as this is a utility function in a service file
          // and logError may not be available in all contexts
          if (typeof window !== 'undefined' && (window as any).logError) {
            (window as any).logError(`Error accessing localStorage key ${key}:`, error);
          } else {
            // eslint-disable-next-line no-console
            console.error(`Error accessing localStorage key ${key}:`, error);
          }
          return null;
        }
      };
      
      const token = getStorageItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Validate date filters
      if (filters?.date_from && isNaN(Date.parse(filters.date_from))) {
        throw new Error('Invalid date_from format. Use YYYY-MM-DD');
      }
      
      if (filters?.date_to && isNaN(Date.parse(filters.date_to))) {
        throw new Error('Invalid date_to format. Use YYYY-MM-DD');
      }
      
      if (filters?.date_from && filters?.date_to && new Date(filters.date_from) > new Date(filters.date_to)) {
        throw new Error('date_from must be before or equal to date_to');
      }

      const queryParams = new URLSearchParams();
      if (filters?.date_from) queryParams.append('date_from', filters.date_from);
      if (filters?.date_to) queryParams.append('date_to', filters.date_to);

      const agencyDatabase = getStorageItem('agency_database') || '';
      
      const response = await fetch(`${API_BASE}/api/reports/dashboard?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Agency-Database': agencyDatabase,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch dashboard data';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }
      
      return result.data;
    }, options);
  }

  /**
   * Generate custom report
   */
  static async generateCustomReport(
    module: 'inventory' | 'procurement' | 'assets' | 'financial',
    options: {
      filters?: Record<string, any>;
      columns?: string[];
      groupBy?: string[];
      orderBy?: string;
    } = {}
  ): Promise<any[]> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const API_BASE = getApiBaseUrl();

    const response = await fetch(`${API_BASE}/api/reports/custom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Agency-Database': localStorage.getItem('agency_database') || '',
      },
      body: JSON.stringify({
        module,
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to generate custom report' }));
      throw new Error(error.error || 'Failed to generate custom report');
    }

    const result = await response.json();
    return result.data || [];
  }

  /**
   * Get scheduled reports
   */
  static async getScheduledReports(filters?: {
    report_type?: string;
    is_active?: boolean;
    search?: string;
  }): Promise<ApiResponse<ScheduledReport[]>> {
    return this.execute(async () => {
      const API_BASE = getApiBaseUrl();
      const token = getStorageItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const queryParams = new URLSearchParams();
      if (filters?.report_type) queryParams.append('report_type', filters.report_type);
      if (filters?.is_active !== undefined) queryParams.append('is_active', String(filters.is_active));
      if (filters?.search) queryParams.append('search', filters.search);

      const agencyDatabase = getStorageItem('agency_database') || '';
      
      const response = await fetch(`${API_BASE}/api/reports/scheduled?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Agency-Database': agencyDatabase,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch scheduled reports' }));
        throw new Error(error.error || 'Failed to fetch scheduled reports');
      }

      const result = await response.json();
      return result.data || [];
    }, {});
  }

  /**
   * Get scheduled report by ID
   */
  static async getScheduledReportById(scheduleId: string): Promise<ApiResponse<ScheduledReport>> {
    return this.execute(async () => {
      const API_BASE = getApiBaseUrl();
      const token = getStorageItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const agencyDatabase = getStorageItem('agency_database') || '';
      
      const response = await fetch(`${API_BASE}/api/reports/scheduled/${scheduleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Agency-Database': agencyDatabase,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch scheduled report' }));
        throw new Error(error.error || 'Failed to fetch scheduled report');
      }

      const result = await response.json();
      return result.data;
    }, {});
  }

  /**
   * Create scheduled report
   */
  static async createScheduledReport(scheduleData: Partial<ScheduledReport>): Promise<ApiResponse<ScheduledReport>> {
    return this.execute(async () => {
      const API_BASE = getApiBaseUrl();
      const token = getStorageItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const agencyDatabase = getStorageItem('agency_database') || '';
      
      const response = await fetch(`${API_BASE}/api/reports/scheduled`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Agency-Database': agencyDatabase,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create scheduled report' }));
        throw new Error(error.error || 'Failed to create scheduled report');
      }

      const result = await response.json();
      return result.data;
    });
  }

  /**
   * Update scheduled report
   */
  static async updateScheduledReport(scheduleId: string, scheduleData: Partial<ScheduledReport>): Promise<ApiResponse<ScheduledReport>> {
    return this.execute(async () => {
      const API_BASE = getApiBaseUrl();
      const token = getStorageItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const agencyDatabase = getStorageItem('agency_database') || '';
      
      const response = await fetch(`${API_BASE}/api/reports/scheduled/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Agency-Database': agencyDatabase,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update scheduled report' }));
        throw new Error(error.error || 'Failed to update scheduled report');
      }

      const result = await response.json();
      return result.data;
    }, {});
  }

  /**
   * Delete scheduled report
   */
  static async deleteScheduledReport(scheduleId: string): Promise<ApiResponse<void>> {
    return this.execute(async () => {
      const API_BASE = getApiBaseUrl();
      const token = getStorageItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const agencyDatabase = getStorageItem('agency_database') || '';
      
      const response = await fetch(`${API_BASE}/api/reports/scheduled/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Agency-Database': agencyDatabase,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete scheduled report' }));
        throw new Error(error.error || 'Failed to delete scheduled report');
      }
    });
  }

  /**
   * Get report exports
   */
  static async getReportExports(filters?: {
    status?: string;
    format?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
  }): Promise<ReportExport[]> {
    return this.execute(async () => {
      const token = getStorageItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.format) queryParams.append('format', filters.format);
      if (filters?.date_from) queryParams.append('date_from', filters.date_from);
      if (filters?.date_to) queryParams.append('date_to', filters.date_to);
      if (filters?.search) queryParams.append('search', filters.search);

      const agencyDatabase = getStorageItem('agency_database') || '';
      
      const response = await fetch(`${API_BASE}/api/reports/exports?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Agency-Database': agencyDatabase,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch report exports' }));
        throw new Error(error.error || 'Failed to fetch report exports');
      }

      const result = await response.json();
      return result.data || [];
    }, {});
  }

  /**
   * Delete report export
   */
  static async deleteReportExport(exportId: string): Promise<ApiResponse<void>> {
    return this.execute(async () => {
      const API_BASE = getApiBaseUrl();
      const token = getStorageItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const agencyDatabase = getStorageItem('agency_database') || '';
      
      const response = await fetch(`${API_BASE}/api/reports/exports/${exportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Agency-Database': agencyDatabase,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete report export' }));
        throw new Error(error.error || 'Failed to delete report export');
      }
      return undefined;
    }, {});
  }

  /**
   * Get analytics dashboard data
   */
  static async getAnalyticsDashboard(filters?: {
    date_from?: string;
    date_to?: string;
    period?: string;
  }): Promise<ApiResponse<AnalyticsMetrics>> {
    return this.execute(async () => {
      const API_BASE = getApiBaseUrl();
      const token = getStorageItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const queryParams = new URLSearchParams();
      if (filters?.date_from) queryParams.append('date_from', filters.date_from);
      if (filters?.date_to) queryParams.append('date_to', filters.date_to);
      if (filters?.period) queryParams.append('period', filters.period);

      const agencyDatabase = getStorageItem('agency_database') || '';
      
      const response = await fetch(`${API_BASE}/api/reports/analytics?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Agency-Database': agencyDatabase,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch analytics data' }));
        throw new Error(error.error || 'Failed to fetch analytics data');
      }

      const result = await response.json();
      return result.data;
    }, {});
  }
}

