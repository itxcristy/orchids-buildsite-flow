import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Gift, MapPin, MapPin as LocationIcon, Edit, Trash2 } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'event' | 'holiday' | 'leave' | 'birthday';
  description?: string;
  color?: string;
  employee_name?: string;
  location?: string;
  event_type?: string;
  all_day?: boolean;
  start_date?: Date;
  end_date?: Date;
  is_company_event?: boolean;
}

interface EventDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  canEdit?: boolean;
}

export function EventDetailsDialog({ 
  open, 
  onOpenChange, 
  event, 
  onEdit, 
  onDelete,
  canEdit = false 
}: EventDetailsDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!event) return null;

  const handleEdit = () => {
    if (onEdit && event) {
      onEdit(event);
      onOpenChange(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (onDelete && event.id) {
      onDelete(event.id);
      setShowDeleteConfirm(false);
    }
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'event':
        return <Calendar className="h-5 w-5" />;
      case 'holiday':
        return <MapPin className="h-5 w-5" />;
      case 'leave':
        return <Users className="h-5 w-5" />;
      case 'birthday':
        return <Gift className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getEventTypeLabel = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'event':
        return event.event_type ? event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1) : 'Event';
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

  const formatDateTime = (date: Date, allDay?: boolean) => {
    if (allDay) {
      return format(date, 'EEEE, MMMM d, yyyy');
    }
    return format(date, 'EEEE, MMMM d, yyyy h:mm a');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg flex-shrink-0"
              style={{ 
                backgroundColor: `${event.color || '#3b82f6'}20`,
                color: event.color || '#3b82f6'
              }}
            >
              {getEventIcon(event.type)}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl sm:text-2xl font-bold line-clamp-2">
                {event.title}
              </DialogTitle>
              <Badge 
                variant="outline" 
                className="mt-2 text-xs sm:text-sm"
                style={{ 
                  borderColor: event.color || '#3b82f6',
                  color: event.color || '#3b82f6'
                }}
              >
                {getEventTypeLabel(event.type)}
              </Badge>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Date/Time Information */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Date & Time</p>
              <p className="text-base sm:text-lg font-semibold text-foreground mt-1">
                {event.start_date ? formatDateTime(event.start_date, event.all_day) : format(event.date, 'EEEE, MMMM d, yyyy')}
              </p>
              {event.end_date && event.start_date && !isSameDay(event.start_date, event.end_date) && (
                <p className="text-sm text-muted-foreground mt-1">
                  to {formatDateTime(event.end_date, event.all_day)}
                </p>
              )}
              {event.all_day && (
                <Badge variant="outline" className="mt-2 text-xs">
                  All Day Event
                </Badge>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <LocationIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <p className="text-base sm:text-lg font-semibold text-foreground mt-1">
                  {event.location}
                </p>
              </div>
            </div>
          )}

          {/* Employee Name (for leave/birthday events) */}
          {event.employee_name && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Employee</p>
                <p className="text-base sm:text-lg font-semibold text-foreground mt-1">
                  {event.employee_name}
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm sm:text-base text-foreground leading-relaxed p-3 rounded-lg bg-muted/50">
                {event.description}
              </p>
            </div>
          )}

          {/* Empty State */}
          {!event.description && !event.location && !event.employee_name && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                No additional details available for this event.
              </p>
            </div>
          )}

          {/* Action Buttons for Editable Events */}
          {canEdit && event.is_company_event && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleEdit}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{event.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

