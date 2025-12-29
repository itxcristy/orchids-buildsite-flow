import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import * as permissionsService from '@/services/permissions';
import { usePermissions } from '@/hooks/usePermissions';
import { getRoleDisplayName, type AppRole, ROLE_HIERARCHY } from '@/utils/roleUtils';
import { toast } from 'sonner';
import { Plus, Loader2, Play, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function PermissionTemplates() {
  const { getPermissionTemplates, applyTemplate } = usePermissions();
  const [templates, setTemplates] = useState<permissionsService.PermissionTemplate[]>([]);
  const [permissions, setPermissions] = useState<permissionsService.Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<permissionsService.PermissionTemplate | null>(null);
  const [applyType, setApplyType] = useState<'roles' | 'users'>('roles');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    selectedPermissions: [] as string[],
  });

  const allRoles = Object.keys(ROLE_HIERARCHY) as AppRole[];

  useEffect(() => {
    fetchTemplates();
    fetchPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPermissionTemplates();
      setTemplates(data);
    } catch (error: any) {
      // If API is not available, show empty state gracefully
      console.warn('Templates API not available:', error);
      setTemplates([]);
      // Don't show error toast for 404s - API might not be set up yet
      if (!error.message?.includes('404')) {
        toast.error(error.message || 'Failed to load templates');
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPermissions = useCallback(async () => {
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
    }
  }, []);

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (templateForm.selectedPermissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    try {
      const permissionData = templateForm.selectedPermissions.map(permId => ({
        permission_id: permId,
        granted: true,
      }));

      await permissionsService.createPermissionTemplate({
        name: templateForm.name,
        description: templateForm.description,
        permissions: permissionData,
      });

      toast.success('Template created successfully');
      setShowCreateDialog(false);
      setTemplateForm({ name: '', description: '', selectedPermissions: [] });
      await fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create template');
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || selectedTargets.length === 0) {
      toast.error('Please select a template and targets');
      return;
    }

    try {
      await applyTemplate(selectedTemplate.id, selectedTargets, applyType);
      setShowApplyDialog(false);
      setSelectedTemplate(null);
      setSelectedTargets([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply template');
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setTemplateForm(prev => ({
      ...prev,
      selectedPermissions: prev.selectedPermissions.includes(permissionId)
        ? prev.selectedPermissions.filter(id => id !== permissionId)
        : [...prev.selectedPermissions, permissionId],
    }));
  };

  const groupedPermissions = useMemo(() => {
    return permissions.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }
      acc[perm.category].push(perm);
      return acc;
    }, {} as Record<string, permissionsService.Permission[]>);
  }, [permissions]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Permission Templates</CardTitle>
              <CardDescription>
                Create and apply permission templates to roles or users
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Permission Template</DialogTitle>
                  <DialogDescription>
                    Define a set of permissions that can be applied to multiple roles or users
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Template Name</Label>
                    <Input
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Finance Manager Template"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this template is for"
                    />
                  </div>
                  <div>
                    <Label>Select Permissions</Label>
                    <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto space-y-4">
                      {Object.entries(groupedPermissions).map(([category, categoryPerms]) => (
                        <div key={category}>
                          <h4 className="font-medium mb-2 capitalize">{category}</h4>
                          <div className="space-y-2">
                            {categoryPerms.map(perm => (
                              <div key={perm.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={templateForm.selectedPermissions.includes(perm.id)}
                                  onCheckedChange={() => handlePermissionToggle(perm.id)}
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
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTemplate}>
                      Create Template
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Badge variant="outline">
                        {Array.isArray(template.permissions) ? template.permissions.length : 0} permissions
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowApplyDialog(true);
                          }}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Apply
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {templates.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No templates found. Create your first template to get started.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Template</DialogTitle>
            <DialogDescription>
              Apply "{selectedTemplate?.name}" to roles or users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Apply To</Label>
              <Select value={applyType} onValueChange={(value) => {
                setApplyType(value as 'roles' | 'users');
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
              <Label>Select {applyType === 'roles' ? 'Roles' : 'Users'}</Label>
              <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto space-y-2">
                {applyType === 'roles' ? (
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
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleApplyTemplate} disabled={selectedTargets.length === 0}>
                Apply Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
