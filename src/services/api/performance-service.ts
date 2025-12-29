// Performance Service - Employee Performance Tracking and Reporting
import { 
  selectRecords, 
  rawQuery,
  rawQueryOne
} from './postgresql-service';
import { format } from 'date-fns';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface PerformanceSummary {
  totalWorkHours: number;
  tasksCompleted: number;
  tasksAssigned: number;
  completionRate: number;
  averageCompletionTime: number;
  attendanceRate: number;
  overtimeHours: number;
  onTimeCompletionRate: number;
}

export interface TaskPerformance {
  id: string;
  title: string;
  project_name: string | null;
  status: string;
  priority: string;
  assigned_date: string;
  due_date: string | null;
  completed_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  time_taken_hours: number | null;
  completion_status: 'on-time' | 'late' | 'overdue' | 'pending';
}

export interface WorkHoursData {
  date: string;
  total_hours: number;
  overtime_hours: number;
  status: string;
}

export interface DailyActivity {
  date: string;
  tasks: Array<{
    task_id: string;
    task_title: string;
    hours_logged: number;
    project_name: string | null;
  }>;
  check_in_time: string | null;
  check_out_time: string | null;
  total_hours: number;
  notes: string | null;
}

export interface PerformanceTrend {
  date: string;
  tasks_completed: number;
  hours_worked: number;
  completion_rate: number;
  attendance_rate: number;
}

/**
 * Get comprehensive performance data for an employee
 */
