import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calendar, Users, Search, Filter, Edit, Trash2, Eye, Loader2, DollarSign, TrendingUp, CheckCircle, Clock, AlertCircle, GanttChart, List, MoreVertical, GripVertical, Building2, ExternalLink, Calculator, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from '@/lib/database';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getAgencyId } from '@/utils/agencyUtils';
import { DepartmentBreadcrumb } from "@/components/DepartmentBreadcrumb";
import { useDepartmentNavigation } from "@/hooks/useDepartmentNavigation";
import ProjectFormDialog from "@/components/ProjectFormDialog";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import ProjectDetailsDialog from "@/components/ProjectDetailsDialog";
import { projectService, Project as ProjectType } from '@/services/api/project-service';
import { selectRecords } from '@/services/api/postgresql-service';
import { getEmployeesForAssignmentAuto } from '@/services/api/employee-selector-service';

interface Project {
  id: string;
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
  client_id: string | null;
  project_manager_id?: string | null;
  account_manager_id?: string | null;
  progress: number;
  assigned_team: any; // JSONB
  departments?: string[];
  tags?: string[];
  categories?: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  agency_id: string;
  client?: {
    id: string;
    name: string;
    company_name: string | null;
  };
  project_manager?: {
    id: string;
    full_name: string;
  };
  account_manager?: {
    id: string;
    full_name: string;
  };
}

