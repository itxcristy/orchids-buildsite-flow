import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, AlertTriangle, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasFinancialAccess, canManageUserRoles } from '@/utils/roleUtils';

export function SecurityAuditSummary() {
  const { userRole } = useAuth();

  const securityImprovements = [
    {
      title: 'Financial Data Access Restricted',
      description: 'Only CFO, Finance Manager, and Super Admin can access payroll, invoices, and financial management',
      status: 'implemented',
      impact: 'high'
    },
    {
      title: 'Department-Based Employee Access',
      description: 'Department heads can only access employees in their own department',
      status: 'implemented',
      impact: 'medium'
    },
    {
      title: 'Role Management Restricted',
      description: 'Only CEO and Super Admin can assign or modify user roles',
      status: 'implemented',
      impact: 'high'
    },
    {
      title: 'Audit Logging Enhanced',
      description: 'All access to sensitive financial data is now logged and auditable',
      status: 'implemented',
      impact: 'high'
    },
    {
      title: 'Admin Role Permissions Reduced',
      description: 'Admin role no longer has access to financial data or salary information',
      status: 'implemented',
      impact: 'high'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'implemented':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getImpactBadge = (impact: string) => {
    const variant = impact === 'high' ? 'destructive' : impact === 'medium' ? 'default' : 'secondary';
    return <Badge variant={variant}>{impact.toUpperCase()}</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-green-600" />
          <CardTitle>Security Audit - Phase 1 Complete</CardTitle>
        </div>
        <CardDescription>
          Immediate security fixes have been implemented to address critical access control vulnerabilities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          {securityImprovements.map((improvement, index) => (
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
        </div>

        {userRole && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Lock className="h-4 w-4" />
              <h4 className="font-medium">Your Current Access Level</h4>
            </div>
            <div className="space-y-1 text-sm">
              <p>Role: <Badge variant="outline">{userRole}</Badge></p>
              <p>Financial Access: {hasFinancialAccess(userRole) ? '✅ Granted' : '❌ Restricted'}</p>
              <p>User Management: {canManageUserRoles(userRole) ? '✅ Granted' : '❌ Restricted'}</p>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">Next Steps:</p>
          <ul className="space-y-1">
            <li>• Phase 2: Enhanced role structure and department-based policies</li>
            <li>• Phase 3: Advanced security features and compliance controls</li>
            <li>• Regular security audits and access reviews</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}