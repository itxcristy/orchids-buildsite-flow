import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Search, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { projectService, Project as ProjectType } from '@/services/api/project-service';
import { selectRecords } from '@/services/api/postgresql-service';
import { getAgencyId } from '@/utils/agencyUtils';
import { getEmployeesForAssignmentAuto } from '@/services/api/employee-selector-service';
import { getClientsForSelectionAuto } from '@/services/api/client-selector-service';
import { getDepartmentsForSelectionAuto } from '@/services/api/department-selector-service';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

interface Project {
  id?: string;
  name: string;
  description: string | null;
  project_code?: string | null;
  project_type?: string | null;
  status: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  start_date: string | null;
  end_date: string | null;
  deadline?: string | null;
  budget: number | null;
  actual_cost?: number | null;
  allocated_budget?: number | null;
  cost_center?: string | null;
  currency?: string;
  client_id: string | null;
  project_manager_id?: string | null;
  account_manager_id?: string | null;
  assigned_team: any; // JSONB - array of user IDs
  departments?: string[]; // Array of department IDs
  tags?: string[];
  categories?: string[];
  progress: number;
}

interface Client {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
}

interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  display_name?: string;
  department?: string;
  position?: string;
}

interface Department {
  id: string;
  name: string;
  manager_name?: string;
  member_count?: number;
}

interface ProjectFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  onProjectSaved: () => void;
}

