import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Gift, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/database';
import { format, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarEventDialog } from './CalendarEventDialog';
import { EventDetailsDialog } from './EventDetailsDialog';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'event' | 'holiday' | 'leave' | 'birthday';
  description?: string;
  color?: string;
  employee_name?: string;
  // Additional fields for company events
  location?: string;
  event_type?: string;
  all_day?: boolean;
  start_date?: Date;
  end_date?: Date;
  is_company_event?: boolean; // Flag to identify if this is a company event that can be edited
}

interface AgencyCalendarProps {
  compact?: boolean;
}

export function AgencyCalendar({ compact = false }: AgencyCalendarProps) {
  const { userRole, profile, user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);

  const canManageEvents = userRole === 'admin' || userRole === 'hr' || userRole === 'super_admin';

  useEffect(() => {
    fetchCalendarData();
  }, [selectedDate, profile, user?.id]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const startDate = startOfMonth(selectedDate);
      const endDate = endOfMonth(selectedDate);

      const allEvents: CalendarEvent[] = [];

      // Get agency_id for filtering
      const { getAgencyId } = await import('@/utils/agencyUtils');
      const agencyId = await getAgencyId(profile, user?.id);
      
      if (!agencyId) {
        console.warn('No agency_id available, cannot fetch calendar data');
        setLoading(false);
        return;
      }

      // Fetch company events for this agency
      const { data: companyEvents } = await db
        .from('company_events')
        .select('*')
        .eq('agency_id', agencyId)
        .gte('start_date', startDate.toISOString())
        .lte('start_date', endDate.toISOString())
        .order('start_date');

      if (companyEvents) {
        allEvents.push(...companyEvents.map(event => ({
          id: event.id,
          title: event.title,
          date: new Date(event.start_date),
          type: 'event' as const,
          description: event.description,
          color: event.color,
          location: event.location,
          event_type: event.event_type,
          all_day: event.is_all_day || event.all_day || false,
          start_date: new Date(event.start_date),
          end_date: event.end_date ? new Date(event.end_date) : undefined,
          is_company_event: true
        })));
      }

      // Fetch holidays for this agency
      const { data: holidays } = await db
        .from('holidays')
        .select('*')
        .eq('agency_id', agencyId)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date');

      if (holidays) {
        allEvents.push(...holidays.map(holiday => {
          // Map database fields to expected format
          const holidayType = holiday.is_national_holiday ? 'public' : holiday.is_company_holiday ? 'company' : 'optional';
          return {
            id: holiday.id,
            title: holiday.name,
            date: new Date(holiday.date),
            type: 'holiday' as const,
            description: holiday.description,
            color: holidayType === 'public' ? '#ef4444' : holidayType === 'company' ? '#3b82f6' : '#22c55e'
          };
        }));
      }

      // Fetch approved leave requests
      const { data: leaveRequests } = await db
        .from('leave_requests')
        .select('*')
        .eq('status', 'approved')
        .gte('start_date', format(startDate, 'yyyy-MM-dd'))
        .lte('end_date', format(endDate, 'yyyy-MM-dd'))
        .order('start_date');

      // Fetch employee details and profiles for leave requests
      let employeeProfileMap = new Map<string, string>();
      if (leaveRequests && leaveRequests.length > 0) {
        const employeeIds = leaveRequests.map(lr => lr.employee_id).filter(Boolean);
        if (employeeIds.length > 0) {
          // Try to find employee_details by id (UUID) first
          const { data: employeeDetails } = await db
            .from('employee_details')
            .select('id, user_id')
            .in('id', employeeIds);
          
          if (employeeDetails) {
            const userIds = employeeDetails.map(ed => ed.user_id).filter(Boolean);
            if (userIds.length > 0) {
              const { data: profiles } = await db
                .from('profiles')
                .select('user_id, full_name')
                .in('user_id', userIds);
              
              if (profiles) {
                const userToProfileMap = new Map(profiles.map(p => [p.user_id, p.full_name]));
                employeeDetails.forEach(ed => {
                  const fullName = userToProfileMap.get(ed.user_id);
                  if (fullName) {
                    employeeProfileMap.set(ed.id, fullName);
                  }
                });
              }
            }
          }
        }
      }

      if (leaveRequests) {
        leaveRequests.forEach(leave => {
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          const currentDate = new Date(startDate);
          const employeeName = employeeProfileMap.get(leave.employee_id) || 'Employee';

          while (currentDate <= endDate) {
            allEvents.push({
              id: `${leave.id}-${currentDate.toISOString()}`,
              title: `${employeeName} - Leave`,
              date: new Date(currentDate),
              type: 'leave' as const,
              description: leave.reason,
              color: '#f59e0b',
              employee_name: employeeName
            });
            currentDate.setDate(currentDate.getDate() + 1);
          }
        });
      }

      // Fetch birthdays
      const { data: employees } = await db
        .from('employee_details')
        .select('*')
        .not('date_of_birth', 'is', null);

      // Fetch profiles for employees
      let employeeNameMap = new Map<string, string>();
      if (employees && employees.length > 0) {
        const userIds = employees.map(emp => emp.user_id).filter(Boolean);
        if (userIds.length > 0) {
          const { data: profiles } = await db
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);
          
          if (profiles) {
            profiles.forEach(profile => {
              employeeNameMap.set(profile.user_id, profile.full_name);
            });
          }
        }
      }

      if (employees) {
        employees.forEach(employee => {
          if (employee.date_of_birth) {
            const birthday = new Date(employee.date_of_birth);
            const currentYear = selectedDate.getFullYear();
            const birthdayThisYear = new Date(currentYear, birthday.getMonth(), birthday.getDate());
            const employeeName = employeeNameMap.get(employee.user_id) || 'Employee';

            if (birthdayThisYear >= startDate && birthdayThisYear <= endDate) {
              allEvents.push({
                id: `birthday-${employee.id}`,
                title: `🎂 ${employeeName}'s Birthday`,
                date: birthdayThisYear,
                type: 'birthday' as const,
                color: '#8b5cf6',
                employee_name: employeeName
              });
            }
          }
        });
      }

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'event':
        return <Calendar className="h-3 w-3" />;
      case 'holiday':
        return <MapPin className="h-3 w-3" />;
      case 'leave':
        return <Users className="h-3 w-3" />;
      case 'birthday':
        return <Gift className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getEventTypeLabel = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'event':
        return 'Event';
      case 'holiday':
        return 'Holiday';
      case 'leave':
        return 'Leave';
      case 'birthday':
        return 'Birthday';
      default:
        return 'Event';
    }
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Calendar</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {selectedDateEvents.slice(0, 3).map((event) => (
              <div key={event.id} className="flex items-center space-x-2">
                {getEventIcon(event.type)}
                <span className="text-sm truncate" style={{ color: event.color }}>
                  {event.title}
                </span>
              </div>
            ))}
            {selectedDateEvents.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{selectedDateEvents.length - 3} more events
              </p>
            )}
            {selectedDateEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">No events today</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4 sm:pb-6">
          <CardTitle className="text-xl sm:text-2xl font-bold">Agency Calendar</CardTitle>
          {canManageEvents && (
            <Button 
              onClick={() => setShowEventDialog(true)} 
              size="sm"
              className="text-xs sm:text-sm px-3 sm:px-4 h-8 sm:h-9"
            >
              Add Event
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
              <div className="w-full overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-lg border shadow-sm bg-card w-full"
                  modifiers={{
                    hasEvents: (date) => {
                      const dateEvents = getEventsForDate(date);
                      return dateEvents.length > 0;
                    },
                    multipleEvents: (date) => {
                      const dateEvents = getEventsForDate(date);
                      return dateEvents.length > 1;
                    }
                  }}
                  modifiersClassNames={{
                    hasEvents: 'relative after:absolute after:bottom-1 sm:after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 sm:after:w-2 sm:after:h-2 after:rounded-full after:bg-primary after:shadow-sm',
                    multipleEvents: 'after:w-2 after:h-2 sm:after:w-2.5 sm:after:h-2.5'
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="sticky top-4">
                <div className="mb-4 pb-3 border-b">
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                    {format(selectedDate, 'EEEE')}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    {format(selectedDate, 'MMMM d, yyyy')}
                  </p>
                </div>
                <div className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                  {selectedDateEvents.length > 0 ? (
                    selectedDateEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowEventDetails(true);
                        }}
                        className={cn(
                          "p-3 sm:p-4 rounded-lg border-2 transition-all duration-200",
                          "hover:shadow-md hover:scale-[1.02] cursor-pointer active:scale-[0.98]",
                          "bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        )}
                        style={{
                          borderLeftColor: event.color || '#3b82f6',
                          borderLeftWidth: '4px'
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedEvent(event);
                            setShowEventDetails(true);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5 p-1.5 rounded-full bg-primary/10" style={{ color: event.color || '#3b82f6' }}>
                            {getEventIcon(event.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="text-sm sm:text-base font-semibold text-foreground line-clamp-2">
                                {event.title}
                              </h4>
                              <Badge 
                                variant="outline" 
                                className="text-xs flex-shrink-0"
                                style={{ 
                                  borderColor: event.color || '#3b82f6',
                                  color: event.color || '#3b82f6'
                                }}
                              >
                                {getEventTypeLabel(event.type)}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 sm:py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted/50 mb-4">
                        <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                      </div>
                      <p className="text-sm sm:text-base text-muted-foreground font-medium">
                        No events on this date
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground/70 mt-1">
                        Select another date to view events
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showEventDialog && (
        <CalendarEventDialog
          open={showEventDialog}
          onOpenChange={(open) => {
            setShowEventDialog(open);
            if (!open) setEventToEdit(null);
          }}
          onEventCreated={fetchCalendarData}
          editEvent={eventToEdit ? {
            id: eventToEdit.id,
            title: eventToEdit.title,
            description: eventToEdit.description || '',
            event_type: eventToEdit.event_type || 'meeting',
            start_date: eventToEdit.start_date || eventToEdit.date,
            end_date: eventToEdit.end_date || eventToEdit.date,
            all_day: eventToEdit.all_day || false,
            location: eventToEdit.location || '',
            color: eventToEdit.color || '#3b82f6'
          } : null}
        />
      )}

      <EventDetailsDialog
        open={showEventDetails}
        onOpenChange={setShowEventDetails}
        event={selectedEvent}
        canEdit={canManageEvents}
        onEdit={(event) => {
          setEventToEdit(event);
          setShowEventDialog(true);
        }}
        onDelete={async (eventId) => {
          try {
            const { getAgencyId } = await import('@/utils/agencyUtils');
            const agencyId = await getAgencyId(profile, user?.id);
            
            if (!agencyId) {
              throw new Error('Agency ID is required to delete events');
            }

            const { error } = await db
              .from('company_events')
              .delete()
              .eq('id', eventId)
              .eq('agency_id', agencyId);

            if (error) throw error;

            toast({
              title: 'Success',
              description: 'Event deleted successfully'
            });

            fetchCalendarData();
          } catch (error: any) {
            console.error('Error deleting event:', error);
            toast({
              title: 'Error',
              description: error.message || 'Failed to delete event',
              variant: 'destructive'
            });
          }
        }}
      />
    </div>
  );
}