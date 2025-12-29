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
import { useNavigate } from 'react-router-dom';
import { projectService } from '@/services/api/project-service';
import { insertRecord } from '@/services/api/postgresql-service';

interface Lead {
  id: string;
  lead_number: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  estimated_value: number | null;
}

interface ConvertLeadToClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onConverted: () => void;
}

const ConvertLeadToClientDialog: React.FC<ConvertLeadToClientDialogProps> = ({
  isOpen,
  onClose,
  lead,
  onConverted,
}) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [createProject, setCreateProject] = useState(false);
  const [createQuotation, setCreateQuotation] = useState(false);
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    budget: null as number | null,
    start_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
  });
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    address: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    status: 'active',
    notes: '',
  });

  useEffect(() => {
    if (lead && isOpen) {
      setFormData({
        name: lead.company_name || '',
        company_name: lead.company_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        address: lead.address || '',
        contact_person: lead.contact_name || '',
        contact_email: lead.email || '',
        contact_phone: lead.phone || '',
        status: 'active',
        notes: lead.notes || '',
      });
      
      // Pre-fill project data from lead
      setProjectData({
        name: `${lead.company_name} - Project`,
        description: `Project created from lead ${lead.lead_number}`,
        budget: lead.estimated_value || null,
        start_date: new Date().toISOString().split('T')[0],
        priority: 'medium',
      });
    }
  }, [lead, isOpen]);

  const handleConvert = async () => {
    if (!lead) return;

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

      // Generate client number
      const year = new Date().getFullYear();
      const timestamp = String(Date.now()).slice(-6);
      const clientNumber = `CLT-${year}-${timestamp}`;

      // Create client
      const { data: client, error: clientError } = await db
        .from('clients')
        .insert([{
          id: generateUUID(),
          client_number: clientNumber,
          name: formData.name,
          company_name: formData.company_name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          contact_person: formData.contact_person || null,
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
          status: formData.status,
          notes: formData.notes || null,
          created_by: userId,
          agency_id: agencyId,
          created_at: new Date().toISOString(),
          // Note: updated_at is automatically set by the database
        }])
        .select()
        .single();

      if (clientError) throw clientError;

      // Update lead status to 'won'
      // Note: updated_at is automatically set by the updateRecord function
      await db
        .from('leads')
        .update({ 
          status: 'won',
        })
        .eq('id', lead.id);

      // Create project if requested
      if (createProject && client) {
        try {
          const project = await projectService.createProject({
            name: projectData.name || `${lead.company_name} - Project`,
            description: projectData.description || `Project created from lead ${lead.lead_number}`,
            status: 'planning',
            priority: projectData.priority,
            budget: projectData.budget || lead.estimated_value || null,
            start_date: projectData.start_date || new Date().toISOString().split('T')[0],
            client_id: client.id,
            progress: 0,
            assigned_team: [],
            departments: [],
            tags: [],
            categories: [],
            currency: 'USD',
          }, profile, userId);

          // Create CRM activity for project creation
          try {
            await insertRecord('crm_activities', {
              id: generateUUID(),
              agency_id: agencyId,
              type: 'project_created',
              title: `Project Created: ${project.name}`,
              description: `Project created from lead ${lead.lead_number}`,
              related_entity_type: 'project',
              related_entity_id: project.id,
              lead_id: lead.id,
              created_by: userId,
              created_at: new Date().toISOString(),
            }, userId, agencyId);
          } catch (activityError) {
            console.warn('Failed to create CRM activity for project:', activityError);
            // Don't fail the whole operation if activity creation fails
          }

          toast({
            title: 'Success',
            description: `Project "${project.name}" created successfully`,
          });
        } catch (projectError: any) {
          console.error('Error creating project:', projectError);
          toast({
            title: 'Warning',
            description: 'Client created but project creation failed: ' + (projectError.message || 'Unknown error'),
            variant: 'destructive',
          });
        }
      }

      // Create quotation if requested
      if (createQuotation && client) {
        const quoteNumber = `Q-${year}-${timestamp}`;
        await db
          .from('quotations')
          .insert([{
            id: generateUUID(),
            quote_number: quoteNumber,
            client_id: client.id,
            title: `Quotation for ${lead.company_name}`,
            description: `Quotation created from lead ${lead.lead_number}`,
            status: 'draft',
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            subtotal: lead.estimated_value || 0,
            tax_rate: 0,
            terms_conditions: null,
            notes: lead.notes || null,
            created_by: userId,
            agency_id: agencyId,
            created_at: new Date().toISOString(),
            // Note: updated_at is automatically set by the database
          }]);
      }

      toast({
        title: 'Success',
        description: 'Lead converted to client successfully',
      });

      onConverted();
      onClose();

      // Navigate to clients page if requested
      if (client) {
        setTimeout(() => {
          navigate('/clients');
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error converting lead to client:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to convert lead to client',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert Lead to Client</DialogTitle>
          <DialogDescription>
            Convert lead {lead.lead_number} to a client. You can optionally create a project and quotation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
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
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold">Additional Actions</h4>
            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={createProject}
                  onChange={(e) => setCreateProject(e.target.checked)}
                  className="rounded"
                />
                <span>Create a project for this client</span>
              </label>
              
              {createProject && (
                <div className="ml-6 space-y-3 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="project_name">Project Name *</Label>
                    <Input
                      id="project_name"
                      value={projectData.name}
                      onChange={(e) => setProjectData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project_description">Description</Label>
                    <Textarea
                      id="project_description"
                      value={projectData.description}
                      onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="project_budget">Budget</Label>
                      <Input
                        id="project_budget"
                        type="number"
                        step="0.01"
                        value={projectData.budget || ''}
                        onChange={(e) => setProjectData(prev => ({ 
                          ...prev, 
                          budget: e.target.value ? parseFloat(e.target.value) : null 
                        }))}
                        placeholder={lead.estimated_value ? lead.estimated_value.toString() : '0.00'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project_start_date">Start Date</Label>
                      <Input
                        id="project_start_date"
                        type="date"
                        value={projectData.start_date}
                        onChange={(e) => setProjectData(prev => ({ ...prev, start_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project_priority">Priority</Label>
                    <Select 
                      value={projectData.priority} 
                      onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
                        setProjectData(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={createQuotation}
                  onChange={(e) => setCreateQuotation(e.target.checked)}
                  className="rounded"
                />
                <span>Create a quotation for this client</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleConvert} 
            disabled={loading || !formData.name || (createProject && !projectData.name)}
          >
            {loading ? 'Converting...' : 'Convert to Client'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConvertLeadToClientDialog;
