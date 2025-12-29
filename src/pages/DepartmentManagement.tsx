import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Building2,
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  DollarSign,
  Download,
  Filter,
  Grid3x3,
  List,
  Table2,
  ChevronUp,
  ChevronDown,
  Eye,
  Copy,
  Archive,
  RefreshCw,
  MoreVertical,
  UserCheck,
  ExternalLink,
  Briefcase,
  Clock,
  Calculator,
  FileText,
} from "lucide-react";
import { db } from '@/lib/database';
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getAgencyId } from '@/utils/agencyUtils';
import { selectRecords } from '@/services/api/postgresql-service';
import { DepartmentFormDialog } from "@/components/DepartmentFormDialog";
import { TeamAssignmentPanel } from "@/components/TeamAssignmentPanel";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { DepartmentHierarchyView } from "@/components/DepartmentHierarchy";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  parent_department_id?: string;
  budget?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  manager?: {
    full_name: string;
  } | null;
  parent_department?: {
    name: string;
  } | null;
  _count?: {
    team_assignments: number;
  };
}

type ViewMode = "cards" | "table" | "list";
type SortField = "name" | "budget" | "employees" | "created_at";
type SortDirection = "asc" | "desc";

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterManager, setFilterManager] = useState<string>("all");
  const [filterParent, setFilterParent] = useState<string>("all");
  const [minBudget, setMinBudget] = useState<string>("");
  const [maxBudget, setMaxBudget] = useState<string>("");
  
  const [managers, setManagers] = useState<Array<{ user_id: string; full_name: string }>>([]);
  const [parentDepartments, setParentDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [departmentEmployees, setDepartmentEmployees] = useState<Array<{
    id: string;
    user_id: string;
    position_title?: string;
    role_in_department: string;
    full_name: string;
  }>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [departmentMembers, setDepartmentMembers] = useState<Record<string, Array<{
    id: string;
    full_name: string;
    position_title?: string;
    role_in_department: string;
  }>>>({});
  
  const { user, userRole, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isHR = userRole === 'hr';

  useEffect(() => {
    fetchDepartments();
    fetchManagers();
    fetchParentDepartments();
  }, []);

  const fetchManagers = async () => {
    try {
      const agencyId = profile?.agency_id;
      
      let query = db
        .from("profiles")
        .select("user_id, full_name")
        .eq("is_active", true);
      
      if (agencyId) {
        query = query.eq("agency_id", agencyId);
      }
      
      const { data, error } = await query.order("full_name");
      
      if (error) throw error;
      if (data) setManagers(data);
    } catch (error) {
      // Silently handle error - managers list will be empty
    }
  };

  const fetchParentDepartments = async () => {
    try {
      const agencyId = profile?.agency_id;
      
      let query = db
        .from("departments")
        .select("id, name")
        .eq("is_active", true);
      
      if (agencyId) {
        query = query.eq("agency_id", agencyId);
      }
      
      const { data, error } = await query.order("name");
      
      if (error) throw error;
      if (data) setParentDepartments(data);
    } catch (error) {
      // Silently handle error - parent departments list will be empty
    }
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      // In isolated database architecture, all records in this DB belong to the agency
      // No need to filter by agency_id - just get all active departments
      const data = await selectRecords('departments', {
        filters: [
          { column: 'is_active', operator: 'eq', value: true }
        ],
        orderBy: 'name ASC'
      });

      if (!data) throw new Error('Failed to fetch departments');

      // Get team assignment counts and related data for each department
      const departmentsWithCounts = await Promise.all(
        (data || []).map(async (dept) => {
          // Count team assignments using PostgreSQL service
          let count = 0;
          try {
            const teamAssignments = await selectRecords('team_assignments', {
              filters: [
                { column: 'department_id', operator: 'eq', value: dept.id },
                { column: 'is_active', operator: 'eq', value: true }
              ]
            });
            count = teamAssignments?.length || 0;
          } catch (e) {
            console.warn('Could not count team assignments for department:', dept.id, e);
          }

          // Fetch manager info if manager_id exists
          let manager = null;
          if (dept.manager_id) {
            try {
              const managerData = await selectRecords('profiles', {
                filters: [{ column: 'user_id', operator: 'eq', value: dept.manager_id }],
                limit: 1
              });
              if (managerData && managerData.length > 0) {
                manager = { full_name: managerData[0].full_name };
              }
            } catch (e) {
              console.warn('Could not fetch manager for department:', dept.id, e);
            }
          }

          // Fetch parent department info if parent_department_id exists
          let parent_department = null;
          if (dept.parent_department_id) {
            try {
              const parentData = await selectRecords('departments', {
                filters: [{ column: 'id', operator: 'eq', value: dept.parent_department_id }],
                limit: 1
              });
              if (parentData && parentData.length > 0) {
                parent_department = { name: parentData[0].name };
              }
            } catch (e) {
              console.warn('Could not fetch parent department:', dept.id, e);
            }
          }

          return {
            ...dept,
            manager,
            parent_department,
            _count: { team_assignments: count }
          };
        })
      );

      setDepartments(departmentsWithCounts);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch departments. Please check your database connection.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort departments - for active departments tab
  const filteredAndSortedDepartments = useMemo(() => {
    // Only show active departments in the main tab
    let filtered = departments.filter(d => d.is_active);

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(dept =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter (only applies to active departments)
    if (filterStatus === "active") {
      filtered = filtered.filter(d => d.is_active);
    } else if (filterStatus === "inactive") {
      // This shouldn't happen in active tab, but handle it
      filtered = [];
    }

    // Manager filter
    if (filterManager !== "all") {
      filtered = filtered.filter(d => d.manager_id === filterManager);
    }

    // Parent department filter
    if (filterParent !== "all") {
      filtered = filtered.filter(d => d.parent_department_id === filterParent);
    }

    // Budget range filter
    if (minBudget) {
      const min = parseFloat(minBudget);
      filtered = filtered.filter(d => (d.budget || 0) >= min);
    }
    if (maxBudget) {
      const max = parseFloat(maxBudget);
      filtered = filtered.filter(d => (d.budget || 0) <= max);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "budget":
          aVal = a.budget || 0;
          bVal = b.budget || 0;
          break;
        case "employees":
          aVal = a._count?.team_assignments || 0;
          bVal = b._count?.team_assignments || 0;
          break;
        case "created_at":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [departments, searchTerm, filterStatus, filterManager, filterParent, minBudget, maxBudget, sortField, sortDirection]);

  // Filter and sort deactivated departments - for deactivated tab
  const filteredAndSortedDeactivatedDepartments = useMemo(() => {
    // Only show inactive departments
    let filtered = departments.filter(d => !d.is_active);

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(dept =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Manager filter
    if (filterManager !== "all") {
      filtered = filtered.filter(d => d.manager_id === filterManager);
    }

    // Parent department filter
    if (filterParent !== "all") {
      filtered = filtered.filter(d => d.parent_department_id === filterParent);
    }

    // Budget range filter
    if (minBudget) {
      const min = parseFloat(minBudget);
      filtered = filtered.filter(d => (d.budget || 0) >= min);
    }
    if (maxBudget) {
      const max = parseFloat(maxBudget);
      filtered = filtered.filter(d => (d.budget || 0) <= max);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "budget":
          aVal = a.budget || 0;
          bVal = b.budget || 0;
          break;
        case "employees":
          aVal = a._count?.team_assignments || 0;
          bVal = b._count?.team_assignments || 0;
          break;
        case "created_at":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [departments, searchTerm, filterManager, filterParent, minBudget, maxBudget, sortField, sortDirection]);

  // Pagination for active departments
  const paginatedDepartments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredAndSortedDepartments.slice(start, end);
  }, [filteredAndSortedDepartments, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedDepartments.length / pageSize);

  // Pagination for deactivated departments
  const paginatedDeactivatedDepartments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredAndSortedDeactivatedDepartments.slice(start, end);
  }, [filteredAndSortedDeactivatedDepartments, currentPage, pageSize]);

  const totalDeactivatedPages = Math.ceil(filteredAndSortedDeactivatedDepartments.length / pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    setShowDepartmentForm(true);
  };

  const handleDelete = (department: Department) => {
    setSelectedDepartment(department);
    setShowDeleteDialog(true);
  };

  const fetchDepartmentEmployees = async (departmentId: string) => {
    setLoadingEmployees(true);
    try {
      const { data: assignments, error } = await db
        .from("team_assignments")
        .select("id, user_id, position_title, role_in_department")
        .eq("department_id", departmentId)
        .eq("is_active", true);

      if (error) throw error;

      if (assignments && assignments.length > 0) {
        // Fetch profile data for each employee
        const employeeData = await Promise.all(
          assignments.map(async (assignment) => {
            try {
              const { data: profileData, error: profileError } = await db
                .from("profiles")
                .select("full_name")
                .eq("user_id", assignment.user_id)
                .single();

              return {
                id: assignment.id,
                user_id: assignment.user_id,
                position_title: assignment.position_title || "",
                role_in_department: assignment.role_in_department || "member",
                full_name: profileData?.full_name || "Unknown Employee",
              };
            } catch (profileError) {
              // If profile fetch fails, still return the assignment with default name
              return {
                id: assignment.id,
                user_id: assignment.user_id,
                position_title: assignment.position_title || "",
                role_in_department: assignment.role_in_department || "member",
                full_name: "Unknown Employee",
              };
            }
          })
        );
        setDepartmentEmployees(employeeData);
      } else {
        setDepartmentEmployees([]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch department employees",
        variant: "destructive",
      });
      setDepartmentEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleViewDetails = async (department: Department) => {
    setSelectedDepartment(department);
    setShowDetailsDialog(true);
    
    if (department.id) {
      // Fetch fresh department data with all related information
      try {
        const { data: deptData, error } = await db
          .from("departments")
          .select("*")
          .eq("id", department.id)
          .single();

        if (error) throw error;

        // Fetch manager info if manager_id exists
        let manager = null;
        if (deptData.manager_id) {
          const { data: managerData, error: managerError } = await db
            .from("profiles")
            .select("full_name")
            .eq("user_id", deptData.manager_id)
            .single();
          
          if (!managerError && managerData) {
            manager = managerData;
          }
        }

        // Fetch parent department info if parent_department_id exists
        let parent_department = null;
        if (deptData.parent_department_id) {
          const { data: parentData, error: parentError } = await db
            .from("departments")
            .select("name")
            .eq("id", deptData.parent_department_id)
            .single();
          
          if (!parentError && parentData) {
            parent_department = parentData;
          }
        }

        // Count team assignments
        const { data: countData } = await db
          .from("team_assignments")
          .select("id")
          .eq("department_id", department.id)
          .eq("is_active", true);

        const count = countData?.length || 0;

        // Update selected department with fresh data
        setSelectedDepartment({
          ...deptData,
          manager,
          parent_department,
          _count: { team_assignments: count }
        });

        // Fetch employees
        fetchDepartmentEmployees(department.id);
      } catch (error) {
        // If refresh fails, use the existing department data
        fetchDepartmentEmployees(department.id);
      }
    }
  };

  // Navigation handlers to related pages
  const handleViewEmployees = (departmentId: string, departmentName: string) => {
    navigate(`/employee-management?department=${departmentId}&name=${encodeURIComponent(departmentName)}`);
  };

  const handleViewProjects = (departmentId: string, departmentName: string) => {
    navigate(`/projects?department=${departmentId}&name=${encodeURIComponent(departmentName)}`);
  };

  const handleViewAttendance = (departmentId: string, departmentName: string) => {
    navigate(`/attendance?department=${departmentId}&name=${encodeURIComponent(departmentName)}`);
  };

  const handleViewPayroll = (departmentId: string, departmentName: string) => {
    navigate(`/payroll?department=${departmentId}&name=${encodeURIComponent(departmentName)}`);
  };

  const handleDuplicate = async (department: Department) => {
    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        toast({
          title: 'Error',
          description: 'Agency ID not found. Please ensure you are logged in to an agency account.',
          variant: 'destructive',
        });
        return;
      }
      const { error } = await db
        .from("departments")
        .insert([{
          name: `${department.name} (Copy)`,
          description: department.description,
          manager_id: department.manager_id,
          parent_department_id: department.parent_department_id,
          budget: department.budget || 0,
          is_active: true,
          agency_id: agencyId,
        }]);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Department duplicated successfully",
      });
      fetchDepartments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to duplicate department",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async (department: Department) => {
    try {
      const { error } = await db
        .from("departments")
        .update({ is_active: false })
        .eq("id", department.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Department archived successfully",
      });
      fetchDepartments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to archive department",
        variant: "destructive",
      });
    }
  };

  const handleRestore = async (department: Department) => {
    try {
      const { error } = await db
        .from("departments")
        .update({ is_active: true })
        .eq("id", department.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Department restored successfully",
      });
      fetchDepartments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to restore department",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDepartments.size === 0) return;
    
    try {
      const ids = Array.from(selectedDepartments);
      await Promise.all(
        ids.map(id =>
          db.from("departments").update({ is_active: false }).eq("id", id)
        )
      );
      
      toast({
        title: "Success",
        description: `${selectedDepartments.size} department(s) archived successfully`,
      });
      setSelectedDepartments(new Set());
      fetchDepartments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to archive departments",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedDepartments.size === paginatedDepartments.length) {
      setSelectedDepartments(new Set());
    } else {
      setSelectedDepartments(new Set(paginatedDepartments.map(d => d.id)));
    }
  };

  const handleSelectDepartment = (id: string) => {
    const newSelected = new Set(selectedDepartments);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDepartments(newSelected);
  };

  const exportToCSV = () => {
    const headers = ["Name", "Description", "Manager", "Parent Department", "Budget", "Employees", "Status", "Created At"];
    const rows = filteredAndSortedDepartments.map(dept => [
      dept.name,
      dept.description || "",
      dept.manager?.full_name || "",
      dept.parent_department?.name || "",
      (dept.budget || 0).toString(),
      (dept._count?.team_assignments || 0).toString(),
      dept.is_active ? "Active" : "Inactive",
      new Date(dept.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `departments_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Departments exported to CSV successfully",
    });
  };

  // Statistics - Calculate from database data
  const stats = useMemo(() => {
    if (!departments || departments.length === 0) {
      return {
        active: 0,
        inactive: 0,
        total: 0,
        totalBudget: 0,
        totalEmployees: 0,
        avgBudget: 0,
        avgEmployees: 0,
        departmentsWithManager: 0,
        departmentsWithParent: 0,
      };
    }

    const active = departments.filter(d => d.is_active === true);
    const inactive = departments.filter(d => d.is_active === false);
    
    // Calculate total budget from active departments only
    const totalBudget = active.reduce((sum, dept) => {
      const budget = dept.budget ? Number(dept.budget) : 0;
      return sum + budget;
    }, 0);
    
    // Calculate total employees from team assignments count
    const totalEmployees = active.reduce((sum, dept) => {
      const count = dept._count?.team_assignments ? Number(dept._count.team_assignments) : 0;
      return sum + count;
    }, 0);
    
    // Calculate averages
    const avgBudget = active.length > 0 ? totalBudget / active.length : 0;
    const avgEmployees = active.length > 0 ? totalEmployees / active.length : 0;
    
    // Count departments with managers
    const departmentsWithManager = active.filter(d => d.manager_id && d.manager_id.trim() !== '').length;
    
    // Count departments with parent departments
    const departmentsWithParent = active.filter(d => d.parent_department_id && d.parent_department_id.trim() !== '').length;

    return {
      active: active.length,
      inactive: inactive.length,
      total: departments.length,
      totalBudget: Number(totalBudget.toFixed(2)),
      totalEmployees: totalEmployees,
      avgBudget: Number(avgBudget.toFixed(2)),
      avgEmployees: Number(avgEmployees.toFixed(1)),
      departmentsWithManager,
      departmentsWithParent,
    };
  }, [departments]);

  if (!isAdmin && !isHR) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">
              You don't have permission to access department management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">Department Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage organizational structure and team assignments
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && selectedDepartments.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="whitespace-nowrap"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Archive Selected</span>
              <span className="sm:hidden">Archive</span>
              <span className="ml-1">({selectedDepartments.size})</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportToCSV} className="whitespace-nowrap">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
          {isAdmin && (
            <Button 
              onClick={() => {
                setSelectedDepartment(null);
                setShowDepartmentForm(true);
              }}
              className="whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Create Department</span>
              <span className="sm:hidden">Create</span>
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced Stats - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <Card className="w-full overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-2xl sm:text-3xl font-bold truncate" title={stats.active.toString()}>
                  {stats.active}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Active Departments</p>
                {stats.inactive > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.inactive} inactive
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 ml-2">
                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="w-full overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-2xl sm:text-3xl font-bold truncate" title={stats.totalEmployees.toString()}>
                  {stats.totalEmployees}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Total Employees</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {stats.avgEmployees} per dept
                </p>
              </div>
              <div className="flex-shrink-0 ml-2">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="w-full overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p 
                  className="text-xl sm:text-2xl lg:text-3xl font-bold truncate" 
                  title={`₹${stats.totalBudget.toLocaleString()}`}
                >
                  ₹{stats.totalBudget >= 1000000 
                    ? `${(stats.totalBudget / 1000000).toFixed(1)}M`
                    : stats.totalBudget >= 1000
                    ? `${(stats.totalBudget / 1000).toFixed(1)}K`
                    : stats.totalBudget.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Total Budget</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: ₹{stats.avgBudget >= 1000000
                    ? `${(stats.avgBudget / 1000000).toFixed(1)}M`
                    : stats.avgBudget >= 1000
                    ? `${(stats.avgBudget / 1000).toFixed(1)}K`
                    : stats.avgBudget.toLocaleString()}
                </p>
              </div>
              <div className="flex-shrink-0 ml-2">
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="w-full overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-2xl sm:text-3xl font-bold truncate" title={stats.departmentsWithManager.toString()}>
                  {stats.departmentsWithManager}
                </p>
                <p className="text-sm text-muted-foreground mt-1">With Managers</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.departmentsWithParent} with parent
                </p>
              </div>
              <div className="flex-shrink-0 ml-2">
                <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="deactivated">
              Deactivated ({stats.inactive})
            </TabsTrigger>
          )}
          {(isAdmin || isHR) && (
            <TabsTrigger value="assignments">Team Assignments</TabsTrigger>
          )}
          <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-4">
          {/* Active Departments Tab */}
          {/* Search and Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("cards")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <Table2 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Manager</label>
                    <Select value={filterManager} onValueChange={setFilterManager}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Managers</SelectItem>
                        {managers.map(m => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Parent Department</label>
                    <Select value={filterParent} onValueChange={setFilterParent}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {parentDepartments.map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Min Budget</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={minBudget}
                      onChange={(e) => setMinBudget(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Budget</label>
                    <Input
                      type="number"
                      placeholder="No limit"
                      value={maxBudget}
                      onChange={(e) => setMaxBudget(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Departments Display */}
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p>Loading departments...</p>
              </CardContent>
            </Card>
          ) : filteredAndSortedDepartments.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No departments found</p>
              </CardContent>
            </Card>
          ) : viewMode === "table" ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {isAdmin && (
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedDepartments.size === paginatedDepartments.length && paginatedDepartments.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                        )}
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center">
                            Name
                            <SortIcon field="name" />
                          </div>
                        </TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Manager</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("budget")}
                        >
                          <div className="flex items-center">
                            Budget
                            <SortIcon field="budget" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("employees")}
                        >
                          <div className="flex items-center">
                            Employees
                            <SortIcon field="employees" />
                          </div>
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDepartments.map((department) => (
                        <TableRow key={department.id}>
                          {isAdmin && (
                            <TableCell>
                              <Checkbox
                                checked={selectedDepartments.has(department.id)}
                                onCheckedChange={() => handleSelectDepartment(department.id)}
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{department.name}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {department.description || "-"}
                          </TableCell>
                          <TableCell>
                            {department.manager ? (
                              <Badge variant="outline">{department.manager.full_name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {department.parent_department ? (
                              <Badge variant="secondary">{department.parent_department.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {department.budget ? `₹${department.budget.toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {department._count?.team_assignments || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={department.is_active ? "default" : "secondary"}>
                              {department.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetails(department)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleViewEmployees(department.id, department.name)}>
                                  <Users className="h-4 w-4 mr-2" />
                                  View Employees
                                  <ExternalLink className="h-3 w-3 ml-auto" />
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewProjects(department.id, department.name)}>
                                  <Briefcase className="h-4 w-4 mr-2" />
                                  View Projects
                                  <ExternalLink className="h-3 w-3 ml-auto" />
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewAttendance(department.id, department.name)}>
                                  <Clock className="h-4 w-4 mr-2" />
                                  View Attendance
                                  <ExternalLink className="h-3 w-3 ml-auto" />
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewPayroll(department.id, department.name)}>
                                  <Calculator className="h-4 w-4 mr-2" />
                                  View Payroll
                                  <ExternalLink className="h-3 w-3 ml-auto" />
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleEdit(department)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDuplicate(department)}>
                                      <Copy className="h-4 w-4 mr-2" />
                                      Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {department.is_active ? (
                                      <DropdownMenuItem onClick={() => handleArchive(department)}>
                                        <Archive className="h-4 w-4 mr-2" />
                                        Archive
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => handleRestore(department)}>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Restore
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(department)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAndSortedDepartments.length)} of {filteredAndSortedDepartments.length} departments
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="text-sm">
                        Page {currentPage} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(v) => {
                          setPageSize(parseInt(v));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-20">
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
                )}
              </CardContent>
            </Card>
          ) : viewMode === "list" ? (
            <div className="space-y-2">
              {paginatedDepartments.map((department) => (
                <Card key={department.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {isAdmin && (
                          <Checkbox
                            checked={selectedDepartments.has(department.id)}
                            onCheckedChange={() => handleSelectDepartment(department.id)}
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{department.name}</h3>
                            <Badge variant={department.is_active ? "default" : "secondary"}>
                              {department.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {department.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {department.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            {department.manager && (
                              <span className="text-muted-foreground">
                                Manager: {department.manager.full_name}
                              </span>
                            )}
                            {department.budget && (
                              <span className="text-muted-foreground">
                                Budget: ₹{department.budget.toLocaleString()}
                              </span>
                            )}
                            <span className="text-muted-foreground">
                              Employees: {department._count?.team_assignments || 0}
                            </span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(department)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewEmployees(department.id, department.name)}>
                              <Users className="h-4 w-4 mr-2" />
                              View Employees
                              <ExternalLink className="h-3 w-3 ml-auto" />
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewProjects(department.id, department.name)}>
                              <Briefcase className="h-4 w-4 mr-2" />
                              View Projects
                              <ExternalLink className="h-3 w-3 ml-auto" />
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewAttendance(department.id, department.name)}>
                              <Clock className="h-4 w-4 mr-2" />
                              View Attendance
                              <ExternalLink className="h-3 w-3 ml-auto" />
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewPayroll(department.id, department.name)}>
                              <Calculator className="h-4 w-4 mr-2" />
                              View Payroll
                              <ExternalLink className="h-3 w-3 ml-auto" />
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEdit(department)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(department)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {department.is_active ? (
                                  <DropdownMenuItem onClick={() => handleArchive(department)}>
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleRestore(department)}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Restore
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleDelete(department)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {/* Pagination for list view */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAndSortedDepartments.length)} of {filteredAndSortedDepartments.length} departments
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedDepartments.map((department) => (
                <Card key={department.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{department.name}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(department)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewEmployees(department.id, department.name)}>
                            <Users className="h-4 w-4 mr-2" />
                            View Employees
                            <ExternalLink className="h-3 w-3 ml-auto" />
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewProjects(department.id, department.name)}>
                            <Briefcase className="h-4 w-4 mr-2" />
                            View Projects
                            <ExternalLink className="h-3 w-3 ml-auto" />
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewAttendance(department.id, department.name)}>
                            <Clock className="h-4 w-4 mr-2" />
                            View Attendance
                            <ExternalLink className="h-3 w-3 ml-auto" />
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewPayroll(department.id, department.name)}>
                            <Calculator className="h-4 w-4 mr-2" />
                            View Payroll
                            <ExternalLink className="h-3 w-3 ml-auto" />
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(department)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(department)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {department.is_active ? (
                                <DropdownMenuItem onClick={() => handleArchive(department)}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleRestore(department)}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Restore
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDelete(department)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {department.description && (
                      <p className="text-sm text-muted-foreground">
                        {department.description}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      {department.manager && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Manager</Badge>
                          <span className="text-sm">{department.manager.full_name}</span>
                        </div>
                      )}
                      
                      {department.parent_department && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Parent</Badge>
                          <span className="text-sm">{department.parent_department.name}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {department._count?.team_assignments || 0} Members
                        </Badge>
                        {department.budget && department.budget > 0 && (
                          <Badge variant="outline">
                            ₹{department.budget.toLocaleString()} Budget
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {/* Pagination for cards view */}
              {totalPages > 1 && (
                <div className="col-span-full flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deactivated" className="space-y-4">
          {/* Deactivated Departments Tab */}
          {/* Search and Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search deactivated departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("cards")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <Table2 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Manager</label>
                    <Select value={filterManager} onValueChange={setFilterManager}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Managers</SelectItem>
                        {managers.map(m => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Parent Department</label>
                    <Select value={filterParent} onValueChange={setFilterParent}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {parentDepartments.map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Min Budget</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={minBudget}
                      onChange={(e) => setMinBudget(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Budget</label>
                    <Input
                      type="number"
                      placeholder="No limit"
                      value={maxBudget}
                      onChange={(e) => setMaxBudget(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deactivated Departments Display */}
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p>Loading deactivated departments...</p>
              </CardContent>
            </Card>
          ) : filteredAndSortedDeactivatedDepartments.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No deactivated departments found</p>
              </CardContent>
            </Card>
          ) : viewMode === "table" ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {isAdmin && (
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedDepartments.size === paginatedDeactivatedDepartments.length && paginatedDeactivatedDepartments.length > 0}
                              onCheckedChange={() => {
                                if (selectedDepartments.size === paginatedDeactivatedDepartments.length) {
                                  setSelectedDepartments(new Set());
                                } else {
                                  setSelectedDepartments(new Set(paginatedDeactivatedDepartments.map(d => d.id)));
                                }
                              }}
                            />
                          </TableHead>
                        )}
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center">
                            Name
                            <SortIcon field="name" />
                          </div>
                        </TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Manager</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("budget")}
                        >
                          <div className="flex items-center">
                            Budget
                            <SortIcon field="budget" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("employees")}
                        >
                          <div className="flex items-center">
                            Employees
                            <SortIcon field="employees" />
                          </div>
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDeactivatedDepartments.map((department) => (
                        <TableRow key={department.id}>
                          {isAdmin && (
                            <TableCell>
                              <Checkbox
                                checked={selectedDepartments.has(department.id)}
                                onCheckedChange={() => handleSelectDepartment(department.id)}
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{department.name}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {department.description || "-"}
                          </TableCell>
                          <TableCell>
                            {department.manager ? (
                              <Badge variant="outline">{department.manager.full_name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {department.parent_department ? (
                              <Badge variant="secondary">{department.parent_department.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {department.budget ? `₹${department.budget.toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {department._count?.team_assignments || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetails(department)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRestore(department)}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Restore
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(department)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination */}
                {totalDeactivatedPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAndSortedDeactivatedDepartments.length)} of {filteredAndSortedDeactivatedDepartments.length} deactivated departments
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="text-sm">
                        Page {currentPage} of {totalDeactivatedPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalDeactivatedPages, p + 1))}
                        disabled={currentPage === totalDeactivatedPages}
                      >
                        Next
                      </Button>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(v) => {
                          setPageSize(parseInt(v));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-20">
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
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedDeactivatedDepartments.map((department) => (
                <Card key={department.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{department.name}</CardTitle>
                      <Badge variant="secondary">Deactivated</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {department.description && (
                      <p className="text-sm text-muted-foreground">
                        {department.description}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      {department.manager && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Manager</Badge>
                          <span className="text-sm">{department.manager.full_name}</span>
                        </div>
                      )}
                      
                      {department.parent_department && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Parent</Badge>
                          <span className="text-sm">{department.parent_department.name}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {department._count?.team_assignments || 0} Members
                        </Badge>
                        {department.budget && department.budget > 0 && (
                          <Badge variant="outline">
                            ₹{department.budget.toLocaleString()} Budget
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(department)}
                        className="flex-1"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(department)}
                        className="flex-1"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {/* Pagination for cards view */}
              {totalDeactivatedPages > 1 && (
                <div className="col-span-full flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {currentPage} of {totalDeactivatedPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalDeactivatedPages, p + 1))}
                    disabled={currentPage === totalDeactivatedPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments">
          <TeamAssignmentPanel />
        </TabsContent>

        <TabsContent value="hierarchy">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Department Hierarchy</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Visual representation of your organizational structure
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchDepartments}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <DepartmentHierarchyView 
                  departments={departments}
                  expandedDepartments={expandedDepartments}
                  setExpandedDepartments={setExpandedDepartments}
                  departmentMembers={departmentMembers}
                  setDepartmentMembers={setDepartmentMembers}
                  onDepartmentClick={(dept) => {
                    handleViewDetails(dept);
                  }}
                  db={db}
                  onRefresh={fetchDepartments}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Department Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={(open) => {
        setShowDetailsDialog(open);
        if (!open) {
          setDepartmentEmployees([]);
          setSelectedDepartment(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDepartment?.name}</DialogTitle>
            <DialogDescription>
              Complete department information and details
            </DialogDescription>
          </DialogHeader>
          {selectedDepartment && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1 text-sm">{selectedDepartment.description || "No description provided"}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Manager</label>
                  <p className="mt-1">
                    {selectedDepartment.manager?.full_name || "No manager assigned"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Parent Department</label>
                  <p className="mt-1">
                    {selectedDepartment.parent_department?.name || "Top level department"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Budget</label>
                  <p className="mt-1">
                    {selectedDepartment.budget 
                      ? `₹${selectedDepartment.budget.toLocaleString()}` 
                      : "No budget set"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Employees</label>
                  <p className="mt-1">
                    {selectedDepartment._count?.team_assignments || 0} employees
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={selectedDepartment.is_active ? "default" : "secondary"}>
                      {selectedDepartment.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="mt-1">
                    {new Date(selectedDepartment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-muted-foreground mb-3 block">
                  Quick Actions
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDetailsDialog(false);
                      handleViewEmployees(selectedDepartment.id, selectedDepartment.name);
                    }}
                    className="w-full"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View Employees
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDetailsDialog(false);
                      handleViewProjects(selectedDepartment.id, selectedDepartment.name);
                    }}
                    className="w-full"
                  >
                    <Briefcase className="h-4 w-4 mr-2" />
                    View Projects
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDetailsDialog(false);
                      handleViewAttendance(selectedDepartment.id, selectedDepartment.name);
                    }}
                    className="w-full"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    View Attendance
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDetailsDialog(false);
                      handleViewPayroll(selectedDepartment.id, selectedDepartment.name);
                    }}
                    className="w-full"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    View Payroll
                  </Button>
                </div>
              </div>

              {/* Employees List */}
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-muted-foreground mb-3 block">
                  Employees ({departmentEmployees.length})
                </label>
                {loadingEmployees ? (
                  <p className="text-sm text-muted-foreground">Loading employees...</p>
                ) : departmentEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No employees assigned to this department</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {departmentEmployees.map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{employee.full_name}</p>
                            {employee.position_title && (
                              <p className="text-xs text-muted-foreground">{employee.position_title}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {employee.role_in_department}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <DepartmentFormDialog
        open={showDepartmentForm}
        onOpenChange={setShowDepartmentForm}
        department={selectedDepartment}
        onDepartmentSaved={() => {
          fetchDepartments();
          setSelectedDepartment(null);
        }}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedDepartment(null);
        }}
        onDeleted={() => {
          fetchDepartments();
          setSelectedDepartment(null);
        }}
        itemType="Department"
        itemName={selectedDepartment?.name || ""}
        itemId={selectedDepartment?.id || ""}
        tableName="departments"
        softDelete={selectedDepartment?.is_active !== false}
      />
    </div>
  );
}
