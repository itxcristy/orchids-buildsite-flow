import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { Clock, Calendar as CalendarIcon, Play, Square, TrendingUp, Award, Loader2 } from "lucide-react";
import ClockInOut from '@/components/ClockInOut';
import { useAuth } from '@/hooks/useAuth';
import { useAgencySettings } from '@/hooks/useAgencySettings';
import { db } from '@/lib/database';
import { useToast } from "@/hooks/use-toast";
import { formatTime, isWorkingDay } from "@/utils/dateFormat";

interface AttendanceRecord {
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  status: string;
}

interface AttendanceStats {
  totalHours: number;
  averageDaily: number;
  onTimePercentage: number;
  currentStreak: number;
}

interface TodayStatus {
  isCheckedIn: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  totalHours: string;
  status: string;
}

const MyAttendance = () => {
  const { user } = useAuth();
  const { settings: agencySettings } = useAgencySettings();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    totalHours: 0,
    averageDaily: 0,
    onTimePercentage: 0,
    currentStreak: 0
  });
  const [todayStatus, setTodayStatus] = useState<TodayStatus>({
    isCheckedIn: false,
    checkInTime: null,
    checkOutTime: null,
    totalHours: "0h 0m",
    status: "not_checked_in"
  });
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchMyAttendance();
    }
  }, [user?.id]);

  const fetchMyAttendance = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's attendance
      const { data: todayData, error: todayError } = await db
        .from('attendance')
        .select('*')
        .eq('employee_id', user.id)
        .eq('date', today)
        .single();

      if (todayError && todayError.code !== 'PGRST116') throw todayError; // PGRST116 = not found

      const todayRecord = todayData || null;
      const isCheckedIn = !!todayRecord?.check_in_time;
      const checkInTime = todayRecord?.check_in_time 
        ? new Date(todayRecord.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : null;
      const checkOutTime = todayRecord?.check_out_time 
        ? new Date(todayRecord.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : null;
      
      let totalHoursToday = "0h 0m";
      if (todayRecord?.total_hours) {
        const hours = Math.floor(todayRecord.total_hours);
        const minutes = Math.round((todayRecord.total_hours - hours) * 60);
        totalHoursToday = `${hours}h ${minutes}m`;
      } else if (todayRecord?.check_in_time && !todayRecord?.check_out_time) {
        // Calculate hours from check-in to now
        const checkIn = new Date(todayRecord.check_in_time);
        const now = new Date();
        const diffMs = now.getTime() - checkIn.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const hours = Math.floor(diffHours);
        const minutes = Math.round((diffHours - hours) * 60);
        totalHoursToday = `${hours}h ${minutes}m`;
      }

      setTodayStatus({
        isCheckedIn,
        checkInTime,
        checkOutTime,
        totalHours: totalHoursToday,
        status: todayRecord?.status || 'not_checked_in'
      });

      // Fetch recent attendance (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: attendanceData, error: attendanceError } = await db
        .from('attendance')
        .select('*')
        .eq('employee_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: false })
        .limit(30);

      if (attendanceError) throw attendanceError;

      // Transform attendance records
      const transformedRecords: AttendanceRecord[] = (attendanceData || []).map((record: any) => {
        const checkIn = record.check_in_time 
          ? formatTime(record.check_in_time, agencySettings?.timezone)
          : '-';
        const checkOut = record.check_out_time 
          ? formatTime(record.check_out_time, agencySettings?.timezone)
          : '-';
        const hours = record.total_hours ? record.total_hours.toFixed(1) : '0.0';
        
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
          }
        } else {
          status = 'absent';
        }

        // Check if working day using agency settings
        const recordDate = new Date(record.date);
        let workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        if (agencySettings?.working_days) {
          if (typeof agencySettings.working_days === 'string') {
            try {
              workingDays = JSON.parse(agencySettings.working_days);
            } catch {
              // Use default if parsing fails
            }
          } else {
            workingDays = agencySettings.working_days as string[];
          }
        }
        if (!isWorkingDay(recordDate, workingDays)) {
          status = 'weekend';
        }

        return {
          date: record.date,
          checkIn,
          checkOut,
          hours,
          status
        };
      });

      setRecentAttendance(transformedRecords);

      // Calculate stats for current month
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const monthlyRecords = transformedRecords.filter(r => {
        const recordDate = new Date(r.date);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      });

      const totalHours = monthlyRecords.reduce((sum, r) => sum + parseFloat(r.hours), 0);
      const workingDays = monthlyRecords.filter(r => r.status !== 'weekend' && r.status !== 'absent').length;
      const averageDaily = workingDays > 0 ? totalHours / workingDays : 0;
      
      const onTimeCount = monthlyRecords.filter(r => r.status === 'present').length;
      const onTimePercentage = monthlyRecords.length > 0 
        ? Math.round((onTimeCount / monthlyRecords.length) * 100) 
        : 0;

      // Calculate current streak (consecutive days with attendance)
      let streak = 0;
      const sortedByDate = [...transformedRecords].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      for (const record of sortedByDate) {
        if (record.status === 'present' || record.status === 'late') {
          streak++;
        } else if (record.status !== 'weekend') {
          break;
        }
      }

      setAttendanceStats({
        totalHours: Math.round(totalHours * 10) / 10,
        averageDaily: Math.round(averageDaily * 10) / 10,
        onTimePercentage,
        currentStreak: streak
      });

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
      case 'weekend': return 'outline';
      default: return 'secondary';
    }
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Attendance</h1>
          <p className="text-muted-foreground">View your attendance history and records</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{attendanceStats.totalHours}h</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Daily Average</p>
                <p className="text-2xl font-bold">{attendanceStats.averageDaily}h</p>
                <p className="text-xs text-muted-foreground">Per day</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">On Time</p>
                <p className="text-2xl font-bold">{attendanceStats.onTimePercentage}%</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold">{attendanceStats.currentStreak}</p>
                <p className="text-xs text-muted-foreground">Days on time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Today's Status</CardTitle>
              <CardDescription>Your current work session</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${todayStatus.isCheckedIn ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <div>
                    <h3 className="font-semibold">
                      {todayStatus.isCheckedIn ? 'Currently Working' : 'Not Checked In'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {todayStatus.isCheckedIn 
                        ? `Checked in at ${todayStatus.checkInTime}` 
                        : 'Start your work session'
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{todayStatus.totalHours}</p>
                  <p className="text-sm text-muted-foreground">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance</CardTitle>
              <CardDescription>Your attendance history for the past few days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAttendance.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No attendance records found.</p>
                  </div>
                ) : (
                  recentAttendance.map((record, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-medium">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}</p>
                        <p className="text-sm text-muted-foreground">{record.date}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">In: {record.checkIn}</p>
                      <p className="text-sm text-muted-foreground">Out: {record.checkOut}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{record.hours}h</p>
                      <Badge variant={getStatusColor(record.status)} className="text-xs">
                        {record.status}
                      </Badge>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
              <CardDescription>View attendance for specific dates</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MyAttendance;