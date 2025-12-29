import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { getAccessibleEmployees } from "@/services/api/performance-service";
import { Loader2 } from "lucide-react";
import { selectRecords } from '@/services/api/postgresql-service';

interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  department: string | null;
}

interface EmployeeSelectorProps {
  selectedEmployeeId: string | null;
  onEmployeeChange: (employeeId: string) => void;
}

export function EmployeeSelector({ selectedEmployeeId, onEmployeeChange }: EmployeeSelectorProps) {
  const { user, userRole, profile, loading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && userRole !== undefined) {
      fetchEmployees();
    }
  }, [userRole, profile, authLoading, user]);

  const fetchEmployees = async () => {
    if (!user || !userRole) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Check access level
      const fullAccessRoles = ['super_admin', 'ceo', 'cfo', 'hr', 'admin', 'operations_manager'];
      const deptAccessRoles = ['department_head', 'team_lead', 'project_manager'];
      
      if (fullAccessRoles.includes(userRole)) {
        // Full access - get all employees
        try {
          const allEmployees = await getAccessibleEmployees(userRole, null);
          setEmployees(allEmployees);
          
          // Auto-select current user if no selection
          if (!selectedEmployeeId && user.id) {
            const currentUserEmployee = allEmployees.find(emp => emp.user_id === user.id);
            if (currentUserEmployee) {
              onEmployeeChange(currentUserEmployee.user_id);
            }
          }
        } catch (err: any) {
          console.error('Error fetching all employees:', err);
          setError('Failed to load employees. Please try again.');
          // Fallback to self-only
          setEmployees([{
            id: user.id,
            user_id: user.id,
            full_name: profile?.full_name || 'You',
            department: profile?.department || null,
          }]);
        }
      } else if (deptAccessRoles.includes(userRole)) {
        // Department access - get department employees
        try {
          const teamAssignments = await selectRecords('team_assignments', {
            filters: [
              { column: 'user_id', operator: 'eq', value: user.id },
              { column: 'is_active', operator: 'eq', value: true }
            ]
          });
          
          const userDepartmentId = teamAssignments[0]?.department_id || null;
          if (userDepartmentId) {
            const deptEmployees = await getAccessibleEmployees(userRole, userDepartmentId);
            setEmployees(deptEmployees);
            
            // Auto-select current user if no selection
            if (!selectedEmployeeId && user.id) {
              const currentUserEmployee = deptEmployees.find(emp => emp.user_id === user.id);
              if (currentUserEmployee) {
                onEmployeeChange(currentUserEmployee.user_id);
              }
            }
          } else {
            // No department assigned, fallback to self-only
            setEmployees([{
              id: user.id,
              user_id: user.id,
              full_name: profile?.full_name || 'You',
              department: profile?.department || null,
            }]);
          }
        } catch (err: any) {
          console.error('Error fetching department employees:', err);
          setError('Failed to load department employees.');
          // Fallback to self-only
          setEmployees([{
            id: user.id,
            user_id: user.id,
            full_name: profile?.full_name || 'You',
            department: profile?.department || null,
          }]);
        }
      } else {
        // Self-only access - only show current user
        setEmployees([{
          id: user.id,
          user_id: user.id,
          full_name: profile?.full_name || 'You',
          department: profile?.department || null,
        }]);
        
        // Auto-select
        if (!selectedEmployeeId) {
          onEmployeeChange(user.id);
        }
      }
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      setError('Failed to load employees. Please refresh the page.');
      // Fallback to self-only
      if (user?.id) {
        setEmployees([{
          id: user.id,
          user_id: user.id,
          full_name: profile?.full_name || 'You',
          department: profile?.department || null,
        }]);
        if (!selectedEmployeeId) {
          onEmployeeChange(user.id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading employees...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-sm text-muted-foreground">
        Please log in to view employees
      </div>
    );
  }

  // If only one employee (self-only access), don't show selector
  if (employees.length === 1 && employees[0].user_id === user?.id) {
    return (
      <div className="text-sm font-medium">
        {employees[0].full_name}
        {employees[0].department && (
          <span className="text-muted-foreground ml-2">({employees[0].department})</span>
        )}
      </div>
    );
  }

  return (
    <Select
      value={selectedEmployeeId || undefined}
      onValueChange={onEmployeeChange}
    >
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder="Select employee" />
      </SelectTrigger>
      <SelectContent>
        {employees.map((employee) => (
          <SelectItem key={employee.user_id} value={employee.user_id}>
            {employee.full_name}
            {employee.department && ` (${employee.department})`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
