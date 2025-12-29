import { Building2, Users, Briefcase, Clock, Calculator, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDepartmentNavigation } from "@/hooks/useDepartmentNavigation";

interface DepartmentBreadcrumbProps {
  currentPage: 'employees' | 'projects' | 'attendance' | 'payroll' | 'department';
  showClearButton?: boolean;
}

export function DepartmentBreadcrumb({ currentPage, showClearButton = true }: DepartmentBreadcrumbProps) {
  const {
    departmentId,
    departmentName,
    employeeId,
    employeeName,
    projectId,
    projectName,
    navigateToDepartment,
    clearFilters,
  } = useDepartmentNavigation();

  if (!departmentId && !employeeId && !projectId) {
    return null;
  }

  const getPageIcon = () => {
    switch (currentPage) {
      case 'employees': return <Users className="h-4 w-4" />;
      case 'projects': return <Briefcase className="h-4 w-4" />;
      case 'attendance': return <Clock className="h-4 w-4" />;
      case 'payroll': return <Calculator className="h-4 w-4" />;
      case 'department': return <Building2 className="h-4 w-4" />;
    }
  };

  const getPageName = () => {
    switch (currentPage) {
      case 'employees': return 'Employees';
      case 'projects': return 'Projects';
      case 'attendance': return 'Attendance';
      case 'payroll': return 'Payroll';
      case 'department': return 'Department';
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4 p-3 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2 flex-wrap">
        {departmentId && departmentName && (
          <>
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 transition-colors"
              onClick={() => navigateToDepartment(departmentId, departmentName)}
            >
              <Building2 className="h-3 w-3 mr-1" />
              {departmentName}
            </Badge>
            {(employeeId || projectId) && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </>
        )}
        
        {employeeId && employeeName && (
          <>
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-accent transition-colors"
            >
              <Users className="h-3 w-3 mr-1" />
              {employeeName}
            </Badge>
            {projectId && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </>
        )}
        
        {projectId && projectName && (
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-accent transition-colors"
          >
            <Briefcase className="h-3 w-3 mr-1" />
            {projectName}
          </Badge>
        )}
        
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {getPageIcon()}
          <span>{getPageName()}</span>
        </div>
      </div>
      
      {showClearButton && (departmentId || employeeId || projectId) && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7"
          onClick={() => {
            const path = window.location.pathname;
            clearFilters(path);
          }}
        >
          <X className="h-3 w-3 mr-1" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
