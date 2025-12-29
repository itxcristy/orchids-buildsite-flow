/**
 * Project Management Module
 * Enterprise-ready project management with Projects, Tasks, Resources, and Planning tabs
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Calendar,
  Users,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Filter,
  Plus,
  Search,
  Download,
  Settings,
  Eye,
  Edit,
  Trash2,
  List,
  Grid3x3,
  Kanban,
  GanttChart as GanttChartIcon,
  Calendar as CalendarIcon,
  BarChart3,
  Loader2,
  Star,
  Archive,
  Copy,
  ArrowUpDown,
  X,
  Bookmark,
  HelpCircle,
  FolderKanban
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import ProjectFormDialog from "@/components/ProjectFormDialog";
import { TaskKanbanBoard } from "@/components/TaskKanbanBoard";
import { GanttChart } from "@/components/project-management/GanttChart";
import { ResourceManagement } from "@/components/project-management/ResourceManagement";
import { ProjectTimeline } from "@/components/project-management/ProjectTimeline";
import { projectService, Project, Task } from "@/services/api/project-service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getEmployeesForAssignmentAuto } from "@/services/api/employee-selector-service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/useDebounce";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { DateRange } from "react-day-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { selectRecords } from '@/services/api/postgresql-service';
import { getAgencyId } from '@/utils/agencyUtils';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  on_hold: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

export default function ProjectManagement() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("projects");
  
  // Projects tab state
  const [projectViewMode, setProjectViewMode] = useState<'grid' | 'list' | 'kanban' | 'gantt' | 'timeline'>('grid');
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [projectPriorityFilter, setProjectPriorityFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [fetchingProjects, setFetchingProjects] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalProjects, setTotalProjects] = useState(0);
  
  // Undo state
  const [deletedProjects, setDeletedProjects] = useState<Array<{ project: Project; deletedAt: number }>>([]);
  
  // Export state
  const [exporting, setExporting] = useState(false);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Favorites state
  const [favoriteProjects, setFavoriteProjects] = useState<Set<string>>(new Set());
  
  // Date range filter
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  // Tag filter
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterOpen, setTagFilterOpen] = useState(false);
  
  // Saved views
  const [savedViews, setSavedViews] = useState<Array<{
    id: string;
    name: string;
    filters: {
      status: string;
      priority: string;
      tags: string[];
      dateRange?: DateRange;
    };
  }>>([]);
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  
  // Archive state
  const [showArchived, setShowArchived] = useState(false);
  
  // Bulk selection
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  
  // Tasks tab state
  const [taskViewMode, setTaskViewMode] = useState<'kanban' | 'list' | 'timeline' | 'calendar'>('kanban');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const [taskProjectFilter, setTaskProjectFilter] = useState<string>('all');
  
  // Resources tab state
  const [resources, setResources] = useState<any[]>([]);
  
  // Planning tab state
  const [planningViewMode, setPlanningViewMode] = useState<'gantt' | 'timeline' | 'critical-path'>('gantt');
  
  // Drag and drop state
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);

  // Debounced search term to prevent excessive API calls
  const debouncedProjectSearchTerm = useDebounce(projectSearchTerm, 300);
  const debouncedTaskSearchTerm = useDebounce(taskSearchTerm, 300);

  // Refs for abort controllers to cancel in-flight requests
  const projectsAbortControllerRef = useRef<AbortController | null>(null);
  const tasksAbortControllerRef = useRef<AbortController | null>(null);
  const resourcesAbortControllerRef = useRef<AbortController | null>(null);

  const fetchProjects = useCallback(async (abortSignal?: AbortSignal) => {
    try {
      setFetchingProjects(true);
      const filters: any = {};
      if (projectStatusFilter !== 'all') {
        filters.status = [projectStatusFilter];
      }
      if (projectPriorityFilter !== 'all') {
        filters.priority = [projectPriorityFilter];
      }
      if (debouncedProjectSearchTerm) {
        filters.search = debouncedProjectSearchTerm.trim().substring(0, 200); // Limit search length
      }
      
      // For now, fetch all projects and paginate client-side
      // TODO: Implement server-side pagination in projectService
      const data = await projectService.getProjects(filters, profile, user?.id);
      
      // Check if request was aborted
      if (abortSignal?.aborted) return;
      
      setProjects(data);
      setTotalProjects(data.length);
    } catch (error: any) {
      // Don't show error if request was aborted
      if (abortSignal?.aborted) return;
      
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load projects",
        variant: "destructive"
      });
    } finally {
      setFetchingProjects(false);
    }
  }, [projectStatusFilter, projectPriorityFilter, debouncedProjectSearchTerm, profile, user?.id, toast]);

  const fetchTasks = useCallback(async (abortSignal?: AbortSignal) => {
    try {
      const filters: any = {};
      if (taskStatusFilter !== 'all') {
        filters.status = [taskStatusFilter];
      }
      if (taskProjectFilter !== 'all') {
        filters.project_id = taskProjectFilter;
      }
      if (debouncedTaskSearchTerm) {
        filters.search = debouncedTaskSearchTerm.trim().substring(0, 200); // Limit search length
      }
      
      const data = await projectService.getTasks(filters, profile, user?.id);
      
      // Check if request was aborted
      if (abortSignal?.aborted) return;
      
      setTasks(data);
    } catch (error: any) {
      // Don't show error if request was aborted
      if (abortSignal?.aborted) return;
      
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load tasks",
        variant: "destructive"
      });
    }
  }, [taskStatusFilter, taskProjectFilter, debouncedTaskSearchTerm, profile, user?.id, toast]);

  // Fetch projects when filters change (with debouncing)
  useEffect(() => {
    // Cancel previous request
    if (projectsAbortControllerRef.current) {
      projectsAbortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    projectsAbortControllerRef.current = abortController;
    
    fetchProjects(abortController.signal);
    
    return () => {
      abortController.abort();
    };
  }, [fetchProjects]);

  // Fetch tasks when filters change
  useEffect(() => {
    // Cancel previous request
    if (tasksAbortControllerRef.current) {
      tasksAbortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    tasksAbortControllerRef.current = abortController;
    
    fetchTasks(abortController.signal);
    
    return () => {
      abortController.abort();
    };
  }, [fetchTasks]);

  // Real-time updates via polling (every 30 seconds)
  useEffect(() => {
    if (activeTab === 'projects') {
      const interval = setInterval(() => {
        fetchProjects();
      }, 30000); // Poll every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchProjects]);

  // Fetch all data on initial mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchProjects(),
          fetchTasks(),
          fetchResources()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load project management data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const fetchResources = useCallback(async () => {
    try {
      const { getAgencyId } = await import('@/utils/agencyUtils');
      const agencyId = await getAgencyId(profile, user?.id);
      
      if (!agencyId) return;
      
      // Use standardized employee fetching service
      const employeesData = await getEmployeesForAssignmentAuto(profile, user?.id);
      
      // Transform to format expected by ResourceManagement component
      const employees: any[] = employeesData.map(emp => ({
        user_id: emp.user_id,
        display_name: emp.full_name,
        full_name: emp.full_name,
        role: emp.role || 'employee',
        is_fully_active: emp.is_active
      }));
      
      // Batch all database queries in parallel for better performance
      const userIds = employees.map((e: any) => e.user_id).filter(Boolean);
      
      // Parallel batch queries instead of sequential
      const [employeeDetails, allTasks, allProjects] = await Promise.all([
        // Get employee_details to map user_id to employee_id
        userIds.length > 0 
          ? selectRecords('employee_details', {
              where: { user_id: { operator: 'in', value: userIds }, agency_id: agencyId }
            })
          : Promise.resolve([]),
        // Fetch all tasks for utilization calculation
        projectService.getTasks({}, profile, user?.id),
        // Fetch all projects for utilization calculation
        projectService.getProjects({}, profile, user?.id)
      ]);
      
      // Process salary details in batch
      const employeeIds = employeeDetails.map((ed: any) => ed.id).filter(Boolean);
      const salaryMap = new Map();
      
      if (employeeIds.length > 0) {
        try {
          // Get salary details using employee_id
          const salaryDetails = await selectRecords('employee_salary_details', {
            where: { employee_id: { operator: 'in', value: employeeIds }, agency_id: agencyId },
            orderBy: 'effective_date DESC' // Get most recent salary
          });
          
          // Create a map from employee_id to salary details (get most recent per employee)
          const employeeIdToSalary = new Map();
          salaryDetails.forEach((s: any) => {
            if (!employeeIdToSalary.has(s.employee_id)) {
              employeeIdToSalary.set(s.employee_id, s);
            }
          });
          
          // Create a map from user_id to salary details
          employeeDetails.forEach((ed: any) => {
            const salary = employeeIdToSalary.get(ed.id);
            if (salary && ed.user_id) {
              salaryMap.set(ed.user_id, salary);
            }
          });
        } catch (error) {
          console.warn('Could not fetch salary details:', error);
        }
      }
      
      // Calculate resource utilization from tasks and projects
      const resourceMap = new Map();
      
      employees.forEach((emp: any) => {
        const userTasks = allTasks.filter(t => 
          t.assignee_id === emp.user_id || 
          t.assignments?.some((a: any) => a.user_id === emp.user_id)
        );
        
        // Get projects where user is assigned (as project manager or in team)
        const userProjects = allProjects.filter(p => 
          p.project_manager_id === emp.user_id ||
          p.account_manager_id === emp.user_id ||
          (p.assigned_team && Array.isArray(p.assigned_team) && p.assigned_team.includes(emp.user_id))
        );
        
        // Calculate hours
        const totalActualHours = userTasks.reduce((sum, t) => sum + (Number(t.actual_hours) || 0), 0);
        const totalEstimatedHours = userTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0);
        
        // Calculate utilization (based on estimated vs actual, or use a standard work week)
        // Standard: 40 hours/week = 160 hours/month
        const standardMonthlyHours = 160;
        const utilization = standardMonthlyHours > 0 
          ? Math.min((totalEstimatedHours / standardMonthlyHours) * 100, 100)
          : 0;
        
        // Get hourly rate from salary details
        const salary = salaryMap.get(emp.user_id);
        let hourlyRate = 0;
        if (salary) {
          if (salary.hourly_rate) {
            hourlyRate = Number(salary.hourly_rate);
          } else if (salary.salary || salary.base_salary) {
            const monthlySalary = Number(salary.salary || salary.base_salary || 0);
            // Convert monthly salary to hourly (assuming 160 hours/month)
            hourlyRate = monthlySalary > 0 ? monthlySalary / 160 : 0;
          }
        }
        
        // Calculate availability (100% - utilization, but at least 0%)
        const availability = Math.max(100 - utilization, 0);
        
        resourceMap.set(emp.user_id, {
          id: emp.user_id,
          name: emp.display_name || emp.full_name || 'Unknown User',
          role: emp.role || emp.position || 'Employee',
          hourly_rate: hourlyRate,
          availability: Math.round(availability),
          current_projects: userProjects.length,
          utilization: Math.round(utilization),
          total_hours: totalActualHours,
          estimated_hours: totalEstimatedHours
        });
      });
      
      setResources(Array.from(resourceMap.values()));
    } catch (error: any) {
      console.error('Error fetching resources:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load resources",
        variant: "destructive"
      });
    }
  }, [profile, user?.id, toast]);

  const handleProjectSaved = useCallback(() => {
    fetchProjects();
    setShowProjectForm(false);
  }, [fetchProjects]);

  const handleDeleteProject = useCallback(async () => {
    if (!projectToDelete) return;
    
    const projectId = projectToDelete.id;
    const projectName = projectToDelete.name;
    const projectToRestore = { ...projectToDelete };
    
    // Optimistic update: remove project from UI immediately
    const previousProjects = [...projects];
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setDeletingProjectId(projectId);
    setProjectToDelete(null);
    
    // Store for undo functionality (5 second window)
    setDeletedProjects(prev => [...prev, { project: projectToRestore, deletedAt: Date.now() }]);
    
    // Auto-remove from undo list after 5 seconds
    setTimeout(() => {
      setDeletedProjects(prev => prev.filter(d => d.project.id !== projectId));
    }, 5000);
    
    try {
      // Check for dependent tasks before deletion
      const projectTasks = tasks.filter(t => t.project_id === projectId);
      if (projectTasks.length > 0) {
        const hasConfirmed = window.confirm(
          `This project has ${projectTasks.length} associated task(s). ` +
          `Deleting this project will remove the project reference from these tasks. Continue?`
        );
        if (!hasConfirmed) {
          // Rollback optimistic update
          setProjects(previousProjects);
          setDeletingProjectId(null);
          setDeletedProjects(prev => prev.filter(d => d.project.id !== projectId));
          return;
        }
      }
      
      await projectService.deleteProject(projectId, profile, user?.id);
      
      const deleteToast = toast({
        title: "Success",
        description: `Project "${projectName}" deleted successfully`,
      });
      
      // Refresh projects list
      fetchProjects();
    } catch (error: any) {
      // Rollback optimistic update on error
      setProjects(previousProjects);
      setDeletingProjectId(null);
      setDeletedProjects(prev => prev.filter(d => d.project.id !== projectId));
      
      toast({
        title: "Error",
        description: error.message || "Failed to delete project. Please try again.",
        variant: "destructive"
      });
    }
  }, [projectToDelete, projects, tasks, profile, user?.id, fetchProjects, toast]);

  // Undo delete functionality
  const handleUndoDelete = useCallback(async (project: Project) => {
    try {
      // Restore project in UI
      setProjects(prev => [...prev, project].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      setDeletedProjects(prev => prev.filter(d => d.project.id !== project.id));
      
      toast({
        title: "Project Restored",
        description: `Project "${project.name}" has been restored`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to restore project. Please refresh the page.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Get all unique tags from projects
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    projects.forEach(project => {
      if (project.tags && Array.isArray(project.tags)) {
        project.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [projects]);

  // Memoize filtered and sorted projects
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      // Skip projects being deleted
      if (deletingProjectId === project.id) return false;
      
      // Archive filter
      if (!showArchived && project.status === 'archived') return false;
      if (showArchived && project.status !== 'archived') return false;
      
      // Status filter
      if (projectStatusFilter !== 'all' && project.status !== projectStatusFilter) return false;
      
      // Priority filter
      if (projectPriorityFilter !== 'all' && project.priority !== projectPriorityFilter) return false;
      
      // Tag filter
      if (selectedTags.length > 0) {
        const projectTags = project.tags || [];
        if (!selectedTags.some(tag => projectTags.includes(tag))) return false;
      }
      
      // Date range filter
      if (dateRange?.from || dateRange?.to) {
        const projectStart = project.start_date ? new Date(project.start_date) : null;
        const projectEnd = project.end_date ? new Date(project.end_date) : null;
        
        if (dateRange.from && projectEnd && projectEnd < dateRange.from) return false;
        if (dateRange.to && projectStart && projectStart > dateRange.to) return false;
      }
      
      // Search filter
      if (projectSearchTerm) {
        const searchLower = projectSearchTerm.toLowerCase();
        return (
          project.name.toLowerCase().includes(searchLower) ||
          project.description?.toLowerCase().includes(searchLower) ||
          project.project_code?.toLowerCase().includes(searchLower) ||
          project.client?.name?.toLowerCase().includes(searchLower) ||
          project.client?.company_name?.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - 
                       (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
          break;
        case 'budget':
          comparison = (a.budget || 0) - (b.budget || 0);
          break;
        case 'deadline':
          const aDeadline = a.deadline ? new Date(a.deadline).getTime() : 0;
          const bDeadline = b.deadline ? new Date(b.deadline).getTime() : 0;
          comparison = aDeadline - bDeadline;
          break;
        case 'progress':
          comparison = (a.progress || 0) - (b.progress || 0);
          break;
        case 'created_at':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    // Sort favorites to top if filtering by favorites
    if (projectStatusFilter === 'favorites') {
      filtered.sort((a, b) => {
        const aFavorite = favoriteProjects.has(a.id);
        const bFavorite = favoriteProjects.has(b.id);
        if (aFavorite && !bFavorite) return -1;
        if (!aFavorite && bFavorite) return 1;
        return 0;
      });
    }
    
    return filtered;
  }, [
    projects, 
    projectStatusFilter, 
    projectPriorityFilter, 
    projectSearchTerm, 
    deletingProjectId,
    selectedTags,
    dateRange,
    showArchived,
    sortBy,
    sortOrder,
    favoriteProjects
  ]);

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    setExporting(true);
    try {
      const headers = ['Project Name', 'Project Code', 'Client', 'Status', 'Priority', 'Progress (%)', 'Budget', 'Actual Cost', 'Start Date', 'End Date', 'Project Manager'];
      const rows = filteredProjects.map(project => [
        project.name || '',
        project.project_code || '',
        project.client?.company_name || project.client?.name || 'No Client',
        project.status.replace('_', ' ') || '',
        project.priority || 'medium',
        project.progress || 0,
        project.budget || 0,
        project.actual_cost || 0,
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
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: `Exported ${filteredProjects.length} project(s) to CSV`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export projects',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  }, [filteredProjects, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search projects"]') as HTMLInputElement;
        searchInput?.focus();
      }
      
      // Ctrl/Cmd + N: New project
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setSelectedProject(null);
        setShowProjectForm(true);
      }
      
      // Escape: Close dialogs
      if (e.key === 'Escape') {
        if (showProjectForm) {
          setShowProjectForm(false);
          setSelectedProject(null);
        }
        if (projectToDelete) {
          setProjectToDelete(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showProjectForm, projectToDelete]);

  const getProjectMetrics = () => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'in_progress').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const overBudgetProjects = projects.filter(p => {
      if (!p.budget || !p.actual_cost) return false;
      return p.actual_cost > p.budget;
    }).length;
    
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalActualCost = projects.reduce((sum, p) => sum + (p.actual_cost || 0), 0);
    const budgetVariance = totalBudget > 0 ? ((totalActualCost - totalBudget) / totalBudget) * 100 : 0;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      overBudgetProjects,
      totalBudget,
      totalActualCost,
      budgetVariance
    };
  };

  // Paginated projects
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredProjects.slice(startIndex, endIndex);
  }, [filteredProjects, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredProjects.length / pageSize);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('projectManagement_favorites');
    if (saved) {
      try {
        setFavoriteProjects(new Set(JSON.parse(saved)));
      } catch (e) {
        console.warn('Failed to load favorites:', e);
      }
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    if (favoriteProjects.size > 0) {
      localStorage.setItem('projectManagement_favorites', JSON.stringify(Array.from(favoriteProjects)));
    }
  }, [favoriteProjects]);

  // Toggle favorite
  const toggleFavorite = useCallback((projectId: string) => {
    setFavoriteProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  // Toggle tag selection
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setProjectStatusFilter('all');
    setProjectPriorityFilter('all');
    setProjectSearchTerm('');
    setSelectedTags([]);
    setDateRange(undefined);
    setCurrentViewId(null);
  }, []);

  // Save current view
  const saveCurrentView = useCallback(() => {
    const viewName = prompt('Enter a name for this view:');
    if (!viewName) return;
    
    const newView = {
      id: Date.now().toString(),
      name: viewName,
      filters: {
        status: projectStatusFilter,
        priority: projectPriorityFilter,
        tags: selectedTags,
        dateRange: dateRange
      }
    };
    
    setSavedViews(prev => [...prev, newView]);
    setCurrentViewId(newView.id);
    toast({
      title: 'View Saved',
      description: `"${viewName}" has been saved`,
    });
  }, [projectStatusFilter, projectPriorityFilter, selectedTags, dateRange, toast]);

  // Load saved view
  const loadSavedView = useCallback((viewId: string) => {
    const view = savedViews.find(v => v.id === viewId);
    if (!view) return;
    
    setProjectStatusFilter(view.filters.status);
    setProjectPriorityFilter(view.filters.priority);
    setSelectedTags(view.filters.tags);
    setDateRange(view.filters.dateRange);
    setCurrentViewId(viewId);
  }, [savedViews]);

  // Calculate project health score
  const calculateHealthScore = useCallback((project: Project): { score: number; status: 'healthy' | 'warning' | 'critical' } => {
    let score = 100;
    
    // Budget variance penalty
    if (project.budget && project.actual_cost) {
      const variance = (project.actual_cost / project.budget) * 100;
      if (variance > 110) score -= 30; // Over budget
      else if (variance > 100) score -= 15; // Approaching budget
    }
    
    // Timeline penalty
    if (project.deadline) {
      const deadline = new Date(project.deadline);
      const now = new Date();
      const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDeadline < 0) score -= 25; // Overdue
      else if (daysUntilDeadline < 7) score -= 10; // Approaching deadline
    }
    
    // Progress penalty
    if (project.deadline) {
      const deadline = new Date(project.deadline);
      const now = new Date();
      const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const totalDays = project.start_date && project.end_date 
        ? Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      if (totalDays > 0 && daysUntilDeadline < totalDays * 0.3 && project.progress < 50) {
        score -= 15; // Behind schedule
      }
    }
    
    const finalScore = Math.max(0, Math.min(100, score));
    
    return {
      score: finalScore,
      status: finalScore >= 70 ? 'healthy' : finalScore >= 40 ? 'warning' : 'critical'
    };
  }, []);

  // Archive project
  const handleArchiveProject = useCallback(async (project: Project) => {
    try {
      await projectService.updateProject(project.id, { status: 'archived' as any }, profile, user?.id);
      toast({
        title: 'Success',
        description: `Project "${project.name}" has been archived`,
      });
      fetchProjects();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to archive project',
        variant: 'destructive'
      });
    }
  }, [profile, user?.id, fetchProjects, toast]);

  // Duplicate project
  const handleDuplicateProject = useCallback(async (project: Project) => {
    try {
      const newProject = {
        ...project,
        name: `${project.name} (Copy)`,
        status: 'planning' as const,
        progress: 0,
        actual_cost: 0,
      };
      delete (newProject as any).id;
      delete (newProject as any).created_at;
      delete (newProject as any).updated_at;
      
      await projectService.createProject(newProject, profile, user?.id);
      toast({
        title: 'Success',
        description: `Project "${project.name}" duplicated successfully`,
      });
      fetchProjects();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate project',
        variant: 'destructive'
      });
    }
  }, [profile, user?.id, fetchProjects, toast]);

  // Bulk actions
  const handleBulkStatusChange = useCallback(async (newStatus: string) => {
    try {
      await Promise.all(
        Array.from(selectedProjectIds).map(projectId => 
          projectService.updateProject(projectId, { status: newStatus as any }, profile, user?.id)
        )
      );
      toast({
        title: 'Success',
        description: `${selectedProjectIds.size} project(s) updated`,
      });
      setSelectedProjectIds(new Set());
      setBulkActionOpen(false);
      fetchProjects();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update projects',
        variant: 'destructive'
      });
    }
  }, [selectedProjectIds, profile, user?.id, fetchProjects, toast]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedProjectIds.size === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedProjectIds.size} project(s)? This action cannot be undone.`
    );
    if (!confirmed) return;
    
    try {
      await Promise.all(
        Array.from(selectedProjectIds).map(projectId => 
          projectService.deleteProject(projectId, profile, user?.id)
        )
      );
      toast({
        title: 'Success',
        description: `${selectedProjectIds.size} project(s) deleted`,
      });
      setSelectedProjectIds(new Set());
      setBulkActionOpen(false);
      fetchProjects();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete projects',
        variant: 'destructive'
      });
    }
  }, [selectedProjectIds, profile, user?.id, fetchProjects, toast]);

  const toggleProjectSelection = useCallback((projectId: string) => {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const selectAllProjects = useCallback(() => {
    setSelectedProjectIds(new Set(paginatedProjects.map(p => p.id)));
  }, [paginatedProjects]);

  const clearSelection = useCallback(() => {
    setSelectedProjectIds(new Set());
  }, []);

  // Drag and drop handlers for Kanban
  const handleDragStart = useCallback((e: React.DragEvent, projectId: string) => {
    setDraggedProjectId(projectId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', projectId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedProjectId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    const projectId = e.dataTransfer.getData('text/plain');
    
    if (!projectId) return;
    
    const project = projects.find(p => p.id === projectId);
    if (!project || project.status === newStatus) {
      setDraggedProjectId(null);
      return;
    }
    
    // Optimistic update
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, status: newStatus as any } : p
    ));
    
    try {
      await projectService.updateProject(projectId, { status: newStatus as any }, profile, user?.id);
      toast({
        title: 'Success',
        description: `Project status updated to ${newStatus.replace('_', ' ')}`,
      });
      fetchProjects();
    } catch (error: any) {
      // Rollback on error
      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, status: project.status } : p
      ));
      toast({
        title: 'Error',
        description: error.message || 'Failed to update project status',
        variant: 'destructive'
      });
    } finally {
      setDraggedProjectId(null);
    }
  }, [projects, profile, user?.id, fetchProjects, toast]);

  // Memoize metrics calculation - MUST be before early return to follow Rules of Hooks
  const metrics = useMemo(() => getProjectMetrics(), [projects]);

  // Chart data for analytics - MUST be before early return to follow Rules of Hooks
  const statusChartData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    projects.forEach(p => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace('_', ' '),
      value
    }));
  }, [projects]);

  const priorityChartData = useMemo(() => {
    const priorityCounts: Record<string, number> = {};
    projects.forEach(p => {
      priorityCounts[p.priority] = (priorityCounts[p.priority] || 0) + 1;
    });
    return Object.entries(priorityCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  }, [projects]);

  const budgetTrendData = useMemo(() => {
    // Group by month
    const monthlyData: Record<string, { budget: number; actual: number }> = {};
    projects.forEach(p => {
      if (p.start_date) {
        const month = new Date(p.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!monthlyData[month]) {
          monthlyData[month] = { budget: 0, actual: 0 };
        }
        monthlyData[month].budget += p.budget || 0;
        monthlyData[month].actual += p.actual_cost || 0;
      }
    });
    return Object.entries(monthlyData)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([name, data]) => ({ name, ...data }));
  }, [projects]);

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </ErrorBoundary>
    );
  }

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Management</h1>
          <p className="text-muted-foreground">
            Enterprise project planning, tracking, and resource management
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            disabled={exporting || filteredProjects.length === 0}
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export ({filteredProjects.length})
              </>
            )}
          </Button>
          <Button onClick={() => {
            setSelectedProject(null);
            setShowProjectForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeProjects} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalProjects > 0 ? Math.round((metrics.completedProjects / metrics.totalProjects) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.completedProjects} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Performance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.budgetVariance > 0 ? '+' : ''}{metrics.budgetVariance.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs planned budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overBudgetProjects}</div>
            <p className="text-xs text-muted-foreground">
              over budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      {projects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Project Status Distribution</CardTitle>
              <CardDescription>Breakdown of projects by status</CardDescription>
            </CardHeader>
            <CardContent>
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Trend</CardTitle>
              <CardDescription>Monthly budget comparison</CardDescription>
            </CardHeader>
            <CardContent>
              {budgetTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={budgetTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="budget" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Budget"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Actual"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No budget data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          {/* Filters and View Controls */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-2 flex-1 min-w-[300px] flex-wrap">
              <div className="relative flex-1 max-w-md min-w-[200px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={projectSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value.substring(0, 200); // Limit input length
                    setProjectSearchTerm(value);
                    // fetchProjects will be called automatically via useEffect when debouncedProjectSearchTerm changes
                  }}
                  className="pl-8"
                  maxLength={200}
                  aria-label="Search projects"
                />
              </div>
              <Select value={projectStatusFilter} onValueChange={(value) => {
                setProjectStatusFilter(value);
                // fetchProjects will be called automatically via useEffect
              }}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="favorites">
                    <Star className="h-4 w-4 mr-2 inline" />
                    Favorites
                  </SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={projectPriorityFilter} onValueChange={(value) => {
                setProjectPriorityFilter(value);
                // fetchProjects will be called automatically via useEffect
              }}>
                <SelectTrigger className="w-[130px]">
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
              
              {/* Tag Filter */}
              {allTags.length > 0 && (
                <Popover open={tagFilterOpen} onOpenChange={setTagFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-auto">
                      <Filter className="h-4 w-4 mr-2" />
                      Tags
                      {selectedTags.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {selectedTags.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start">
                    <div className="space-y-2">
                      <div className="font-medium text-sm mb-2">Filter by Tags</div>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {allTags.map(tag => (
                          <div key={tag} className="flex items-center space-x-2">
                            <Checkbox
                              id={`tag-${tag}`}
                              checked={selectedTags.includes(tag)}
                              onCheckedChange={() => toggleTag(tag)}
                            />
                            <label
                              htmlFor={`tag-${tag}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {tag}
                            </label>
                          </div>
                        ))}
                      </div>
                      {selectedTags.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => setSelectedTags([])}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear Tags
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              
              {/* Date Range Filter */}
              <div className="w-[300px]">
                <DatePickerWithRange
                  date={dateRange}
                  setDate={setDateRange}
                />
              </div>
              
              {/* Sort */}
              <Select value={`${sortBy}_${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('_');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}>
                <SelectTrigger className="w-[160px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at_desc">Recently Created</SelectItem>
                  <SelectItem value="created_at_asc">Oldest First</SelectItem>
                  <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                  <SelectItem value="status_asc">Status</SelectItem>
                  <SelectItem value="priority_desc">Priority (High to Low)</SelectItem>
                  <SelectItem value="priority_asc">Priority (Low to High)</SelectItem>
                  <SelectItem value="budget_desc">Budget (High to Low)</SelectItem>
                  <SelectItem value="budget_asc">Budget (Low to High)</SelectItem>
                  <SelectItem value="deadline_asc">Deadline (Earliest)</SelectItem>
                  <SelectItem value="deadline_desc">Deadline (Latest)</SelectItem>
                  <SelectItem value="progress_desc">Progress (High to Low)</SelectItem>
                  <SelectItem value="progress_asc">Progress (Low to High)</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Saved Views */}
              {savedViews.length > 0 && (
                <Select value={currentViewId || 'default'} onValueChange={(value) => {
                  if (value === 'default') {
                    clearAllFilters();
                  } else {
                    loadSavedView(value);
                  }
                }}>
                  <SelectTrigger className="w-[140px]">
                    <Bookmark className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Views" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default View</SelectItem>
                    {savedViews.map(view => (
                      <SelectItem key={view.id} value={view.id}>
                        {view.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Save View Button */}
              {(projectStatusFilter !== 'all' || projectPriorityFilter !== 'all' || selectedTags.length > 0 || dateRange) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={saveCurrentView}
                      >
                        <Bookmark className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Save current filters as a view</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* Clear Filters */}
              {(projectStatusFilter !== 'all' || projectPriorityFilter !== 'all' || selectedTags.length > 0 || dateRange) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  aria-label="Clear all filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              
              {/* Show Archived Toggle */}
              <Button
                variant={showArchived ? "default" : "outline"}
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="h-4 w-4 mr-2" />
                {showArchived ? 'Hide' : 'Show'} Archived
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              {/* Bulk Actions */}
              {selectedProjectIds.size > 0 && (
                <div className="flex items-center space-x-2 mr-2 pr-2 border-r">
                  <span className="text-sm text-muted-foreground">
                    {selectedProjectIds.size} selected
                  </span>
                  <Popover open={bulkActionOpen} onOpenChange={setBulkActionOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        Bulk Actions
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end">
                      <div className="space-y-1">
                        <div className="font-medium text-sm mb-2">Change Status</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleBulkStatusChange('active')}
                        >
                          Set to Active
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleBulkStatusChange('in_progress')}
                        >
                          Set to In Progress
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleBulkStatusChange('on_hold')}
                        >
                          Set to On Hold
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleBulkStatusChange('completed')}
                        >
                          Set to Completed
                        </Button>
                        <div className="border-t my-2" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-red-600"
                          onClick={handleBulkDelete}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selected
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={clearSelection}
                        >
                          Clear Selection
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              
              <Button
                variant={projectViewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProjectViewMode('grid')}
                aria-label="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={projectViewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProjectViewMode('list')}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={projectViewMode === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProjectViewMode('kanban')}
                aria-label="Kanban view"
              >
                <Kanban className="h-4 w-4" />
              </Button>
              <Button
                variant={projectViewMode === 'gantt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProjectViewMode('gantt')}
                aria-label="Gantt chart view"
              >
                <GanttChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={projectViewMode === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProjectViewMode('timeline')}
                aria-label="Timeline view"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
              
              {/* Help Tooltip */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="Help">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold">Keyboard Shortcuts:</p>
                      <p>Ctrl/Cmd + K: Focus search</p>
                      <p>Ctrl/Cmd + N: New project</p>
                      <p>Escape: Close dialogs</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {/* Active Filter Badges */}
          {(selectedTags.length > 0 || dateRange) && (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    onClick={() => toggleTag(tag)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    aria-label={`Remove ${tag} filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {dateRange && (dateRange.from || dateRange.to) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {dateRange.from && dateRange.to
                    ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                    : dateRange.from
                    ? `From ${dateRange.from.toLocaleDateString()}`
                    : `Until ${dateRange.to?.toLocaleDateString()}`
                  }
                  <button
                    onClick={() => setDateRange(undefined)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    aria-label="Clear date range"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {filteredProjects.length > pageSize && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredProjects.length)} of {filteredProjects.length} projects
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm">Page Size:</label>
                <Select 
                  value={pageSize.toString()} 
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Projects View */}
          {projectViewMode === 'grid' && (
            <>
              {fetchingProjects ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Card key={i} className="">
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-2" />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Skeleton className="h-2 w-full" />
                        <div className="grid grid-cols-2 gap-4">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : paginatedProjects.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FolderKanban className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {projectSearchTerm || selectedTags.length > 0 || dateRange
                        ? 'No projects found'
                        : showArchived
                        ? 'No archived projects'
                        : 'No projects yet'}
                    </h3>
                    <p className="text-muted-foreground mb-4 text-center max-w-md">
                      {projectSearchTerm || selectedTags.length > 0 || dateRange
                        ? 'Try adjusting your filters to see more projects.'
                        : showArchived
                        ? 'You don\'t have any archived projects yet.'
                        : 'Get started by creating your first project to organize and track your work.'}
                    </p>
                    {!projectSearchTerm && selectedTags.length === 0 && !dateRange && !showArchived && (
                      <Button onClick={() => {
                        setSelectedProject(null);
                        setShowProjectForm(true);
                      }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Project
                      </Button>
                    )}
                    {(projectSearchTerm || selectedTags.length > 0 || dateRange) && (
                      <Button variant="outline" onClick={clearAllFilters}>
                        <X className="mr-2 h-4 w-4" />
                        Clear Filters
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedProjects.map((project) => {
                    const health = calculateHealthScore(project);
                    const isFavorite = favoriteProjects.has(project.id);
                    const isSelected = selectedProjectIds.has(project.id);
                    
                    return (
                <Card 
                  key={project.id} 
                  className={cn(
                    "hover:shadow-md transition-shadow cursor-pointer relative",
                    isSelected && "ring-2 ring-primary",
                    health.status === 'critical' && "border-l-4 border-l-red-500",
                    health.status === 'warning' && "border-l-4 border-l-yellow-500"
                  )}
                  onClick={() => {
                    if (selectedProjectIds.size > 0) {
                      toggleProjectSelection(project.id);
                    } else {
                      navigate(`/projects/${project.id}`);
                    }
                  }}
                >
                  {/* Selection Checkbox */}
                  {selectedProjectIds.size > 0 && (
                    <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleProjectSelection(project.id)}
                        aria-label={`Select ${project.name}`}
                      />
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-1 flex-1">{project.name}</CardTitle>
                        {/* Favorite Star */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(project.id);
                          }}
                          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className={cn(
                            "h-4 w-4",
                            isFavorite && "fill-yellow-400 text-yellow-400"
                          )} />
                        </Button>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            aria-label="Project options"
                            disabled={deletingProjectId === project.id}
                          >
                            {deletingProjectId === project.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Settings className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${project.id}`);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProject(project);
                            setShowProjectForm(true);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateProject(project);
                          }}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          {project.status !== 'archived' && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveProject(project);
                            }}>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(project);
                            }}
                            disabled={deletingProjectId === project.id}
                          >
                            {deletingProjectId === project.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription className="line-clamp-1">
                      {project.client?.company_name || project.client?.name || 'No client'}
                      {project.project_code && ` • ${project.project_code}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Health Score Indicator */}
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1">
                              <div className={cn(
                                "h-2 w-2 rounded-full",
                                health.status === 'healthy' && "bg-green-500",
                                health.status === 'warning' && "bg-yellow-500",
                                health.status === 'critical' && "bg-red-500"
                              )} />
                              <span className="text-xs text-muted-foreground">
                                Health: {health.score}%
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Project health score based on budget, timeline, and progress</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(project.progress)}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="font-medium">{project.currency || 'USD'} {project.budget?.toLocaleString() || '0'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Spent</p>
                        <p className="font-medium">{project.currency || 'USD'} {project.actual_cost?.toLocaleString() || '0'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge className={statusColors[project.status] || statusColors.planning}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={priorityColors[project.priority] || priorityColors.medium}
                      >
                        {project.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {projectViewMode === 'list' && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        {selectedProjectIds.size > 0 && (
                          <th className="text-left p-4 w-12">
                            <Checkbox
                              checked={selectedProjectIds.size === paginatedProjects.length && paginatedProjects.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  selectAllProjects();
                                } else {
                                  clearSelection();
                                }
                              }}
                              aria-label="Select all projects"
                            />
                          </th>
                        )}
                        <th className="text-left p-4">Project</th>
                        <th className="text-left p-4">Client</th>
                        <th className="text-left p-4">Status</th>
                        <th className="text-left p-4">Priority</th>
                        <th className="text-left p-4">Progress</th>
                        <th className="text-left p-4">Budget</th>
                        <th className="text-left p-4">Health</th>
                        <th className="text-left p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fetchingProjects ? (
                        <tr>
                          <td colSpan={selectedProjectIds.size > 0 ? 9 : 8} className="p-8">
                            <div className="space-y-2">
                              {[1, 2, 3, 4, 5].map(i => (
                                <Skeleton key={i} className="h-12 w-full" />
                              ))}
                            </div>
                          </td>
                        </tr>
                      ) : paginatedProjects.length === 0 ? (
                        <tr>
                          <td colSpan={selectedProjectIds.size > 0 ? 9 : 8} className="p-12">
                            <div className="text-center">
                              <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                              <h3 className="font-semibold mb-2">No projects found</h3>
                              <p className="text-muted-foreground mb-4">
                                {projectSearchTerm || selectedTags.length > 0 || dateRange
                                  ? 'Try adjusting your filters'
                                  : 'Create your first project to get started'}
                              </p>
                              {!projectSearchTerm && selectedTags.length === 0 && !dateRange && (
                                <Button onClick={() => {
                                  setSelectedProject(null);
                                  setShowProjectForm(true);
                                }}>
                                  <Plus className="mr-2 h-4 w-4" />
                                  Create Project
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedProjects.map((project) => {
                          const health = calculateHealthScore(project);
                          const isSelected = selectedProjectIds.has(project.id);
                          const isFavorite = favoriteProjects.has(project.id);
                          
                          return (
                        <tr 
                          key={project.id} 
                          className={cn(
                            "border-b hover:bg-muted/50 transition-colors",
                            isSelected && "bg-primary/5"
                          )}
                        >
                          {selectedProjectIds.size > 0 && (
                            <td className="p-4">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleProjectSelection(project.id)}
                                aria-label={`Select ${project.name}`}
                              />
                            </td>
                          )}
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{project.name}</p>
                                  {isFavorite && (
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  )}
                                </div>
                                {project.project_code && (
                                  <p className="text-sm text-muted-foreground">{project.project_code}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            {project.client?.company_name || project.client?.name || '-'}
                          </td>
                          <td className="p-4">
                            <Badge className={statusColors[project.status] || statusColors.planning}>
                              {project.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className={priorityColors[project.priority] || priorityColors.medium}>
                              {project.priority}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Progress value={project.progress} className="w-20 h-2" />
                              <span className="text-sm">{Math.round(project.progress)}%</span>
                            </div>
                          </td>
                          <td className="p-4">
                            {project.currency || 'USD'} {project.budget?.toLocaleString() || '0'}
                          </td>
                          <td className="p-4">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1">
                                    <div className={cn(
                                      "h-2 w-2 rounded-full",
                                      health.status === 'healthy' && "bg-green-500",
                                      health.status === 'warning' && "bg-yellow-500",
                                      health.status === 'critical' && "bg-red-500"
                                    )} />
                                    <span className="text-xs text-muted-foreground">
                                      {health.score}%
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Project Health Score</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => navigate(`/projects/${project.id}`)}
                                      aria-label={`View ${project.name}`}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Details</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedProject(project);
                                        setShowProjectForm(true);
                                      }}
                                      aria-label={`Edit ${project.name}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setProjectToDelete(project)}
                                      disabled={deletingProjectId === project.id}
                                      aria-label={`Delete ${project.name}`}
                                    >
                                      {deletingProjectId === project.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                                      ) : (
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {projectViewMode === 'gantt' && (
            <Card>
              <CardHeader>
                <CardTitle>Gantt Chart</CardTitle>
                <CardDescription>Visual project timeline and dependencies</CardDescription>
              </CardHeader>
              <CardContent>
                <GanttChart projects={paginatedProjects.map(p => ({
                  id: p.id,
                  title: p.name,
                  start_date: p.start_date || new Date().toISOString(),
                  end_date: p.end_date || new Date().toISOString(),
                  status: p.status,
                  progress: p.progress,
                  clients: p.client ? { name: p.client.name } : undefined
                }))} />
              </CardContent>
            </Card>
          )}

          {projectViewMode === 'timeline' && (
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
                <CardDescription>Chronological view of project milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectTimeline projects={paginatedProjects.map(p => ({
                  id: p.id,
                  title: p.name,
                  start_date: p.start_date || new Date().toISOString(),
                  end_date: p.end_date || new Date().toISOString(),
                  status: p.status,
                  progress: p.progress,
                  clients: p.client ? { name: p.client.name } : undefined,
                  profiles: p.project_manager ? { full_name: p.project_manager.full_name } : undefined
                }))} />
              </CardContent>
            </Card>
          )}

          {projectViewMode === 'kanban' && (
            <div className="space-y-4">
              {fetchingProjects ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-16 mt-2" />
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {[1, 2, 3].map(j => (
                          <Skeleton key={j} className="h-20 w-full" />
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {['planning', 'active', 'in_progress', 'on_hold', 'completed'].map((status) => {
                    const statusProjects = filteredProjects.filter(p => p.status === status);
                    const paginatedStatusProjects = statusProjects.slice(
                      (currentPage - 1) * Math.ceil(pageSize / 5),
                      currentPage * Math.ceil(pageSize / 5)
                    );
                    
                    return (
                      <Card 
                        key={status}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, status)}
                        className={cn(
                          "transition-colors",
                          draggedProjectId && "bg-muted/50"
                        )}
                      >
                        <CardHeader>
                          <CardTitle className="text-sm capitalize">{status.replace('_', ' ')}</CardTitle>
                          <CardDescription>
                            {statusProjects.length} project{statusProjects.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 min-h-[200px]">
                          {paginatedStatusProjects.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              Drop projects here
                            </div>
                          ) : (
                            paginatedStatusProjects.map((project) => {
                              const health = calculateHealthScore(project);
                              const isDragging = draggedProjectId === project.id;
                              
                              return (
                                <Card
                                  key={project.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, project.id)}
                                  onDragEnd={handleDragEnd}
                                  className={cn(
                                    "p-3 cursor-move hover:shadow-md transition-all",
                                    isDragging && "opacity-50"
                                  )}
                                  onClick={() => navigate(`/projects/${project.id}`)}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <p className="font-medium text-sm flex-1">{project.name}</p>
                                    <div className={cn(
                                      "h-2 w-2 rounded-full ml-2 flex-shrink-0",
                                      health.status === 'healthy' && "bg-green-500",
                                      health.status === 'warning' && "bg-yellow-500",
                                      health.status === 'critical' && "bg-red-500"
                                    )} />
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                    <Progress value={project.progress} className="h-1 flex-1 mr-2" />
                                    <span className="text-xs text-muted-foreground">{Math.round(project.progress)}%</span>
                                  </div>
                                  {project.priority && (
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "mt-2 text-xs",
                                        priorityColors[project.priority]
                                      )}
                                    >
                                      {project.priority}
                                    </Badge>
                                  )}
                                </Card>
                              );
                            })
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <TaskKanbanBoard />
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <ResourceManagement resources={resources} projects={projects.map(p => ({
            id: p.id,
            title: p.name,
            status: p.status,
            assigned_to: p.project_manager_id || '',
            estimated_hours: 0,
            actual_hours: 0
          }))} />
        </TabsContent>

        {/* Planning Tab */}
        <TabsContent value="planning" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant={planningViewMode === 'gantt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPlanningViewMode('gantt')}
              >
                <GanttChartIcon className="h-4 w-4 mr-2" />
                Gantt Chart
              </Button>
              <Button
                variant={planningViewMode === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPlanningViewMode('timeline')}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Timeline
              </Button>
              <Button
                variant={planningViewMode === 'critical-path' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPlanningViewMode('critical-path')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Critical Path
              </Button>
            </div>
          </div>

          {planningViewMode === 'gantt' && (
            <Card>
              <CardHeader>
                <CardTitle>Gantt Chart</CardTitle>
                <CardDescription>Interactive project planning and scheduling</CardDescription>
              </CardHeader>
              <CardContent>
                <GanttChart projects={projects.map(p => ({
                  id: p.id,
                  title: p.name,
                  start_date: p.start_date || new Date().toISOString(),
                  end_date: p.end_date || new Date().toISOString(),
                  status: p.status,
                  progress: p.progress,
                  clients: p.client ? { name: p.client.name } : undefined
                }))} />
              </CardContent>
            </Card>
          )}

          {planningViewMode === 'timeline' && (
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
                <CardDescription>Chronological view of all projects</CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectTimeline projects={projects.map(p => ({
                  id: p.id,
                  title: p.name,
                  start_date: p.start_date || new Date().toISOString(),
                  end_date: p.end_date || new Date().toISOString(),
                  status: p.status,
                  progress: p.progress,
                  clients: p.client ? { name: p.client.name } : undefined,
                  profiles: p.project_manager ? { full_name: p.project_manager.full_name } : undefined
                }))} />
              </CardContent>
            </Card>
          )}

          {planningViewMode === 'critical-path' && (
            <Card>
              <CardHeader>
                <CardTitle>Critical Path Analysis</CardTitle>
                <CardDescription>Identify critical tasks and dependencies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Critical path analysis coming soon...
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Project Form Dialog */}
      {showProjectForm && (
        <ProjectFormDialog
          isOpen={showProjectForm}
          onClose={() => {
            setShowProjectForm(false);
            setSelectedProject(null);
          }}
          project={selectedProject}
          onProjectSaved={handleProjectSaved}
        />
      )}

      {/* Delete Confirmation */}
      {projectToDelete && (
        <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{projectToDelete.name}"? This action cannot be undone.
                {tasks.filter(t => t.project_id === projectToDelete.id).length > 0 && (
                  <span className="block mt-2 text-amber-600">
                    Warning: This project has {tasks.filter(t => t.project_id === projectToDelete.id).length} associated task(s).
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteProject}
                className="bg-destructive hover:bg-destructive/90"
                disabled={deletingProjectId === projectToDelete.id}
              >
                {deletingProjectId === projectToDelete.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      </div>
    </ErrorBoundary>
  );
}
