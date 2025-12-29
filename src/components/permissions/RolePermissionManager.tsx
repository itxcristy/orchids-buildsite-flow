import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { getRoleDisplayName, ROLE_HIERARCHY, type AppRole } from '@/utils/roleUtils';
import * as permissionsService from '@/services/permissions';
import { toast } from 'sonner';
import { Save, Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function RolePermissionManager() {
  const { updateRolePermissions } = usePermissions();
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [permissions, setPermissions] = useState<permissionsService.Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [permissionStates, setPermissionStates] = useState<Record<string, boolean>>({});

  const allRoles = Object.keys(ROLE_HIERARCHY) as AppRole[];

  // Fetch permissions for selected role
  useEffect(() => {
    if (!selectedRole) {
      setPermissions([]);
      setPermissionStates({});
      return;
    }

    const fetchRolePermissions = async () => {
      setLoading(true);
      try {
        const data = await permissionsService.getRolePermissions(selectedRole);
        setPermissions(data);
        
        // Initialize permission states
        const states: Record<string, boolean> = {};
        data.forEach(perm => {
          states[perm.id] = perm.granted ?? false;
        });
        setPermissionStates(states);
        setHasChanges(false);
      } catch (error: any) {
        // If API is not available, show empty state gracefully
        console.warn('Role permissions API not available:', error);
        setPermissions([]);
        setPermissionStates({});
        // Don't show error toast for 404s - API might not be set up yet
        if (!error.message?.includes('404')) {
          toast.error(error.message || 'Failed to load role permissions');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRolePermissions();
  }, [selectedRole]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(permissions.map(p => p.category));
    return Array.from(cats).sort();
  }, [permissions]);

  // Filter permissions
  const filteredPermissions = useMemo(() => {
    return permissions.filter(perm => {
      const matchesSearch = perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (perm.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || perm.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [permissions, searchTerm, selectedCategory]);

  // Group by category
  const groupedPermissions = useMemo(() => {
    const grouped: Record<string, permissionsService.Permission[]> = {};
    filteredPermissions.forEach(perm => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped;
  }, [filteredPermissions]);

  const handlePermissionToggle = (permissionId: string, granted: boolean) => {
    setPermissionStates(prev => ({
      ...prev,
      [permissionId]: granted
    }));
    setHasChanges(true);
  };

  const handleCategoryToggle = (category: string, granted: boolean) => {
    const categoryPerms = permissions.filter(p => p.category === category);
    setPermissionStates(prev => {
      const newStates = { ...prev };
      categoryPerms.forEach(perm => {
        newStates[perm.id] = granted;
      });
      return newStates;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedRole) return;

    setSaving(true);
    try {
      const permissionUpdates = Object.entries(permissionStates).map(([permission_id, granted]) => ({
        permission_id,
        granted
      }));

      await updateRolePermissions(selectedRole, permissionUpdates);
      setHasChanges(false);
      setShowSaveDialog(false);
      toast.success('Role permissions saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAction = (action: 'grant-all' | 'deny-all') => {
    const newStates: Record<string, boolean> = {};
    permissions.forEach(perm => {
      newStates[perm.id] = action === 'grant-all';
    });
    setPermissionStates(newStates);
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Role Permission Management</CardTitle>
          <CardDescription>
            Manage permissions for each role. Select a role to view and modify its permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {allRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      {getRoleDisplayName(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRole && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('grant-all')}
                >
                  Grant All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('deny-all')}
                >
                  Deny All
                </Button>
                <Button
                  onClick={() => setShowSaveDialog(true)}
                  disabled={!hasChanges || saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {selectedRole && (
            <>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search permissions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select value={selectedCategory === 'all' ? 'all' : selectedCategory} onValueChange={(value) => setSelectedCategory(value === 'all' ? 'all' : value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([category, categoryPerms]) => (
                    <Card key={category}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg capitalize">{category}</CardTitle>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCategoryToggle(category, true)}
                            >
                              Grant All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCategoryToggle(category, false)}
                            >
                              Deny All
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {categoryPerms.map(perm => {
                            const granted = permissionStates[perm.id] ?? false;
                            return (
                              <div
                                key={perm.id}
                                className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50"
                              >
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{perm.name.replace(/_/g, ' ')}</h4>
                                    {granted ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-gray-400" />
                                    )}
                                  </div>
                                  {perm.description && (
                                    <p className="text-sm text-muted-foreground">{perm.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge variant={granted ? 'default' : 'secondary'}>
                                    {granted ? 'Granted' : 'Denied'}
                                  </Badge>
                                  <Checkbox
                                    checked={granted}
                                    onCheckedChange={(checked) =>
                                      handlePermissionToggle(perm.id, checked === true)
                                    }
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredPermissions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No permissions found matching your search.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!selectedRole && (
            <div className="text-center py-12 text-muted-foreground">
              Select a role to manage its permissions
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Permission Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these permission changes for {selectedRole && getRoleDisplayName(selectedRole)}? 
              This will update the role's permissions immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
