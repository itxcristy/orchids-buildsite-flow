import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { db } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { generateUUID } from '@/lib/uuid';
import { getAgencyId } from '@/utils/agencyUtils';

interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated: () => void;
  editEvent?: {
    id: string;
    title: string;
    description: string;
    event_type: string;
    start_date: Date;
    end_date: Date;
    all_day: boolean;
    location: string;
    color: string;
  } | null;
}

const eventTypes = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'training', label: 'Training' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'social', label: 'Social Event' },
  { value: 'other', label: 'Other' }
];

const eventColors = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#ef4444', label: 'Red' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#06b6d4', label: 'Cyan' }
];

export function CalendarEventDialog({ open, onOpenChange, onEventCreated, editEvent }: CalendarEventDialogProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'meeting',
    start_date: new Date(),
    end_date: new Date(),
    is_all_day: false,
    location: '',
    color: '#3b82f6'
  });

  // Update form when editEvent changes
  React.useEffect(() => {
    if (editEvent) {
      setFormData({
        title: editEvent.title,
        description: editEvent.description || '',
        event_type: editEvent.event_type,
        start_date: editEvent.start_date,
        end_date: editEvent.end_date,
        is_all_day: editEvent.all_day,
        location: editEvent.location || '',
        color: editEvent.color || '#3b82f6'
      });
    } else {
      // Reset form when creating new event
      setFormData({
        title: '',
        description: '',
        event_type: 'meeting',
        start_date: new Date(),
        end_date: new Date(),
        is_all_day: false,
        location: '',
        color: '#3b82f6'
      });
    }
  }, [editEvent, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        throw new Error('Agency ID is required to create/update events');
      }

      if (editEvent) {
        // Update existing event
        const { error } = await db
          .from('company_events')
          .update({
            title: formData.title,
            description: formData.description,
            event_type: formData.event_type,
            start_date: formData.start_date.toISOString(),
            end_date: formData.end_date.toISOString(),
            is_all_day: formData.is_all_day,
            location: formData.location,
            color: formData.color,
            updated_at: new Date().toISOString()
          })
          .eq('id', editEvent.id)
          .eq('agency_id', agencyId);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Event updated successfully'
        });
      } else {
        // Create new event
        const { error } = await db
          .from('company_events')
          .insert({
            id: generateUUID(),
            title: formData.title,
            description: formData.description,
            event_type: formData.event_type,
            start_date: formData.start_date.toISOString(),
            end_date: formData.end_date.toISOString(),
            is_all_day: formData.is_all_day,
            location: formData.location,
            color: formData.color,
            created_by: user.id,
            agency_id: agencyId
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
            const userIds = profiles.map((p: any) => p.user_id).filter(Boolean);

            // Get active users
            const { data: users } = await db
              .from('users')
              .select('id')
              .in('id', userIds)
              .eq('is_active', true);

            if (users && users.length > 0) {
              // Format event date for notification message
              const eventDate = format(formData.start_date, 'MMM d, yyyy');
              const eventTime = formData.is_all_day 
                ? 'All Day' 
                : format(formData.start_date, 'h:mm a');
              const locationText = formData.location ? ` at ${formData.location}` : '';

              // Create notifications for all users in this agency
              const notifications = users.map((u: any) => ({
                id: generateUUID(),
                user_id: u.id,
                title: `New Event: ${formData.title}`,
                message: `${formData.title} is scheduled for ${eventDate}${eventTime ? ` at ${eventTime}` : ''}${locationText}. ${formData.description ? formData.description.substring(0, 100) + (formData.description.length > 100 ? '...' : '') : ''}`,
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
          title: 'Success',
          description: 'Event created successfully and notifications sent'
        });
      }

      onEventCreated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editEvent ? 'Edit Company Event' : 'Create Company Event'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter event title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter event description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? format(formData.start_date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.start_date}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, start_date: date }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.end_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.end_date ? format(formData.end_date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.end_date}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, end_date: date }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="all_day"
              checked={formData.is_all_day}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_all_day: checked as boolean }))}
            />
            <Label htmlFor="all_day" className="text-sm font-normal cursor-pointer">
              All Day Event
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventColors.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color.value }}
                        />
                        <span>{color.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (editEvent ? 'Updating...' : 'Creating...') : (editEvent ? 'Update Event' : 'Create Event')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}