import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { RoleGuard } from "@/components/RoleGuard";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmployeeSelector } from "@/components/performance/EmployeeSelector";
import { PerformanceSummaryCards } from "@/components/performance/PerformanceSummaryCards";
import { TaskPerformanceList } from "@/components/performance/TaskPerformanceList";
import { WorkHoursChart } from "@/components/performance/WorkHoursChart";
import { DailyActivityCalendar } from "@/components/performance/DailyActivityCalendar";
import { PerformanceTrendsChart } from "@/components/performance/PerformanceTrendsChart";
import {
  getEmployeePerformance,
  getTaskPerformance,
  getWorkHours,
  getWorkHoursByProject,
  getDailyActivity,
  getDailyActivitiesBatch,
  getPerformanceTrends,
  getEmployeeInfo,
  type DateRange,
  type PerformanceSummary,
  type TaskPerformance,
  type WorkHoursData,
  type DailyActivity,
  type PerformanceTrend,
} from "@/services/api/performance-service";
import { getAgencyId } from "@/utils/agencyUtils";

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export default function EmployeePerformance() {
  const { toast } = useToast();
  const { user, userRole, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get employee ID from URL or default to current user
  const urlEmployeeId = searchParams.get('employeeId');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    urlEmployeeId || null
  );

  // Update selectedEmployeeId when user becomes available
  useEffect(() => {
    if (!authLoading && user && !selectedEmployeeId && !urlEmployeeId) {
      setSelectedEmployeeId(user.id);
    } else if (urlEmployeeId && urlEmployeeId !== selectedEmployeeId) {
      setSelectedEmployeeId(urlEmployeeId);
    }
  }, [authLoading, user, selectedEmployeeId, urlEmployeeId]);
  
  // Period selection
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  // Calculate date range based on period
  const getDateRange = (): DateRange => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day
    let startDate: Date;
    let endDate: Date = new Date(today);

    switch (period) {
      case 'daily':
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case 'weekly':
        // Last 7 days including today
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 6); // 7 days total (including today)
        endDate = new Date(today);
        break;
      case 'monthly':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yearly':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          startDate = new Date(customDateRange.from);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(customDateRange.to);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // Default to monthly if custom range not set
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
    }

    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    };
  };

  const dateRange = getDateRange();

  // Fetch employee info for header
  const { data: employeeInfo, isLoading: employeeInfoLoading } = useQuery({
    queryKey: ['employee-info', selectedEmployeeId],
    queryFn: async () => {
      if (!selectedEmployeeId) return null;
      const agencyId = await getAgencyId(profile, user?.id || null);
      return getEmployeeInfo(selectedEmployeeId, agencyId || undefined);
    },
    enabled: !!selectedEmployeeId,
  });

  // Fetch performance data
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery<PerformanceSummary>({
    queryKey: ['employee-performance-summary', selectedEmployeeId, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      if (!selectedEmployeeId) throw new Error('No employee selected');
      const agencyId = await getAgencyId(profile, user?.id || null);
      return getEmployeePerformance(selectedEmployeeId, dateRange, agencyId || undefined);
    },
    enabled: !!selectedEmployeeId,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<TaskPerformance[]>({
    queryKey: ['employee-performance-tasks', selectedEmployeeId, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      if (!selectedEmployeeId) throw new Error('No employee selected');
      const agencyId = await getAgencyId(profile, user?.id || null);
      return getTaskPerformance(selectedEmployeeId, dateRange, agencyId || undefined);
    },
    enabled: !!selectedEmployeeId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const { data: workHours, isLoading: workHoursLoading } = useQuery<WorkHoursData[]>({
    queryKey: ['employee-performance-workhours', selectedEmployeeId, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      if (!selectedEmployeeId) throw new Error('No employee selected');
      const agencyId = await getAgencyId(profile, user?.id || null);
      return getWorkHours(selectedEmployeeId, dateRange, agencyId || undefined);
    },
    enabled: !!selectedEmployeeId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const { data: hoursByProject, isLoading: hoursByProjectLoading } = useQuery({
    queryKey: ['employee-performance-hours-by-project', selectedEmployeeId, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      if (!selectedEmployeeId) throw new Error('No employee selected');
      const agencyId = await getAgencyId(profile, user?.id || null);
      return getWorkHoursByProject(selectedEmployeeId, dateRange, agencyId || undefined);
    },
    enabled: !!selectedEmployeeId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<PerformanceTrend[]>({
    queryKey: ['employee-performance-trends', selectedEmployeeId, dateRange.startDate, dateRange.endDate, period],
    queryFn: async () => {
      if (!selectedEmployeeId) throw new Error('No employee selected');
      const agencyId = await getAgencyId(profile, user?.id || null);
      const trendPeriod = period === 'custom' ? 'monthly' : period;
      return getPerformanceTrends(selectedEmployeeId, trendPeriod, dateRange, agencyId || undefined);
    },
    enabled: !!selectedEmployeeId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  // Daily activity state
  const [selectedActivityDate, setSelectedActivityDate] = useState<string | null>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [activities, setActivities] = useState<Record<string, DailyActivity>>({});

  // Fetch daily activity for the selected date
  const { data: dailyActivity, isLoading: dailyActivityLoading } = useQuery<DailyActivity | null>({
    queryKey: ['employee-performance-daily-activity', selectedEmployeeId, selectedActivityDate],
    queryFn: async () => {
      if (!selectedEmployeeId || !selectedActivityDate) return null;
      const agencyId = await getAgencyId(profile, user?.id || null);
      return getDailyActivity(selectedEmployeeId, selectedActivityDate, agencyId || undefined);
    },
    enabled: !!selectedEmployeeId && !!selectedActivityDate,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Fetch activities for the current month for calendar indicators
  // Use batch endpoint for efficiency
  const { data: monthlyActivities } = useQuery<DailyActivity[]>({
    queryKey: ['employee-performance-monthly-activities', selectedEmployeeId],
    queryFn: async () => {
      if (!selectedEmployeeId) return [];
      const agencyId = await getAgencyId(profile, user?.id || null);
      
      // Only fetch last 30 days for calendar indicators to reduce load
      const today = new Date();
      const datesToFetch: string[] = [];
      
      // Generate dates for last 30 days only
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        datesToFetch.push(format(date, 'yyyy-MM-dd'));
      }

      // Use batch endpoint for efficient fetching
      const activities = await getDailyActivitiesBatch(selectedEmployeeId, datesToFetch, agencyId || undefined);
      
      return activities;
    },
    enabled: !!selectedEmployeeId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if data exists
  });

  // Update activities when daily activity is fetched
  useEffect(() => {
    if (dailyActivity) {
      setActivities((prev) => ({
        ...prev,
        [dailyActivity.date]: dailyActivity,
      }));
    }
  }, [dailyActivity]);

  // Update activities when monthly activities are fetched
  useEffect(() => {
    if (monthlyActivities) {
      const newActivities: Record<string, DailyActivity> = {};
      monthlyActivities.forEach(activity => {
        newActivities[activity.date] = activity;
      });
      setActivities((prev) => ({
        ...prev,
        ...newActivities,
      }));
    }
  }, [monthlyActivities]);

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setSearchParams({ employeeId });
  };

  const handleDateSelect = (date: string) => {
    setSelectedActivityDate(date);
  };

  const handleExport = async () => {
    try {
      if (!selectedEmployeeId || !employeeInfo) {
        toast({
          title: "Error",
          description: "Please select an employee first",
          variant: "destructive",
        });
        return;
      }

      // Prepare data for export
      const exportData = {
        employee: employeeInfo,
        period: period,
        dateRange: dateRange,
        summary: summary,
        tasks: tasks || [],
        workHours: workHours || [],
        hoursByProject: hoursByProject || [],
        trends: trends || [],
        generatedAt: new Date().toISOString(),
      };

      // Create CSV content
      const csvRows: string[] = [];
      
      // Header
      csvRows.push(`Employee Performance Report`);
      csvRows.push(`Employee: ${employeeInfo.full_name}`);
      csvRows.push(`Period: ${period} (${dateRange.startDate} to ${dateRange.endDate})`);
      csvRows.push(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
      csvRows.push(``);

      // Summary
      csvRows.push(`Summary`);
      csvRows.push(`Total Work Hours,${summary?.totalWorkHours.toFixed(2) || 0}`);
      csvRows.push(`Tasks Completed,${summary?.tasksCompleted || 0}`);
      csvRows.push(`Tasks Assigned,${summary?.tasksAssigned || 0}`);
      csvRows.push(`Completion Rate,${summary?.completionRate.toFixed(2) || 0}%`);
      csvRows.push(`On-Time Completion Rate,${summary?.onTimeCompletionRate.toFixed(2) || 0}%`);
      csvRows.push(`Attendance Rate,${summary?.attendanceRate.toFixed(2) || 0}%`);
      csvRows.push(`Overtime Hours,${summary?.overtimeHours.toFixed(2) || 0}`);
      csvRows.push(`Average Completion Time,${summary?.averageCompletionTime.toFixed(2) || 0} hours`);
      csvRows.push(``);

      // Tasks
      csvRows.push(`Tasks`);
      csvRows.push(`Title,Project,Status,Priority,Assigned Date,Due Date,Completed Date,Estimated Hours,Actual Hours,Time Taken,Completion Status`);
      (tasks || []).forEach(task => {
        csvRows.push([
          `"${task.title}"`,
          task.project_name || 'No Project',
          task.status,
          task.priority,
          task.assigned_date ? format(new Date(task.assigned_date), 'yyyy-MM-dd') : '',
          task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '',
          task.completed_date ? format(new Date(task.completed_date), 'yyyy-MM-dd') : '',
          task.estimated_hours || '',
          task.actual_hours || '',
          task.time_taken_hours ? task.time_taken_hours.toFixed(2) : '',
          task.completion_status,
        ].join(','));
      });
      csvRows.push(``);

      // Work Hours
      csvRows.push(`Work Hours`);
      csvRows.push(`Date,Total Hours,Overtime Hours,Status`);
      (workHours || []).forEach(wh => {
        csvRows.push([
          wh.date,
          wh.total_hours.toFixed(2),
          wh.overtime_hours.toFixed(2),
          wh.status,
        ].join(','));
      });
      csvRows.push(``);

      // Hours by Project
      if (hoursByProject && hoursByProject.length > 0) {
        csvRows.push(`Hours by Project`);
        csvRows.push(`Project,Total Hours`);
        hoursByProject.forEach((hp: any) => {
          csvRows.push([
            hp.project_name || 'No Project',
            hp.total_hours.toFixed(2),
          ].join(','));
        });
        csvRows.push(``);
      }

      // Export CSV
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `performance_report_${employeeInfo.full_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Performance report exported successfully",
      });
    } catch (error: any) {
      console.error('Error exporting report:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to export report",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2 text-muted-foreground">Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Please log in to view performance data</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedEmployeeId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Please select an employee to view performance data</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Employee Performance</h1>
          <p className="text-sm lg:text-base text-muted-foreground">
            Track and analyze employee performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Employee Info Header */}
      {employeeInfo && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
              <div>
                <h2 className="text-xl font-semibold">{employeeInfo.full_name}</h2>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  {employeeInfo.email && (
                    <span>{employeeInfo.email}</span>
                  )}
                  {employeeInfo.department && (
                    <span>• {employeeInfo.department}</span>
                  )}
                  {employeeInfo.position && (
                    <span>• {employeeInfo.position}</span>
                  )}
                  {employeeInfo.manager_name && (
                    <span>• Manager: {employeeInfo.manager_name}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/employee-management?employeeId=${selectedEmployeeId}`)}
                >
                  View Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Navigate to attendance page - use my-attendance for self, attendance for others
                    if (selectedEmployeeId === user?.id) {
                      navigate(`/my-attendance`);
                    } else {
                      navigate(`/attendance?employeeId=${selectedEmployeeId}`);
                    }
                  }}
                >
                  View Attendance
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate(`/project-management`);
                    toast({
                      title: "Navigate to Tasks Tab",
                      description: "Please switch to the 'Tasks' tab to view tasks assigned to this employee.",
                    });
                  }}
                >
                  View Tasks
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Selector and Period Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4 lg:items-center">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Employee</label>
              <RoleGuard
                requiredRole="employee"
                fallback={
                  <EmployeeSelector
                    selectedEmployeeId={selectedEmployeeId}
                    onEmployeeChange={handleEmployeeChange}
                  />
                }
              >
                <div className="text-sm font-medium">
                  {employeeInfo?.full_name || 'Loading...'}
                </div>
              </RoleGuard>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Period</label>
              <Select value={period} onValueChange={(value: PeriodType) => setPeriod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (Today)</SelectItem>
                  <SelectItem value="weekly">Weekly (Last 7 Days)</SelectItem>
                  <SelectItem value="monthly">Monthly (Current Month)</SelectItem>
                  <SelectItem value="yearly">Yearly (Current Year)</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {period === 'custom' && (
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customDateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange.from ? (
                          format(customDateRange.from, "MMM dd, yyyy")
                        ) : (
                          <span>From</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateRange.from}
                        onSelect={(date) => setCustomDateRange({ ...customDateRange, from: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customDateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange.to ? (
                          format(customDateRange.to, "MMM dd, yyyy")
                        ) : (
                          <span>To</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateRange.to}
                        onSelect={(date) => setCustomDateRange({ ...customDateRange, to: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {summaryError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center py-4">
              <p className="text-destructive font-medium">Error loading performance data</p>
              <p className="text-sm text-muted-foreground mt-2">
                {summaryError instanceof Error ? summaryError.message : 'An unexpected error occurred'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <PerformanceSummaryCards summary={summary || {
        totalWorkHours: 0,
        tasksCompleted: 0,
        tasksAssigned: 0,
        completionRate: 0,
        averageCompletionTime: 0,
        attendanceRate: 0,
        overtimeHours: 0,
        onTimeCompletionRate: 0,
      }} loading={summaryLoading} />

      {/* Tabs */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Task Performance</TabsTrigger>
          <TabsTrigger value="hours">Work Hours</TabsTrigger>
          <TabsTrigger value="activity">Daily Activity</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <TaskPerformanceList tasks={tasks || []} loading={tasksLoading} />
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <WorkHoursChart
            workHours={workHours || []}
            hoursByProject={hoursByProject}
            loading={workHoursLoading || hoursByProjectLoading}
            selectedEmployeeId={selectedEmployeeId}
            currentUserId={user?.id || null}
          />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <DailyActivityCalendar
            activities={activities}
            onDateSelect={handleDateSelect}
            selectedDate={selectedActivityDate}
            loading={dailyActivityLoading}
            selectedEmployeeId={selectedEmployeeId}
            currentUserId={user?.id || null}
          />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <PerformanceTrendsChart trends={trends || []} loading={trendsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
