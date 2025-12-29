import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DailyActivity } from "@/services/api/performance-service";
import { format } from "date-fns";
import { Clock, CheckCircle2, FileText, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DailyActivityCalendarProps {
  activities: Record<string, DailyActivity>;
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
  loading?: boolean;
  selectedEmployeeId?: string | null;
  currentUserId?: string | null;
}

export function DailyActivityCalendar({ 
  activities, 
  onDateSelect, 
  selectedDate,
  loading,
  selectedEmployeeId,
  currentUserId
}: DailyActivityCalendarProps) {
  const navigate = useNavigate();
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(
    selectedDate ? new Date(selectedDate) : new Date()
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCalendarDate(date);
      onDateSelect(format(date, 'yyyy-MM-dd'));
    }
  };

  const selectedActivity = selectedDate ? activities[selectedDate] : null;

  // Mark dates with activity and calculate activity level
  const getActivityLevel = (date: Date): 'high' | 'medium' | 'low' | 'none' => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const activity = activities[dateStr];
    if (!activity) return 'none';
    
    const totalHours = activity.total_hours || 0;
    const taskCount = activity.tasks?.length || 0;
    
    if (totalHours >= 8 || taskCount >= 5) return 'high';
    if (totalHours >= 4 || taskCount >= 2) return 'medium';
    return 'low';
  };

  const dateModifiers = {
    hasActivity: (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return !!activities[dateStr];
    },
    highActivity: (date: Date) => getActivityLevel(date) === 'high',
    mediumActivity: (date: Date) => getActivityLevel(date) === 'medium',
    lowActivity: (date: Date) => getActivityLevel(date) === 'low',
  };

  const dateModifierClassNames = {
    hasActivity: 'bg-blue-100 text-blue-900 hover:bg-blue-200',
    highActivity: 'bg-green-200 text-green-900 hover:bg-green-300 font-semibold',
    mediumActivity: 'bg-blue-100 text-blue-900 hover:bg-blue-200',
    lowActivity: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity</CardTitle>
          <CardDescription>Loading calendar...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Calendar */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>Select a date to view activity</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={calendarDate}
            onSelect={handleDateSelect}
            modifiers={dateModifiers}
            modifierClassNames={dateModifierClassNames}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {/* Activity Details */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>
            {selectedDate
              ? `Activity for ${format(new Date(selectedDate), 'MMMM dd, yyyy')}`
              : 'Select a date to view activity'}
          </CardTitle>
          <CardDescription>
            {selectedActivity
              ? `${selectedActivity.tasks.length} task${selectedActivity.tasks.length !== 1 ? 's' : ''} worked on`
              : 'No date selected'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedActivity ? (
            <div className="space-y-4">
              {/* Attendance Info */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Attendance
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const isOwnData = selectedEmployeeId === currentUserId;
                      if (isOwnData) {
                        navigate(`/my-attendance?date=${selectedActivity.date}`);
                      } else {
                        navigate(`/attendance?date=${selectedActivity.date}${selectedEmployeeId ? `&employeeId=${selectedEmployeeId}` : ''}`);
                      }
                    }}
                  >
                    View Full Record
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Check In</p>
                    <p className="font-medium">
                      {selectedActivity.check_in_time
                        ? format(new Date(selectedActivity.check_in_time), 'hh:mm a')
                        : 'Not recorded'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Check Out</p>
                    <p className="font-medium">
                      {selectedActivity.check_out_time
                        ? format(new Date(selectedActivity.check_out_time), 'hh:mm a')
                        : 'Not recorded'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Hours</p>
                    <p className="font-medium">{selectedActivity.total_hours.toFixed(1)}h</p>
                  </div>
                  {selectedActivity.notes && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Notes</p>
                      <p className="font-medium">{selectedActivity.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tasks Worked On */}
              {selectedActivity.tasks.length > 0 ? (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Tasks Worked On
                  </h4>
                  <div className="space-y-2">
                    {selectedActivity.tasks.map((task) => (
                      <div
                        key={task.task_id}
                        className="border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                        onClick={() => navigate(`/tasks?taskId=${task.task_id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{task.task_title}</p>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </div>
                            {task.project_name && (
                              <p className="text-sm text-muted-foreground">
                                {task.project_name}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            {task.hours_logged.toFixed(1)}h
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No tasks logged for this day</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Select a date from the calendar to view activity details</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
