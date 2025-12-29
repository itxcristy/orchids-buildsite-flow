import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Clock, Calendar as CalendarIcon, Users, TrendingUp, Loader2, Download, AlertTriangle, TrendingDown, BarChart3, PieChart, Activity, ArrowUp, ArrowDown, Building2 } from "lucide-react";
import { db } from '@/lib/database';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAgencySettings } from "@/hooks/useAgencySettings";
import { hasRoleOrHigher } from "@/utils/roleUtils";
import { formatTime, isWorkingDay } from "@/utils/dateFormat";
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface AttendanceRecord {
  id: string;
  name: string;
  checkIn: string;
  checkOut: string;
  status: string;
  hours: string;
  employee_id?: string;
}

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
}

interface WeeklyTrend {
  date: string;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

interface DepartmentStats {
  department: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  attendanceRate: number;
}

interface AttendanceInsight {
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  count?: number;
}

const Attendance = () => {
  const { toast } = useToast();
  const { userRole, user, profile } = useAuth();
  const { settings: agencySettings } = useAgencySettings();
  const [searchParams] = useSearchParams();
  
  // Get department filter from URL
  const urlDepartmentId = searchParams.get('department');
  const urlDepartmentName = searchParams.get('name');
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0
  });
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [showReportsDialog, setShowReportsDialog] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [insights, setInsights] = useState<AttendanceInsight[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  
  // Check if user is admin/manager/HR (should see admin dashboard)
  const isAdminView = userRole && (
    userRole === 'super_admin' || 
    userRole === 'admin' || 
    userRole === 'hr' || 
    userRole === 'ceo' || 
    userRole === 'cto' || 
    userRole === 'cfo' || 
    userRole === 'coo' ||
    userRole === 'operations_manager' ||
    userRole === 'department_head' ||
    userRole === 'team_lead' ||
    userRole === 'project_manager'
  );

  useEffect(() => {
    if (date && user?.id) {
      fetchAttendanceData(date);
      if (isAdminView) {
        fetchWeeklyTrends();
        fetchDepartmentStats();
        generateInsights();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, isAdminView, selectedPeriod, urlDepartmentId, user?.id]);

  const fetchAttendanceData = async (selectedDate: Date) => {
    try {
      setLoading(true);
      
      // Format date for query (YYYY-MM-DD)
      // Note: Agency isolation is handled at the database connection level
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // If filtering by department, get user IDs in that department
      let departmentUserIds: string[] = [];
      if (urlDepartmentId) {
        let assignmentsQuery = db
          .from('team_assignments')
          .select('user_id')
          .eq('department_id', urlDepartmentId)
          .eq('is_active', true);
        
        // Note: Agency isolation is handled at the database connection level
        const { data: assignments } = await assignmentsQuery;
        
        if (assignments) {
          departmentUserIds = assignments.map((ta: any) => ta.user_id).filter(Boolean);
        }
      }
      
      // Fetch attendance records for the selected date
      // Note: Agency isolation is handled at the database connection level
      // No need to filter by agency_id as each agency has its own database
      let attendanceQuery = db
        .from('attendance')
        .select('*')
        .eq('date', dateStr);
      
      // Filter by department if specified
      if (urlDepartmentId && departmentUserIds.length > 0) {
        attendanceQuery = attendanceQuery.in('employee_id', departmentUserIds);
      }
      
      const { data: attendanceData, error: attendanceError } = await attendanceQuery
        .order('check_in_time', { ascending: true });

      if (attendanceError) throw attendanceError;

      // Fetch all active employees to check who's absent
      // Note: Agency isolation is handled at the database connection level
      let employeesQuery = db
        .from('employee_details')
        .select('user_id, first_name, last_name, is_active')
        .eq('is_active', true);
      
      // Filter by department if specified
      if (urlDepartmentId && departmentUserIds.length > 0) {
        employeesQuery = employeesQuery.in('user_id', departmentUserIds);
      }
      
      const { data: employeesData, error: employeesError } = await employeesQuery;

      if (employeesError) throw employeesError;

      // Fetch profiles for employee names
      // Note: Agency isolation is handled at the database connection level
      const employeeIds = employeesData?.map(e => e.user_id).filter(Boolean) || [];
      let profiles: any[] = [];
      
      if (employeeIds.length > 0) {
        const { data: profilesData, error: profilesError } = await db
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', employeeIds);

        if (profilesError) throw profilesError;
        profiles = profilesData || [];
      }

      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p.full_name]));

      // Check for leave requests that include this date (between start_date and end_date)
      // FIXED: Use user_id instead of employee_id (leave_requests table uses user_id)
      // Note: Agency isolation is handled at the database connection level
      let leaveQuery = db
        .from('leave_requests')
        .select('user_id, status, start_date, end_date')
        .gte('end_date', dateStr)
        .lte('start_date', dateStr)
        .in('status', ['approved', 'pending']);
      
      // Filter by department if specified
      if (urlDepartmentId && departmentUserIds.length > 0) {
        leaveQuery = leaveQuery.in('user_id', departmentUserIds);
      }
      
      const { data: leaveData, error: leaveError } = await leaveQuery;

      if (leaveError) throw leaveError;

      const onLeaveIds = new Set((leaveData || []).map((l: any) => l.user_id));

      // Transform attendance data
      const attendanceRecords: AttendanceRecord[] = [];
      const presentIds = new Set<string>();
      const lateIds = new Set<string>();

      (attendanceData || []).forEach((record: any) => {
        const employee = employeesData?.find(e => e.user_id === record.employee_id);
        const fullName = profileMap.get(record.employee_id) || 
          (employee ? `${employee.first_name} ${employee.last_name}`.trim() : 'Unknown Employee');
        
        presentIds.add(record.employee_id);
        
        // Determine if late (check-in after working hours start + 15 minutes grace period)
        let status = 'present';
        if (record.check_in_time) {
          const checkInTime = new Date(record.check_in_time);
          // Get working hours from agency settings (default to 9:00 if not set)
          const workingHoursStart = agencySettings?.working_hours_start || '09:00';
          const [startHour, startMin] = workingHoursStart.split(':').map(Number);
          const gracePeriodMinutes = 15;
          
          const checkInHours = checkInTime.getHours();
          const checkInMinutes = checkInTime.getMinutes();
          const startTimeMinutes = startHour * 60 + startMin + gracePeriodMinutes;
          const checkInTimeMinutes = checkInHours * 60 + checkInMinutes;
          
          if (checkInTimeMinutes > startTimeMinutes) {
            status = 'late';
            lateIds.add(record.employee_id);
          }
        }

        const checkIn = record.check_in_time 
          ? formatTime(record.check_in_time, agencySettings?.timezone)
          : '-';
        const checkOut = record.check_out_time 
          ? formatTime(record.check_out_time, agencySettings?.timezone)
          : '-';
        // Fix: Convert total_hours to number first, handle null/undefined/string cases
        const totalHours = record.total_hours != null 
          ? (typeof record.total_hours === 'string' ? parseFloat(record.total_hours) : Number(record.total_hours))
          : 0;
        const hours = !isNaN(totalHours) && totalHours > 0 ? totalHours.toFixed(1) : '0.0';

        attendanceRecords.push({
          id: record.id,
          name: fullName,
          checkIn,
          checkOut,
          status,
          hours,
          employee_id: record.employee_id
        });
      });

      // Add absent employees (not in attendance, not on leave)
      employeesData?.forEach((employee: any) => {
        if (!presentIds.has(employee.user_id) && !onLeaveIds.has(employee.user_id)) {
          const fullName = profileMap.get(employee.user_id) || 
            `${employee.first_name} ${employee.last_name}`.trim();
          
          attendanceRecords.push({
            id: `absent-${employee.user_id}`,
            name: fullName,
            checkIn: '-',
            checkOut: '-',
            status: 'absent',
            hours: '0.0',
            employee_id: employee.user_id
          });
        }
      });

      // Add employees on leave
      (leaveData || []).forEach((leave: any) => {
        const userId = leave.user_id; // Use user_id from leave_requests
        if (!presentIds.has(userId)) {
          const employee = employeesData?.find(e => e.user_id === userId);
          const fullName = profileMap.get(userId) || 
            (employee ? `${employee.first_name} ${employee.last_name}`.trim() : 'Unknown Employee');
          
          attendanceRecords.push({
            id: `leave-${userId}`,
            name: fullName,
            checkIn: '-',
            checkOut: '-',
            status: 'on-leave',
            hours: '0.0',
            employee_id: userId
          });
        }
      });

      setTodayAttendance(attendanceRecords);

      // Calculate stats
      const present = attendanceRecords.filter(r => r.status === 'present').length;
      const absent = attendanceRecords.filter(r => r.status === 'absent').length;
      const late = attendanceRecords.filter(r => r.status === 'late').length;
      const onLeave = attendanceRecords.filter(r => r.status === 'on-leave').length;

      setAttendanceStats({ present, absent, late, onLeave });

    } catch (error: any) {
      console.error('Error fetching attendance data:', error);
      toast({
        title: "Error",
        description: "Failed to load attendance data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'default';
      case 'late': return 'secondary';
      case 'absent': return 'destructive';
      case 'on-leave': return 'outline';
      default: return 'secondary';
    }
  };

  const fetchReportData = async (startDate: Date, endDate: Date) => {
    try {
      setReportLoading(true);
      
      // Note: Agency isolation is handled at the database connection level
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Fetch attendance records for the date range
      // Note: Agency isolation is handled at the database connection level
      let attendanceQuery = db
        .from('attendance')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr);
      
      const { data: attendanceData, error: attendanceError } = await attendanceQuery;

      if (attendanceError) throw attendanceError;

      // Fetch employees
      // Note: Agency isolation is handled at the database connection level
      const { data: employeesData, error: employeesError } = await db
        .from('employee_details')
        .select('user_id, first_name, last_name, is_active')
        .eq('is_active', true);

      if (employeesError) throw employeesError;

      // Fetch profiles
      // Note: Agency isolation is handled at the database connection level
      const employeeIds = employeesData?.map(e => e.user_id).filter(Boolean) || [];
      let profiles: any[] = [];
      
      if (employeeIds.length > 0) {
        const { data: profilesData, error: profilesError } = await db
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', employeeIds);

        if (profilesError) throw profilesError;
        profiles = profilesData || [];
      }

      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p.full_name]));

      // Calculate report statistics
      const totalRecords = attendanceData?.length || 0;
      const presentCount = attendanceData?.filter((r: any) => r.status === 'present' || r.check_in_time).length || 0;
      const lateCount = attendanceData?.filter((r: any) => {
        if (!r.check_in_time) return false;
        const checkInTime = new Date(r.check_in_time);
        const hours = checkInTime.getHours();
        const minutes = checkInTime.getMinutes();
        return hours > 9 || (hours === 9 && minutes > 15);
      }).length || 0;
      
      const totalHours = attendanceData?.reduce((sum: number, r: any) => {
        const hours = r.total_hours != null 
          ? (typeof r.total_hours === 'string' ? parseFloat(r.total_hours) : Number(r.total_hours))
          : 0;
        return sum + (isNaN(hours) ? 0 : hours);
      }, 0) || 0;

      const avgHours = totalRecords > 0 ? (totalHours / totalRecords) : 0;

      setReportData({
        startDate: startStr,
        endDate: endStr,
        totalRecords,
        presentCount,
        lateCount,
        totalHours: totalHours.toFixed(1),
        avgHours: avgHours.toFixed(1),
        attendanceData: attendanceData || []
      });
    } catch (error: any) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: "Failed to load report data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReportLoading(false);
    }
  };

  const handleViewReports = () => {
    if (!date) return;
    
    // Generate report for current month
    const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    setShowReportsDialog(true);
    fetchReportData(startDate, endDate);
  };

  const fetchWeeklyTrends = async () => {
    try {
      // Note: Agency isolation is handled at the database connection level
      const days = selectedPeriod === 'week' ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const trends: WeeklyTrend[] = [];
      
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Note: Agency isolation is handled at the database connection level
        const { data: attendanceData } = await db
          .from('attendance')
          .select('*')
          .eq('date', dateStr);
        
        // Note: Agency isolation is handled at the database connection level
        const { data: employeesData } = await db
          .from('employee_details')
          .select('user_id')
          .eq('is_active', true);
        
        const totalEmployees = employeesData?.length || 0;
        const present = attendanceData?.filter((r: any) => {
          if (!r.check_in_time) return false;
          const checkInTime = new Date(r.check_in_time);
          const hours = checkInTime.getHours();
          const minutes = checkInTime.getMinutes();
          return !(hours > 9 || (hours === 9 && minutes > 15));
        }).length || 0;
        
        const late = attendanceData?.filter((r: any) => {
          if (!r.check_in_time) return false;
          const checkInTime = new Date(r.check_in_time);
          const hours = checkInTime.getHours();
          const minutes = checkInTime.getMinutes();
          return hours > 9 || (hours === 9 && minutes > 15);
        }).length || 0;
        
        const absent = totalEmployees - (attendanceData?.length || 0);
        const attendanceRate = totalEmployees > 0 ? ((present + late) / totalEmployees) * 100 : 0;
        
        trends.push({
          date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          present,
          absent,
          late,
          attendanceRate: Math.round(attendanceRate)
        });
      }
      
      setWeeklyTrends(trends);
    } catch (error) {
      console.error('Error fetching weekly trends:', error);
    }
  };

  const fetchDepartmentStats = async () => {
    try {
      if (!date) return;
      
      // Note: Agency isolation is handled at the database connection level
      const dateStr = date.toISOString().split('T')[0];
      
      // Fetch all active employees with their user_ids
      // Note: Agency isolation is handled at the database connection level
      const { data: employeesData } = await db
        .from('employee_details')
        .select('user_id, is_active')
        .eq('is_active', true);
      
      if (!employeesData || employeesData.length === 0) {
        setDepartmentStats([]);
        return;
      }
      
      // Fetch profiles to get department information
      // Note: Agency isolation is handled at the database connection level
      const userIds = employeesData.map((emp: any) => emp.user_id);
      const { data: profilesData } = await db
        .from('profiles')
        .select('user_id, department')
        .in('user_id', userIds)
        .eq('is_active', true);
      
      // Create a map of user_id to department
      const userDeptMap = new Map<string, string>(
        profilesData?.map((p: any) => [p.user_id as string, (p.department as string) || 'Unassigned']) || []
      );
      
      // Fetch attendance for the date
      // Note: Agency isolation is handled at the database connection level
      const { data: attendanceData } = await db
        .from('attendance')
        .select('*')
        .eq('date', dateStr);
      
      const attendanceMap = new Map<string, any>(attendanceData?.map((a: any) => [a.employee_id as string, a]) || []);
      
      // Group by department
      const deptStatsMap = new Map<string, { present: number; absent: number; late: number; total: number }>();
      
      employeesData?.forEach((emp: any) => {
        const empId = emp.user_id as string;
        const deptName = userDeptMap.get(empId) || 'Unassigned';
        
        if (!deptStatsMap.has(deptName)) {
          deptStatsMap.set(deptName, { present: 0, absent: 0, late: 0, total: 0 });
        }
        
        const stats = deptStatsMap.get(deptName)!;
        stats.total++;
        
        const attendance = attendanceMap.get(empId) as any;
        if (attendance) {
          if (attendance.check_in_time) {
            const checkInTime = new Date(attendance.check_in_time);
            const hours = checkInTime.getHours();
            const minutes = checkInTime.getMinutes();
            if (hours > 9 || (hours === 9 && minutes > 15)) {
              stats.late++;
            } else {
              stats.present++;
            }
          }
        } else {
          stats.absent++;
        }
      });
      
      const stats: DepartmentStats[] = Array.from(deptStatsMap.entries()).map(([department, data]) => ({
        department,
        ...data,
        attendanceRate: data.total > 0 ? Math.round(((data.present + data.late) / data.total) * 100) : 0
      }));
      
      setDepartmentStats(stats.sort((a, b) => b.attendanceRate - a.attendanceRate));
    } catch (error) {
      console.error('Error fetching department stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch department statistics',
        variant: 'destructive',
      });
    }
  };

  const generateInsights = async () => {
    try {
      if (!date) return;
      
      const insightsList: AttendanceInsight[] = [];
      const dateStr = date.toISOString().split('T')[0];
      
      // Check for high absenteeism
      const totalEmployees = attendanceStats.present + attendanceStats.absent + attendanceStats.late + attendanceStats.onLeave;
      const absentRate = totalEmployees > 0 ? (attendanceStats.absent / totalEmployees) * 100 : 0;
      
      if (absentRate > 20) {
        insightsList.push({
          type: 'warning',
          title: 'High Absenteeism',
          message: `${absentRate.toFixed(1)}% of employees are absent today`,
          count: attendanceStats.absent
        });
      }
      
      // Check for frequent late arrivals
      const lateRate = totalEmployees > 0 ? (attendanceStats.late / totalEmployees) * 100 : 0;
      if (lateRate > 15) {
        insightsList.push({
          type: 'warning',
          title: 'High Late Arrivals',
          message: `${lateRate.toFixed(1)}% of employees arrived late today`,
          count: attendanceStats.late
        });
      }
      
      // Check for good attendance
      const attendanceRate = totalEmployees > 0 ? ((attendanceStats.present + attendanceStats.late) / totalEmployees) * 100 : 0;
      if (attendanceRate >= 90) {
        insightsList.push({
          type: 'success',
          title: 'Excellent Attendance',
          message: `${attendanceRate.toFixed(1)}% attendance rate today`,
        });
      }
      
      // Check for departments with issues
      const problematicDepts = departmentStats.filter(d => d.attendanceRate < 70);
      if (problematicDepts.length > 0) {
        insightsList.push({
          type: 'error',
          title: 'Department Alert',
          message: `${problematicDepts.length} department(s) have attendance below 70%`,
          count: problematicDepts.length
        });
      }
      
      setInsights(insightsList);
    } catch (error) {
      console.error('Error generating insights:', error);
    }
  };

  const handleExportReport = () => {
    if (!reportData) return;

    const csvContent = [
      ['Date', 'Employee', 'Check In', 'Check Out', 'Hours', 'Status'].join(','),
      ...reportData.attendanceData.map((record: any) => {
        const totalHours = record.total_hours != null 
          ? (typeof record.total_hours === 'string' ? parseFloat(record.total_hours) : Number(record.total_hours))
          : 0;
        const hours = !isNaN(totalHours) && totalHours > 0 ? totalHours.toFixed(1) : '0.0';
        const checkIn = record.check_in_time 
          ? new Date(record.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : '-';
        const checkOut = record.check_out_time 
          ? new Date(record.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : '-';
        return [record.date, 'Employee', checkIn, checkOut, hours, record.status || 'present'].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${reportData.startDate}-${reportData.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading attendance data...</span>
        </div>
      </div>
    );
  }

  // Admin Dashboard View
  if (isAdminView) {
    const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
    const totalEmployees = attendanceStats.present + attendanceStats.absent + attendanceStats.late + attendanceStats.onLeave;
    const attendanceRate = totalEmployees > 0 
      ? Math.round(((attendanceStats.present + attendanceStats.late) / totalEmployees) * 100) 
      : 0;

    return (
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold">Attendance Dashboard</h1>
              {urlDepartmentName && (
                <Badge variant="secondary" className="text-sm">
                  <Building2 className="h-3 w-3 mr-1" />
                  {decodeURIComponent(urlDepartmentName)}
                </Badge>
              )}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">
              {urlDepartmentName 
                ? `Attendance for ${decodeURIComponent(urlDepartmentName)} department - ${date ? date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'today'}`
                : `Overview and insights for ${date ? date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'today'}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedPeriod} onValueChange={(value: 'week' | 'month') => setSelectedPeriod(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleViewReports} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Quick Insights */}
        {insights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {insights.map((insight, idx) => (
              <Card key={idx} className={`border-l-4 ${
                insight.type === 'success' ? 'border-l-green-500' :
                insight.type === 'warning' ? 'border-l-yellow-500' :
                insight.type === 'error' ? 'border-l-red-500' :
                'border-l-blue-500'
              }`}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    {insight.type === 'success' && <Activity className="h-5 w-5 text-green-500 mt-0.5" />}
                    {insight.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />}
                    {insight.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />}
                    {insight.type === 'info' && <Activity className="h-5 w-5 text-blue-500 mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{insight.message}</p>
                      {insight.count !== undefined && (
                        <p className="text-lg font-bold mt-2">{insight.count}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                  <p className="text-3xl font-bold mt-2">{attendanceRate}%</p>
                  <div className="flex items-center gap-1 mt-2">
                    {attendanceRate >= 90 ? (
                      <ArrowUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-xs ${attendanceRate >= 90 ? 'text-green-500' : 'text-red-500'}`}>
                      {attendanceRate >= 90 ? 'Excellent' : 'Needs Attention'}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Present</p>
                  <p className="text-2xl font-bold">{attendanceStats.present}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Late</p>
                  <p className="text-2xl font-bold">{attendanceStats.late}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <TrendingDown className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Absent</p>
                  <p className="text-2xl font-bold">{attendanceStats.absent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Attendance Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Distribution</CardTitle>
                  <CardDescription>Today's attendance breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { name: 'Present', value: attendanceStats.present, color: COLORS[0] },
                          { name: 'Late', value: attendanceStats.late, color: COLORS[1] },
                          { name: 'Absent', value: attendanceStats.absent, color: COLORS[2] },
                          { name: 'On Leave', value: attendanceStats.onLeave, color: COLORS[3] }
                        ]}
                        cx="50%"
                        cy="45%"
                        labelLine={false}
                        label={false}
                        outerRadius={80}
                        innerRadius={25}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={3}
                      >
                        {[
                          { name: 'Present', value: attendanceStats.present },
                          { name: 'Late', value: attendanceStats.late },
                          { name: 'Absent', value: attendanceStats.absent },
                          { name: 'On Leave', value: attendanceStats.onLeave }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: string) => {
                          const total = attendanceStats.present + attendanceStats.late + attendanceStats.absent + attendanceStats.onLeave;
                          const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                          return [`${value} (${percent}%)`, name];
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={80}
                        iconType="circle"
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value, entry: any) => {
                          const total = attendanceStats.present + attendanceStats.late + attendanceStats.absent + attendanceStats.onLeave;
                          const itemValue = entry.payload?.value || 0;
                          const percent = total > 0 ? ((itemValue / total) * 100).toFixed(1) : 0;
                          return `${value}: ${itemValue} (${percent}%)`;
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Statistics</CardTitle>
                  <CardDescription>Key metrics at a glance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Employees</span>
                      <span className="font-semibold">{totalEmployees}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Present Employees</span>
                      <span className="font-semibold text-green-600">{attendanceStats.present}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Late Arrivals</span>
                      <span className="font-semibold text-yellow-600">{attendanceStats.late}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Absent Employees</span>
                      <span className="font-semibold text-red-600">{attendanceStats.absent}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">On Leave</span>
                      <span className="font-semibold text-blue-600">{attendanceStats.onLeave}</span>
                    </div>
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Overall Attendance Rate</span>
                        <span className={`text-lg font-bold ${attendanceRate >= 90 ? 'text-green-600' : attendanceRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {attendanceRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Trends</CardTitle>
                <CardDescription>{selectedPeriod === 'week' ? 'Last 7 days' : 'Last 30 days'} attendance pattern</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={weeklyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="present" stroke="#10b981" name="Present" strokeWidth={2} />
                    <Line type="monotone" dataKey="late" stroke="#f59e0b" name="Late" strokeWidth={2} />
                    <Line type="monotone" dataKey="absent" stroke="#ef4444" name="Absent" strokeWidth={2} />
                    <Line type="monotone" dataKey="attendanceRate" stroke="#3b82f6" name="Attendance Rate %" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Department Performance</CardTitle>
                <CardDescription>Attendance breakdown by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentStats.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={departmentStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="department" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="present" fill="#10b981" name="Present" />
                          <Bar dataKey="late" fill="#f59e0b" name="Late" />
                          <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {departmentStats.map((dept, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{dept.department}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-muted-foreground">
                                {dept.present + dept.late}/{dept.total}
                              </span>
                              <Badge variant={dept.attendanceRate >= 90 ? 'default' : dept.attendanceRate >= 70 ? 'secondary' : 'destructive'}>
                                {dept.attendanceRate}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No department data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Today's"} Attendance
                    </CardTitle>
                    <CardDescription>
                      Employee check-in and check-out records for selected date
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:space-y-4">
                      {todayAttendance.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-sm sm:text-base text-muted-foreground">No attendance records found for this date.</p>
                        </div>
                      ) : (
                        todayAttendance.map((record) => (
                          <div key={record.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                            <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs sm:text-sm font-semibold text-primary">
                                  {record.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-sm sm:text-base truncate">{record.name}</h4>
                                <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-1">
                                  <span className="whitespace-nowrap">In: {record.checkIn}</span>
                                  <span className="whitespace-nowrap">Out: {record.checkOut}</span>
                                  <span className="whitespace-nowrap">Hours: {record.hours}</span>
                                </div>
                              </div>
                            </div>
                            <Badge variant={getStatusColor(record.status)} className="flex-shrink-0">
                              {record.status.replace('-', ' ')}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="w-full">
                <Card className="h-fit">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">Calendar</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Select a date to view attendance</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-4 overflow-visible">
                    <div className="w-full flex justify-center">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border w-full max-w-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Reports Dialog */}
        <Dialog open={showReportsDialog} onOpenChange={setShowReportsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Attendance Report</DialogTitle>
              <DialogDescription>
                {reportData ? `Report for ${reportData.startDate} to ${reportData.endDate}` : 'Loading report data...'}
              </DialogDescription>
            </DialogHeader>
            
            {reportLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2 text-muted-foreground">Generating report...</span>
              </div>
            ) : reportData ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                        <p className="text-2xl font-bold mt-2">{reportData.totalRecords}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">Present</p>
                        <p className="text-2xl font-bold mt-2">{reportData.presentCount}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">Late</p>
                        <p className="text-2xl font-bold mt-2">{reportData.lateCount}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">Avg Hours</p>
                        <p className="text-2xl font-bold mt-2">{reportData.avgHours}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Export Button */}
                <div className="flex justify-end">
                  <Button onClick={handleExportReport} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>

                {/* Report Details */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Date</th>
                          <th className="px-4 py-2 text-left font-medium">Check In</th>
                          <th className="px-4 py-2 text-left font-medium">Check Out</th>
                          <th className="px-4 py-2 text-left font-medium">Hours</th>
                          <th className="px-4 py-2 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.attendanceData.slice(0, 50).map((record: any) => {
                          const totalHours = record.total_hours != null 
                            ? (typeof record.total_hours === 'string' ? parseFloat(record.total_hours) : Number(record.total_hours))
                            : 0;
                          const hours = !isNaN(totalHours) && totalHours > 0 ? totalHours.toFixed(1) : '0.0';
                          const checkIn = record.check_in_time 
                            ? new Date(record.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                            : '-';
                          const checkOut = record.check_out_time 
                            ? new Date(record.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                            : '-';
                          return (
                            <tr key={record.id} className="border-t">
                              <td className="px-4 py-2">{record.date}</td>
                              <td className="px-4 py-2">{checkIn}</td>
                              <td className="px-4 py-2">{checkOut}</td>
                              <td className="px-4 py-2">{hours}</td>
                              <td className="px-4 py-2">
                                <Badge variant={getStatusColor(record.status || 'present')}>
                                  {record.status || 'present'}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {reportData.attendanceData.length > 50 && (
                    <div className="px-4 py-2 text-sm text-muted-foreground text-center border-t">
                      Showing first 50 of {reportData.attendanceData.length} records. Export CSV for full report.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Regular Employee View (simplified)
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Attendance</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track and manage employee attendance</p>
        </div>
        <Button onClick={handleViewReports} className="w-full sm:w-auto">
          <CalendarIcon className="mr-2 h-4 w-4" />
          View Reports
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Present</p>
                <p className="text-2xl font-bold">{attendanceStats.present}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Late</p>
                <p className="text-2xl font-bold">{attendanceStats.late}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold">{attendanceStats.absent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">On Leave</p>
                <p className="text-2xl font-bold">{attendanceStats.onLeave}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">
                {date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Today's"} Attendance
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Employee check-in and check-out records for selected date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {todayAttendance.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm sm:text-base text-muted-foreground">No attendance records found for this date.</p>
                  </div>
                ) : (
                  todayAttendance.map((record) => (
                  <div key={record.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-semibold text-primary">
                          {record.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm sm:text-base truncate">{record.name}</h4>
                        <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-1">
                          <span className="whitespace-nowrap">In: {record.checkIn}</span>
                          <span className="whitespace-nowrap">Out: {record.checkOut}</span>
                          <span className="whitespace-nowrap">Hours: {record.hours}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(record.status)} className="flex-shrink-0">
                      {record.status.replace('-', ' ')}
                    </Badge>
                  </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="order-1 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Calendar</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Select a date to view attendance</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center sm:block overflow-hidden">
              <div className="w-full max-w-full overflow-x-auto">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border w-full min-w-[280px] mx-auto"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reports Dialog */}
      <Dialog open={showReportsDialog} onOpenChange={setShowReportsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attendance Report</DialogTitle>
            <DialogDescription>
              {reportData ? `Report for ${reportData.startDate} to ${reportData.endDate}` : 'Loading report data...'}
            </DialogDescription>
          </DialogHeader>
          
          {reportLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2 text-muted-foreground">Generating report...</span>
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                      <p className="text-2xl font-bold mt-2">{reportData.totalRecords}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Present</p>
                      <p className="text-2xl font-bold mt-2">{reportData.presentCount}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Late</p>
                      <p className="text-2xl font-bold mt-2">{reportData.lateCount}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Avg Hours</p>
                      <p className="text-2xl font-bold mt-2">{reportData.avgHours}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <Button onClick={handleExportReport} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              {/* Report Details */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Date</th>
                        <th className="px-4 py-2 text-left font-medium">Check In</th>
                        <th className="px-4 py-2 text-left font-medium">Check Out</th>
                        <th className="px-4 py-2 text-left font-medium">Hours</th>
                        <th className="px-4 py-2 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.attendanceData.slice(0, 50).map((record: any) => {
                        const totalHours = record.total_hours != null 
                          ? (typeof record.total_hours === 'string' ? parseFloat(record.total_hours) : Number(record.total_hours))
                          : 0;
                        const hours = !isNaN(totalHours) && totalHours > 0 ? totalHours.toFixed(1) : '0.0';
                        const checkIn = record.check_in_time 
                          ? new Date(record.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                          : '-';
                        const checkOut = record.check_out_time 
                          ? new Date(record.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                          : '-';
                        return (
                          <tr key={record.id} className="border-t">
                            <td className="px-4 py-2">{record.date}</td>
                            <td className="px-4 py-2">{checkIn}</td>
                            <td className="px-4 py-2">{checkOut}</td>
                            <td className="px-4 py-2">{hours}</td>
                            <td className="px-4 py-2">
                              <Badge variant={getStatusColor(record.status || 'present')}>
                                {record.status || 'present'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {reportData.attendanceData.length > 50 && (
                  <div className="px-4 py-2 text-sm text-muted-foreground text-center border-t">
                    Showing first 50 of {reportData.attendanceData.length} records. Export CSV for full report.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;