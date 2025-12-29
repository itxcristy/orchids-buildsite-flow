import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';

export function PermissionSettings() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enableInheritance: true,
    defaultPolicy: 'deny' as 'deny' | 'allow',
    requireApproval: false,
    auditRetentionDays: 365,
    sessionTimeout: 30,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Implement settings save API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permission System Settings</CardTitle>
        <CardDescription>
          Configure global settings for the permission system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Permission Inheritance</Label>
              <p className="text-sm text-muted-foreground">
                Allow roles to inherit permissions from higher roles
              </p>
            </div>
            <Switch
              checked={settings.enableInheritance}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ ...prev, enableInheritance: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Default Permission Policy</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Default behavior when a permission is not explicitly granted or denied
            </p>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="deny"
                  checked={settings.defaultPolicy === 'deny'}
                  onChange={() => setSettings(prev => ({ ...prev, defaultPolicy: 'deny' }))}
                  className="w-4 h-4"
                />
                <span>Deny All (Default)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="allow"
                  checked={settings.defaultPolicy === 'allow'}
                  onChange={() => setSettings(prev => ({ ...prev, defaultPolicy: 'allow' }))}
                  className="w-4 h-4"
                />
                <span>Allow All</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Approval for Permission Changes</Label>
              <p className="text-sm text-muted-foreground">
                Require approval workflow for sensitive permission changes
              </p>
            </div>
            <Switch
              checked={settings.requireApproval}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ ...prev, requireApproval: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Audit Log Retention (Days)</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Number of days to retain audit logs
            </p>
            <Input
              type="number"
              value={settings.auditRetentionDays}
              onChange={(e) =>
                setSettings(prev => ({ ...prev, auditRetentionDays: parseInt(e.target.value) || 365 }))
              }
              min={30}
              max={3650}
            />
          </div>

          <div className="space-y-2">
            <Label>Session Timeout (Minutes)</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Automatic session timeout for permission management
            </p>
            <Input
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) =>
                setSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 30 }))
              }
              min={5}
              max={480}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
