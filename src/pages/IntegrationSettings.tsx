/**
 * Integration Settings Page
 * Configuration options for Integration Hub module
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Save,
  Loader2,
  Plug,
  Shield,
  Key,
  Webhook,
  Bell,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export default function IntegrationSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    // General Settings
    enable_integrations: true,
    allow_custom_integrations: true,
    require_integration_approval: false,
    max_integrations_per_agency: 50,
    
    // API Key Settings
    enable_api_keys: true,
    api_key_expiration_days: 365,
    require_api_key_rotation: false,
    api_key_rotation_days: 90,
    api_key_rate_limit: 1000,
    api_key_rate_limit_window: 60,
    
    // Webhook Settings
    enable_webhooks: true,
    webhook_timeout_seconds: 30,
    webhook_retry_attempts: 3,
    webhook_retry_delay_seconds: 5,
    require_webhook_verification: true,
    webhook_secret_rotation_days: 90,
    
    // Security Settings
    encrypt_credentials: true,
    require_ssl: true,
    allow_self_signed_certs: false,
    audit_integration_access: true,
    log_all_api_calls: false,
    
    // Notification Settings
    notify_on_integration_failure: true,
    notify_on_api_limit_reached: true,
    notify_on_webhook_failure: true,
    notify_on_credential_expiry: true,
    notification_email: '',
    
    // Sync Settings
    enable_auto_sync: false,
    sync_frequency: 'hourly',
    max_sync_records: 1000,
    sync_timeout_minutes: 15,
    
    // Performance Settings
    enable_caching: true,
    cache_ttl_minutes: 10,
    max_concurrent_requests: 10,
    request_timeout_seconds: 60,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { getIntegrationSettings } = await import('@/services/api/settings-service');
      const data = await getIntegrationSettings();
      setSettings(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { updateIntegrationSettings } = await import('@/services/api/settings-service');
      await updateIntegrationSettings(settings);
      toast({
        title: 'Success',
        description: 'Integration settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integration Settings</h1>
          <p className="text-muted-foreground">Configure integration hub preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <Key className="w-4 h-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="w-4 h-4 mr-2" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="sync">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Settings className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Integration Settings</CardTitle>
              <CardDescription>Basic integration hub configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Integrations</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable integration hub functionality
                  </p>
                </div>
                <Switch
                  checked={settings.enable_integrations}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enable_integrations: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Custom Integrations</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to create custom integrations
                  </p>
                </div>
                <Switch
                  checked={settings.allow_custom_integrations}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allow_custom_integrations: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Integration Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    Require approval before activating integrations
                  </p>
                </div>
                <Switch
                  checked={settings.require_integration_approval}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, require_integration_approval: checked })
                  }
                />
              </div>
              <div>
                <Label>Max Integrations per Agency</Label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={settings.max_integrations_per_agency}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_integrations_per_agency: parseInt(e.target.value) || 50,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Key Settings */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Key Settings</CardTitle>
              <CardDescription>Configure API key management and security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable API Keys</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable API key functionality
                  </p>
                </div>
                <Switch
                  checked={settings.enable_api_keys}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enable_api_keys: checked })
                  }
                />
              </div>
              <div>
                <Label>API Key Expiration (Days)</Label>
                <Input
                  type="number"
                  min="1"
                  max="3650"
                  value={settings.api_key_expiration_days}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      api_key_expiration_days: parseInt(e.target.value) || 365,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require API Key Rotation</Label>
                  <p className="text-sm text-muted-foreground">
                    Require periodic API key rotation
                  </p>
                </div>
                <Switch
                  checked={settings.require_api_key_rotation}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, require_api_key_rotation: checked })
                  }
                />
              </div>
              {settings.require_api_key_rotation && (
                <div>
                  <Label>API Key Rotation Period (Days)</Label>
                  <Input
                    type="number"
                    min="30"
                    max="365"
                    value={settings.api_key_rotation_days}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        api_key_rotation_days: parseInt(e.target.value) || 90,
                      })
                    }
                  />
                </div>
              )}
              <div>
                <Label>API Key Rate Limit (Requests)</Label>
                <Input
                  type="number"
                  min="1"
                  value={settings.api_key_rate_limit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      api_key_rate_limit: parseInt(e.target.value) || 1000,
                    })
                  }
                />
              </div>
              <div>
                <Label>Rate Limit Window (Seconds)</Label>
                <Input
                  type="number"
                  min="1"
                  value={settings.api_key_rate_limit_window}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      api_key_rate_limit_window: parseInt(e.target.value) || 60,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Settings */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Settings</CardTitle>
              <CardDescription>Configure webhook delivery and security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Webhooks</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable webhook functionality
                  </p>
                </div>
                <Switch
                  checked={settings.enable_webhooks}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enable_webhooks: checked })
                  }
                />
              </div>
              <div>
                <Label>Webhook Timeout (Seconds)</Label>
                <Input
                  type="number"
                  min="1"
                  max="300"
                  value={settings.webhook_timeout_seconds}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      webhook_timeout_seconds: parseInt(e.target.value) || 30,
                    })
                  }
                />
              </div>
              <div>
                <Label>Webhook Retry Attempts</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={settings.webhook_retry_attempts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      webhook_retry_attempts: parseInt(e.target.value) || 3,
                    })
                  }
                />
              </div>
              <div>
                <Label>Retry Delay (Seconds)</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.webhook_retry_delay_seconds}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      webhook_retry_delay_seconds: parseInt(e.target.value) || 5,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Webhook Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Require signature verification for webhooks
                  </p>
                </div>
                <Switch
                  checked={settings.require_webhook_verification}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, require_webhook_verification: checked })
                  }
                />
              </div>
              <div>
                <Label>Webhook Secret Rotation (Days)</Label>
                <Input
                  type="number"
                  min="30"
                  max="365"
                  value={settings.webhook_secret_rotation_days}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      webhook_secret_rotation_days: parseInt(e.target.value) || 90,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure integration security and encryption</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Encrypt Credentials</Label>
                  <p className="text-sm text-muted-foreground">
                    Encrypt stored integration credentials
                  </p>
                </div>
                <Switch
                  checked={settings.encrypt_credentials}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, encrypt_credentials: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require SSL</Label>
                  <p className="text-sm text-muted-foreground">
                    Require SSL/TLS for all connections
                  </p>
                </div>
                <Switch
                  checked={settings.require_ssl}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, require_ssl: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Self-Signed Certificates</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow connections with self-signed certificates
                  </p>
                </div>
                <Switch
                  checked={settings.allow_self_signed_certs}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allow_self_signed_certs: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Audit Integration Access</Label>
                  <p className="text-sm text-muted-foreground">
                    Log all integration access attempts
                  </p>
                </div>
                <Switch
                  checked={settings.audit_integration_access}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, audit_integration_access: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Log All API Calls</Label>
                  <p className="text-sm text-muted-foreground">
                    Log all API requests and responses
                  </p>
                </div>
                <Switch
                  checked={settings.log_all_api_calls}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, log_all_api_calls: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure integration-related notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify on Integration Failure</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notification when integration fails
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_integration_failure}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_integration_failure: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify on API Limit Reached</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when API rate limit is reached
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_api_limit_reached}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_api_limit_reached: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify on Webhook Failure</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when webhook delivery fails
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_webhook_failure}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_webhook_failure: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify on Credential Expiry</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify before credentials expire
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_credential_expiry}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_credential_expiry: checked })
                  }
                />
              </div>
              <div>
                <Label>Notification Email</Label>
                <Input
                  type="email"
                  value={settings.notification_email}
                  onChange={(e) =>
                    setSettings({ ...settings, notification_email: e.target.value })
                  }
                  placeholder="admin@example.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email address for integration notifications
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Settings */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Settings</CardTitle>
              <CardDescription>Configure data synchronization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Auto Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync data with integrations
                  </p>
                </div>
                <Switch
                  checked={settings.enable_auto_sync}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enable_auto_sync: checked })
                  }
                />
              </div>
              <div>
                <Label>Sync Frequency</Label>
                <Select
                  value={settings.sync_frequency}
                  onValueChange={(value) =>
                    setSettings({ ...settings, sync_frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Sync Records</Label>
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  value={settings.max_sync_records}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_sync_records: parseInt(e.target.value) || 1000,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum records to sync per operation
                </p>
              </div>
              <div>
                <Label>Sync Timeout (Minutes)</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.sync_timeout_minutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sync_timeout_minutes: parseInt(e.target.value) || 15,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Settings */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Settings</CardTitle>
              <CardDescription>Configure integration performance and optimization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Caching</Label>
                  <p className="text-sm text-muted-foreground">
                    Cache integration responses for better performance
                  </p>
                </div>
                <Switch
                  checked={settings.enable_caching}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enable_caching: checked })
                  }
                />
              </div>
              {settings.enable_caching && (
                <div>
                  <Label>Cache TTL (Minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.cache_ttl_minutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cache_ttl_minutes: parseInt(e.target.value) || 10,
                      })
                    }
                  />
                </div>
              )}
              <div>
                <Label>Max Concurrent Requests</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.max_concurrent_requests}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_concurrent_requests: parseInt(e.target.value) || 10,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum concurrent integration requests
                </p>
              </div>
              <div>
                <Label>Request Timeout (Seconds)</Label>
                <Input
                  type="number"
                  min="1"
                  max="300"
                  value={settings.request_timeout_seconds}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      request_timeout_seconds: parseInt(e.target.value) || 60,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

