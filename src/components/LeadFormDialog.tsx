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

interface Lead {
  id?: string;
  lead_number?: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address?: string;
  website?: string;
  job_title?: string;
  industry?: string;
  location?: string;
  lead_source_id?: string;
  status: string;
  priority: string;
  estimated_value: number;
  probability: number;
  expected_close_date: string;
  due_date?: string;
  follow_up_date?: string;
  notes?: string;
  assigned_to?: string;
}

interface LeadFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onLeadSaved: () => void;
}

const LeadFormDialog: React.FC<LeadFormDialogProps> = ({ isOpen, onClose, lead, onLeadSaved }) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string }>>([]);
  const [formData, setFormData] = useState<Lead>({
    company_name: lead?.company_name || lead?.name || '',
    contact_name: lead?.contact_name || lead?.name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    address: lead?.address || '',
    website: lead?.website || '',
    job_title: lead?.job_title || '',
    industry: lead?.industry || '',
    location: lead?.location || '',
    lead_source_id: lead?.lead_source_id || lead?.source_id || '',
    status: lead?.status || 'new',
    priority: lead?.priority || 'medium',
    estimated_value: lead?.estimated_value || lead?.value || 0,
    probability: lead?.probability || 0,
    expected_close_date: lead?.expected_close_date || '',
    due_date: lead?.due_date || '',
    follow_up_date: lead?.follow_up_date || '',
    notes: lead?.notes || lead?.description || '',
    assigned_to: lead?.assigned_to || '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchLeadSources();
      fetchEmployees();
      // Reset form when dialog opens
      if (lead) {
        setFormData({
          company_name: lead.company_name || lead.name || '',
          contact_name: lead.contact_name || lead.name || '',
          email: lead.email || '',
          phone: lead.phone || '',
          address: lead.address || '',
          website: lead.website || '',
          job_title: lead.job_title || '',
          industry: lead.industry || '',
          location: lead.location || '',
          lead_source_id: lead.lead_source_id || lead.source_id || '',
          status: lead.status || 'new',
          priority: lead.priority || 'medium',
          estimated_value: lead.estimated_value || lead.value || 0,
          probability: lead.probability || 0,
          expected_close_date: lead.expected_close_date || '',
          due_date: lead.due_date || '',
          follow_up_date: lead.follow_up_date || '',
          notes: lead.notes || lead.description || '',
          assigned_to: lead.assigned_to || '',
        });
      } else {
        setFormData({
          company_name: '',
          contact_name: '',
          email: '',
          phone: '',
          address: '',
          website: '',
          job_title: '',
          industry: '',
          location: '',
          lead_source_id: '',
          status: 'new',
          priority: 'medium',
          estimated_value: 0,
          probability: 0,
          expected_close_date: '',
          due_date: '',
          follow_up_date: '',
          notes: '',
          assigned_to: '',
        });
      }
    }
  }, [isOpen, lead]);

  const fetchLeadSources = async () => {
    try {
      const { data, error } = await db
        .from('lead_sources')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      setLeadSources(data || []);
    } catch (error) {
      console.error('Error fetching lead sources:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      if (!user?.id) {
        setEmployees([]);
        return;
      }
      
      // Use standardized employee fetching service
      const employeesData = await getEmployeesForAssignmentAuto(profile, user.id);
      
      // Transform to component format
      const transformedEmployees = employeesData.map(emp => ({
        id: emp.user_id,
        full_name: emp.full_name
      }));
      
      setEmployees(transformedEmployees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      });
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

      if (lead?.id) {
        const updateData: any = {
          name: formData.contact_name || formData.company_name || '', // Set name for backward compatibility
          company_name: formData.company_name,
          contact_name: formData.contact_name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          website: formData.website || null,
          job_title: formData.job_title || null,
          industry: formData.industry || null,
          location: formData.location || null,
          lead_source_id: (formData.lead_source_id && formData.lead_source_id !== '__none__') ? formData.lead_source_id : null,
          source_id: (formData.lead_source_id && formData.lead_source_id !== '__none__') ? formData.lead_source_id : null,
          status: formData.status,
          priority: formData.priority,
          estimated_value: formData.estimated_value || null,
          value: formData.estimated_value || null,
          probability: formData.probability || 0,
          expected_close_date: formData.expected_close_date || null,
          due_date: formData.due_date || null,
          follow_up_date: formData.follow_up_date || null,
          notes: formData.notes || null,
          description: formData.notes || null,
          assigned_to: (formData.assigned_to && formData.assigned_to !== '__none__') ? formData.assigned_to : null,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await db
          .from('leads')
          .update(updateData)
          .eq('id', lead.id)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Lead updated successfully',
        });
      } else {
        // Generate lead number
        const year = new Date().getFullYear();
        const timestamp = String(Date.now()).slice(-6);
        const leadNumber = `LEAD-${year}-${timestamp}`;

        const { data, error } = await db
          .from('leads')
          .insert([{
            id: generateUUID(),
            lead_number: leadNumber,
            name: formData.contact_name || formData.company_name || '', // Set name for backward compatibility
            company_name: formData.company_name,
            contact_name: formData.contact_name,
            email: formData.email || null,
            phone: formData.phone || null,
            address: formData.address || null,
            website: formData.website || null,
            job_title: formData.job_title || null,
            industry: formData.industry || null,
            location: formData.location || null,
            lead_source_id: (formData.lead_source_id && formData.lead_source_id !== '__none__') ? formData.lead_source_id : null,
            source_id: (formData.lead_source_id && formData.lead_source_id !== '__none__') ? formData.lead_source_id : null,
            status: formData.status,
            priority: formData.priority,
            estimated_value: formData.estimated_value || null,
            value: formData.estimated_value || null,
            probability: formData.probability || 0,
            expected_close_date: formData.expected_close_date || null,
            due_date: formData.due_date || null,
            follow_up_date: formData.follow_up_date || null,
            notes: formData.notes || null,
            description: formData.notes || null,
            assigned_to: (formData.assigned_to && formData.assigned_to !== '__none__') ? formData.assigned_to : null,
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
          description: 'Lead created successfully',
        });
      }

      onLeadSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving lead:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save lead',
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
          <DialogTitle>{lead?.id ? 'Edit Lead' : 'Create New Lead'}</DialogTitle>
          <DialogDescription>
            {lead?.id ? 'Update lead details below.' : 'Fill in the details to create a new lead.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name *</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={formData.job_title || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead_source_id">Lead Source</Label>
              <Select 
                value={formData.lead_source_id || undefined} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, lead_source_id: value === '__none__' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lead source (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {leadSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_value">Estimated Value (₹)</Label>
              <Input
                id="estimated_value"
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="probability">Probability (%)</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData(prev => ({ ...prev, probability: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expected_close_date">Expected Close Date</Label>
              <Input
                id="expected_close_date"
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_close_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="follow_up_date">Follow-up Date</Label>
            <Input
              id="follow_up_date"
              type="date"
              value={formData.follow_up_date || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : lead?.id ? 'Update Lead' : 'Create Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadFormDialog;