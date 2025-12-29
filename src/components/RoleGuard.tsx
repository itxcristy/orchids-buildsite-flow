import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { hasRoleOrHigher, hasFinancialAccess, canManageUserRoles } from '@/utils/roleUtils';
import type { AppRole } from '@/utils/roleUtils';

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: AppRole | AppRole[];
  requireFinancialAccess?: boolean;
  requireUserManagement?: boolean;
  fallback?: ReactNode;
  showError?: boolean;
}

/**
 * Component-level role guard for conditional rendering
 * 
 * Usage:
 * - <RoleGuard requiredRole="admin">...</RoleGuard>
 * - <RoleGuard requiredRole={["admin", "hr"]}>...</RoleGuard>
 * - <RoleGuard requireFinancialAccess>...</RoleGuard>
 */
export function RoleGuard({ 
  children, 
  requiredRole, 
  requireFinancialAccess = false,
  requireUserManagement = false,
  fallback = null,
  showError = false
}: RoleGuardProps) {
  const { userRole, loading } = useAuth();

  if (loading) {
    return <>{fallback}</>;
  }

  if (!userRole) {
    return <>{fallback}</>;
  }

  // Check specific role requirement
  if (requiredRole) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasAccess = requiredRoles.includes(userRole) || 
                     requiredRoles.some(role => hasRoleOrHigher(userRole, role));
    
    if (!hasAccess) {
      if (showError) {
        return (
          <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10">
            <p className="text-sm text-destructive">
              You don't have permission to view this content. Required role(s): {requiredRoles.join(', ')}
            </p>
          </div>
        );
      }
      return <>{fallback}</>;
    }
  }

  // Check financial access requirement
  if (requireFinancialAccess && !hasFinancialAccess(userRole)) {
    if (showError) {
      return (
        <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10">
          <p className="text-sm text-destructive">
            Financial access is required to view this content.
          </p>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  // Check user management requirement
  if (requireUserManagement && !canManageUserRoles(userRole)) {
    if (showError) {
      return (
        <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10">
          <p className="text-sm text-destructive">
            User management permissions are required to view this content.
          </p>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}