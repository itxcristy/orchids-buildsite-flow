import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { WorkHoursData } from "@/services/api/performance-service";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface WorkHoursChartProps {
  workHours: WorkHoursData[];
  hoursByProject?: Array<{ project_name: string; total_hours: number }>;
  loading?: boolean;
  selectedEmployeeId?: string | null;
  currentUserId?: string | null;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function WorkHoursChart({ workHours, hoursByProject, loading, selectedEmployeeId, currentUserId }: WorkHoursChartProps) {
  const navigate = useNavigate();
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Daily Work Hours</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-muted rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hours by Project</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare data for daily hours chart
  const dailyHoursData = workHours
    .slice(0, 30) // Last 30 days
    .reverse()
    .map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      hours: Number(item.total_hours.toFixed(1)),
      overtime: Number(item.overtime_hours.toFixed(1)),
    }));

  // Calculate totals
  const totalHours = workHours.reduce((sum, item) => sum + item.total_hours, 0);
  const totalOvertime = workHours.reduce((sum, item) => sum + item.overtime_hours, 0);
  const avgHours = workHours.length > 0 ? totalHours / workHours.length : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
              <p className="text-2xl font-bold mt-2">{totalHours.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Overtime Hours</p>
              <p className="text-2xl font-bold mt-2">{totalOvertime.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Average Daily Hours</p>
              <p className="text-2xl font-bold mt-2">{avgHours.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Hours Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Work Hours</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyHoursData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyHoursData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hours" fill="#3b82f6" name="Regular Hours" />
                  <Bar dataKey="overtime" fill="#ef4444" name="Overtime" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No work hours data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hours by Project Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Hours by Project</CardTitle>
            <CardDescription>Time allocation across projects</CardDescription>
          </CardHeader>
          <CardContent>
            {hoursByProject && hoursByProject.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={hoursByProject}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ project_name, total_hours, percent }) => 
                      `${project_name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total_hours"
                  >
                    {hoursByProject.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}h`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No project hours data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hours Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Hours Breakdown</CardTitle>
          <CardDescription>Daily work hours and attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          {workHours.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Overtime Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workHours.slice(0, 30).map((wh) => (
                    <TableRow key={wh.date}>
                      <TableCell className="font-medium">
                        {format(new Date(wh.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{wh.total_hours.toFixed(2)}h</TableCell>
                      <TableCell>
                        {wh.overtime_hours > 0 ? (
                          <span className="text-red-600">{wh.overtime_hours.toFixed(2)}h</span>
                        ) : (
                          <span className="text-muted-foreground">0h</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`capitalize ${
                          wh.status === 'present' ? 'text-green-600' :
                          wh.status === 'late' ? 'text-yellow-600' :
                          wh.status === 'absent' ? 'text-red-600' :
                          'text-muted-foreground'
                        }`}>
                          {wh.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => {
                            // Navigate to appropriate attendance page
                            const isOwnData = selectedEmployeeId === currentUserId;
                            if (isOwnData) {
                              navigate(`/my-attendance?date=${wh.date}`);
                            } else {
                              navigate(`/attendance?date=${wh.date}${selectedEmployeeId ? `&employeeId=${selectedEmployeeId}` : ''}`);
                            }
                          }}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View Details
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No work hours data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Hours Breakdown Table */}
      {hoursByProject && hoursByProject.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Hours Breakdown</CardTitle>
            <CardDescription>Time spent on each project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hoursByProject.map((hp: any, index) => {
                    const totalProjectHours = hoursByProject.reduce((sum: number, p: any) => sum + p.total_hours, 0);
                    const percentage = totalProjectHours > 0 ? (hp.total_hours / totalProjectHours) * 100 : 0;
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{hp.project_name || 'No Project'}</TableCell>
                        <TableCell>{hp.total_hours.toFixed(2)}h</TableCell>
                        <TableCell>{percentage.toFixed(1)}%</TableCell>
                        <TableCell>
                          {hp.project_name && hp.project_name !== 'No Project' && (
                            <button
                              onClick={() => navigate(`/projects?projectName=${encodeURIComponent(hp.project_name)}`)}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              View Project
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
