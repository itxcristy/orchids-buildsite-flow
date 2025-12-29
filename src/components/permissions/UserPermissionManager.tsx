import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/hooks/usePermissions';
import { db } from '@/lib/database';
import * as permissionsService from '@/services/permissions';
import { toast } from 'sonner';
import { Search, User, CheckCircle2, XCircle, Loader2, RotateCcw, Save } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  department: string | null;
  avatar_url: string | null;
}

export function UserPermissionManager() {
  const { updateUserPermissions, resetUserPermissions } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<permissionsService.Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [permissionStates, setPermissionStates] = useState<Record<string, {
    granted: boolean;
    reason?: string;
    expires_at?: string;
  }>>({});
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overridePermission, setOverridePermission] = useState<permissionsService.Permission | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideExpiresAt, setOverrideExpiresAt] = useState('');

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Fetch profiles
        const { data: profilesData } = await db
          .from('profiles')
          .select('user_id, full_name, department, avatar_url')
          .order('full_name');

        // Fetch users for email
        const { data: usersData } = await db
          .from('users')
          .select('id, email');

        // Fetch user roles
        const { data: rolesData } = await db
          .from('user_roles')
          .select('user_id, role');

        // Create maps
        const profileMap = new Map(profilesData?.map((p: any) => [p.user_id, p]) || []);
        const userMap = new Map(usersData?.map((u: any) => [u.id, u]) || []);
        const roleMap = new Map(rolesData?.map((r: any) => [r.user_id, r.role]) || []);

        // Combine data
        const combinedUsers: User[] = (usersData || []).map((u: any) => {
          const profile = profileMap.get(u.id);
          return {
            id: u.id,
            email: u.email,
            full_name: profile?.full_name || null,
            role: roleMap.get(u.id) || 'employee',
            department: profile?.department || null,
            avatar_url: profile?.avatar_url || null,
          };
        });

        setUsers(combinedUsers);
      } catch (error: any) {
        toast.error(error.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Fetch permissions for selected user
  useEffect(() => {
    if (!selectedUser) {
      setPermissions([]);
      setPermissionStates({});
      return;
    }

    const fetchUserPermissions = async () => {
      setLoading(true);
      try {
      const data = await permissionsService.getUserPermissions(selectedUser.id);
      setPermissions(data);
      
      // Initialize permission states
      const states: Record<string, { granted: boolean; reason?: string; expires_at?: string }> = {};
      data.forEach(perm => {
        states[perm.id] = {
          granted: perm.granted ?? false,
          reason: (perm as any).reason || undefined,
          expires_at: (perm as any).expires_at || undefined,
        };
      });
      setPermissionStates(states);
      setHasChanges(false);
    } catch (error: any) {
      // If API is not available, show empty state gracefully
      console.warn('User permissions API not available:', error);
      setPermissions([]);
      setPermissionStates({});
      // Don't show error toast for 404s - API might not be set up yet
      if (!error.message?.includes('404')) {
        toast.error(error.message || 'Failed to load user permissions');
      }
    } finally {
      setLoading(false);
    }
    };

    fetchUserPermissions();
  }, [selectedUser]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.department || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    const grouped: Record<string, permissionsService.Permission[]> = {};
    permissions.forEach(perm => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped;
  }, [permissions]);

  const handlePermissionToggle = (permissionId: string, granted: boolean) => {
    const perm = permissions.find(p => p.id === permissionId);
    if (perm?.source === 'user') {
      // User override - can toggle directly
      setPermissionStates(prev => ({
        ...prev,
        [permissionId]: { ...prev[permissionId], granted }
      }));
      setHasChanges(true);
    } else {
      // Role-based permission - need to create override
      setOverridePermission(perm || null);
      setOverrideReason('');
      setOverrideExpiresAt('');
      setOverrideDialogOpen(true);
    }
  };

  const handleCreateOverride = () => {
    if (!overridePermission) return;

    setPermissionStates(prev => ({
      ...prev,
      [overridePermission.id]: {
        granted: true,
        reason: overrideReason || undefined,
        expires_at: overrideExpiresAt || undefined,
      }
    }));
    setHasChanges(true);
    setOverrideDialogOpen(false);
    setOverridePermission(null);
    setOverrideReason('');
    setOverrideExpiresAt('');
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const permissionUpdates = Object.entries(permissionStates)
        .filter(([_, state]) => state.granted !== undefined)
        .map(([permission_id, state]) => ({
          permission_id,
          granted: state.granted,
          reason: state.reason,
          expires_at: state.expires_at,
        }));

      await updateUserPermissions(selectedUser.id, permissionUpdates);
      setHasChanges(false);
      setShowSaveDialog(false);
      toast.success('User permissions saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      await resetUserPermissions(selectedUser.id);
      setShowResetDialog(false);
      toast.success('User permissions reset to role defaults');
      
      // Reload permissions
      const data = await permissionsService.getUserPermissions(selectedUser.id);
      setPermissions(data);
      const states: Record<string, { granted: boolean; reason?: string; expires_at?: string }> = {};
      data.forEach(perm => {
        states[perm.id] = {
          granted: perm.granted ?? false,
          reason: (perm as any).reason || undefined,
          expires_at: (perm as any).expires_at || undefined,
        };
      });
      setPermissionStates(states);
      setHasChanges(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Permission Overrides</CardTitle>
          <CardDescription>
            Manage user-specific permission overrides. These override role-based permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, role, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 space-y-2 max-h-[600px] overflow-y-auto">
              <h3 className="font-semibold mb-3">Select User</h3>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedUser?.id === user.id ? 'bg-primary/10 border-primary' : ''
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.full_name || user.email}</p>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{user.role}</Badge>
                            {user.department && (
                              <Badge variant="secondary" className="text-xs">{user.department}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found matching your search.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-2 max-h-[600px] overflow-y-auto">
              {selectedUser ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">
                        {selectedUser.full_name || selectedUser.email}
                      </h3>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowResetDialog(true)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                      <Button
                        size="sm"
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
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(groupedPermissions).map(([category, categoryPerms]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="font-medium text-sm capitalize">{category}</h4>
                          {categoryPerms.map(perm => {
                            const state = permissionStates[perm.id];
                            const granted = state?.granted ?? false;
                            const isOverride = perm.source === 'user';
                            const isExpired = state?.expires_at && new Date(state.expires_at) < new Date();

                            return (
                              <div
                                key={perm.id}
                                className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">{perm.name.replace(/_/g, ' ')}</p>
                                    {isOverride && (
                                      <Badge variant="outline" className="text-xs">Override</Badge>
                                    )}
                                    {isExpired && (
                                      <Badge variant="destructive" className="text-xs">Expired</Badge>
                                    )}
                                  </div>
                                  {perm.description && (
                                    <p className="text-xs text-muted-foreground">{perm.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {granted ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-gray-400" />
                                  )}
                                  <Switch
                                    checked={granted}
                                    onCheckedChange={(checked) => handlePermissionToggle(perm.id, checked)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      {permissions.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No permissions found for this user.
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a user to manage their permissions</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Permission Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these permission overrides for {selectedUser?.full_name || selectedUser?.email}?
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

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset User Permissions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset all permission overrides for {selectedUser?.full_name || selectedUser?.email}?
              This will remove all user-specific overrides and restore role-based permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={saving}>
              {saving ? 'Resetting...' : 'Reset Permissions'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Permission Override</DialogTitle>
            <DialogDescription>
              Create a user-specific override for {overridePermission?.name.replace(/_/g, ' ')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Why is this override needed?"
              />
            </div>
            <div>
              <Label>Expires At (optional)</Label>
              <Input
                type="datetime-local"
                value={overrideExpiresAt}
                onChange={(e) => setOverrideExpiresAt(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOverride}>
                Create Override
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
