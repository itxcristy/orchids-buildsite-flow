import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { PerformanceTrend } from "@/services/api/performance-service";
import { format } from "date-fns";

interface PerformanceTrendsChartProps {
  trends: PerformanceTrend[];
  loading?: boolean;
}

export function PerformanceTrendsChart({ trends, loading }: PerformanceTrendsChartProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-muted rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completion & Attendance</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>No trend data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for better display
  const formattedTrends = trends.map(trend => {
    let dateToFormat: Date;
    try {
      // Handle different date formats (YYYY-MM-DD, YYYY-MM, YYYY-WW)
      if (trend.date.includes('-W')) {
        // Weekly format (YYYY-WW)
        const [year, week] = trend.date.split('-W');
        dateToFormat = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
      } else if (trend.date.length === 7 && trend.date.includes('-')) {
        // Monthly format (YYYY-MM)
        dateToFormat = new Date(trend.date + '-01');
      } else {
        // Daily format (YYYY-MM-DD)
        dateToFormat = new Date(trend.date);
      }
    } catch {
      dateToFormat = new Date();
    }
    
    return {
      ...trend,
      dateFormatted: format(dateToFormat, 'MMM dd'),
    };
  });

  // Calculate averages
  const avgTasksCompleted = trends.length > 0 
    ? trends.reduce((sum, t) => sum + t.tasks_completed, 0) / trends.length 
    : 0;
  const avgHoursWorked = trends.length > 0 
    ? trends.reduce((sum, t) => sum + t.hours_worked, 0) / trends.length 
    : 0;
  const avgCompletionRate = trends.length > 0 
    ? trends.reduce((sum, t) => sum + t.completion_rate, 0) / trends.length 
    : 0;
  const avgAttendanceRate = trends.length > 0 
    ? trends.reduce((sum, t) => sum + t.attendance_rate, 0) / trends.length 
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Avg Tasks/Period</p>
              <p className="text-2xl font-bold mt-2">{avgTasksCompleted.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Avg Hours/Period</p>
              <p className="text-2xl font-bold mt-2">{avgHoursWorked.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Avg Completion Rate</p>
              <p className="text-2xl font-bold mt-2">{avgCompletionRate.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Avg Attendance Rate</p>
              <p className="text-2xl font-bold mt-2">{avgAttendanceRate.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tasks Completed & Hours Worked */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks & Hours Trend</CardTitle>
            <CardDescription>Tasks completed and hours worked over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={formattedTrends}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateFormatted" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'hours_worked') return `${value.toFixed(1)}h`;
                    return value;
                  }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="tasks_completed"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorTasks)"
                  name="Tasks Completed"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="hours_worked"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorHours)"
                  name="Hours Worked"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Completion Rate & Attendance Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Completion & Attendance Rates</CardTitle>
            <CardDescription>Performance metrics over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={formattedTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateFormatted" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completion_rate"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Completion Rate %"
                />
                <Line
                  type="monotone"
                  dataKey="attendance_rate"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Attendance Rate %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
