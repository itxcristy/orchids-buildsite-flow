import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { insertRecord, updateRecord, selectRecords, selectOne } from '@/services/api/postgresql-service';
import { useAuth } from '@/hooks/useAuth';
import { getEmployeesForAssignmentAuto } from '@/services/api/employee-selector-service';
import { getClientsForSelectionAuto } from '@/services/api/client-selector-service';
import { getProjectsForSelectionAuto } from '@/services/api/project-selector-service';
import { getProductsForSelectionAuto } from '@/services/api/inventory-selector-service';
import { X } from 'lucide-react';

interface Job {
  id?: string;
  job_number?: string;
  title: string;
  description: string;
  client_id: string;
  category_id: string;
  status: string;
  start_date: string;
  end_date: string;
  estimated_hours: number;
  estimated_cost: number;
  budget: number;
  profit_margin: number;
  assigned_to: string;
}

interface JobFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  job?: Job | null;
  onJobSaved: () => void;
}

const JobFormDialog: React.FC<JobFormDialogProps> = ({ isOpen, onClose, job, onJobSaved }) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [jobCategories, setJobCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState<Job>({
    title: job?.title || '',
    description: job?.description || '',
    client_id: job?.client_id || '',
    category_id: job?.category_id || '',
    status: job?.status || 'planning',
    start_date: job?.start_date || '',
    end_date: job?.end_date || '',
    estimated_hours: job?.estimated_hours || 0,
    estimated_cost: job?.estimated_cost || 0,
    budget: job?.budget || 0,
    profit_margin: job?.profit_margin || 0,
    assigned_to: job?.assigned_to || '',
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form data first
      setFormData({
        title: '',
        description: '',
        client_id: '',
        category_id: '',
        status: 'planning',
        start_date: '',
        end_date: '',
        estimated_hours: 0,
        estimated_cost: 0,
        budget: 0,
        profit_margin: 0,
        assigned_to: '',
      });
      
      // Fetch data first, then set form data after data is loaded
      const loadData = async () => {
        setDataLoading(true);
        try {
          await Promise.all([
            fetchClients(),
            fetchJobCategories(),
            fetchEmployees(),
          ]);
          
          // After data is loaded, set form data if editing
          if (job) {
            setFormData({
              title: job.title || '',
              description: job.description || '',
              client_id: job.client_id || '',
              category_id: job.category_id || '',
              status: job.status || 'planning',
              start_date: job.start_date || '',
              end_date: job.end_date || '',
              estimated_hours: job.estimated_hours || 0,
              estimated_cost: job.estimated_cost || 0,
              budget: job.budget || 0,
              profit_margin: job.profit_margin || 0,
              assigned_to: job.assigned_to || '',
            });
          }
        } finally {
          setDataLoading(false);
        }
      };
      
      loadData();
    }
  }, [isOpen, job]);

  const fetchClients = async () => {
    try {
      if (!user?.id) {
        setClients([]);
        return;
      }
      
      // Use standardized client fetching service
      const clientsData = await getClientsForSelectionAuto(profile, user.id);
      
      // Transform to component format
      setClients(clientsData.map(c => ({
        id: c.id,
        company_name: c.company_name || c.name,
        name: c.name
      })));
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive",
      });
      setClients([]);
    }
  };

  const fetchJobCategories = async () => {
    try {
      const categoriesData = await selectRecords('job_categories', {
        orderBy: 'name ASC',
      });
      setJobCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching job categories:', error);
      setJobCategories([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      if (!user?.id) {
        setEmployees([]);
        return;
      }
      
      // Use standardized employee fetching service
      const employeesData = await getEmployeesForAssignmentAuto(profile, user?.id);
      
      // Transform to component format
      const transformedEmployees = employeesData.map(emp => ({
        id: emp.user_id,
        name: emp.full_name
      }));
      
      setEmployees(transformedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        toast({
          title: 'Error',
          description: 'Job title is required',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Clean up empty string values for UUID fields
      const cleanedData: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        estimated_hours: formData.estimated_hours || 0,
        estimated_cost: formData.estimated_cost || 0,
        budget: formData.budget || 0,
        profit_margin: formData.profit_margin || 0,
        client_id: formData.client_id || null,
        category_id: formData.category_id || null,
        assigned_to: formData.assigned_to || null,
      };

      if (job?.id) {
        // Update existing job
        await updateRecord('jobs', cleanedData, { id: job.id }, user?.id);
        toast({
          title: 'Success',
          description: 'Job updated successfully',
        });
      } else {
        // Get agency_id from profile
        const profile = user?.id ? await selectOne('profiles', { user_id: user.id }) : null;
        if (!profile?.agency_id) {
          toast({
            title: 'Error',
            description: 'Unable to determine agency. Please ensure you are logged in.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        // Create new job
        const year = new Date().getFullYear();
        const timestamp = String(Date.now()).slice(-6);
        const jobNumber = `J-${year}-${timestamp}`;
        
        await insertRecord('jobs', {
          ...cleanedData,
          job_number: jobNumber,
          created_by: user?.id || null,
          agency_id: profile.agency_id,
        }, user?.id);

        toast({
          title: 'Success',
          description: 'Job created successfully',
        });
      }

      onJobSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving job:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save job',
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
          <DialogTitle>{job?.id ? 'Edit Job' : 'Create New Job'}</DialogTitle>
          <DialogDescription>
            {job?.id ? 'Update job details below.' : 'Fill in the details to create a new job.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client</Label>
              {dataLoading ? (
                <Input disabled placeholder="Loading clients..." />
              ) : (
                <div className="flex gap-2">
                  <Select 
                    value={
                      formData.client_id && clients.some(c => c.id === formData.client_id) 
                        ? formData.client_id 
                        : undefined
                    } 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                    onOpenChange={(open) => {
                      if (!open && formData.client_id && !clients.some(c => c.id === formData.client_id)) {
                        // Clear invalid value when closing
                        setFormData(prev => ({ ...prev, client_id: '' }));
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select client (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name || client.name || client.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.client_id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setFormData(prev => ({ ...prev, client_id: '' }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category_id">Category</Label>
              {dataLoading ? (
                <Input disabled placeholder="Loading categories..." />
              ) : (
                <div className="flex gap-2">
                  <Select 
                    value={
                      formData.category_id && jobCategories.some(c => c.id === formData.category_id) 
                        ? formData.category_id 
                        : undefined
                    } 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                    onOpenChange={(open) => {
                      if (!open && formData.category_id && !jobCategories.some(c => c.id === formData.category_id)) {
                        // Clear invalid value when closing
                        setFormData(prev => ({ ...prev, category_id: '' }));
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.category_id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setFormData(prev => ({ ...prev, category_id: '' }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_hours">Estimated Hours</Label>
              <Input
                id="estimated_hours"
                type="number"
                value={formData.estimated_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated_cost">Estimated Cost (₹)</Label>
              <Input
                id="estimated_cost"
                type="number"
                value={formData.estimated_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_cost: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (₹)</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profit_margin">Profit Margin (%)</Label>
              <Input
                id="profit_margin"
                type="number"
                value={formData.profit_margin}
                onChange={(e) => setFormData(prev => ({ ...prev, profit_margin: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To</Label>
            {dataLoading ? (
              <Input disabled placeholder="Loading employees..." />
            ) : (
              <div className="flex gap-2">
                <Select 
                  value={
                    formData.assigned_to && employees.some(e => e.id === formData.assigned_to) 
                      ? formData.assigned_to 
                      : undefined
                  } 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value }))}
                  onOpenChange={(open) => {
                    if (!open && formData.assigned_to && !employees.some(e => e.id === formData.assigned_to)) {
                      // Clear invalid value when closing
                      setFormData(prev => ({ ...prev, assigned_to: '' }));
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select employee (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.assigned_to && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFormData(prev => ({ ...prev, assigned_to: '' }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : job?.id ? 'Update Job' : 'Create Job'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JobFormDialog;