const Projects = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const {
    departmentId: urlDepartmentId,
    departmentName: urlDepartmentName,
    employeeId: urlEmployeeId,
    employeeName: urlEmployeeName,
    projectId: urlProjectId,
    navigateToDepartment,
    navigateToEmployees,
    navigateToAttendance,
    navigateToPayroll,
  } = useDepartmentNavigation();
  
  // Legacy support for old URL params
  const [searchParams] = useSearchParams();
  const legacyDepartmentId = searchParams.get('department');
  const legacyDepartmentName = searchParams.get('name');
  const clientFilterId = searchParams.get('client_id');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [projectToView, setProjectToView] = useState<Project | null>(null);
  const [draggedProject, setDraggedProject] = useState<string | null>(null);
  const [projectStats, setProjectStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    onHold: 0,
    totalBudget: 0,
  });
  const [clients, setClients] = useState<Array<{ id: string; name: string; company_name: string | null }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [urlDepartmentId, urlEmployeeId, legacyDepartmentId, statusFilter, priorityFilter, clientFilter, managerFilter, departmentFilter]);

  const fetchFilterOptions = async () => {
    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) return;

      // Fetch clients, employees, and departments for filters
      const [clientsData, employeesData, departmentsData] = await Promise.all([
        selectRecords('clients', {
          where: { agency_id: agencyId, is_active: true },
          orderBy: 'name ASC'
        }),
        getEmployeesForAssignmentAuto(profile, user?.id).catch(() => []),
        selectRecords('departments', {
          filters: [
            { column: 'is_active', operator: 'eq', value: true }
          ],
          orderBy: 'name ASC'
        }).catch(() => [])
      ]);

      setClients(clientsData.map((c: any) => ({
        id: c.id,
        name: c.name,
        company_name: c.company_name
      })));

      setEmployees(employeesData.map((e: any) => ({
        id: e.user_id,
        full_name: e.full_name
      })));

      setDepartments(departmentsData.map((d: any) => ({
        id: d.id,
        name: d.name
      })));
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // Use projectService for consistency
      const filters: any = {};
      if (statusFilter !== 'all') {
        filters.status = [statusFilter === 'in-progress' ? 'in_progress' : statusFilter === 'on-hold' ? 'on_hold' : statusFilter];
      }
      if (priorityFilter !== 'all') {
        filters.priority = [priorityFilter];
      }
      if (clientFilter !== 'all') {
        filters.client_id = clientFilter;
      }
      if (managerFilter !== 'all') {
        filters.project_manager_id = managerFilter;
      }
      if (searchTerm) {
        filters.search = searchTerm;
      }

      const projectsData = await projectService.getProjects(filters, profile, user?.id);

      // Filter by department or employee if URL parameters are provided
      const deptId = urlDepartmentId || legacyDepartmentId;
      let filteredData = projectsData;

      if (deptId) {
        const { data: assignments } = await db
          .from('team_assignments')
          .select('user_id, department_id')
          .eq('department_id', deptId)
          .eq('is_active', true);
        
        const userDepartmentMap = new Map<string, string>();
        if (assignments) {
          assignments.forEach((ta: any) => {
            if (ta.user_id) {
              userDepartmentMap.set(ta.user_id, ta.department_id);
            }
          });
        }

        filteredData = filteredData.filter((project: Project) => {
          if (!project.assigned_team) return false;
          let teamMembers: any[] = [];
          try {
            teamMembers = typeof project.assigned_team === 'string' 
              ? JSON.parse(project.assigned_team) 
              : project.assigned_team;
          } catch {
            return false;
          }
          return teamMembers.some((member: any) => {
            const userId = member.user_id || member.id;
            return userId && userDepartmentMap.has(userId);
          });
        });
      }
      
      if (urlEmployeeId) {
        filteredData = filteredData.filter((project: Project) => {
          if (!project.assigned_team) return false;
          let teamMembers: any[] = [];
          try {
            teamMembers = typeof project.assigned_team === 'string' 
              ? JSON.parse(project.assigned_team) 
              : project.assigned_team;
          } catch {
            return false;
          }
          return teamMembers.some((member: any) => {
            const userId = member.user_id || member.id;
            return userId === urlEmployeeId;
          });
        });
      }
      
      // If filtering by client from URL, apply client filter
      if (clientFilterId) {
        filteredData = filteredData.filter((p: Project) => p.client_id === clientFilterId);
      }

      // Filter by department if selected
      if (departmentFilter !== 'all') {
        filteredData = filteredData.filter((project: Project) => {
          if (!project.departments) return false;
          const deptArray = Array.isArray(project.departments) ? project.departments : 
                           typeof project.departments === 'string' ? JSON.parse(project.departments || '[]') : [];
          return deptArray.includes(departmentFilter);
        });
      }

      setProjects(filteredData);
      
      // Calculate statistics from all projects (not filtered)
      const total = filteredData.length;
      const active = filteredData.filter((p: Project) => {
        const status = p.status?.toLowerCase();
        return status === 'in-progress' || status === 'in_progress' || status === 'active';
      }).length;
      const completed = filteredData.filter((p: Project) => p.status?.toLowerCase() === 'completed').length;
      const onHold = filteredData.filter((p: Project) => {
        const status = p.status?.toLowerCase();
        return status === 'on-hold' || status === 'on_hold';
      }).length;
      
      // Calculate total budget - ensure budget is a number
      const totalBudget = filteredData.reduce((sum: number, p: Project) => {
        const budget = typeof p.budget === 'number' ? p.budget : 
                      typeof p.budget === 'string' ? parseFloat(p.budget) || 0 : 0;
        return sum + budget;
      }, 0);
      
      setProjectStats({
        total,
        active,
        completed,
        onHold,
        totalBudget,
      });
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch projects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewProject = () => {
    setSelectedProject(null);
    setProjectFormOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setProjectFormOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleViewProject = (project: Project) => {
    setProjectToView(project);
    setDetailsDialogOpen(true);
  };

  const handleProjectSaved = () => {
    fetchProjects();
    setSelectedProject(null);
  };

  const handleProjectDeleted = () => {
    fetchProjects();
    setProjectToDelete(null);
  };

  // Pipeline stages for projects
  const pipelineStages = [
    { name: 'Planning', status: 'planning', color: 'bg-blue-500', icon: '📋' },
    { name: 'In Progress', status: 'in-progress', color: 'bg-yellow-500', icon: '⚡' },
    { name: 'On Hold', status: 'on-hold', color: 'bg-orange-500', icon: '⏸️' },
    { name: 'Completed', status: 'completed', color: 'bg-green-500', icon: '✅' },
    { name: 'Cancelled', status: 'cancelled', color: 'bg-red-500', icon: '❌' },
  ];

  // Group projects by status for pipeline view
  const projectsByStatus = pipelineStages.reduce((acc, stage) => {
    acc[stage.status] = projects.filter(project => {
      const normalizedStatus = project.status === 'in_progress' ? 'in-progress' : 
                              project.status === 'on_hold' ? 'on-hold' : project.status;
      return normalizedStatus === stage.status;
    });
    return acc;
  }, {} as Record<string, Project[]>);

  // Handle project status change in pipeline
  const handleProjectStatusChange = async (projectId: string, newStatus: string) => {
    try {
      // Convert display status to database format if needed
      const dbStatus = newStatus === 'in-progress' ? 'in_progress' : 
                      newStatus === 'on-hold' ? 'on_hold' : newStatus;

      const { data, error } = await db
        .from('projects')
        .update({ status: dbStatus })
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Project status updated successfully',
      });

      // Refresh projects
      fetchProjects();
    } catch (error: any) {
      console.error('Error updating project status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update project status',
        variant: 'destructive',
      });
    }
  };

  // Drag and drop handlers
  const onDragStart = (e: React.DragEvent, projectId: string) => {
    setDraggedProject(projectId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', projectId);
    // Create a custom drag image
    const dragElement = e.currentTarget as HTMLElement;
    if (dragElement) {
      dragElement.style.opacity = '0.5';
      dragElement.style.transform = 'scale(0.95) rotate(2deg)';
      dragElement.style.cursor = 'grabbing';
    }
  };

  const onDragEnd = (e: React.DragEvent) => {
    setDraggedProject(null);
    const dragElement = e.currentTarget as HTMLElement;
    if (dragElement) {
      dragElement.style.opacity = '1';
      dragElement.style.transform = 'scale(1) rotate(0deg)';
      dragElement.style.cursor = 'pointer';
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const target = e.currentTarget as HTMLElement;
    const dropZone = target.querySelector('.pipeline-column') as HTMLElement;
    if (dropZone) {
      dropZone.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'bg-blue-50/50');
      dropZone.style.transform = 'scale(1.01)';
    }
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const dropZone = target.querySelector('.pipeline-column') as HTMLElement;
    if (dropZone) {
      dropZone.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'bg-blue-50/50');
      dropZone.style.transform = 'scale(1)';
    }
  };

  const onDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    const projectId = e.dataTransfer.getData('text/plain');
    
    const target = e.currentTarget as HTMLElement;
    const dropZone = target.querySelector('.pipeline-column') as HTMLElement;
    if (dropZone) {
      dropZone.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'bg-blue-50/50');
      dropZone.style.transform = 'scale(1)';
      // Add a brief success animation
      // Animation removed for ERP system
      setTimeout(() => {
        // Animation removed for ERP system
      }, 500);
    }

    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        const currentStatus = project.status === 'in_progress' ? 'in-progress' : 
                            project.status === 'on_hold' ? 'on-hold' : project.status;
        if (currentStatus !== newStatus) {
          handleProjectStatusChange(projectId, newStatus);
        }
      }
    }
    
    setDraggedProject(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress':
      case 'in_progress': return 'secondary';
      case 'planning': return 'outline';
      case 'on-hold':
      case 'on_hold': return 'destructive';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    // Handle both database format (in_progress) and display format (in-progress)
    const normalizedStatus = status === 'in_progress' ? 'in-progress' : 
                            status === 'on_hold' ? 'on-hold' : status;
    switch (normalizedStatus) {
      case 'in-progress':
      case 'in_progress': return 'In Progress';
      case 'on-hold':
      case 'on_hold': return 'On Hold';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Format currency with compact notation for large numbers
  const formatCurrency = (amount: number): string => {
    if (!amount || amount === 0) return '₹0';
    
    // For amounts >= 1 crore (10,000,000)
    if (amount >= 10000000) {
      const crores = amount / 10000000;
      return `₹${crores.toFixed(crores >= 100 ? 0 : 1)}Cr`;
    }
    
    // For amounts >= 1 lakh (100,000)
    if (amount >= 100000) {
      const lakhs = amount / 100000;
      return `₹${lakhs.toFixed(lakhs >= 100 ? 0 : 1)}L`;
    }
    
    // For amounts >= 1 thousand (1,000)
    if (amount >= 1000) {
      const thousands = amount / 1000;
      return `₹${thousands.toFixed(thousands >= 100 ? 0 : 1)}K`;
    }
    
    // For smaller amounts, show full number with commas
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  // Memoized filtered and sorted projects
  // Note: clientFilter and managerFilter are applied server-side in fetchProjects
  // Only search term and status/priority are applied client-side here for responsiveness
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      // Search filter (client-side for instant feedback)
      const matchesSearch = !searchTerm || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.project_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter (client-side for instant feedback)
      const normalizedStatus = project.status === 'in_progress' ? 'in-progress' : 
                               project.status === 'on_hold' ? 'on-hold' : project.status;
      const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;
      
      // Priority filter (client-side for instant feedback)
      const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'budget':
          comparison = (b.budget || 0) - (a.budget || 0);
          break;
        case 'progress':
          comparison = b.progress - a.progress;
          break;
        case 'start_date':
          comparison = (a.start_date || '').localeCompare(b.start_date || '');
          break;
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          comparison = (priorityOrder[b.priority || 'medium'] || 0) - (priorityOrder[a.priority || 'medium'] || 0);
          break;
        case 'created_at':
        default:
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return filtered;
  }, [projects, searchTerm, statusFilter, priorityFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / pageSize);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, currentPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Project Name', 'Project Code', 'Client', 'Status', 'Priority', 'Progress (%)', 'Budget', 'Start Date', 'End Date', 'Project Manager'];
    const rows = filteredProjects.map(project => [
      project.name || '',
      project.project_code || '',
      project.client?.company_name || project.client?.name || 'No Client',
      getStatusLabel(project.status),
      project.priority || 'medium',
      project.progress || 0,
      project.budget || 0,
      project.start_date ? new Date(project.start_date).toLocaleDateString() : '',
      project.end_date ? new Date(project.end_date).toLocaleDateString() : '',
      project.project_manager?.full_name || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `projects_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Success',
      description: 'Projects exported to CSV successfully',
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading projects...</span>
        </div>
      </div>
    );
  }

  const displayDepartmentName = urlDepartmentName || (legacyDepartmentName ? decodeURIComponent(legacyDepartmentName) : null);
  const displayEmployeeName = urlEmployeeName;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <DepartmentBreadcrumb currentPage="projects" />
      
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-bold">Projects</h1>
            {displayDepartmentName && (
              <Badge 
                variant="secondary" 
                className="text-sm cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => navigateToDepartment(urlDepartmentId || legacyDepartmentId || undefined, displayDepartmentName || undefined)}
              >
                <Building2 className="h-3 w-3 mr-1" />
                {displayDepartmentName}
              </Badge>
            )}
            {displayEmployeeName && (
              <Badge 
                variant="outline" 
                className="text-sm cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigateToEmployees({ employeeId: urlEmployeeId || undefined, employeeName: displayEmployeeName || undefined })}
              >
                <Users className="h-3 w-3 mr-1" />
                {displayEmployeeName}
              </Badge>
            )}
          </div>
          <p className="text-sm lg:text-base text-muted-foreground mt-1">
            {displayEmployeeName 
              ? `Projects for ${displayEmployeeName}`
              : displayDepartmentName 
              ? `Projects for ${displayDepartmentName} department`
              : "Manage and track project progress"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto" disabled={filteredProjects.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handleNewProject} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                <p className="text-xl lg:text-2xl font-bold">{projectStats.total}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-xl lg:text-2xl font-bold">{projectStats.active}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-xl lg:text-2xl font-bold">{projectStats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">On Hold</p>
                <p className="text-xl lg:text-2xl font-bold">{projectStats.onHold}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                <p className="text-xl lg:text-2xl font-bold truncate" title={`₹${projectStats.totalBudget.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}>
                  {formatCurrency(projectStats.totalBudget)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col space-y-3 lg:flex-row lg:space-y-0 lg:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search projects by name, code, description, or client..." 
                  className="pl-10 h-10" 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-full lg:w-[150px] h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(value) => {
                setPriorityFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-full lg:w-[130px] h-10">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-[150px] h-10">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Newest First</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="budget">Budget (High-Low)</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="start_date">Start Date</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="h-10"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
            
            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={clientFilter} onValueChange={(value) => {
                    setClientFilter(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name || client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Project Manager</Label>
                  <Select value={managerFilter} onValueChange={(value) => {
                    setManagerFilter(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Managers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Managers</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={departmentFilter} onValueChange={(value) => {
                    setDepartmentFilter(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projects Content with Tabs */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger value="pipeline">
            <GanttChart className="h-4 w-4 mr-2" />
            Pipeline View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'No projects found matching your search.' : 'No projects found.'}
              </p>
              {!searchTerm && (
                <Button 
                  className="mt-4" 
                  onClick={handleNewProject}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Project
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <div>
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredProjects.length)} of {filteredProjects.length} projects
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Page Size:</Label>
              <Select value={pageSize.toString()} onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-[80px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 lg:gap-6">
            {paginatedProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md">
              <CardHeader className="pb-4">
                <div className="flex flex-col space-y-3 lg:flex-row lg:justify-between lg:items-start lg:space-y-0">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg lg:text-xl break-words">{project.name}</CardTitle>
                    <CardDescription className="text-sm lg:text-base mt-1 break-words">{project.description}</CardDescription>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Badge variant={getStatusColor(project.status)} className="self-start">
                      {getStatusLabel(project.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Section */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="w-full h-3 lg:h-2" />
                  </div>
                  
                  {/* Project Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-6 text-sm text-muted-foreground">
                    {project.start_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">Start: {new Date(project.start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {project.end_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">Due: {new Date(project.end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {project.client && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {project.client.company_name || project.client.name}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Budget and Actions */}
                  <div className="flex flex-col space-y-3 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
                    <div className="text-sm lg:text-base font-medium">
                      Budget: ₹{(project.budget || 0).toLocaleString()}
                    </div>
                    <div className="flex flex-col space-y-2 lg:flex-row lg:gap-2 lg:space-y-0">
                      <Button variant="outline" size="sm" onClick={() => handleViewProject(project)} className="w-full lg:w-auto h-9">
                        <Eye className="h-4 w-4 mr-2 lg:mr-1" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full lg:w-auto h-9">
                            <MoreVertical className="h-4 w-4 mr-2 lg:mr-1" />
                            More
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewProject(project)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditProject(project)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {(() => {
                            // Parse assigned_team to check if it has team members
                            if (!project.assigned_team) return false;
                            try {
                              const teamMembers = typeof project.assigned_team === 'string' 
                                ? JSON.parse(project.assigned_team) 
                                : project.assigned_team;
                              return Array.isArray(teamMembers) && teamMembers.length > 0;
                            } catch {
                              return false;
                            }
                          })() && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => {
                                  navigateToEmployees({ 
                                    departmentId: urlDepartmentId || legacyDepartmentId || undefined,
                                    departmentName: displayDepartmentName || undefined
                                  });
                                }}
                              >
                                <Users className="h-4 w-4 mr-2" />
                                View Team Members
                                <ExternalLink className="h-3 w-3 ml-auto" />
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  navigateToAttendance({ 
                                    projectId: project.id,
                                    projectName: project.name,
                                    departmentId: urlDepartmentId || legacyDepartmentId || undefined,
                                    departmentName: displayDepartmentName || undefined
                                  });
                                }}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                View Team Attendance
                                <ExternalLink className="h-3 w-3 ml-auto" />
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  navigateToPayroll({ 
                                    projectId: project.id,
                                    projectName: project.name,
                                    departmentId: urlDepartmentId || legacyDepartmentId || undefined,
                                    departmentName: displayDepartmentName || undefined
                                  });
                                }}
                              >
                                <Calculator className="h-4 w-4 mr-2" />
                                View Team Payroll
                                <ExternalLink className="h-3 w-3 ml-auto" />
                              </DropdownMenuItem>
                            </>
                          )}
                          {displayDepartmentName && (urlDepartmentId || legacyDepartmentId) && (
                            <DropdownMenuItem 
                              onClick={() => navigateToDepartment(urlDepartmentId || legacyDepartmentId || undefined, displayDepartmentName || undefined)}
                            >
                              <Building2 className="h-4 w-4 mr-2" />
                              View Department
                              <ExternalLink className="h-3 w-3 ml-auto" />
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteProject(project)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">Project Pipeline</CardTitle>
              <CardDescription className="text-base">
                Visual representation of projects through different stages. Drag and drop projects to change their status.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 lg:p-6">
              <div className="flex gap-4 lg:gap-5 xl:gap-6 overflow-x-auto pb-4 -mx-4 lg:-mx-6 px-4 lg:px-6 scrollbar-thin">
                {pipelineStages.map((stage) => {
                  const stageProjects = projectsByStatus[stage.status] || [];
                  const stageBudget = stageProjects.reduce((sum, project) => {
                    const budget = typeof project.budget === 'number' ? project.budget : 
                                  typeof project.budget === 'string' ? parseFloat(project.budget) || 0 : 0;
                    return sum + budget;
                  }, 0);
                  const avgProgress = stageProjects.length > 0
                    ? Math.round(stageProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / stageProjects.length)
                    : 0;
                  
                  return (
                    <div 
                      key={stage.status} 
                      className="flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px] lg:w-[340px] xl:w-[360px] 2xl:w-[380px]"
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={(e) => onDrop(e, stage.status)}
                    >
                      <div className="pipeline-column bg-card rounded-lg p-4 lg:p-5 h-[calc(100vh-300px)] min-h-[650px] sm:min-h-[700px] lg:min-h-[750px] max-h-[850px] border border-border flex flex-col shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
                        {/* Stage Header */}
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border flex-shrink-0">
                          <div className="flex items-center gap-2.5 lg:gap-3">
                            <span className="text-xl lg:text-2xl">{stage.icon}</span>
                            <h3 className="font-semibold text-sm lg:text-base text-foreground">{stage.name}</h3>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className="bg-white text-gray-800 font-bold text-xs lg:text-sm px-2.5 lg:px-3 py-1 shadow-sm"
                          >
                            {stageProjects.length}
                          </Badge>
                        </div>

                        {/* Stage Statistics */}
                        <div className="space-y-3 mb-4 pb-4 border-b border-gray-200 bg-white/60 rounded-lg p-2.5 lg:p-3 flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs lg:text-sm font-medium text-gray-600">Total Budget</span>
                            <span className="font-bold text-xs lg:text-sm text-gray-900">
                              {formatCurrency(stageBudget)}
                            </span>
                          </div>
                          {stageProjects.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs lg:text-sm font-medium text-gray-600">Avg Progress</span>
                                <span className="font-bold text-xs lg:text-sm text-gray-900">{avgProgress}%</span>
                              </div>
                              <Progress value={avgProgress} className="h-2" />
                            </div>
                          )}
                        </div>

                        {/* Projects List */}
                        <div className="space-y-3 flex-1 overflow-y-auto min-h-[350px] scrollbar-thin">
                          {stageProjects.length === 0 ? (
                            <div className="text-center py-12 lg:py-16 text-muted-foreground border-2 border-dashed border-gray-300 rounded-xl bg-white/60 backdrop-blur-sm">
                              <div className="text-3xl lg:text-4xl mb-2 lg:mb-3 opacity-40">📋</div>
                              <div className="text-xs lg:text-sm font-medium">Drop projects here</div>
                              <div className="text-[10px] lg:text-xs mt-1 opacity-70">Drag a project card to move it</div>
                            </div>
                          ) : (
                            stageProjects
                              .filter(project => {
                                const matchesSearch = !searchTerm ||
                                  project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  project.project_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  project.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  project.client?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
                                const normalizedStatus = project.status === 'in_progress' ? 'in-progress' : 
                                                         project.status === 'on_hold' ? 'on-hold' : project.status;
                                const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;
                                const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
                                return matchesSearch && matchesStatus && matchesPriority;
                              })
                              .map((project) => {
                                const isDragging = draggedProject === project.id;
                                const projectBudget = typeof project.budget === 'number' ? project.budget : 
                                                    typeof project.budget === 'string' ? parseFloat(project.budget) || 0 : 0;
                                
                                // Get status color for card border
                                const getStatusBorderColor = (status: string) => {
                                  const normalizedStatus = status === 'in_progress' ? 'in-progress' : 
                                                          status === 'on_hold' ? 'on-hold' : status;
                                  switch (normalizedStatus) {
                                    case 'planning': return 'border-l-blue-500';
                                    case 'in-progress': return 'border-l-yellow-500';
                                    case 'on-hold': return 'border-l-orange-500';
                                    case 'completed': return 'border-l-green-500';
                                    case 'cancelled': return 'border-l-red-500';
                                    default: return 'border-l-gray-500';
                                  }
                                };

                                return (
                                  <Card 
                                    key={project.id} 
                                    draggable
                                    onDragStart={(e) => onDragStart(e, project.id)}
                                    onDragEnd={onDragEnd}
                                    onClick={() => handleViewProject(project)}
                                    className={`relative p-3 lg:p-4 hover:shadow-xl cursor-pointer bg-white border-2 border-gray-200 border-l-4 ${getStatusBorderColor(project.status)} hover:border-blue-300 hover:shadow-2xl group ${
                                      isDragging ? 'opacity-40 scale-95 rotate-2' : 'hover:scale-[1.02] hover:-translate-y-1'
                                    }`}
                                  >
                                    <div className="space-y-2.5 lg:space-y-3">
                                      {/* Status Badge and Drag Handle - Trello style */}
                                      <div className="flex items-center justify-between">
                                        <Badge 
                                          variant={getStatusColor(project.status)} 
                                          className="text-[9px] lg:text-[10px] px-1.5 lg:px-2 py-0.5 font-semibold"
                                        >
                                          {getStatusLabel(project.status)}
                                        </Badge>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" onMouseDown={(e) => e.stopPropagation()}>
                                          <GripVertical className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-gray-400" />
                                        </div>
                                      </div>
                                      
                                      {/* Project Name */}
                                      <div className="font-bold text-xs lg:text-sm text-gray-900 line-clamp-2 min-h-[2.25rem] lg:min-h-[2.5rem] cursor-pointer hover:text-blue-600 transition-colors" title={project.name}>
                                        {project.name}
                                      </div>
                                      
                                      {/* Client Info */}
                                      {project.client && (
                                        <div className="flex items-center gap-1.5 lg:gap-2 text-[10px] lg:text-xs text-gray-600 bg-gray-50 rounded-md px-2 py-1 lg:py-1.5">
                                          <Users className="h-3 w-3 lg:h-3.5 lg:w-3.5 flex-shrink-0 text-blue-600" />
                                          <span className="truncate font-medium">
                                            {project.client.company_name || project.client.name}
                                          </span>
                                        </div>
                                      )}

                                      {/* Budget */}
                                      {projectBudget > 0 && (
                                        <div className="flex items-center gap-1.5 lg:gap-2 text-xs lg:text-sm font-bold text-gray-900 bg-green-50 rounded-md px-2 py-1 lg:py-1.5">
                                          <DollarSign className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-green-600 flex-shrink-0" />
                                          <span className="truncate">{formatCurrency(projectBudget)}</span>
                                        </div>
                                      )}

                                      {/* Progress */}
                                      <div className="space-y-1.5 lg:space-y-2 bg-gray-50 rounded-md p-2 lg:p-2.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] lg:text-xs font-medium text-gray-600">Progress</span>
                                          <span className="font-bold text-xs lg:text-sm text-gray-900">{project.progress || 0}%</span>
                                        </div>
                                        <Progress value={project.progress || 0} className="h-1.5 lg:h-2" />
                                      </div>

                                      {/* Dates */}
                                      {(project.start_date || project.end_date) && (
                                        <div className="flex items-center gap-1.5 lg:gap-2 text-[10px] lg:text-xs text-gray-600 bg-blue-50 rounded-md px-2 py-1 lg:py-1.5">
                                          <Calendar className="h-3 w-3 lg:h-3.5 lg:w-3.5 flex-shrink-0 text-blue-600" />
                                          <span className="truncate font-medium">
                                            {project.start_date && new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            {project.start_date && project.end_date && ' → '}
                                            {project.end_date && new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                          </span>
                                        </div>
                                      )}

                                      {/* Quick Actions - Show on Hover - Trello style */}
                                      <div className="flex items-center gap-1 lg:gap-1.5 pt-2 border-t border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 lg:h-7 px-2 lg:px-2.5 text-[10px] lg:text-xs flex-1 hover:bg-blue-50 hover:text-blue-700 rounded-md"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewProject(project);
                                          }}
                                        >
                                          <Eye className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 lg:h-7 px-2 lg:px-2.5 text-[10px] lg:text-xs flex-1 hover:bg-green-50 hover:text-green-700 rounded-md"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditProject(project);
                                          }}
                                        >
                                          <Edit className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 lg:h-7 px-2 lg:px-2.5 text-[10px] lg:text-xs hover:bg-red-50 hover:text-red-700 rounded-md"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteProject(project);
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </Card>
                                );
                              })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProjectFormDialog
        isOpen={projectFormOpen}
        onClose={() => setProjectFormOpen(false)}
        project={selectedProject}
        onProjectSaved={handleProjectSaved}
      />

      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onDeleted={handleProjectDeleted}
        itemType="Project"
        itemName={projectToDelete?.name || ''}
        itemId={projectToDelete?.id || ''}
        tableName="projects"
      />

      <ProjectDetailsDialog
        isOpen={detailsDialogOpen}
        onClose={() => {
          setDetailsDialogOpen(false);
          setProjectToView(null);
        }}
        project={projectToView}
        onEdit={() => {
          setDetailsDialogOpen(false);
          if (projectToView) {
            setSelectedProject(projectToView);
            setProjectFormOpen(true);
          }
        }}
      />
    </div>
  );
};

export default Projects;