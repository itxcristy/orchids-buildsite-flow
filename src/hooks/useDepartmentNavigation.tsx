import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Hook for navigating between department-related pages with context preservation
 */
export function useDepartmentNavigation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get current context from URL
  const departmentId = searchParams.get('department');
  const departmentName = searchParams.get('name');
  const employeeId = searchParams.get('employee');
  const employeeName = searchParams.get('employeeName');
  const projectId = searchParams.get('project');
  const projectName = searchParams.get('projectName');

  /**
   * Navigate to Department Management with optional department filter
   */
  const navigateToDepartment = (deptId?: string, deptName?: string) => {
    if (deptId && deptName) {
      navigate(`/department-management?department=${deptId}&name=${encodeURIComponent(deptName)}`);
    } else {
      navigate('/department-management');
    }
  };

  /**
   * Navigate to Employee Management with optional filters
   */
  const navigateToEmployees = (filters?: {
    departmentId?: string;
    departmentName?: string;
    employeeId?: string;
    employeeName?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.departmentId) params.set('department', filters.departmentId);
    if (filters?.departmentName) params.set('name', encodeURIComponent(filters.departmentName));
    if (filters?.employeeId) params.set('employee', filters.employeeId);
    if (filters?.employeeName) params.set('employeeName', encodeURIComponent(filters.employeeName));
    
    const queryString = params.toString();
    navigate(`/employee-management${queryString ? `?${queryString}` : ''}`);
  };

  /**
   * Navigate to Projects with optional filters
   */
  const navigateToProjects = (filters?: {
    departmentId?: string;
    departmentName?: string;
    projectId?: string;
    projectName?: string;
    employeeId?: string;
    employeeName?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.departmentId) params.set('department', filters.departmentId);
    if (filters?.departmentName) params.set('name', encodeURIComponent(filters.departmentName));
    if (filters?.projectId) params.set('project', filters.projectId);
    if (filters?.projectName) params.set('projectName', encodeURIComponent(filters.projectName));
    if (filters?.employeeId) params.set('employee', filters.employeeId);
    if (filters?.employeeName) params.set('employeeName', encodeURIComponent(filters.employeeName));
    
    const queryString = params.toString();
    navigate(`/projects${queryString ? `?${queryString}` : ''}`);
  };

  /**
   * Navigate to Attendance with optional filters
   */
  const navigateToAttendance = (filters?: {
    departmentId?: string;
    departmentName?: string;
    employeeId?: string;
    employeeName?: string;
    projectId?: string;
    projectName?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.departmentId) params.set('department', filters.departmentId);
    if (filters?.departmentName) params.set('name', encodeURIComponent(filters.departmentName));
    if (filters?.employeeId) params.set('employee', filters.employeeId);
    if (filters?.employeeName) params.set('employeeName', encodeURIComponent(filters.employeeName));
    if (filters?.projectId) params.set('project', filters.projectId);
    if (filters?.projectName) params.set('projectName', encodeURIComponent(filters.projectName));
    
    const queryString = params.toString();
    navigate(`/attendance${queryString ? `?${queryString}` : ''}`);
  };

  /**
   * Navigate to Payroll with optional filters
   */
  const navigateToPayroll = (filters?: {
    departmentId?: string;
    departmentName?: string;
    employeeId?: string;
    employeeName?: string;
    projectId?: string;
    projectName?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.departmentId) params.set('department', filters.departmentId);
    if (filters?.departmentName) params.set('name', encodeURIComponent(filters.departmentName));
    if (filters?.employeeId) params.set('employee', filters.employeeId);
    if (filters?.employeeName) params.set('employeeName', encodeURIComponent(filters.employeeName));
    if (filters?.projectId) params.set('project', filters.projectId);
    if (filters?.projectName) params.set('projectName', encodeURIComponent(filters.projectName));
    
    const queryString = params.toString();
    navigate(`/payroll${queryString ? `?${queryString}` : ''}`);
  };

  /**
   * Clear all filters and navigate to base page
   */
  const clearFilters = (basePath: string) => {
    navigate(basePath);
  };

  return {
    // Current context
    departmentId,
    departmentName: departmentName ? decodeURIComponent(departmentName) : null,
    employeeId,
    employeeName: employeeName ? decodeURIComponent(employeeName) : null,
    projectId,
    projectName: projectName ? decodeURIComponent(projectName) : null,
    
    // Navigation functions
    navigateToDepartment,
    navigateToEmployees,
    navigateToProjects,
    navigateToAttendance,
    navigateToPayroll,
    clearFilters,
  };
}