export async function getEmployeePerformance(
  employeeId: string,
  dateRange: DateRange,
  agencyId?: string
): Promise<PerformanceSummary> {
  // Note: agency_id is not needed as each agency has its own database
  
  // Get attendance summary - employee_id is actually user_id
  // Note: attendance table stores hours_worked, not total_hours/overtime_hours
  const attendanceQuery = `
    SELECT 
      COALESCE(SUM(hours_worked), 0) as total_hours,
      COALESCE(SUM(GREATEST(hours_worked - 9, 0)), 0) as overtime_hours,
      COUNT(*) FILTER (WHERE status IN ('present', 'late')) as present_days,
      COUNT(*) as total_days
    FROM attendance
    WHERE employee_id = $1
      AND date BETWEEN $2 AND $3
  `;
  
  const attendanceResult = await rawQueryOne(attendanceQuery, [
    employeeId,
    dateRange.startDate,
    dateRange.endDate
  ]);
  
  // Get task statistics - use task_assignments table
  // Fix: Use assigned_at date for filtering, not created_at
  const taskQuery = `
    SELECT 
      COUNT(DISTINCT t.id) as total_assigned,
      COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed,
      COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed' AND t.due_date IS NOT NULL AND t.updated_at <= t.due_date) as on_time,
      AVG(EXTRACT(EPOCH FROM (t.updated_at - ta.assigned_at))/3600) FILTER (WHERE t.status = 'completed' AND ta.assigned_at IS NOT NULL) as avg_completion_hours
    FROM tasks t
    INNER JOIN task_assignments ta ON t.id = ta.task_id
    WHERE ta.user_id = $1
      AND ta.assigned_at::date BETWEEN $2::date AND $3::date
  `;
  
  const taskResult = await rawQueryOne(taskQuery, [
    employeeId,
    dateRange.startDate,
    dateRange.endDate
  ]);
  
  const totalAssigned = Number(taskResult?.total_assigned || 0);
  const completed = Number(taskResult?.completed || 0);
  const onTime = Number(taskResult?.on_time || 0);
  const completionRate = totalAssigned > 0 ? (completed / totalAssigned) * 100 : 0;
  const onTimeRate = completed > 0 ? (onTime / completed) * 100 : 0;
  const avgCompletionTime = Number(taskResult?.avg_completion_hours || 0);
  
  const totalHours = Number(attendanceResult?.total_hours || 0);
  const overtimeHours = Number(attendanceResult?.overtime_hours || 0);
  const presentDays = Number(attendanceResult?.present_days || 0);
  const totalDays = Number(attendanceResult?.total_days || 0);
  const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
  
  return {
    totalWorkHours: Math.round(totalHours * 100) / 100,
    tasksCompleted: completed,
    tasksAssigned: totalAssigned,
    completionRate: Math.round(completionRate * 100) / 100,
    averageCompletionTime: Math.round(avgCompletionTime * 100) / 100,
    attendanceRate: Math.round(attendanceRate * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    onTimeCompletionRate: Math.round(onTimeRate * 100) / 100,
  };
}

/**
 * Get detailed task performance data
 */
export async function getTaskPerformance(
  employeeId: string,
  dateRange: DateRange,
  agencyId?: string
): Promise<TaskPerformance[]> {
  // Note: agency_id is not needed as each agency has its own database
  
  const query = `
    SELECT 
      t.id,
      t.title,
      p.name as project_name,
      t.status,
      t.priority,
      ta.assigned_at as assigned_date,
      t.due_date,
      t.updated_at as completed_date,
      t.estimated_hours,
      t.actual_hours,
      CASE 
        WHEN t.status = 'completed' AND t.updated_at IS NOT NULL AND ta.assigned_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (t.updated_at - ta.assigned_at))/3600
        ELSE NULL
      END as time_taken_hours,
      CASE
        WHEN t.status = 'completed' AND t.due_date IS NOT NULL AND t.updated_at <= t.due_date THEN 'on-time'
        WHEN t.status = 'completed' AND t.due_date IS NOT NULL AND t.updated_at > t.due_date THEN 'late'
        WHEN t.status != 'completed' AND t.due_date IS NOT NULL AND t.due_date < NOW() THEN 'overdue'
        ELSE 'pending'
      END as completion_status
    FROM tasks t
    INNER JOIN task_assignments ta ON t.id = ta.task_id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE ta.user_id = $1
      AND ta.assigned_at::date BETWEEN $2::date AND $3::date
    ORDER BY ta.assigned_at DESC, t.created_at DESC
  `;
  
  const results = await rawQuery(query, [
    employeeId,
    dateRange.startDate,
    dateRange.endDate
  ]);
  
  return results.map((row: any) => ({
    id: row.id,
    title: row.title,
    project_name: row.project_name,
    status: row.status,
    priority: row.priority,
    assigned_date: row.assigned_date,
    due_date: row.due_date,
    completed_date: row.completed_date,
    estimated_hours: row.estimated_hours ? Number(row.estimated_hours) : null,
    actual_hours: row.actual_hours ? Number(row.actual_hours) : null,
    time_taken_hours: row.time_taken_hours ? Number(row.time_taken_hours) : null,
    completion_status: row.completion_status as TaskPerformance['completion_status'],
  }));
}

/**
 * Get work hours breakdown
 */
export async function getWorkHours(
  employeeId: string,
  dateRange: DateRange,
  agencyId?: string
): Promise<WorkHoursData[]> {
  // Note: agency_id is not needed as each agency has its own database
  
  const query = `
    SELECT 
      date,
      COALESCE(SUM(hours_worked), 0) as total_hours,
      COALESCE(SUM(GREATEST(hours_worked - 9, 0)), 0) as overtime_hours,
      MAX(status) as status
    FROM attendance
    WHERE employee_id = $1
      AND date BETWEEN $2 AND $3
    GROUP BY date
    ORDER BY date DESC
  `;
  
  const results = await rawQuery(query, [
    employeeId,
    dateRange.startDate,
    dateRange.endDate
  ]);
  
  return results.map((row: any) => ({
    date: row.date,
    total_hours: Number(row.total_hours || 0),
    overtime_hours: Number(row.overtime_hours || 0),
    status: row.status || 'absent',
  }));
}

/**
 * Get work hours by project
 */
export async function getWorkHoursByProject(
  employeeId: string,
  dateRange: DateRange,
  agencyId?: string
): Promise<Array<{ project_name: string; total_hours: number }>> {
  // Note: agency_id is not needed as each agency has its own database
  
  const query = `
    SELECT 
      COALESCE(p.name, 'No Project') as project_name,
      COALESCE(SUM(tt.duration_minutes), 0) / 60.0 as total_hours
    FROM task_time_tracking tt
    INNER JOIN tasks t ON tt.task_id = t.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE tt.user_id = $1
      AND DATE(tt.start_time) BETWEEN $2 AND $3
    GROUP BY p.name
    ORDER BY total_hours DESC
  `;
  
  const results = await rawQuery(query, [
    employeeId,
    dateRange.startDate,
    dateRange.endDate
  ]);
  
  return results.map((row: any) => ({
    project_name: row.project_name,
    total_hours: Number(row.total_hours || 0),
  }));
}

/**
 * Get daily activity for a specific date
 */
export async function getDailyActivity(
  employeeId: string,
  date: string,
  agencyId?: string
): Promise<DailyActivity | null> {
  // Note: agency_id is not needed as each agency has its own database
  
  // Get attendance record - employee_id is actually user_id
  // Map hours_worked to total_hours for the daily activity view
  const attendanceQuery = `
    SELECT 
      date,
      check_in_time,
      check_out_time,
      COALESCE(hours_worked, 0) as total_hours,
      notes
    FROM attendance
    WHERE employee_id = $1
      AND date = $2
    LIMIT 1
  `;
  
  const attendance = await rawQueryOne(attendanceQuery, [employeeId, date]);
  
  // Get tasks worked on that day
  const tasksQuery = `
    SELECT 
      t.id as task_id,
      t.title as task_title,
      COALESCE(SUM(tt.duration_minutes), 0) / 60.0 as hours_logged,
      p.name as project_name
    FROM task_time_tracking tt
    INNER JOIN tasks t ON tt.task_id = t.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE tt.user_id = $1
      AND DATE(tt.start_time) = $2
    GROUP BY t.id, t.title, p.name
    ORDER BY hours_logged DESC
  `;
  
  const tasks = await rawQuery(tasksQuery, [employeeId, date]);
  
  return {
    date,
    tasks: tasks.map((row: any) => ({
      task_id: row.task_id,
      task_title: row.task_title,
      hours_logged: Number(row.hours_logged || 0),
      project_name: row.project_name,
    })),
    check_in_time: attendance?.check_in_time || null,
    check_out_time: attendance?.check_out_time || null,
    total_hours: Number(attendance?.total_hours || 0),
    notes: attendance?.notes || null,
  };
}

/**
 * Get daily activities for multiple dates in a single query (batch)
 * More efficient than calling getDailyActivity multiple times
 */
export async function getDailyActivitiesBatch(
  employeeId: string,
  dates: string[],
  agencyId?: string
): Promise<DailyActivity[]> {
  if (dates.length === 0) return [];
  
  // Get attendance records for all dates
  const attendanceQuery = `
    SELECT 
      date,
      check_in_time,
      check_out_time,
      COALESCE(hours_worked, 0) as total_hours,
      notes
    FROM attendance
    WHERE employee_id = $1
      AND date = ANY($2::date[])
    ORDER BY date DESC
  `;
  
  const attendanceRecords = await rawQuery(attendanceQuery, [employeeId, dates]);
  
  // Get tasks for all dates
  const tasksQuery = `
    SELECT 
      DATE(tt.start_time) as date,
      t.id as task_id,
      t.title as task_title,
      COALESCE(SUM(tt.duration_minutes), 0) / 60.0 as hours_logged,
      p.name as project_name
    FROM task_time_tracking tt
    INNER JOIN tasks t ON tt.task_id = t.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE tt.user_id = $1
      AND DATE(tt.start_time) = ANY($2::date[])
    GROUP BY DATE(tt.start_time), t.id, t.title, p.name
    ORDER BY date DESC, hours_logged DESC
  `;
  
  const taskRecords = await rawQuery(tasksQuery, [employeeId, dates]);
  
  // Group tasks by date
  const tasksByDate: Record<string, any[]> = {};
  taskRecords.forEach((row: any) => {
    const dateStr = format(new Date(row.date), 'yyyy-MM-dd');
    if (!tasksByDate[dateStr]) {
      tasksByDate[dateStr] = [];
    }
    tasksByDate[dateStr].push({
      task_id: row.task_id,
      task_title: row.task_title,
      hours_logged: Number(row.hours_logged || 0),
      project_name: row.project_name,
    });
  });
  
  // Build activities array
  const activities: DailyActivity[] = dates.map(date => {
    // Find attendance record - handle both string and Date formats
    const attendance = attendanceRecords.find((r: any) => {
      const recordDate = r.date instanceof Date 
        ? format(r.date, 'yyyy-MM-dd')
        : r.date?.toString().split('T')[0] || r.date;
      return recordDate === date;
    });
    const tasks = tasksByDate[date] || [];
    
    return {
      date,
      tasks,
      check_in_time: attendance?.check_in_time || null,
      check_out_time: attendance?.check_out_time || null,
      total_hours: Number(attendance?.total_hours || 0),
      notes: attendance?.notes || null,
    };
  });
  
  return activities;
}

/**
 * Get performance trends over time
 */
export async function getPerformanceTrends(
  employeeId: string,
  period: 'daily' | 'weekly' | 'monthly',
  dateRange: DateRange,
  agencyId?: string
): Promise<PerformanceTrend[]> {
  // Note: agency_id is not needed as each agency has its own database
  
  // Build proper date grouping expressions and join conditions
  let dateFormat = '';
  let attendanceGroupBy = '';
  let taskGroupBy = '';
  let attendanceJoin = '';
  let taskJoin = '';
  
  switch (period) {
    case 'daily':
      dateFormat = "TO_CHAR(ds.date, 'YYYY-MM-DD')";
      attendanceGroupBy = "a.date";
      taskGroupBy = "t.created_at::date";
      attendanceJoin = "ad.date_group = ds.date";
      taskJoin = "td.date_group = ds.date";
      break;
    case 'weekly':
      dateFormat = "TO_CHAR(ds.date, 'IYYY-IW')";
      attendanceGroupBy = "DATE_TRUNC('week', a.date)";
      taskGroupBy = "DATE_TRUNC('week', t.created_at::date)";
      attendanceJoin = "ad.date_group = DATE_TRUNC('week', ds.date)";
      taskJoin = "td.date_group = DATE_TRUNC('week', ds.date)";
      break;
    case 'monthly':
      dateFormat = "TO_CHAR(ds.date, 'YYYY-MM')";
      attendanceGroupBy = "DATE_TRUNC('month', a.date)";
      taskGroupBy = "DATE_TRUNC('month', t.created_at::date)";
      attendanceJoin = "ad.date_group = DATE_TRUNC('month', ds.date)";
      taskJoin = "td.date_group = DATE_TRUNC('month', ds.date)";
      break;
  }
  
  const query = `
    WITH date_series AS (
      SELECT generate_series(
        $2::date,
        $3::date,
        CASE WHEN $4 = 'daily' THEN '1 day'::interval
             WHEN $4 = 'weekly' THEN '1 week'::interval
             ELSE '1 month'::interval
        END
      )::date as date
    ),
    attendance_data AS (
      SELECT 
        ${attendanceGroupBy} as date_group,
        COUNT(*) FILTER (WHERE a.status IN ('present', 'late')) as present_days,
        COUNT(*) as total_days,
        COALESCE(SUM(a.hours_worked), 0) as hours_worked
      FROM attendance a
      WHERE a.employee_id = $1
        AND a.date BETWEEN $2 AND $3
      GROUP BY ${attendanceGroupBy}
    ),
    task_data AS (
      SELECT 
        ${taskGroupBy} as date_group,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as tasks_completed,
        COUNT(DISTINCT t.id) as tasks_assigned
      FROM tasks t
      INNER JOIN task_assignments ta ON t.id = ta.task_id
      WHERE ta.user_id = $1
        AND ta.assigned_at::date BETWEEN $2::date AND $3::date
      GROUP BY ${taskGroupBy}
    )
    SELECT 
      ${dateFormat} as date,
      COALESCE(td.tasks_completed, 0) as tasks_completed,
      COALESCE(ad.hours_worked, 0) as hours_worked,
      CASE 
        WHEN td.tasks_assigned > 0 
        THEN (td.tasks_completed::numeric / td.tasks_assigned::numeric * 100)
        ELSE 0
      END as completion_rate,
      CASE 
        WHEN ad.total_days > 0 
        THEN (ad.present_days::numeric / ad.total_days::numeric * 100)
        ELSE 0
      END as attendance_rate
    FROM date_series ds
    LEFT JOIN attendance_data ad ON ${attendanceJoin}
    LEFT JOIN task_data td ON ${taskJoin}
    ORDER BY ds.date
  `;
  
  const results = await rawQuery(query, [
    employeeId,
    dateRange.startDate,
    dateRange.endDate,
    period
  ]);
  
  return results.map((row: any) => ({
    date: row.date,
    tasks_completed: Number(row.tasks_completed || 0),
    hours_worked: Number(row.hours_worked || 0),
    completion_rate: Number(row.completion_rate || 0),
    attendance_rate: Number(row.attendance_rate || 0),
  }));
}

/**
 * Get employee information for header display
 */
export async function getEmployeeInfo(
  employeeId: string,
  agencyId?: string
): Promise<{
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  department: string | null;
  position: string | null;
  manager_name: string | null;
} | null> {
  try {
    // Try unified_employees view first
    try {
      const query = `
        SELECT 
          user_id,
          COALESCE(display_name, full_name, email, 'Unknown User') as full_name,
          email,
          department,
          position,
          supervisor_id
        FROM unified_employees
        WHERE user_id = $1
          AND is_fully_active = true
        LIMIT 1
      `;
      const employee = await rawQueryOne(query, [employeeId]);
      
      if (employee) {
        // Get manager name if supervisor_id exists
        let managerName = null;
        if (employee.supervisor_id) {
          try {
            const managerQuery = `
              SELECT COALESCE(display_name, full_name, email, 'Unknown') as manager_name
              FROM unified_employees
              WHERE id = $1
              LIMIT 1
            `;
            const manager = await rawQueryOne(managerQuery, [employee.supervisor_id]);
            managerName = manager?.manager_name || null;
          } catch (error) {
            // Ignore manager fetch errors
          }
        }
        
        return {
          id: employee.user_id,
          user_id: employee.user_id,
          full_name: employee.full_name,
          email: employee.email || '',
          department: employee.department || null,
          position: employee.position || null,
          manager_name: managerName,
        };
      }
    } catch (viewError: any) {
      // Fallback to manual join
      console.warn('unified_employees view not found, using fallback query:', viewError.message);
      const fallbackQuery = `
        SELECT 
          u.id as user_id,
          COALESCE(p.full_name, CONCAT(ed.first_name, ' ', ed.last_name), u.email, 'Unknown User') as full_name,
          u.email,
          p.department,
          p.position,
          ed.supervisor_id
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        LEFT JOIN employee_details ed ON u.id = ed.user_id
        WHERE u.id = $1
          AND u.is_active = true
        LIMIT 1
      `;
      const employee = await rawQueryOne(fallbackQuery, [employeeId]);
      
      if (employee) {
        let managerName = null;
        if (employee.supervisor_id) {
          try {
            const managerQuery = `
              SELECT COALESCE(p.full_name, CONCAT(ed.first_name, ' ', ed.last_name), 'Unknown') as manager_name
              FROM employee_details ed
              LEFT JOIN profiles p ON ed.user_id = p.user_id
              WHERE ed.id = $1
              LIMIT 1
            `;
            const manager = await rawQueryOne(managerQuery, [employee.supervisor_id]);
            managerName = manager?.manager_name || null;
          } catch (error) {
            // Ignore manager fetch errors
          }
        }
        
        return {
          id: employee.user_id,
          user_id: employee.user_id,
          full_name: employee.full_name,
          email: employee.email || '',
          department: employee.department || null,
          position: employee.position || null,
          manager_name: managerName,
        };
      }
    }
    
    return null;
  } catch (error: any) {
    console.error('Error in getEmployeeInfo:', error);
    return null;
  }
}

/**
 * Get accessible employees based on user role
 */
export async function getAccessibleEmployees(
  userRole: string,
  userDepartmentId: string | null,
  agencyId?: string
): Promise<Array<{ id: string; user_id: string; full_name: string; department: string | null }>> {
  try {
    // Full access roles
    const fullAccessRoles = ['super_admin', 'ceo', 'cfo', 'hr', 'admin', 'operations_manager'];
    
    if (fullAccessRoles.includes(userRole)) {
      // Try unified_employees view first, fallback to manual join if view doesn't exist
      try {
        const query = `
          SELECT DISTINCT
            COALESCE(employee_detail_id, profile_id, user_id) as id,
            user_id,
            COALESCE(display_name, full_name, email, 'Unknown User') as full_name,
            department
          FROM unified_employees
          WHERE is_fully_active = true
          ORDER BY full_name
        `;
        return await rawQuery(query, []);
      } catch (viewError: any) {
        // View doesn't exist, fallback to manual join
        console.warn('unified_employees view not found, using fallback query:', viewError.message);
        const fallbackQuery = `
          SELECT DISTINCT
            COALESCE(ed.id::text, p.id::text, u.id::text) as id,
            u.id as user_id,
            COALESCE(p.full_name, CONCAT(ed.first_name, ' ', ed.last_name), u.email, 'Unknown User') as full_name,
            p.department
          FROM users u
          LEFT JOIN profiles p ON u.id = p.user_id
          LEFT JOIN employee_details ed ON u.id = ed.user_id
          WHERE u.is_active = true
            AND (p.is_active IS NULL OR p.is_active = true)
            AND (ed.is_active IS NULL OR ed.is_active = true)
          ORDER BY full_name
        `;
        return await rawQuery(fallbackQuery, []);
      }
    }
    
    // Department-only access
    const deptAccessRoles = ['department_head', 'team_lead', 'project_manager'];
    
    if (deptAccessRoles.includes(userRole) && userDepartmentId) {
      try {
        const query = `
          SELECT DISTINCT
            COALESCE(ue.employee_detail_id, ue.profile_id, ue.user_id) as id,
            ue.user_id,
            COALESCE(ue.display_name, ue.full_name, ue.email, 'Unknown User') as full_name,
            ue.department
          FROM unified_employees ue
          INNER JOIN team_assignments ta ON ue.user_id = ta.user_id
          WHERE ue.is_fully_active = true
            AND ta.department_id = $1
            AND ta.is_active = true
          ORDER BY full_name
        `;
        return await rawQuery(query, [userDepartmentId]);
      } catch (viewError: any) {
        // View doesn't exist, fallback to manual join
        console.warn('unified_employees view not found, using fallback query:', viewError.message);
        const fallbackQuery = `
          SELECT DISTINCT
            COALESCE(ed.id::text, p.id::text, u.id::text) as id,
            u.id as user_id,
            COALESCE(p.full_name, CONCAT(ed.first_name, ' ', ed.last_name), u.email, 'Unknown User') as full_name,
            p.department
          FROM users u
          INNER JOIN team_assignments ta ON u.id = ta.user_id
          LEFT JOIN profiles p ON u.id = p.user_id
          LEFT JOIN employee_details ed ON u.id = ed.user_id
          WHERE u.is_active = true
            AND ta.department_id = $1
            AND ta.is_active = true
            AND (p.is_active IS NULL OR p.is_active = true)
            AND (ed.is_active IS NULL OR ed.is_active = true)
          ORDER BY full_name
        `;
        return await rawQuery(fallbackQuery, [userDepartmentId]);
      }
    }
    
    // Self-only access - return empty array (will be handled in component)
    return [];
  } catch (error: any) {
    console.error('Error in getAccessibleEmployees:', error);
    throw new Error(`Failed to fetch accessible employees: ${error.message}`);
  }
}
