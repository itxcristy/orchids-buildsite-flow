import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  CalendarDays,
  Clock,
  Plus,
  Users,
  FileText,
  Bell,
  ClipboardList,
  CalendarIcon,
  Loader2,
  CheckCircle,
  MapPin,
  Briefcase,
  UserPlus
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getAgencyId } from '@/utils/agencyUtils';
import { db } from '@/lib/database';
import { toast } from '@/hooks/use-toast';
import { generateUUID } from '@/lib/uuid';
import { format, addHours } from 'date-fns';
import { cn } from '@/lib/utils';

interface QuickActionsPanelProps {
  onEventCreated?: () => void;
  onHolidayCreated?: () => void;
}

const eventTypes = [
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'training', label: 'Training', icon: Briefcase },
  { value: 'announcement', label: 'Announcement', icon: Bell },
  { value: 'milestone', label: 'Milestone', icon: CheckCircle },
  { value: 'social', label: 'Social Event', icon: Calendar },
  { value: 'other', label: 'Other', icon: ClipboardList }
];

const eventColors = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#ef4444', label: 'Red' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#ec4899', label: 'Pink' }
];

export function QuickActionsPanel({ onEventCreated, onHolidayCreated }: QuickActionsPanelProps) {
  const { user, profile, userRole } = useAuth();
  const [showQuickActionDialog, setShowQuickActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'event' | 'holiday' | 'task' | 'announcement'>('event');
  const [loading, setLoading] = useState(false);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_type: 'meeting',
    start_date: new Date(),
    end_date: addHours(new Date(), 1),
    is_all_day: false,
    location: '',
    color: '#3b82f6'
  });

  // Holiday form state
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    description: '',
    date: undefined as Date | undefined,
    is_national_holiday: false,
    is_company_holiday: true
  });

  // Announcement form state
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent'
  });

  const canManageEvents = userRole === 'admin' || userRole === 'hr' || userRole === 'super_admin';

  // Fetch recent activities
  useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        const agencyId = await getAgencyId(profile, user?.id);
        if (!agencyId) return;

        // Fetch recent events for this agency
        const { data: events } = await db
          .from('company_events')
          .select('*')
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false })
          .limit(3);

        // Fetch recent holidays for this agency
        const { data: holidays } = await db
          .from('holidays')
          .select('*')
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false })
          .limit(3);

        const combined = [
          ...(events || []).map(e => ({ ...e, type: 'event' })),
          ...(holidays || []).map(h => ({ ...h, type: 'holiday' }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
         .slice(0, 5);

        setRecentActivities(combined);
      } catch (error) {
        console.error('Error fetching recent activities:', error);
      }
    };

    if (canManageEvents) {
      fetchRecentActivities();
    }
  }, [canManageEvents, profile, user?.id]);

  const resetForms = () => {
    setEventForm({
      title: '',
      description: '',
      event_type: 'meeting',
      start_date: new Date(),
      end_date: addHours(new Date(), 1),
      is_all_day: false,
      location: '',
      color: '#3b82f6'
    });
    setHolidayForm({
      name: '',
      description: '',
      date: undefined,
      is_national_holiday: false,
      is_company_holiday: true
    });
    setAnnouncementForm({
      title: '',
      message: '',
      priority: 'normal'
    });
  };

  const handleCreateEvent = async () => {
    if (!eventForm.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter an event title',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        throw new Error('Agency ID is required to create events');
      }

      // Create the event
      const { error } = await db
        .from('company_events')
        .insert({
          id: generateUUID(),
          title: eventForm.title,
          description: eventForm.description,
          event_type: eventForm.event_type,
          start_date: eventForm.start_date.toISOString(),
          end_date: eventForm.end_date.toISOString(),
          is_all_day: eventForm.is_all_day,
          location: eventForm.location,
          color: eventForm.color,
          created_by: user?.id,
          agency_id: agencyId,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Send notifications to all users in the agency
      try {
        // Get all users in this agency
        const { data: profiles } = await db
          .from('profiles')
          .select('user_id')
          .eq('agency_id', agencyId);

        if (profiles && profiles.length > 0) {
          const userIds = profiles.map(p => p.user_id).filter(Boolean);

          // Get active users
          const { data: users } = await db
            .from('users')
            .select('id')
            .in('id', userIds)
            .eq('is_active', true);

          if (users && users.length > 0) {
            // Format event date for notification message
            const eventDate = format(eventForm.start_date, 'MMM d, yyyy');
            const eventTime = eventForm.is_all_day 
              ? 'All Day' 
              : format(eventForm.start_date, 'h:mm a');
            const locationText = eventForm.location ? ` at ${eventForm.location}` : '';

            // Create notifications for all users in this agency
            const notifications = users.map(u => ({
              id: generateUUID(),
              user_id: u.id,
              title: `New Event: ${eventForm.title}`,
              message: `${eventForm.title} is scheduled for ${eventDate}${eventTime ? ` at ${eventTime}` : ''}${locationText}. ${eventForm.description ? eventForm.description.substring(0, 100) + (eventForm.description.length > 100 ? '...' : '') : ''}`,
              type: 'in_app',
              category: 'event',
              priority: 'normal',
              action_url: '/calendar',
              agency_id: agencyId,
              created_at: new Date().toISOString()
            }));

            const { error: notifError } = await db
              .from('notifications')
              .insert(notifications);

            if (notifError) {
              console.warn('Failed to send event notifications:', notifError);
              // Don't throw - event was created successfully
            }
          }
        }
      } catch (notifErr) {
        console.warn('Error sending event notifications:', notifErr);
        // Don't throw - event was created successfully
      }

      toast({
        title: '✅ Event Created',
        description: `"${eventForm.title}" has been added to the calendar and notifications sent.`
      });

      resetForms();
      setShowQuickActionDialog(false);
      onEventCreated?.();
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create event',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHoliday = async () => {
    if (!holidayForm.name.trim() || !holidayForm.date) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a holiday name and date',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        throw new Error('Agency ID is required to create holidays');
      }

      // Map form fields to database schema (is_company_holiday and is_national_holiday)
      const { error } = await db
        .from('holidays')
        .insert({
          id: generateUUID(),
          name: holidayForm.name,
          description: holidayForm.description,
          date: format(holidayForm.date, 'yyyy-MM-dd'),
          holiday_date: format(holidayForm.date, 'yyyy-MM-dd'),
          is_company_holiday: holidayForm.is_company_holiday,
          is_national_holiday: holidayForm.is_national_holiday,
          agency_id: agencyId,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Send notifications to all users in the agency
      try {
        // Get all users in this agency
        const { data: profiles } = await db
          .from('profiles')
          .select('user_id')
          .eq('agency_id', agencyId);

        if (profiles && profiles.length > 0) {
          const userIds = profiles.map(p => p.user_id).filter(Boolean);

          // Get active users
          const { data: users } = await db
            .from('users')
            .select('id')
            .in('id', userIds)
            .eq('is_active', true);

          if (users && users.length > 0) {
            // Format holiday date for notification message
            const holidayDate = format(holidayForm.date, 'MMM d, yyyy');
            const holidayType = holidayForm.is_national_holiday 
              ? 'National Holiday' 
              : holidayForm.is_company_holiday 
              ? 'Company Holiday' 
              : 'Holiday';

            // Create notifications for all users in this agency
            const notifications = users.map(u => ({
              id: generateUUID(),
              user_id: u.id,
              title: `New ${holidayType}: ${holidayForm.name}`,
              message: `${holidayForm.name} has been added to the calendar for ${holidayDate}. ${holidayForm.description ? holidayForm.description.substring(0, 100) + (holidayForm.description.length > 100 ? '...' : '') : ''}`,
              type: 'in_app',
              category: 'holiday',
              priority: 'normal',
              action_url: '/calendar',
              agency_id: agencyId,
              created_at: new Date().toISOString()
            }));

            const { error: notifError } = await db
              .from('notifications')
              .insert(notifications);

            if (notifError) {
              console.warn('Failed to send holiday notifications:', notifError);
              // Don't throw - holiday was created successfully
            }
          }
        }
      } catch (notifErr) {
        console.warn('Error sending holiday notifications:', notifErr);
        // Don't throw - holiday was created successfully
      }

      toast({
        title: '✅ Holiday Created',
        description: `"${holidayForm.name}" has been added to the calendar and notifications sent.`
      });

      resetForms();
      setShowQuickActionDialog(false);
      onHolidayCreated?.();
    } catch (error: any) {
      console.error('Error creating holiday:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create holiday',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a title and message',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        throw new Error('Agency ID is required to send announcements');
      }

      // Get all users in this agency to send notifications
      const { data: profiles } = await db
        .from('profiles')
        .select('user_id')
        .eq('agency_id', agencyId);

      if (!profiles || profiles.length === 0) {
        throw new Error('No users found in your agency');
      }

      const userIds = profiles.map(p => p.user_id).filter(Boolean);

      // Get active users
      const { data: users } = await db
        .from('users')
        .select('id')
        .in('id', userIds)
        .eq('is_active', true);

      if (!users || users.length === 0) {
        throw new Error('No active users found in your agency');
      }

      // Create notifications for all users in this agency
      const notifications = users.map(u => ({
        id: generateUUID(),
        user_id: u.id,
        title: announcementForm.title,
        message: announcementForm.message,
        type: 'in_app',
        category: 'announcement',
        priority: announcementForm.priority,
        agency_id: agencyId,
        created_at: new Date().toISOString()
      }));

      const { error } = await db
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      toast({
        title: '✅ Announcement Sent',
        description: `Sent to ${users.length} users in your agency`
      });

      resetForms();
      setShowQuickActionDialog(false);
    } catch (error: any) {
      console.error('Error creating announcement:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send announcement',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const openQuickAction = (type: 'event' | 'holiday' | 'task' | 'announcement') => {
    setActionType(type);
    resetForms();
    setShowQuickActionDialog(true);
  };

  if (!canManageEvents) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Create events, holidays, and announcements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
              onClick={() => openQuickAction('event')}
            >
              <Calendar className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium">Create Event</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-red-50 hover:border-red-300 transition-colors"
              onClick={() => openQuickAction('holiday')}
            >
              <CalendarDays className="h-6 w-6 text-red-600" />
              <span className="text-sm font-medium">Add Holiday</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-purple-50 hover:border-purple-300 transition-colors"
              onClick={() => openQuickAction('announcement')}
            >
              <Bell className="h-6 w-6 text-purple-600" />
              <span className="text-sm font-medium">Announcement</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-green-50 hover:border-green-300 transition-colors"
              onClick={() => window.location.href = '/calendar'}
            >
              <FileText className="h-6 w-6 text-green-600" />
              <span className="text-sm font-medium">View Calendar</span>
            </Button>
          </div>

          {/* Recent Activity */}
          {recentActivities.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Recent Activity</h4>
              <div className="space-y-2">
                {recentActivities.slice(0, 3).map((activity, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {activity.type === 'event' ? (
                      <Calendar className="h-4 w-4 text-blue-500" />
                    ) : (
                      <CalendarDays className="h-4 w-4 text-red-500" />
                    )}
                    <span className="truncate">{activity.title || activity.name}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {activity.type === 'event' ? 'Event' : 'Holiday'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Action Dialog */}
      <Dialog open={showQuickActionDialog} onOpenChange={setShowQuickActionDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'event' && 'Create Company Event'}
              {actionType === 'holiday' && 'Add Holiday'}
              {actionType === 'announcement' && 'Send Announcement'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'event' && 'Schedule a new company event for all employees'}
              {actionType === 'holiday' && 'Add a new holiday to the company calendar'}
              {actionType === 'announcement' && 'Send a notification to all employees'}
            </DialogDescription>
          </DialogHeader>

          {/* Event Form */}
          {actionType === 'event' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="event-title">Event Title *</Label>
                  <Input
                    id="event-title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter event title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select
                    value={eventForm.event_type}
                    onValueChange={(value) => setEventForm(prev => ({ ...prev, event_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select
                    value={eventForm.color}
                    onValueChange={(value) => setEventForm(prev => ({ ...prev, color: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventColors.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color.value }} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter event description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date & Time</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(eventForm.start_date, "PPP HH:mm")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={eventForm.start_date}
                        onSelect={(date) => date && setEventForm(prev => ({ ...prev, start_date: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date & Time</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(eventForm.end_date, "PPP HH:mm")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={eventForm.end_date}
                        onSelect={(date) => date && setEventForm(prev => ({ ...prev, end_date: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={eventForm.location}
                    onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Enter location or 'Virtual'"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="all-day"
                  checked={eventForm.is_all_day}
                  onCheckedChange={(checked) => setEventForm(prev => ({ ...prev, is_all_day: checked as boolean }))}
                />
                <Label htmlFor="all-day" className="text-sm">All-day event</Label>
              </div>
            </div>
          )}

          {/* Holiday Form */}
          {actionType === 'holiday' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="holiday-name">Holiday Name *</Label>
                <Input
                  id="holiday-name"
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., New Year's Day"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={holidayForm.description}
                  onChange={(e) => setHolidayForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !holidayForm.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {holidayForm.date ? format(holidayForm.date, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={holidayForm.date}
                      onSelect={(date) => setHolidayForm(prev => ({ ...prev, date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-3">
                <Label>Holiday Type</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="company-holiday"
                      checked={holidayForm.is_company_holiday}
                      onCheckedChange={(checked) => setHolidayForm(prev => ({
                        ...prev,
                        is_company_holiday: checked as boolean,
                        is_national_holiday: checked ? false : prev.is_national_holiday
                      }))}
                    />
                    <Label htmlFor="company-holiday" className="text-sm">Company Holiday</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="national-holiday"
                      checked={holidayForm.is_national_holiday}
                      onCheckedChange={(checked) => setHolidayForm(prev => ({
                        ...prev,
                        is_national_holiday: checked as boolean,
                        is_company_holiday: checked ? false : prev.is_company_holiday
                      }))}
                    />
                    <Label htmlFor="national-holiday" className="text-sm">National Holiday</Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Announcement Form */}
          {actionType === 'announcement' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="announcement-title">Title *</Label>
                <Input
                  id="announcement-title"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Announcement title"
                />
              </div>

              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter your announcement message"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={announcementForm.priority}
                  onValueChange={(value: any) => setAnnouncementForm(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-gray-600">Low</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="normal">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-blue-600">Normal</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-orange-600">High</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Urgent</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <Bell className="h-4 w-4 inline-block mr-2" />
                This announcement will be sent as a notification to all active users.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowQuickActionDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (actionType === 'event') handleCreateEvent();
                if (actionType === 'holiday') handleCreateHoliday();
                if (actionType === 'announcement') handleCreateAnnouncement();
              }}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionType === 'event' && 'Create Event'}
              {actionType === 'holiday' && 'Add Holiday'}
              {actionType === 'announcement' && 'Send Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default QuickActionsPanel;

