import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, Search, Filter, Mail, Phone, Loader2, Edit, Trash2, Eye, 
  Users, UserCheck, UserX, Briefcase, Shield, Crown, Star, MapPin, 
  Calendar, Building2, UserPlus, X, MoreVertical, ExternalLink, Clock, Calculator, BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import UserFormDialog from "@/components/UserFormDialog";
import { DepartmentBreadcrumb } from "@/components/DepartmentBreadcrumb";
import { useDepartmentNavigation } from "@/hooks/useDepartmentNavigation";
import { selectRecords, updateRecord, deleteRecord, insertRecord } from '@/services/api/postgresql-service';
import { generateUUID } from '@/lib/uuid';
import { getAgencyId } from '@/utils/agencyUtils';
import { getRoleDisplayName, ROLE_CATEGORIES, canAccessEmployeeData, canManageRole, AppRole } from '@/utils/roleUtils';
import { RoleGuard } from "@/components/RoleGuard";
import { getProjectsForSelectionAuto } from "@/services/api/project-selector-service";
import { projectService } from "@/services/api/project-service";
import { Progress } from "@/components/ui/progress";

interface UnifiedEmployee {
  id: string;
  user_id: string;
  employee_id?: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: string;
  department_id?: string; // Add department_id for filtering by ID
  position?: string;
  role: string;
  status: 'active' | 'inactive';
  is_active: boolean;
  hire_date?: string;
  employment_type?: string;
  work_location?: string;
  avatar_url?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

const EmployeeManagement = () => {
  const { toast } = useToast();
  const { user, userRole, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    departmentId: urlDepartmentId,
    departmentName: urlDepartmentName,
    employeeId: urlEmployeeId,
    navigateToDepartment,
    navigateToProjects,
    navigateToAttendance,
    navigateToPayroll,
  } = useDepartmentNavigation();
  
  // Get department filter from URL (for backward compatibility)
  const legacyDepartmentId = searchParams.get('department');
  const legacyDepartmentName = searchParams.get('name');
  
  const [employees, setEmployees] = useState<UnifiedEmployee[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>((urlDepartmentId || legacyDepartmentId) || "all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [selectedEmployee, setSelectedEmployee] = useState<UnifiedEmployee | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string; role: string; position?: string; department?: string; phone?: string; hire_date?: string } | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<UnifiedEmployee | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUserFormDialog, setShowUserFormDialog] = useState(false);
  const [showUserDeleteDialog, setShowUserDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UnifiedEmployee>>({});
  const [saving, setSaving] = useState(false);
  
  // Integration data for employee view
  const [employeeProjects, setEmployeeProjects] = useState<any[]>([]);
  const [loadingEmployeeProjects, setLoadingEmployeeProjects] = useState(false);

  const managerDepartment = profile?.department || undefined;

  const canViewEmployee = (employee: UnifiedEmployee): boolean => {
    if (!user || !userRole) return false;
    // Everyone can see their own record
    if (employee.user_id === user.id) return true;
    return canAccessEmployeeData(userRole as AppRole, managerDepartment, employee.department);
  };

  const canManageEmployee = (employee: UnifiedEmployee): boolean => {
    if (!user || !userRole) return false;
    // Cannot manage yourself from this screen
    if (employee.user_id === user.id) return false;
    const canAccess = canAccessEmployeeData(
      userRole as AppRole,
      managerDepartment,
      employee.department
    );
    if (!canAccess) return false;
    return canManageRole(userRole as AppRole, employee.role as AppRole);
  };

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, [urlDepartmentId]);

  // Update department filter when URL parameter changes
  useEffect(() => {
    const deptId = urlDepartmentId || legacyDepartmentId;
    if (deptId) {
      setDepartmentFilter(deptId);
    }
  }, [urlDepartmentId, legacyDepartmentId]);

  const fetchDepartments = async () => {
    try {
      const deptData = await selectRecords('departments', {
        select: 'id, name',
        filters: [
          { column: 'is_active', operator: 'eq', value: true }
        ],
        orderBy: 'name ASC'
      });
      setDepartments(deptData);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      // Use unified_employees view for single query instead of joining 4 tables
      // This view consolidates: users, profiles, employee_details, and user_roles
      // Note: We fetch all employees and let tabs filter by is_fully_active
      const unifiedData = await selectRecords('unified_employees', {
        orderBy: 'display_name ASC'
      });

      // Fetch team assignments to get department_id for each employee
      const teamAssignments = await selectRecords('team_assignments', {
        filters: [
          { column: 'is_active', operator: 'eq', value: true }
        ]
      });

      // Create a map of user_id to department_id
      const userDepartmentMap = new Map<string, string>();
      teamAssignments.forEach((ta: any) => {
        if (ta.user_id && ta.department_id) {
          userDepartmentMap.set(ta.user_id, ta.department_id);
        }
      });

      // Transform view data to UnifiedEmployee interface
      const unifiedEmployees: UnifiedEmployee[] = unifiedData.map((emp: any) => {
        const departmentId = userDepartmentMap.get(emp.user_id);
        return {
          id: emp.employee_detail_id || emp.profile_id || emp.user_id,
          user_id: emp.user_id,
          employee_id: emp.employee_id,
          full_name: emp.display_name || emp.full_name_computed || emp.full_name || 'Unknown User',
          first_name: emp.first_name || emp.full_name?.split(' ')[0] || '',
          last_name: emp.last_name || emp.full_name?.split(' ').slice(1).join(' ') || '',
          email: emp.email || '',
          phone: emp.phone,
          department: emp.department,
          department_id: departmentId, // Add department_id for filtering
          position: emp.position,
          role: emp.role || 'employee',
          status: emp.is_fully_active ? 'active' : 'inactive',
          is_active: emp.is_fully_active,
          hire_date: emp.hire_date,
          employment_type: emp.employment_type,
          work_location: emp.work_location,
          avatar_url: emp.avatar_url,
          emergency_contact_name: emp.emergency_contact_name,
          emergency_contact_phone: emp.emergency_contact_phone,
        };
      });

      setEmployees(unifiedEmployees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      
      // Fallback to old method if view doesn't exist yet
      if (error.message?.includes('relation') && error.message?.includes('unified_employees')) {
        console.warn('unified_employees view not found, falling back to old method');
        toast({
          title: "Warning",
          description: "Database view not found. Please run migration: 03_create_unified_employees_view.sql",
          variant: "default",
        });
        
        // Fallback to old method
        await fetchEmployeesFallback();
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to fetch employees. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Fallback method using old approach (for backward compatibility)
  const fetchEmployeesFallback = async () => {
    try {
      // Fetch profiles
      const profilesData = await selectRecords('profiles', {
        orderBy: 'full_name ASC'
      });

      // Fetch user roles
      const rolesData = await selectRecords('user_roles', {
        select: 'user_id, role'
      });

      // Fetch employee details
      const employeeDetailsData = await selectRecords('employee_details', {
        select: 'id, user_id, employee_id, first_name, last_name, employment_type, work_location, is_active, emergency_contact_name, emergency_contact_phone'
      });

      // Fetch users for email
      const userIds = profilesData.map((p: any) => p.user_id).filter(Boolean);
      let usersData: any[] = [];
      if (userIds.length > 0) {
        usersData = await selectRecords('users', {
          select: 'id, email, is_active',
          filters: [
            { column: 'id', operator: 'in', value: userIds }
          ]
        });
      }

      // Create maps for quick lookup
      const roleMap = new Map<string, string>();
      rolesData?.forEach((r: any) => {
        roleMap.set(r.user_id, r.role);
      });

      const employeeMap = new Map<string, any>();
      employeeDetailsData?.forEach((e: any) => {
        employeeMap.set(e.user_id, e);
      });

      const userMap = new Map<string, any>();
      usersData?.forEach((u: any) => {
        userMap.set(u.id, u);
      });

      // Transform and merge data
      const unifiedEmployees: UnifiedEmployee[] = profilesData.map((profile: any) => {
        const employeeDetail = employeeMap.get(profile.user_id);
        const userData = userMap.get(profile.user_id);
        const role = roleMap.get(profile.user_id) || 'employee';
        
        return {
          id: employeeDetail?.id || profile.id,
          user_id: profile.user_id,
          employee_id: employeeDetail?.employee_id,
          full_name: profile.full_name || `${employeeDetail?.first_name || ''} ${employeeDetail?.last_name || ''}`.trim() || 'Unknown User',
          first_name: employeeDetail?.first_name || profile.full_name?.split(' ')[0] || '',
          last_name: employeeDetail?.last_name || profile.full_name?.split(' ').slice(1).join(' ') || '',
          email: userData?.email || `${(profile.full_name || 'user').toLowerCase().replace(/\s+/g, '.')}@company.com`,
          phone: profile.phone,
          department: profile.department,
          position: profile.position,
          role: role,
          status: (profile.is_active && userData?.is_active !== false) ? 'active' : 'inactive',
          is_active: profile.is_active && userData?.is_active !== false,
          hire_date: profile.hire_date,
          employment_type: employeeDetail?.employment_type,
          work_location: employeeDetail?.work_location,
          avatar_url: profile.avatar_url,
          emergency_contact_name: employeeDetail?.emergency_contact_name,
          emergency_contact_phone: employeeDetail?.emergency_contact_phone,
        };
      });

      setEmployees(unifiedEmployees);
    } catch (error: any) {
      console.error('Error in fallback fetch:', error);
      throw error;
    }
  };

  const getFilteredEmployees = () => {
    let filtered = employees;

    // Tab filter
    if (selectedTab === 'active') {
      filtered = filtered.filter(emp => emp.is_active);
    } else if (selectedTab === 'trash') {
      filtered = filtered.filter(emp => !emp.is_active);
    } else if (selectedTab === 'admins') {
      // Admins tab shows only active admins
      filtered = filtered.filter(emp => emp.is_active && ['super_admin', 'admin'].includes(emp.role));
    } else if (selectedTab === 'managers') {
      // Managers tab shows only active managers
      filtered = filtered.filter(emp => emp.is_active && ROLE_CATEGORIES.management.includes(emp.role as any));
    } else if (selectedTab === 'all') {
      // "All" tab shows ALL employees regardless of status
      // No filter applied - show everything
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(emp => emp.role === roleFilter);
    }

    // Department filter - support both department name and department_id
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(emp => 
        emp.department_id === departmentFilter || 
        emp.department === departmentFilter
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(emp => emp.status === statusFilter);
    }

    return filtered;
  };

  const filteredEmployees = getFilteredEmployees();

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.is_active).length,
    inactive: employees.filter(e => !e.is_active).length,
    admins: employees.filter(e => e.is_active && ['super_admin', 'admin'].includes(e.role)).length,
    managers: employees.filter(e => e.is_active && ROLE_CATEGORIES.management.includes(e.role as any)).length,
    departments: new Set(employees.map(e => e.department).filter(Boolean)).size,
  };

  const handleViewEmployee = async (employee: UnifiedEmployee) => {
    setSelectedEmployee(employee);
    setShowViewDialog(true);
    // Load employee projects
    await loadEmployeeProjects(employee.user_id);
  };

  const loadEmployeeProjects = async (employeeId: string) => {
    setLoadingEmployeeProjects(true);
    try {
      // Fetch all projects and filter by employee assignment
      const allProjects = await projectService.getProjects({}, profile, user?.id);
      
      // Filter projects where employee is assigned (in assigned_team array or as manager)
      const employeeProjects = allProjects.filter((project: any) => {
        // Check if employee is in assigned_team
        const inTeam = project.assigned_team && Array.isArray(project.assigned_team) && 
          project.assigned_team.some((member: any) => {
            const memberId = typeof member === 'string' ? member : member.user_id || member.id || String(member);
            return memberId === employeeId;
          });
        
        // Check if employee is project manager or account manager
        const isManager = project.project_manager_id === employeeId || project.account_manager_id === employeeId;
        
        return inTeam || isManager;
      });
      
      setEmployeeProjects(employeeProjects);
    } catch (error) {
      console.error('Error loading employee projects:', error);
      setEmployeeProjects([]);
    } finally {
      setLoadingEmployeeProjects(false);
    }
  };

  const handleEditEmployee = (employee: UnifiedEmployee) => {
    if (!canManageEmployee(employee)) {
      toast({
        title: "Permission denied",
        description: "You are not allowed to edit this employee.",
        variant: "destructive",
      });
      return;
    }
    // Check if this is a user (has user_id but no employee_id) or an employee
    if (!employee.employee_id) {
      // This is a user, open UserFormDialog
      setSelectedUser({
        id: employee.user_id,
        name: employee.full_name,
        email: employee.email,
        role: employee.role,
        position: employee.position,
        department: employee.department,
        phone: employee.phone,
        hire_date: employee.hire_date
      } as any);
      setShowUserFormDialog(true);
    } else {
      // This is an employee, open employee edit dialog
      setSelectedEmployee(employee);
      // Normalize employment_type - convert hyphens to underscores for form state
      const normalizedType = employee.employment_type?.replace('-', '_') || 'full_time';
      setEditForm({
        full_name: employee.full_name,
        phone: employee.phone,
        department: employee.department,
        position: employee.position,
        employment_type: normalizedType,
        work_location: employee.work_location,
        is_active: employee.is_active,
      });
      setShowEditDialog(true);
    }
  };

  const handleDeleteEmployee = (employee: UnifiedEmployee) => {
    if (!canManageEmployee(employee)) {
      toast({
        title: "Permission denied",
        description: "You are not allowed to delete or deactivate this employee.",
        variant: "destructive",
      });
      return;
    }
    if (!employee.employee_id) {
      // This is a user, show user delete dialog
      setSelectedUserForDelete(employee);
      setShowUserDeleteDialog(true);
    } else {
      // This is an employee, show employee delete dialog
      setSelectedEmployee(employee);
      setShowDeleteDialog(true);
    }
  };

  const handleSaveEmployee = async () => {
    if (!selectedEmployee || !user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to update employees",
        variant: "destructive",
      });
      return;
    }
    
    setSaving(true);
    try {
      // Track if status changed from inactive to active
      const wasInactive = !selectedEmployee.is_active;
      const isNowActive = editForm.is_active;
      const statusChangedToActive = wasInactive && isNowActive;

      // Update all three tables sequentially to ensure consistency
      // Check if profile exists
      const existingProfiles = await selectRecords('profiles', {
        filters: [{ column: 'user_id', operator: 'eq', value: selectedEmployee.user_id }]
      });

      // Update or create profile
      if (existingProfiles.length > 0) {
        // Update existing profile - include full_name and is_active
        await updateRecord('profiles', {
          full_name: editForm.full_name,
          phone: editForm.phone,
          department: editForm.department,
          position: editForm.position,
          is_active: editForm.is_active,
        }, { user_id: selectedEmployee.user_id }, user.id);
      } else {
        // Profile doesn't exist - create it with the updated information
        const agencyId = await getAgencyId(profile, user?.id);
        await insertRecord('profiles', {
          id: generateUUID(),
          user_id: selectedEmployee.user_id,
          agency_id: agencyId || '00000000-0000-0000-0000-000000000000',
          full_name: editForm.full_name,
          phone: editForm.phone,
          department: editForm.department,
          position: editForm.position,
          is_active: editForm.is_active,
        }, user.id);
      }

      // Update users table is_active status
      await updateRecord('users', {
        is_active: editForm.is_active,
      }, { id: selectedEmployee.user_id }, user.id);

      // Check if employee_details exists
      const employeeDetails = await selectRecords('employee_details', {
        filters: [{ column: 'user_id', operator: 'eq', value: selectedEmployee.user_id }]
      });

      if (employeeDetails.length > 0) {
        // Split full_name into first_name and last_name for employee_details
        const nameParts = (editForm.full_name || '').trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Normalize employment_type to database format (hyphens)
        const normalizedEmploymentType = normalizeEmploymentType(editForm.employment_type);
        
        // Update employee_details with all fields
        await updateRecord('employee_details', {
          first_name: firstName,
          last_name: lastName,
          employment_type: normalizedEmploymentType,
          work_location: editForm.work_location,
          is_active: editForm.is_active,
        }, { user_id: selectedEmployee.user_id }, user.id);
      }

      toast({
        title: "Success",
        description: statusChangedToActive 
          ? "Employee reactivated successfully" 
          : "Employee updated successfully",
      });

      setShowEditDialog(false);
      
      // If status changed to active, switch to Active tab
      if (statusChangedToActive) {
        setSelectedTab('active');
      }
      
      // Force multiple refreshes to ensure the view is updated
      // The view might need time to recalculate is_fully_active
      await fetchEmployees();
      
      // Refresh again after a short delay
      setTimeout(async () => {
        await fetchEmployees();
      }, 300);
      
      // Final refresh after longer delay to ensure database view has fully updated
      setTimeout(async () => {
        await fetchEmployees();
      }, 1000);
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast({
        title: "Error",
        description: error.message || error.detail || "Failed to update employee. Please check console for details.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!selectedEmployee || !user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to delete employees",
        variant: "destructive",
      });
      return;
    }

    try {
      const errors: string[] = [];
      let successCount = 0;

      // 1. Soft delete employee_details if exists
      try {
        const employeeDetails = await selectRecords('employee_details', {
          filters: [{ column: 'user_id', operator: 'eq', value: selectedEmployee.user_id }]
        });

        if (employeeDetails.length > 0) {
          // Only update if not already inactive
          if (employeeDetails[0].is_active !== false) {
            const result = await updateRecord('employee_details', {
              is_active: false
            }, { id: employeeDetails[0].id }, user.id);
            successCount++;
          } else {
            successCount++; // Count as success since it's already deleted
          }
        }
      } catch (error: any) {
        console.error('Error deleting employee_details:', error);
        errors.push(`Employee details: ${error.message || 'Failed to delete'}`);
      }

      // 2. Soft delete profile if exists
      try {
        const existingProfiles = await selectRecords('profiles', {
          filters: [{ column: 'user_id', operator: 'eq', value: selectedEmployee.user_id }]
        });

        if (existingProfiles.length > 0) {
          // Only update if not already inactive
          if (existingProfiles[0].is_active !== false) {
            const result = await updateRecord('profiles', {
              is_active: false
            }, { user_id: selectedEmployee.user_id }, user.id);
            successCount++;
          } else {
            successCount++; // Count as success since it's already deleted
          }
        }
      } catch (error: any) {
        console.error('Error deleting profile:', error);
        errors.push(`Profile: ${error.message || 'Failed to delete'}`);
      }

      // 3. Soft delete user (this should always exist)
      try {
        const existingUsers = await selectRecords('users', {
          filters: [{ column: 'id', operator: 'eq', value: selectedEmployee.user_id }]
        });

        if (existingUsers.length > 0) {
          // Only update if not already inactive
          if (existingUsers[0].is_active !== false) {
            const result = await updateRecord('users', {
              is_active: false
            }, { id: selectedEmployee.user_id }, user.id);
            successCount++;
          } else {
            successCount++; // Count as success since it's already deleted
          }
        } else {
          errors.push('User record not found');
        }
      } catch (error: any) {
        console.error('Error deleting user:', error);
        errors.push(`User: ${error.message || 'Failed to delete'}`);
      }

      // Verify deletion by checking the view
      let verificationFailed = false;
      try {
        const verifyData = await selectRecords('unified_employees', {
          filters: [{ column: 'user_id', operator: 'eq', value: selectedEmployee.user_id }]
        });
        
        if (verifyData.length > 0 && verifyData[0].is_fully_active === true) {
          verificationFailed = true;
          errors.push('Verification failed: Employee still appears as active in view');
        }
      } catch (verifyError: any) {
        console.error('Error verifying deletion:', verifyError);
        // Don't fail the deletion if verification fails
      }

      // Show appropriate message
      if (errors.length > 0 && successCount === 0) {
        // All operations failed
        toast({
          title: "Error",
          description: `Failed to delete employee: ${errors.join('; ')}`,
          variant: "destructive",
        });
      } else if (errors.length > 0 || verificationFailed) {
        // Some operations failed or verification failed
        toast({
          title: verificationFailed ? "Warning" : "Partial Success",
          description: verificationFailed 
            ? `Employee marked as deleted but may still appear. Please refresh the page.`
            : `Employee partially deleted. Some errors: ${errors.join('; ')}`,
          variant: verificationFailed ? "default" : "default",
        });
        setShowDeleteDialog(false);
        setSelectedEmployee(null);
        // Small delay to ensure view is updated
        setTimeout(() => {
          fetchEmployees();
        }, 100);
      } else {
        // All operations succeeded
        toast({
          title: "Success",
          description: "Employee deleted successfully",
        });
        setShowDeleteDialog(false);
        setSelectedEmployee(null);
        // Small delay to ensure view is updated
        setTimeout(() => {
          fetchEmployees();
        }, 100);
      }
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Error",
        description: error.message || error.detail || "Failed to delete employee. Please check console for details.",
        variant: "destructive",
      });
    }
  };

  const handleUserDeleteConfirmed = async () => {
    if (!selectedUserForDelete || !user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to delete users",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if user is already inactive before attempting deletion
      let wasAlreadyInactive = false;
      try {
        const checkData = await selectRecords('unified_employees', {
          filters: [{ column: 'user_id', operator: 'eq', value: selectedUserForDelete.user_id }]
        });
        if (checkData.length > 0 && checkData[0].is_fully_active === false) {
          wasAlreadyInactive = true;
        }
      } catch (checkError) {
        // Ignore check errors, proceed with deletion attempt
      }

      const errors: string[] = [];
      let successCount = 0;
      let actuallyUpdated = 0; // Track if we actually made any changes

      // 1. Soft delete profile if exists
      try {
        const existingProfiles = await selectRecords('profiles', {
          filters: [{ column: 'user_id', operator: 'eq', value: selectedUserForDelete.user_id }]
        });

        if (existingProfiles.length > 0) {
          // Only update if not already inactive
          if (existingProfiles[0].is_active !== false) {
            const result = await updateRecord('profiles', {
              is_active: false
            }, { user_id: selectedUserForDelete.user_id }, user.id);
            successCount++;
            actuallyUpdated++;
          } else {
            successCount++; // Count as success since it's already deleted
          }
        }
      } catch (error: any) {
        console.error('Error deleting profile:', error);
        errors.push(`Profile: ${error.message || 'Failed to delete'}`);
      }

      // 2. Soft delete user (this should always exist)
      try {
        const existingUsers = await selectRecords('users', {
          filters: [{ column: 'id', operator: 'eq', value: selectedUserForDelete.user_id }]
        });

        if (existingUsers.length > 0) {
          // Only update if not already inactive
          if (existingUsers[0].is_active !== false) {
            const result = await updateRecord('users', {
              is_active: false
            }, { id: selectedUserForDelete.user_id }, user.id);
            successCount++;
            actuallyUpdated++;
          } else {
            successCount++; // Count as success since it's already deleted
          }
        } else {
          errors.push('User record not found');
        }
      } catch (error: any) {
        console.error('Error deleting user:', error);
        errors.push(`User: ${error.message || 'Failed to delete'}`);
      }

      // 3. Also check and soft delete employee_details if exists
      try {
        const employeeDetails = await selectRecords('employee_details', {
          filters: [{ column: 'user_id', operator: 'eq', value: selectedUserForDelete.user_id }]
        });

        if (employeeDetails.length > 0) {
          // Only update if not already inactive
          if (employeeDetails[0].is_active !== false) {
            const result = await updateRecord('employee_details', {
              is_active: false
            }, { id: employeeDetails[0].id }, user.id);
            successCount++;
            actuallyUpdated++;
          } else {
            successCount++; // Count as success since it's already deleted
          }
        }
      } catch (error: any) {
        console.error('Error deleting employee_details:', error);
        errors.push(`Employee details: ${error.message || 'Failed to delete'}`);
      }

      // Verify deletion by checking the view
      let verificationFailed = false;
      try {
        const verifyData = await selectRecords('unified_employees', {
          filters: [{ column: 'user_id', operator: 'eq', value: selectedUserForDelete.user_id }]
        });
        
        if (verifyData.length > 0 && verifyData[0].is_fully_active === true) {
          verificationFailed = true;
          errors.push('Verification failed: User still appears as active in view');
        }
      } catch (verifyError: any) {
        console.error('Error verifying user deletion:', verifyError);
        // Don't fail the deletion if verification fails
      }

      // Show appropriate message
      if (errors.length > 0 && successCount === 0) {
        // All operations failed
        toast({
          title: "Error",
          description: `Failed to delete user: ${errors.join('; ')}`,
          variant: "destructive",
        });
      } else if (wasAlreadyInactive && actuallyUpdated === 0) {
        // User was already deleted (inactive) and no updates were made
        toast({
          title: "Already Deleted",
          description: "This user is already deleted. They appear in the 'Trash' tab.",
          variant: "default",
        });
        setShowUserDeleteDialog(false);
        setSelectedUserForDelete(null);
        // Refresh to ensure list is up to date
        setTimeout(() => {
          fetchEmployees();
        }, 100);
      } else if (errors.length > 0 || verificationFailed) {
        // Some operations failed or verification failed
        toast({
          title: verificationFailed ? "Warning" : "Partial Success",
          description: verificationFailed 
            ? `User marked as deleted but may still appear. Please refresh the page.`
            : `User partially deleted. Some errors: ${errors.join('; ')}`,
          variant: verificationFailed ? "default" : "default",
        });
        setShowUserDeleteDialog(false);
        setSelectedUserForDelete(null);
        // Small delay to ensure view is updated
        setTimeout(() => {
          fetchEmployees();
        }, 100);
      } else {
        // All operations succeeded - user was just deleted
        toast({
          title: "Success",
          description: "User deleted successfully. They will now appear in the 'Trash' tab.",
        });
        setShowUserDeleteDialog(false);
        setSelectedUserForDelete(null);
        // Small delay to ensure view is updated
        setTimeout(() => {
          fetchEmployees();
        }, 100);
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user. Please check console for details.",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    if (ROLE_CATEGORIES.executive.includes(role as any)) return Crown;
    if (ROLE_CATEGORIES.management.includes(role as any)) return Shield;
    return Star;
  };

  const getRoleBadgeVariant = (role: string) => {
    if (ROLE_CATEGORIES.executive.includes(role as any)) return 'default';
    if (ROLE_CATEGORIES.management.includes(role as any)) return 'secondary';
    return 'outline';
  };

  const getEmploymentTypeLabel = (type?: string) => {
    switch (type) {
      case 'full_time':
      case 'full-time':
        return 'Full Time';
      case 'part_time':
      case 'part-time':
        return 'Part Time';
      case 'contract': return 'Contract';
      case 'intern': return 'Intern';
      default: return type || 'Full Time';
    }
  };

  // Normalize employment_type to database format (hyphens)
  const normalizeEmploymentType = (type?: string): string => {
    if (!type) return 'full-time';
    // Convert underscores to hyphens (replace all occurrences)
    return type.replace(/_/g, '-');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setDepartmentFilter("all");
    setStatusFilter("all");
    setSelectedTab("all");
  };

  const hasActiveFilters = searchTerm || roleFilter !== "all" || departmentFilter !== "all" || statusFilter !== "all";

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading employees...</span>
      </div>
    );
  }

  const displayDepartmentName = urlDepartmentName || (legacyDepartmentName ? decodeURIComponent(legacyDepartmentName) : null);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Breadcrumb */}
      <DepartmentBreadcrumb currentPage="employees" />
      
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-bold">Employee Management</h1>
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
          </div>
          <p className="text-sm lg:text-base text-muted-foreground">
            {displayDepartmentName 
              ? `Employees in ${displayDepartmentName} department`
              : "Manage all employees, users, and team members in one place"}
          </p>
        </div>
        <RoleGuard requiredRole="hr" fallback={null}>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/create-employee')}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
            <Button onClick={() => setShowUserFormDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </RoleGuard>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <div className="ml-4 min-w-0">
                <p className="text-sm text-muted-foreground truncate">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600 flex-shrink-0" />
              <div className="ml-4 min-w-0">
                <p className="text-sm text-muted-foreground truncate">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-red-600 flex-shrink-0" />
              <div className="ml-4 min-w-0">
                <p className="text-sm text-muted-foreground truncate">Trash</p>
                <p className="text-2xl font-bold">{stats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-purple-600 flex-shrink-0" />
              <div className="ml-4 min-w-0">
                <p className="text-sm text-muted-foreground truncate">Admins</p>
                <p className="text-2xl font-bold">{stats.admins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Briefcase className="h-8 w-8 text-orange-600 flex-shrink-0" />
              <div className="ml-4 min-w-0">
                <p className="text-sm text-muted-foreground truncate">Managers</p>
                <p className="text-2xl font-bold">{stats.managers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-indigo-600 flex-shrink-0" />
              <div className="ml-4 min-w-0">
                <p className="text-sm text-muted-foreground truncate">Depts</p>
                <p className="text-2xl font-bold">{stats.departments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, ID, department, or position..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="finance_manager">Finance Manager</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Trash</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="w-full lg:w-auto">
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <div className="w-full overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
          <TabsList className="inline-flex w-full min-w-max lg:grid lg:grid-cols-5 h-auto lg:h-10">
            <TabsTrigger value="all" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2 lg:py-1.5">All ({stats.active})</TabsTrigger>
            <TabsTrigger value="active" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2 lg:py-1.5">Active ({stats.active})</TabsTrigger>
            <TabsTrigger value="trash" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2 lg:py-1.5">Trash ({stats.inactive})</TabsTrigger>
            <TabsTrigger value="admins" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2 lg:py-1.5">Admins ({stats.admins})</TabsTrigger>
            <TabsTrigger value="managers" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2 lg:py-1.5">Managers ({stats.managers})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={selectedTab} className="space-y-4">
          {filteredEmployees.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    No employees found
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {hasActiveFilters 
                      ? 'Try adjusting your filters or search terms.' 
                      : 'Get started by adding your first employee or user.'}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => navigate('/create-employee')}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Employee
                    </Button>
                    <Button variant="outline" onClick={() => setShowUserFormDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredEmployees.map((employee) => {
                const canView = canViewEmployee(employee);
                const canEdit = canManageEmployee(employee);
                const canDelete = canManageEmployee(employee);
                const RoleIcon = getRoleIcon(employee.role);
                
                return (
                  <Card 
                    key={employee.id} 
                    className="hover:shadow-lg border-l-4 border-l-primary/20 flex flex-col h-full w-full"
                  >
                    <CardHeader className="pb-3 flex-shrink-0">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-14 w-14 border-2 border-primary/20 flex-shrink-0">
                          <AvatarImage 
                            src={employee.avatar_url && employee.avatar_url.startsWith('data:') 
                              ? employee.avatar_url 
                              : employee.avatar_url || undefined} 
                            alt={employee.full_name} 
                          />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                            {getInitials(employee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base leading-5 truncate mb-1.5">
                            {employee.full_name}
                          </CardTitle>
                          <div className="flex items-center space-x-2 mb-1.5">
                            <RoleIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <Badge variant={getRoleBadgeVariant(employee.role)} className="text-xs px-1.5 py-0">
                              {getRoleDisplayName(employee.role as any)}
                            </Badge>
                          </div>
                          {employee.position ? (
                            <p className="text-xs text-muted-foreground truncate">
                              {employee.position}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground/50 italic">No position</p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col space-y-3 pb-4">
                      <div className="space-y-1.5 text-sm flex-1 min-h-[80px]">
                        {employee.email ? (
                          <div className="flex items-start space-x-2 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                            <span className="truncate text-xs leading-relaxed">{employee.email}</span>
                          </div>
                        ) : (
                          <div className="flex items-start space-x-2 text-muted-foreground/50">
                            <Mail className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                            <span className="text-xs italic">No email</span>
                          </div>
                        )}
                        
                        {employee.phone ? (
                          <div className="flex items-center space-x-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs">{employee.phone}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-muted-foreground/50">
                            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs italic">No phone</span>
                          </div>
                        )}
                        
                        {employee.work_location ? (
                          <div className="flex items-center space-x-2 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate text-xs">{employee.work_location}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-muted-foreground/50">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs italic">No location</span>
                          </div>
                        )}
                        
                        {employee.hire_date ? (
                          <div className="flex items-center space-x-2 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs">
                              Joined {new Date(employee.hire_date).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-muted-foreground/50">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs italic">No hire date</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t space-y-2 flex-shrink-0">
                        <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                          {employee.department && employee.department_id ? (
                            <Badge 
                              variant="outline" 
                              className="text-xs px-2 py-0.5 cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => navigateToDepartment(employee.department_id!, employee.department || undefined)}
                            >
                              {employee.department}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs px-2 py-0.5 opacity-50">
                              No dept
                            </Badge>
                          )}
                          {employee.employment_type ? (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              {getEmploymentTypeLabel(employee.employment_type)}
                            </Badge>
                          ) : null}
                          <Badge 
                            variant={employee.is_active ? 'default' : 'destructive'} 
                            className="text-xs px-2 py-0.5"
                          >
                            {employee.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        {employee.employee_id ? (
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            ID: {employee.employee_id}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/50 italic">
                            No employee ID
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1.5 sm:gap-2 pt-2 border-t flex-shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-xs h-8 min-w-0"
                          onClick={() => handleViewEmployee(employee)}
                          disabled={!canView}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 sm:w-8 p-0 flex-shrink-0"
                          onClick={() => handleEditEmployee(employee)}
                          disabled={!canEdit}
                          title="Edit employee"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0 flex-shrink-0"
                              title="More actions"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewEmployee(employee)} disabled={!canView}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditEmployee(employee)} disabled={!canEdit}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {employee.department_id && (
                              <DropdownMenuItem 
                                onClick={() => navigateToDepartment(employee.department_id, employee.department || undefined)}
                              >
                                <Building2 className="h-4 w-4 mr-2" />
                                View Department
                                <ExternalLink className="h-3 w-3 ml-auto" />
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => navigateToProjects({ 
                                employeeId: employee.user_id, 
                                employeeName: employee.full_name,
                                departmentId: employee.department_id,
                                departmentName: employee.department || undefined
                              })}
                            >
                              <Briefcase className="h-4 w-4 mr-2" />
                              View Projects
                              <ExternalLink className="h-3 w-3 ml-auto" />
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => navigateToAttendance({ 
                                employeeId: employee.user_id, 
                                employeeName: employee.full_name,
                                departmentId: employee.department_id,
                                departmentName: employee.department || undefined
                              })}
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              View Attendance
                              <ExternalLink className="h-3 w-3 ml-auto" />
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => navigate(`/employee-performance?employeeId=${employee.user_id}`)}
                            >
                              <BarChart3 className="h-4 w-4 mr-2" />
                              View Performance
                              <ExternalLink className="h-3 w-3 ml-auto" />
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => navigateToPayroll({ 
                                employeeId: employee.user_id, 
                                employeeName: employee.full_name,
                                departmentId: employee.department_id,
                                departmentName: employee.department || undefined
                              })}
                            >
                              <Calculator className="h-4 w-4 mr-2" />
                              View Payroll
                              <ExternalLink className="h-3 w-3 ml-auto" />
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {canDelete && (
                              <DropdownMenuItem 
                                onClick={() => handleDeleteEmployee(employee)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* View Employee Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>Complete information about this employee</DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="projects">Projects ({employeeProjects.length})</TabsTrigger>
                <TabsTrigger value="actions">Quick Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  <AvatarImage 
                    src={selectedEmployee.avatar_url && selectedEmployee.avatar_url.startsWith('data:') 
                      ? selectedEmployee.avatar_url 
                      : selectedEmployee.avatar_url || undefined} 
                    alt={selectedEmployee.full_name} 
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                    {getInitials(selectedEmployee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-2xl font-semibold">{selectedEmployee.full_name}</h3>
                  <p className="text-muted-foreground">{selectedEmployee.position || 'No position'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getRoleBadgeVariant(selectedEmployee.role)}>
                      {getRoleDisplayName(selectedEmployee.role as any)}
                    </Badge>
                    <Badge variant={selectedEmployee.is_active ? 'default' : 'destructive'}>
                      {selectedEmployee.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="font-medium break-all">{selectedEmployee.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Phone</p>
                  <p className="font-medium">{selectedEmployee.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge variant={selectedEmployee.is_active ? 'default' : 'destructive'} className="mt-1">
                    {selectedEmployee.is_active ? 'Active' : 'Trash'}
                  </Badge>
                </div>
                {selectedEmployee.employee_id && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Employee ID</p>
                    <p className="font-medium font-mono">{selectedEmployee.employee_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Department</p>
                  {selectedEmployee.department && selectedEmployee.department_id ? (
                    <Badge 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-secondary/80 transition-colors mt-1"
                      onClick={() => {
                        setShowViewDialog(false);
                        navigateToDepartment(selectedEmployee.department_id!, selectedEmployee.department || undefined);
                      }}
                    >
                      <Building2 className="h-3 w-3 mr-1" />
                      {selectedEmployee.department}
                    </Badge>
                  ) : (
                    <p className="font-medium">Not assigned</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Position</p>
                  <p className="font-medium">{selectedEmployee.position || 'Not specified'}</p>
                </div>
                {selectedEmployee.employment_type && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Employment Type</p>
                    <p className="font-medium">{getEmploymentTypeLabel(selectedEmployee.employment_type)}</p>
                  </div>
                )}
                {selectedEmployee.work_location && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Work Location</p>
                    <p className="font-medium">{selectedEmployee.work_location}</p>
                  </div>
                )}
                {selectedEmployee.hire_date && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Hire Date</p>
                    <p className="font-medium">
                      {new Date(selectedEmployee.hire_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {selectedEmployee.emergency_contact_name && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Emergency Contact</p>
                    <p className="font-medium">
                      {selectedEmployee.emergency_contact_name}
                      {selectedEmployee.emergency_contact_phone && ` (${selectedEmployee.emergency_contact_phone})`}
                    </p>
                  </div>
                )}
              </div>

              </TabsContent>

              <TabsContent value="projects" className="mt-4">
                {loadingEmployeeProjects ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading projects...</p>
                  </div>
                ) : employeeProjects.length > 0 ? (
                  <div className="space-y-3">
                    {employeeProjects.map((project: any) => (
                      <Card key={project.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{project.name}</h4>
                                {project.project_code && (
                                  <Badge variant="outline">{project.project_code}</Badge>
                                )}
                                <Badge variant={
                                  project.status === 'completed' ? 'default' :
                                  project.status === 'in_progress' ? 'secondary' :
                                  'outline'
                                }>
                                  {project.status}
                                </Badge>
                                {(project.project_manager_id === selectedEmployee.user_id) && (
                                  <Badge variant="secondary">Project Manager</Badge>
                                )}
                                {(project.account_manager_id === selectedEmployee.user_id) && (
                                  <Badge variant="secondary">Account Manager</Badge>
                                )}
                              </div>
                              {project.client && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  Client: {project.client.company_name || project.client.name}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                                {project.start_date && (
                                  <span>Start: {new Date(project.start_date).toLocaleDateString()}</span>
                                )}
                                {project.budget && (
                                  <span>Budget: {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: project.currency || 'USD'
                                  }).format(project.budget)}</span>
                                )}
                                <span>Progress: {project.progress}%</span>
                              </div>
                              {project.progress > 0 && (
                                <Progress value={project.progress} className="h-2" />
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowViewDialog(false);
                                navigate(`/project-management/${project.id}`);
                              }}
                            >
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-sm text-muted-foreground">No projects assigned to this employee</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="actions" className="mt-4">
                {selectedEmployee && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {selectedEmployee.department_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowViewDialog(false);
                            navigateToDepartment(selectedEmployee.department_id!, selectedEmployee.department || undefined);
                          }}
                          className="w-full"
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          View Department
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowViewDialog(false);
                          navigateToProjects({ 
                            employeeId: selectedEmployee.user_id, 
                            employeeName: selectedEmployee.full_name,
                            departmentId: selectedEmployee.department_id,
                            departmentName: selectedEmployee.department || undefined
                          });
                        }}
                        className="w-full"
                      >
                        <Briefcase className="h-4 w-4 mr-2" />
                        View All Projects
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowViewDialog(false);
                          navigateToAttendance({ 
                            employeeId: selectedEmployee.user_id, 
                            employeeName: selectedEmployee.full_name,
                            departmentId: selectedEmployee.department_id,
                            departmentName: selectedEmployee.department || undefined
                          });
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
                          setShowViewDialog(false);
                          navigateToPayroll({ 
                            employeeId: selectedEmployee.user_id, 
                            employeeName: selectedEmployee.full_name,
                            departmentId: selectedEmployee.department_id,
                            departmentName: selectedEmployee.department || undefined
                          });
                        }}
                        className="w-full"
                      >
                        <Calculator className="h-4 w-4 mr-2" />
                        View Payroll
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowViewDialog(false);
                          navigate(`/employee-performance?employeeId=${selectedEmployee.user_id}`);
                        }}
                        className="w-full"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Performance
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={editForm.full_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Position</label>
                <Input
                  value={editForm.position || ''}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <Select
                  value={editForm.department || ''}
                  onValueChange={(value) => setEditForm({ ...editForm, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Employment Type</label>
                <Select
                  value={editForm.employment_type || 'full_time'}
                  onValueChange={(value) => setEditForm({ ...editForm, employment_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={editForm.is_active ? 'active' : 'inactive'}
                  onValueChange={(value) => setEditForm({ ...editForm, is_active: value === 'active' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Work Location</label>
              <Input
                value={editForm.work_location || ''}
                onChange={(e) => setEditForm({ ...editForm, work_location: e.target.value })}
                placeholder="e.g., New York, NY"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEmployee} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDeleteDialog(false);
          setSelectedEmployee(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedEmployee?.full_name || 'this employee'}"? This will deactivate the employee account and all related records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setSelectedEmployee(null);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirmed} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Form Dialog */}
      <UserFormDialog
        isOpen={showUserFormDialog}
        onClose={() => {
          setShowUserFormDialog(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onUserSaved={fetchEmployees}
      />

      {/* User Delete Dialog - Use custom handler instead of DeleteConfirmDialog for users */}
      <AlertDialog open={showUserDeleteDialog} onOpenChange={(open) => {
        if (!open) {
          setShowUserDeleteDialog(false);
          setSelectedUserForDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedUserForDelete?.full_name || 'this user'}"? This will deactivate the user account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowUserDeleteDialog(false);
              setSelectedUserForDelete(null);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUserDeleteConfirmed} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmployeeManagement;