const ProjectFormDialog: React.FC<ProjectFormDialogProps> = ({ isOpen, onClose, project, onProjectSaved }) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]); // Array of user_ids
  const [teamMemberSearchOpen, setTeamMemberSearchOpen] = useState(false);
  const [teamMemberSearchTerm, setTeamMemberSearchTerm] = useState('');
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]); // Array of department IDs
  
  const [tagInput, setTagInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');

  const [formData, setFormData] = useState<Project>({
    name: '',
    description: '',
    project_code: null,
    project_type: null,
    status: 'planning',
    priority: 'medium',
    start_date: null,
    end_date: null,
    deadline: null,
    budget: null,
    actual_cost: 0,
    allocated_budget: null,
    cost_center: null,
    currency: 'USD',
    client_id: null,
    project_manager_id: null,
    account_manager_id: null,
    assigned_team: [],
    departments: [],
    tags: [],
    categories: [],
    progress: 0,
  });

  // Normalize status value for display (convert database format to form format)
  const normalizeStatusForDisplay = (status: string | undefined): string => {
    if (!status) return 'planning';
    if (status === 'in_progress') return 'in-progress';
    if (status === 'on_hold') return 'on-hold';
    return status;
  };

  // Normalize status value for database (convert form format to database format)
  const normalizeStatusForDatabase = (status: string): string => {
    if (status === 'in-progress') return 'in_progress';
    if (status === 'on-hold') return 'on_hold';
    return status;
  };

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | null | undefined): string | null => {
    if (!dateString) return null;
    try {
      // Handle date strings that might already be in YYYY-MM-DD format
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        // Validate it's a reasonable date (after 2000)
        if (dateString < '2000-01-01') {
          console.warn('Invalid date detected (too old):', dateString);
          return null;
        }
        return dateString;
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      
      // Check if date is reasonable (after year 2000)
      const year = date.getFullYear();
      if (year < 2000 || year > 2100) {
        console.warn('Invalid date detected (out of range):', dateString, 'Year:', year);
        return null;
      }
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return null;
    }
  };

  // Update form data when project prop changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      if (project && project.id) {
        // Editing existing project - populate form with project data
        const proj = project as any;
        setFormData({
          name: proj.name || '',
          description: proj.description || '',
          project_code: proj.project_code || null,
          project_type: proj.project_type || null,
          status: normalizeStatusForDisplay(proj.status),
          priority: proj.priority || 'medium',
          start_date: formatDateForInput(proj.start_date),
          end_date: formatDateForInput(proj.end_date),
          deadline: formatDateForInput(proj.deadline),
          budget: proj.budget || null,
          actual_cost: proj.actual_cost || 0,
          allocated_budget: proj.allocated_budget || null,
          cost_center: proj.cost_center || null,
          currency: proj.currency || 'USD',
          client_id: proj.client_id || null,
          project_manager_id: proj.project_manager_id || null,
          account_manager_id: proj.account_manager_id || null,
          assigned_team: [],
          departments: Array.isArray(proj.departments) ? proj.departments : [],
          tags: Array.isArray(proj.tags) ? proj.tags : [],
          categories: Array.isArray(proj.categories) ? proj.categories : [],
          progress: proj.progress || 0,
        });

        // Parse assigned_team from project - expect array of user IDs
        if (proj.assigned_team) {
          let parsed: string[] = [];
          if (typeof proj.assigned_team === 'string') {
            try {
              const parsedJson = JSON.parse(proj.assigned_team);
              if (Array.isArray(parsedJson)) {
                // Extract user IDs from objects or use strings directly
                parsed = parsedJson.map((m: any) => 
                  typeof m === 'string' ? m : m.user_id || m.id || String(m)
                );
              }
            } catch {
              parsed = [];
            }
          } else if (Array.isArray(proj.assigned_team)) {
            parsed = proj.assigned_team.map((m: any) => 
              typeof m === 'string' ? m : m.user_id || m.id || String(m)
            );
          }
          setSelectedTeamMembers(parsed);
        } else {
          setSelectedTeamMembers([]);
        }

        // Set selected departments
        if (proj.departments && Array.isArray(proj.departments)) {
          setSelectedDepartments(proj.departments);
        } else {
          setSelectedDepartments([]);
        }
      } else {
        // Creating new project - reset form
        setFormData({
          name: '',
          description: '',
          project_code: null,
          project_type: null,
          status: 'planning',
          priority: 'medium',
          start_date: null,
          end_date: null,
          deadline: null,
          budget: null,
          actual_cost: 0,
          allocated_budget: null,
          cost_center: null,
          currency: 'USD',
          client_id: null,
          project_manager_id: null,
          account_manager_id: null,
          assigned_team: [],
          departments: [],
          tags: [],
          categories: [],
          progress: 0,
        });
        setSelectedTeamMembers([]);
        setSelectedDepartments([]);
        setTagInput('');
        setCategoryInput('');
      }
    }
  }, [project, isOpen]);

  // Fetch clients, employees, and departments when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchClients();
      fetchEmployees();
      fetchDepartments();
    }
  }, [isOpen]);

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      
      // Use standardized client fetching service
      const clientsData = await getClientsForSelectionAuto(profile, user?.id, {
        includeInactive: false
      });
      
      // Transform to Client interface format
      setClients(clientsData.map(c => ({
        id: c.id,
        name: c.name,
        company_name: c.company_name,
        email: c.email
      })));
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clients',
        variant: 'destructive',
      });
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      
      // Use standardized employee fetching service
      const employeesData = await getEmployeesForAssignmentAuto(profile, user?.id);
      
      // Transform to Employee interface format
      const transformedEmployees: Employee[] = employeesData.map(emp => ({
        id: emp.user_id,
        user_id: emp.user_id,
        full_name: emp.full_name,
        display_name: emp.display_name || emp.full_name,
        department: emp.department,
        position: emp.position
      }));
      
      setEmployees(transformedEmployees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast({
        title: 'Error',
        description: 'Failed to load employees',
        variant: 'destructive',
      });
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      
      // Use standardized department fetching service
      const departmentsData = await getDepartmentsForSelectionAuto(profile, user?.id, {
        includeInactive: false
      });
      
      // Transform to Department interface format
      setDepartments(departmentsData.map(d => ({
        id: d.id,
        name: d.name,
        manager_name: d.manager_name || undefined,
        member_count: d.member_count || undefined
      })));
    } catch (error: any) {
      console.error('Error fetching departments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load departments',
        variant: 'destructive',
      });
    } finally {
      setLoadingDepartments(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(t => t !== tag)
    }));
  };

  const addCategory = () => {
    if (categoryInput.trim() && !formData.categories?.includes(categoryInput.trim())) {
      setFormData(prev => ({
        ...prev,
        categories: [...(prev.categories || []), categoryInput.trim()]
      }));
      setCategoryInput('');
    }
  };

  const removeCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: (prev.categories || []).filter(c => c !== category)
    }));
  };

  const toggleTeamMember = (userId: string) => {
    setSelectedTeamMembers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const toggleDepartment = (deptId: string) => {
    setSelectedDepartments(prev => {
      if (prev.includes(deptId)) {
        return prev.filter(id => id !== deptId);
      } else {
        return [...prev, deptId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Project name is required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.progress < 0 || formData.progress > 100) {
      toast({
        title: 'Validation Error',
        description: 'Progress must be between 0 and 100',
        variant: 'destructive',
      });
      return;
    }

    // Date validation
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const minDate = '2000-01-01'; // Reasonable minimum date
    
    if (formData.start_date) {
      // Check if start date is too old (before 2000)
      if (formData.start_date < minDate) {
        toast({
          title: 'Validation Error',
          description: 'Start date cannot be before year 2000. Please enter a valid date.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (formData.end_date) {
      // Check if end date is too old
      if (formData.end_date < minDate) {
        toast({
          title: 'Validation Error',
          description: 'End date cannot be before year 2000. Please enter a valid date.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (formData.deadline) {
      // Check if deadline is too old
      if (formData.deadline < minDate) {
        toast({
          title: 'Validation Error',
          description: 'Deadline cannot be before year 2000. Please enter a valid date.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      toast({
        title: 'Validation Error',
        description: 'End date must be after start date',
        variant: 'destructive',
      });
      return;
    }

    if (formData.start_date && formData.deadline && formData.start_date > formData.deadline) {
      toast({
        title: 'Validation Error',
        description: 'Deadline must be after start date',
        variant: 'destructive',
      });
      return;
    }

    if (formData.allocated_budget && formData.budget && formData.allocated_budget > formData.budget) {
      toast({
        title: 'Validation Error',
        description: 'Allocated budget cannot exceed total budget',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const projectData: Partial<ProjectType> = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        project_code: formData.project_code || undefined,
        project_type: formData.project_type || undefined,
        status: normalizeStatusForDatabase(formData.status) as any,
        priority: formData.priority || 'medium',
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        deadline: formData.deadline || null,
        budget: formData.budget || null,
        actual_cost: formData.actual_cost || 0,
        allocated_budget: formData.allocated_budget || null,
        cost_center: formData.cost_center || null,
        currency: formData.currency || 'USD',
        client_id: formData.client_id || null,
        project_manager_id: formData.project_manager_id || null,
        account_manager_id: formData.account_manager_id || null,
        assigned_team: selectedTeamMembers, // Array of user IDs
        departments: selectedDepartments, // Array of department IDs
        tags: formData.tags || [],
        categories: formData.categories || [],
        progress: formData.progress,
      };

      if (project?.id) {
        // Update existing project
        await projectService.updateProject(project.id, projectData, profile, user?.id);
        toast({
          title: 'Success',
          description: 'Project updated successfully',
        });
      } else {
        // Create new project
        await projectService.createProject(projectData, profile, user?.id);
        toast({
          title: 'Success',
          description: 'Project created successfully',
        });
      }

      onProjectSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save project',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.company_name?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  // Filter employees based on search term
  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(teamMemberSearchTerm.toLowerCase()) ||
    emp.display_name?.toLowerCase().includes(teamMemberSearchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(teamMemberSearchTerm.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === formData.client_id);
  const selectedTeamMemberObjects = employees.filter(e => selectedTeamMembers.includes(e.user_id));
  const selectedDepartmentObjects = departments.filter(d => selectedDepartments.includes(d.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{project?.id ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {project?.id ? 'Update project details below.' : 'Fill in the details to create a new project.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold text-sm">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="Enter project name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_code">Project Code</Label>
                <Input
                  id="project_code"
                  value={formData.project_code || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_code: e.target.value || null }))}
                  placeholder="Auto-generated if empty"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_type">Project Type</Label>
                <Input
                  id="project_type"
                  value={formData.project_type || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_type: e.target.value || null }))}
                  placeholder="e.g., Web Development, Construction, Marketing"
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority || 'medium'} onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}>
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
              <div className="space-y-2">
                <Label htmlFor="progress">Progress (%)</Label>
                <Input
                  id="progress"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData(prev => ({ ...prev, progress: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Enter project description"
              />
            </div>
          </div>

          {/* Client & Team Assignment */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold text-sm">Client & Team Assignment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_id">Client</Label>
                <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      disabled={loadingClients}
                    >
                      {selectedClient ? (selectedClient.company_name || selectedClient.name) : "Select client..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search clients..." 
                        value={clientSearchTerm}
                        onValueChange={setClientSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>No clients found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__none__"
                            onSelect={() => {
                              setFormData(prev => ({ ...prev, client_id: null }));
                              setClientSearchOpen(false);
                            }}
                          >
                            No Client
                          </CommandItem>
                          {filteredClients.map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.id}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, client_id: client.id }));
                                setClientSearchOpen(false);
                                setClientSearchTerm('');
                              }}
                            >
                              {client.company_name || client.name}
                              {client.email && <span className="text-xs text-muted-foreground ml-2">({client.email})</span>}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_manager_id">Project Manager</Label>
                <Select 
                  value={formData.project_manager_id || '__none__'} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, project_manager_id: value === '__none__' ? null : value }))}
                  disabled={loadingEmployees}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingEmployees ? "Loading..." : "Select project manager"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Project Manager</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} {emp.department && `(${emp.department})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_manager_id">Account Manager</Label>
              <Select 
                value={formData.account_manager_id || '__none__'} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, account_manager_id: value === '__none__' ? null : value }))}
                disabled={loadingEmployees}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingEmployees ? "Loading..." : "Select account manager"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Account Manager</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} {emp.department && `(${emp.department})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Team Members</Label>
              <Popover open={teamMemberSearchOpen} onOpenChange={setTeamMemberSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    disabled={loadingEmployees}
                  >
                    {selectedTeamMemberObjects.length > 0 
                      ? `${selectedTeamMemberObjects.length} member(s) selected`
                      : "Select team members..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search employees..." 
                      value={teamMemberSearchTerm}
                      onValueChange={setTeamMemberSearchTerm}
                    />
                    <CommandList>
                      <CommandEmpty>No employees found.</CommandEmpty>
                      <CommandGroup>
                        {filteredEmployees.map((emp) => (
                          <CommandItem
                            key={emp.id}
                            value={emp.id}
                            onSelect={() => {
                              toggleTeamMember(emp.user_id);
                            }}
                          >
                            <Checkbox
                              checked={selectedTeamMembers.includes(emp.user_id)}
                              onCheckedChange={() => toggleTeamMember(emp.user_id)}
                              className="mr-2"
                            />
                            {emp.full_name}
                            {emp.department && <span className="text-xs text-muted-foreground ml-2">({emp.department})</span>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedTeamMemberObjects.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTeamMemberObjects.map((emp) => (
                    <Badge key={emp.id} variant="secondary" className="flex items-center gap-1">
                      {emp.full_name}
                      <button
                        type="button"
                        onClick={() => toggleTeamMember(emp.user_id)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Departments</Label>
              <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
                {loadingDepartments ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : departments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No departments available</p>
                ) : (
                  <div className="space-y-2">
                    {departments.map((dept) => (
                      <div key={dept.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dept-${dept.id}`}
                          checked={selectedDepartments.includes(dept.id)}
                          onCheckedChange={() => toggleDepartment(dept.id)}
                        />
                        <label
                          htmlFor={`dept-${dept.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {dept.name}
                          {dept.member_count !== undefined && (
                            <span className="text-xs text-muted-foreground ml-2">({dept.member_count} members)</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedDepartmentObjects.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedDepartmentObjects.map((dept) => (
                    <Badge key={dept.id} variant="outline" className="flex items-center gap-1">
                      {dept.name}
                      <button
                        type="button"
                        onClick={() => toggleDepartment(dept.id)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Timeline & Dates */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold text-sm">Timeline & Dates</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  min="2000-01-01"
                  max="2100-12-31"
                  value={formData.start_date || ''}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    // Validate date is reasonable
                    if (value && value < '2000-01-01') {
                      toast({
                        title: 'Invalid Date',
                        description: 'Start date cannot be before year 2000',
                        variant: 'destructive',
                      });
                      return;
                    }
                    setFormData(prev => ({ ...prev, start_date: value }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  min={formData.start_date || '2000-01-01'}
                  max="2100-12-31"
                  value={formData.end_date || ''}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    // Validate date is reasonable and after start date
                    if (value) {
                      if (value < '2000-01-01') {
                        toast({
                          title: 'Invalid Date',
                          description: 'End date cannot be before year 2000',
                          variant: 'destructive',
                        });
                        return;
                      }
                      if (formData.start_date && value < formData.start_date) {
                        toast({
                          title: 'Invalid Date',
                          description: 'End date must be after start date',
                          variant: 'destructive',
                        });
                        return;
                      }
                    }
                    setFormData(prev => ({ ...prev, end_date: value }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  min={formData.start_date || '2000-01-01'}
                  max="2100-12-31"
                  value={formData.deadline || ''}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    // Validate date is reasonable and after start date
                    if (value) {
                      if (value < '2000-01-01') {
                        toast({
                          title: 'Invalid Date',
                          description: 'Deadline cannot be before year 2000',
                          variant: 'destructive',
                        });
                        return;
                      }
                      if (formData.start_date && value < formData.start_date) {
                        toast({
                          title: 'Invalid Date',
                          description: 'Deadline must be after start date',
                          variant: 'destructive',
                        });
                        return;
                      }
                    }
                    setFormData(prev => ({ ...prev, deadline: value }));
                  }}
                />
              </div>
            </div>
          </div>

          {/* Budget & Financial */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold text-sm">Budget & Financial</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency || 'USD'} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Total Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.budget || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="allocated_budget">Allocated Budget</Label>
                <Input
                  id="allocated_budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.allocated_budget || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, allocated_budget: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="0.00"
                />
                {formData.allocated_budget && formData.budget && formData.allocated_budget > formData.budget && (
                  <p className="text-xs text-destructive">Allocated budget cannot exceed total budget</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost_center">Cost Center</Label>
                <Input
                  id="cost_center"
                  value={formData.cost_center || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost_center: e.target.value || null }))}
                  placeholder="e.g., Engineering, Marketing"
                />
              </div>
            </div>

            {project?.id && (
              <div className="space-y-2">
                <Label htmlFor="actual_cost">Actual Cost</Label>
                <Input
                  id="actual_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.actual_cost || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, actual_cost: Number(e.target.value) }))}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          {/* Tags & Categories */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Tags & Categories</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Enter tag and press Enter"
                  />
                  <Button type="button" onClick={addTag} variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="categories">Categories</Label>
                <div className="flex gap-2">
                  <Input
                    id="categories"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCategory();
                      }
                    }}
                    placeholder="Enter category and press Enter"
                  />
                  <Button type="button" onClick={addCategory} variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.categories && formData.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.categories.map((category, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {category}
                        <button
                          type="button"
                          onClick={() => removeCategory(category)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : project?.id ? 'Update Project' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectFormDialog;
