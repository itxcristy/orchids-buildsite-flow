import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import * as permissionsService from '@/services/permissions';
import { getRoleDisplayName, type AppRole, ROLE_HIERARCHY } from '@/utils/roleUtils';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function BulkOperations() {
  const [type, setType] = useState<'roles' | 'users'>('roles');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<permissionsService.Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [action, setAction] = useState<'grant' | 'deny'>('grant');

  const allRoles = Object.keys(ROLE_HIERARCHY) as AppRole[];

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const result = await permissionsService.getPermissions();
      setPermissions(result.data);
    } catch (error: any) {
      // If API is not available, show empty state gracefully
      console.warn('Permissions API not available:', error);
      setPermissions([]);
      // Don't show error toast for 404s - API might not be set up yet
      if (!error.message?.includes('404')) {
        toast.error(error.message || 'Failed to load permissions');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedTargets.length === 0 || selectedPermissions.length === 0) {
      toast.error('Please select at least one target and one permission');
      return;
    }

    setSaving(true);
    try {
      const permissionUpdates = selectedPermissions.map(permission_id => ({
        permission_id,
        granted: action === 'grant',
      }));

      await permissionsService.bulkUpdatePermissions({
        type,
        targets: selectedTargets,
        permissions: permissionUpdates,
      });

      toast.success(`Bulk ${action} operation completed successfully`);
      setShowConfirmDialog(false);
      setSelectedTargets([]);
      setSelectedPermissions([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to perform bulk operation');
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, permissionsService.Permission[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Operations</CardTitle>
        <CardDescription>
          Apply permission changes to multiple roles or users at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Operation Type</label>
          <Select value={type} onValueChange={(value) => {
            setType(value as 'roles' | 'users');
            setSelectedTargets([]);
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="roles">Roles</SelectItem>
              <SelectItem value="users">Users</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Select {type === 'roles' ? 'Roles' : 'Users'}
          </label>
          <div className="border rounded-lg p-4 max-h-[200px] overflow-y-auto space-y-2">
            {type === 'roles' ? (
              allRoles.map(role => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedTargets.includes(role)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTargets([...selectedTargets, role]);
                      } else {
                        setSelectedTargets(selectedTargets.filter(r => r !== role));
                      }
                    }}
                  />
                  <label className="text-sm cursor-pointer">
                    {getRoleDisplayName(role)}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                User selection feature coming soon
              </p>
            )}
          </div>
          {selectedTargets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedTargets.map(target => (
                <Badge key={target} variant="secondary">
                  {type === 'roles' ? getRoleDisplayName(target as AppRole) : target}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Select Permissions</label>
          <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto space-y-4">
            {Object.entries(groupedPermissions).map(([category, categoryPerms]) => (
              <div key={category}>
                <h4 className="font-medium mb-2 capitalize">{category}</h4>
                <div className="space-y-2">
                  {categoryPerms.map(perm => (
                    <div key={perm.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedPermissions.includes(perm.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPermissions([...selectedPermissions, perm.id]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter(id => id !== perm.id));
                          }
                        }}
                      />
                      <label className="text-sm cursor-pointer">
                        {perm.name.replace(/_/g, ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {selectedPermissions.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">
                {selectedPermissions.length} permission(s) selected
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setAction('grant');
              setShowConfirmDialog(true);
            }}
            disabled={selectedTargets.length === 0 || selectedPermissions.length === 0 || saving}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Grant Selected
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setAction('deny');
              setShowConfirmDialog(true);
            }}
            disabled={selectedTargets.length === 0 || selectedPermissions.length === 0 || saving}
          >
            Deny Selected
          </Button>
        </div>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Bulk Operation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {action} {selectedPermissions.length} permission(s) for {selectedTargets.length} {type}?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkAction} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Confirm ${action === 'grant' ? 'Grant' : 'Deny'}`
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
