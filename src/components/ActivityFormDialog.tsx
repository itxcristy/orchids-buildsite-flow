import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/database';
import { useAuth } from '@/hooks/useAuth';
import { generateUUID } from '@/lib/uuid';
import { getAgencyId } from '@/utils/agencyUtils';
import { getEmployeesForAssignmentAuto } from '@/services/api/employee-selector-service';

interface Activity {
  id?: string;
  lead_id?: string;
  client_id?: string;
  activity_type: string;
  subject: string;
  description?: string;
  status: string;
  due_date: string;
  completed_date?: string;
  assigned_to?: string;
  duration?: number;
  outcome?: string;
  location?: string;
  agenda?: string;
  attendees?: string[];
}

interface ActivityFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activity?: Activity | null;
  leadId?: string;
  onActivitySaved: () => void;
}

const formatDateTimeLocal = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
};

const ActivityFormDialog: React.FC<ActivityFormDialogProps> = ({ 
  isOpen, 
  onClose, 
  activity, 
  leadId,
  onActivitySaved 
}) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string }>>([]);
  const [formData, setFormData] = useState<Activity>({
    lead_id: activity?.lead_id || leadId || '',
    client_id: activity?.client_id || '',
    activity_type: activity?.activity_type || 'call',
    subject: activity?.subject || '',
    description: activity?.description || '',
    status: activity?.status || 'pending',
    due_date: activity?.due_date || '',
    completed_date: activity?.completed_date || '',
    assigned_to: activity?.assigned_to || '',
    duration: activity?.duration || undefined,
    outcome: activity?.outcome || '',
    location: activity?.location || '',
    agenda: activity?.agenda || '',
    attendees: activity?.attendees || [],
  });

  useEffect(() => {
    if (isOpen) {
      fetchLeads();
      fetchEmployees();
      if (activity && activity.id) {
        setFormData({
          lead_id: activity.lead_id || '',
          client_id: activity.client_id || '',
          activity_type: activity.activity_type || 'call',
          subject: activity.subject || '',
          description: activity.description || '',
          status: activity.status || 'pending',
          due_date: activity.due_date || '',
          completed_date: activity.completed_date || '',
          assigned_to: activity.assigned_to || '',
          duration: activity.duration || undefined,
          outcome: activity.outcome || '',
          location: activity.location || '',
          agenda: activity.agenda || '',
          attendees: activity.attendees || [],
        });
      } else {
        setFormData({
          lead_id: leadId || activity?.lead_id || '',
          client_id: '',
          activity_type: 'call',
          subject: '',
          description: '',
          status: 'pending',
          due_date: '',
          completed_date: '',
          assigned_to: '',
          duration: undefined,
          outcome: '',
          location: '',
          agenda: '',
          attendees: [],
        });
      }
    }
  }, [isOpen, activity, leadId]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await db
        .from('leads')
        .select('id, company_name, lead_number')
        .order('company_name', { ascending: true });
      
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const employeesData = await getEmployeesForAssignmentAuto(profile, user?.id);
      setEmployees(employeesData.map(emp => ({
        id: emp.user_id,
        full_name: emp.full_name
      })));
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId || !user?.id) {
        toast({
          title: 'Error',
          description: 'Agency ID or User ID not found. Please ensure you are logged in.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      const userId = user.id;

      if (activity?.id) {
        const updateData: any = {
          lead_id: (formData.lead_id && formData.lead_id !== '__none__') ? formData.lead_id : null,
          client_id: formData.client_id || null,
          activity_type: formData.activity_type,
          subject: formData.subject,
          description: formData.description || null,
          status: formData.status,
          due_date: formData.due_date || null,
          completed_date: formData.completed_date || null,
          assigned_to: formData.assigned_to || null,
          duration: formData.duration || null,
          outcome: formData.outcome || null,
          location: formData.location || null,
          agenda: formData.agenda || null,
          attendees: formData.attendees && formData.attendees.length > 0 ? formData.attendees : null,
          updated_at: new Date().toISOString(),
        };

        // If status is completed and completed_date is not set, set it
        if (formData.status === 'completed' && !formData.completed_date) {
          updateData.completed_date = new Date().toISOString();
        }

        // Ensure activity_date is set (use due_date if available, otherwise current time)
        if (!updateData.activity_date) {
          updateData.activity_date = formData.due_date || new Date().toISOString();
        }

        const { data, error } = await db
          .from('crm_activities')
          .update(updateData)
          .eq('id', activity.id)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Activity updated successfully',
        });
      } else {
        const { data, error } = await db
          .from('crm_activities')
          .insert([{
            id: generateUUID(),
            lead_id: (formData.lead_id && formData.lead_id !== '__none__') ? formData.lead_id : null,
            client_id: formData.client_id || null,
            activity_type: formData.activity_type,
            subject: formData.subject,
            description: formData.description || null,
            status: formData.status,
            activity_date: formData.due_date || new Date().toISOString(),
            due_date: formData.due_date || null,
            completed_date: formData.completed_date || null,
            assigned_to: formData.assigned_to || null,
            duration: formData.duration || null,
            outcome: formData.outcome || null,
            location: formData.location || null,
            agenda: formData.agenda || null,
            attendees: formData.attendees && formData.attendees.length > 0 ? formData.attendees : null,
            created_by: userId,
            agency_id: agencyId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Activity created successfully',
        });
      }

      onActivitySaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving activity:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save activity',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activity?.id ? 'Edit Activity' : 'Create New Activity'}</DialogTitle>
          <DialogDescription>
            {activity?.id ? 'Update activity details below.' : 'Fill in the details to create a new activity.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead_id">Lead</Label>
              <Select 
                value={formData.lead_id || undefined} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, lead_id: value === '__none__' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lead (optional)" />
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.lead_number} - {lead.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity_type">Activity Type</Label>
              <Select 
                value={formData.activity_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, activity_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date & Time</Label>
              <Input
                id="due_date"
                type="datetime-local"
                value={formatDateTimeLocal(formData.due_date)}
                onChange={(e) => {
                  if (e.target.value) {
                    // Convert local datetime to ISO string
                    const localDate = new Date(e.target.value);
                    setFormData(prev => ({ ...prev, due_date: localDate.toISOString() }));
                  } else {
                    setFormData(prev => ({ ...prev, due_date: '' }));
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Select 
              value={formData.assigned_to || undefined} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value === '__none__' ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.status === 'completed' && (
            <div className="space-y-2">
              <Label htmlFor="completed_date">Completed Date & Time</Label>
              <Input
                id="completed_date"
                type="datetime-local"
                value={formatDateTimeLocal(formData.completed_date)}
                onChange={(e) => {
                  if (e.target.value) {
                    const localDate = new Date(e.target.value);
                    setFormData(prev => ({ ...prev, completed_date: localDate.toISOString() }));
                  } else {
                    setFormData(prev => ({ ...prev, completed_date: '' }));
                  }
                }}
              />
            </div>
          )}

          {formData.activity_type === 'meeting' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Meeting location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenda">Agenda</Label>
                <Textarea
                  id="agenda"
                  value={formData.agenda || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, agenda: e.target.value }))}
                  rows={3}
                  placeholder="Meeting agenda"
                />
              </div>
            </>
          )}

          {formData.activity_type === 'call' && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: Number(e.target.value) || null }))}
                placeholder="Call duration in minutes"
              />
            </div>
          )}

          {(formData.activity_type === 'call' || formData.activity_type === 'meeting') && (
            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Textarea
                id="outcome"
                value={formData.outcome || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, outcome: e.target.value }))}
                rows={2}
                placeholder="Activity outcome or result"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : activity?.id ? 'Update Activity' : 'Create Activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityFormDialog;

