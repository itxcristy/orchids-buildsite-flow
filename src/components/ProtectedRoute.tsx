import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { hasRoleOrHigher, getRoleDisplayName } from '@/utils/roleUtils';
import { getRoutePermission, canAccessRouteSync, canAccessRoute } from '@/utils/routePermissions';
import { hasPageAccess } from '@/utils/agencyPageAccess';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AppRole } from '@/utils/roleUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole | AppRole[]; // Optional: if not provided, will auto-detect from routePermissions
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, userRole, profile, loading } = useAuth();
  const location = useLocation();
  const [pageAccessChecked, setPageAccessChecked] = useState(false);
  const [hasPageAccessResult, setHasPageAccessResult] = useState<boolean | null>(null);

  // Check page access for non-super-admin users
  // MUST be declared before any early returns to follow Rules of Hooks
  useEffect(() => {
    if (userRole && userRole !== 'super_admin' && user) {
      hasPageAccess(location.pathname).then(hasAccess => {
        setHasPageAccessResult(hasAccess);
        setPageAccessChecked(true);
      }).catch(() => {
        setHasPageAccessResult(true); // Default to allowing if check fails
        setPageAccessChecked(true);
      });
    } else {
      setPageAccessChecked(true);
      setHasPageAccessResult(true);
    }
  }, [location.pathname, userRole, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Validate agency context (skip for super admins - they use main database)
  if (userRole !== 'super_admin') {
    const agencyDatabase = localStorage.getItem('agency_database');
    if (!agencyDatabase && location.pathname !== '/agency-setup' && location.pathname !== '/agency-setup-progress') {
      // If no agency database and not on setup pages, redirect to setup
      return <Navigate to="/agency-setup-progress" replace />;
    }
  } else {
    // Super admin - redirect away from agency setup pages
    if (location.pathname === '/agency-setup-progress' || location.pathname === '/agency-setup') {
      return <Navigate to="/system" replace />;
    }
  }

  // Determine required roles: use prop if provided, otherwise auto-detect from routePermissions
  let requiredRoles: AppRole[] = [];
  let useAutoDetection = false;
  
  if (requiredRole) {
    // Explicit role requirement from prop
    requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  } else {
    // Auto-detect from routePermissions
    useAutoDetection = true;
    const routePermission = getRoutePermission(location.pathname);
    if (routePermission) {
      requiredRoles = routePermission.requiredRoles;
    }
    // If no route permission found, allow access (public/authenticated routes)
  }

  // Show loading while checking page access
  if (!pageAccessChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Check page access first (for non-super-admin)
  if (userRole && userRole !== 'super_admin' && hasPageAccessResult === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Page Not Available</CardTitle>
            </div>
            <CardDescription>
              This page is not included in your agency's subscription.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To access this page, please request it from your administrator or contact support.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button 
                variant="default"
                onClick={() => window.location.href = '/dashboard'}
                className="flex-1"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check role-based access
  // If requiredRoles is empty, all authenticated users can access
  if (userRole && requiredRoles.length > 0) {
    // Use canAccessRouteSync for role checking
    const hasAccess = useAutoDetection 
      ? canAccessRouteSync(userRole, location.pathname)
      : (requiredRoles.includes(userRole) || requiredRoles.some(role => hasRoleOrHigher(userRole, role)));
    
    if (!hasAccess) {
      // Get route permission info for better error message
      const routePermission = getRoutePermission(location.pathname);
      
      // Format required roles for display
      const roleNames = requiredRoles.map(role => getRoleDisplayName(role));
      const roleText = roleNames.length === 1 
        ? roleNames[0] 
        : roleNames.length === 2
        ? `${roleNames[0]} or ${roleNames[1]}`
        : `${roleNames.slice(0, -1).join(', ')}, or ${roleNames[roleNames.length - 1]}`;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle>Access Denied</CardTitle>
              </div>
              <CardDescription>
                You don't have permission to access this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  This page requires the <strong>{roleText}</strong> role.
                </p>
                {userRole && (
                  <p className="text-sm text-muted-foreground">
                    Your current role: <strong>{getRoleDisplayName(userRole)}</strong>
                  </p>
                )}
                {routePermission?.description && (
                  <p className="text-sm text-muted-foreground italic">
                    {routePermission.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => window.history.back()}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
                <Button 
                  variant="default"
                  onClick={() => window.location.href = '/dashboard'}
                  className="flex-1"
                >
                  Go to Dashboard
                </Button>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  If you believe you should have access to this page, please contact your administrator.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;