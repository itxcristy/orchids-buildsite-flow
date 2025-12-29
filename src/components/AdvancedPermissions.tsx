import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, FolderTree, FileText, ClipboardList, BarChart3, Settings, Zap, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { RolePermissionManager } from '@/components/permissions/RolePermissionManager';
import { UserPermissionManager } from '@/components/permissions/UserPermissionManager';
import { CategoryManager } from '@/components/permissions/CategoryManager';
import { PermissionTemplates } from '@/components/permissions/PermissionTemplates';
import { AuditLogViewer } from '@/components/permissions/AuditLogViewer';
import { Reports } from '@/components/permissions/Reports';
import { PermissionSettings } from '@/components/permissions/PermissionSettings';
import * as permissionsService from '@/services/permissions';
import { countRecords } from '@/services/api/postgresql-service';
import { toast } from 'sonner';
import { logError, logWarn } from '@/utils/consoleLogger';

const AdvancedPermissions = () => {
  const { userRole } = useAuth();
  const { permissions, loading } = usePermissions();
  const [stats, setStats] = useState({
    totalPermissions: 0,
    totalRoles: 22,
    totalUsers: 0,
    recentChanges: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const canManagePermissions = ['super_admin', 'ceo', 'admin'].includes(userRole || '');

  useEffect(() => {
    if (!loading && permissions.length >= 0) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, permissions.length]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      
      // Get permissions count - use local permissions if API fails
      let totalPerms = permissions.length;
      try {
        const permResult = await permissionsService.getPermissions({ limit: 1 });
        totalPerms = permResult.pagination?.total || permissions.length;
      } catch (error) {
        // API might not be available yet, use local permissions
        logWarn('Could not fetch permissions count from API, using local data');
      }

      // Get users count from database
      let totalUsers = 0;
      try {
        totalUsers = await countRecords('profiles', {});
      } catch (error) {
        logWarn('Could not fetch users count from database, using 0');
      }

      setStats({
        totalPermissions: totalPerms,
        totalRoles: 22,
        totalUsers,
        recentChanges: 0, // Audit log feature not yet implemented
      });
    } catch (error: any) {
      logError('Failed to load stats:', error);
      // Set default stats on error
      setStats({
        totalPermissions: permissions.length,
        totalRoles: 22,
        totalUsers: 0,
        recentChanges: 0,
      });
    } finally {
      setLoadingStats(false);
    }
  };

  // Show loading state
  if (loading || loadingStats) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Permissions</h1>
          <p className="text-muted-foreground">
            Comprehensive permission management system for enterprise access control
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Your Role: {userRole}</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPermissions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Roles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRoles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recent Changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentChanges}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex flex-wrap gap-2 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          {canManagePermissions && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Permission System Overview</CardTitle>
                <CardDescription>
                  Quick overview of the permission system status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">System Status</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Active</Badge>
                      <span className="text-sm text-muted-foreground">
                        All systems operational
                      </span>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Quick Actions</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Bulk Operations</Badge>
                      <Badge variant="outline">Export Permissions</Badge>
                      <Badge variant="outline">Generate Report</Badge>
                    </div>
                  </div>
                </div>
                {canManagePermissions && (
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-3">Management Tools</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Bulk Operations</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-3">
                            Apply permission changes to multiple roles or users at once
                          </p>
                          <Badge variant="secondary">Available in Templates tab</Badge>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Templates</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-3">
                            Create and apply permission templates
                          </p>
                          <Badge variant="secondary">Available</Badge>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Audit Trail</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-3">
                            View complete audit history
                          </p>
                          <Badge variant="secondary">Available</Badge>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roles">
          <RolePermissionManager />
        </TabsContent>

        <TabsContent value="users">
          {canManagePermissions ? (
            <UserPermissionManager />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  You don't have permission to manage user permissions
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>

        <TabsContent value="templates">
          {canManagePermissions ? (
            <PermissionTemplates />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  You don't have permission to manage templates
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit">
          {canManagePermissions ? (
            <AuditLogViewer />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  You don't have permission to view audit logs
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports">
          {canManagePermissions ? (
            <Reports />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  You don't have permission to generate reports
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {canManagePermissions && (
          <TabsContent value="settings">
            <PermissionSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default AdvancedPermissions;
