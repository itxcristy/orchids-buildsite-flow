import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, AlertTriangle, Lock, Users, Database, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasFinancialAccess, canManageUserRoles } from '@/utils/roleUtils';

export function PhaseCompleteSummary() {
  const { userRole } = useAuth();

  const phase1Improvements = [
    {
      title: 'Financial Data Access Restricted',
      description: 'Only CFO, Finance Manager, and Super Admin can access payroll, invoices, and financial management',
      status: 'complete',
      impact: 'high'
    },
    {
      title: 'Department-Based Employee Access',
      description: 'Department heads can only access employees in their own department',
      status: 'complete',
      impact: 'medium'
    },
    {
      title: 'Role Management Restricted',
      description: 'Only CEO and Super Admin can assign or modify user roles',
      status: 'complete',
      impact: 'high'
    },
    {
      title: 'Audit Logging Enhanced',
      description: 'All access to sensitive financial data is now logged and auditable',
      status: 'complete',
      impact: 'high'
    }
  ];

  const phase2Improvements = [
    {
      title: 'Granular Permissions System',
      description: 'Fine-grained control over specific system features and data access',
      status: 'complete',
      impact: 'high'
    },
    {
      title: 'Role Change Workflow',
      description: 'Structured approval process for role changes with notifications',
      status: 'complete',
      impact: 'medium'
    },
    {
      title: 'Feature Flags Management',
      description: 'Dynamic control over system features based on roles and permissions',
      status: 'complete',
      impact: 'medium'
    },
    {
      title: 'Department-Specific Roles',
      description: 'Support for different roles within specific departments',
      status: 'complete',
      impact: 'medium'
    }
  ];

  const getStatusIcon = (status: string) => {
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  const getImpactBadge = (impact: string) => {
    const variant = impact === 'high' ? 'destructive' : impact === 'medium' ? 'default' : 'secondary';
    return <Badge variant={variant}>{impact.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Shield className="h-8 w-8 text-green-600" />
          <h1 className="text-4xl font-bold">Security Upgrade Complete</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Phase 1 & 2 security enhancements have been successfully implemented. 
          Your system now has enterprise-grade access controls and permissions management.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-green-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Lock className="h-6 w-6 text-green-600" />
              <CardTitle>Phase 1: Immediate Security Fixes</CardTitle>
            </div>
            <CardDescription>
              Critical security vulnerabilities addressed with restricted access controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {phase1Improvements.map((improvement, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                {getStatusIcon(improvement.status)}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{improvement.title}</h4>
                    {getImpactBadge(improvement.impact)}
                  </div>
                  <p className="text-sm text-muted-foreground">{improvement.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Zap className="h-6 w-6 text-blue-600" />
              <CardTitle>Phase 2: Enhanced Role Structure</CardTitle>
            </div>
            <CardDescription>
              Advanced permissions system with granular controls and workflow management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {phase2Improvements.map((improvement, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                {getStatusIcon(improvement.status)}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{improvement.title}</h4>
                    {getImpactBadge(improvement.impact)}
                  </div>
                  <p className="text-sm text-muted-foreground">{improvement.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {userRole && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle>Your Access Summary</CardTitle>
            </div>
            <CardDescription>Current permissions and access levels for your role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium">Current Role</h4>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {userRole.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Financial Access</h4>
                <div className="flex items-center space-x-2">
                  {hasFinancialAccess(userRole) ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Granted</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-red-600" />
                      <span className="text-red-600">Restricted</span>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">User Management</h4>
                <div className="flex items-center space-x-2">
                  {canManageUserRoles(userRole) ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Granted</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-red-600" />
                      <span className="text-red-600">Restricted</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6 text-purple-600" />
            <CardTitle>System Features Implemented</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Security Infrastructure</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• 25 granular permissions across 4 categories</li>
                <li>• Role-based access control (RBAC)</li>
                <li>• Department-specific data isolation</li>
                <li>• Comprehensive audit logging</li>
                <li>• Feature flag management</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Workflow Management</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Role change approval workflow</li>
                <li>• Automated notifications system</li>
                <li>• Time-limited access requests</li>
                <li>• Multi-level approval process</li>
                <li>• Real-time permission checking</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center space-y-4 pt-8">
        <h3 className="text-2xl font-semibold">What's Next?</h3>
        <div className="max-w-2xl mx-auto text-muted-foreground">
          <p className="mb-4">
            Your system now has enterprise-grade security. Consider implementing Phase 3 for advanced compliance features:
          </p>
          <ul className="text-left space-y-2">
            <li>• Advanced audit reporting and compliance dashboards</li>
            <li>• Automated access reviews and certification</li>
            <li>• Integration with external identity providers</li>
            <li>• Custom workflow builders for complex approval processes</li>
            <li>• Real-time security monitoring and alerting</li>
          </ul>
        </div>
      </div>
    </div>
  );
}