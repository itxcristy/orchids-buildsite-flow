/**
 * Workflow Settings Page
 * Configuration options for Workflow Engine module
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
  Workflow,
  Clock,
  User,
  Bell,
  Shield,
  Zap,
  AlertCircle,
  CheckCircle2,
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

export default function WorkflowSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    // General Settings
    enable_workflows: true,
    default_workflow_type: 'approval',
    auto_start_workflows: true,
    allow_parallel_approvals: true,
    max_workflow_steps: 10,
    
    // Approval Settings
    default_approval_timeout_days: 7,
    require_approval_comments: false,
    allow_delegation: true,
    auto_escalate_on_timeout: true,
    escalation_notification_days: 2,
    
    // Notification Settings
    notify_on_workflow_start: true,
    notify_on_approval_required: true,
    notify_on_workflow_complete: true,
    notify_on_workflow_rejected: true,
    notify_on_escalation: true,
    notify_on_timeout: true,
    
    // Automation Settings
    enable_automation_rules: true,
    auto_execute_rules: true,
    rule_execution_priority: 'high',
    max_concurrent_executions: 5,
    
    // Security Settings
    protect_system_workflows: true,
    allow_workflow_deletion: true,
    require_workflow_approval: false,
    audit_workflow_changes: true,
    
    // Performance Settings
    workflow_timeout_minutes: 30,
    enable_workflow_caching: true,
    cache_ttl_minutes: 15,
    max_retry_attempts: 3,
    
    // Integration Settings
    sync_with_external_systems: false,
    webhook_on_completion: false,
    webhook_url: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { getWorkflowSettings } = await import('@/services/api/settings-service');
      const data = await getWorkflowSettings();
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
      const { updateWorkflowSettings } = await import('@/services/api/settings-service');
      await updateWorkflowSettings(settings);
      toast({
        title: 'Success',
        description: 'Workflow settings saved successfully',
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
          <h1 className="text-3xl font-bold">Workflow Settings</h1>
          <p className="text-muted-foreground">Configure workflow engine preferences</p>
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
          <TabsTrigger value="approval">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approval
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="automation">
            <Zap className="w-4 h-4 mr-2" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Clock className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="integration">
            <Settings className="w-4 h-4 mr-2" />
            Integration
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Workflow Settings</CardTitle>
              <CardDescription>Basic workflow engine configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Workflows</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable workflow engine functionality
                  </p>
                </div>
                <Switch
                  checked={settings.enable_workflows}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enable_workflows: checked })
                  }
                />
              </div>
              <div>
                <Label>Default Workflow Type</Label>
                <Select
                  value={settings.default_workflow_type}
                  onValueChange={(value) =>
                    setSettings({ ...settings, default_workflow_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approval">Approval</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                    <SelectItem value="automation">Automation</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-start Workflows</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically start workflows on trigger events
                  </p>
                </div>
                <Switch
                  checked={settings.auto_start_workflows}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, auto_start_workflows: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Parallel Approvals</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow multiple approvers to approve simultaneously
                  </p>
                </div>
                <Switch
                  checked={settings.allow_parallel_approvals}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allow_parallel_approvals: checked })
                  }
                />
              </div>
              <div>
                <Label>Maximum Workflow Steps</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.max_workflow_steps}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_workflow_steps: parseInt(e.target.value) || 10,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of steps allowed in a workflow
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approval Settings */}
        <TabsContent value="approval" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Approval Settings</CardTitle>
              <CardDescription>Configure approval workflow behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Default Approval Timeout (Days)</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.default_approval_timeout_days}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_approval_timeout_days: parseInt(e.target.value) || 7,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Approval Comments</Label>
                  <p className="text-sm text-muted-foreground">
                    Require comments when approving or rejecting
                  </p>
                </div>
                <Switch
                  checked={settings.require_approval_comments}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, require_approval_comments: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Delegation</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow approvers to delegate to other users
                  </p>
                </div>
                <Switch
                  checked={settings.allow_delegation}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allow_delegation: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-escalate on Timeout</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically escalate when approval times out
                  </p>
                </div>
                <Switch
                  checked={settings.auto_escalate_on_timeout}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, auto_escalate_on_timeout: checked })
                  }
                />
              </div>
              {settings.auto_escalate_on_timeout && (
                <div>
                  <Label>Escalation Notification (Days Before)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="7"
                    value={settings.escalation_notification_days}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        escalation_notification_days: parseInt(e.target.value) || 2,
                      })
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure workflow-related notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify on Workflow Start</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notification when workflow starts
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_workflow_start}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_workflow_start: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify on Approval Required</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify approvers when action is required
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_approval_required}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_approval_required: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify on Workflow Complete</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when workflow is completed
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_workflow_complete}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_workflow_complete: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify on Workflow Rejected</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when workflow is rejected
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_workflow_rejected}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_workflow_rejected: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify on Escalation</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when workflow is escalated
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_escalation}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_escalation: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify on Timeout</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when workflow times out
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_timeout}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_timeout: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Settings */}
        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automation Settings</CardTitle>
              <CardDescription>Configure automation rules and execution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Automation Rules</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable automation rule functionality
                  </p>
                </div>
                <Switch
                  checked={settings.enable_automation_rules}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enable_automation_rules: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-execute Rules</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically execute automation rules
                  </p>
                </div>
                <Switch
                  checked={settings.auto_execute_rules}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, auto_execute_rules: checked })
                  }
                />
              </div>
              <div>
                <Label>Rule Execution Priority</Label>
                <Select
                  value={settings.rule_execution_priority}
                  onValueChange={(value) =>
                    setSettings({ ...settings, rule_execution_priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Concurrent Executions</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.max_concurrent_executions}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_concurrent_executions: parseInt(e.target.value) || 5,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of rules that can execute simultaneously
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure workflow security and protection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Protect System Workflows</Label>
                  <p className="text-sm text-muted-foreground">
                    Prevent modification of system workflows
                  </p>
                </div>
                <Switch
                  checked={settings.protect_system_workflows}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, protect_system_workflows: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Workflow Deletion</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to delete workflows
                  </p>
                </div>
                <Switch
                  checked={settings.allow_workflow_deletion}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allow_workflow_deletion: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Workflow Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    Require approval before activating new workflows
                  </p>
                </div>
                <Switch
                  checked={settings.require_workflow_approval}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, require_workflow_approval: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Audit Workflow Changes</Label>
                  <p className="text-sm text-muted-foreground">
                    Log all workflow changes for audit purposes
                  </p>
                </div>
                <Switch
                  checked={settings.audit_workflow_changes}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, audit_workflow_changes: checked })
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
              <CardDescription>Configure workflow performance and optimization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Workflow Timeout (Minutes)</Label>
                <Input
                  type="number"
                  min="1"
                  max="1440"
                  value={settings.workflow_timeout_minutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workflow_timeout_minutes: parseInt(e.target.value) || 30,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Workflow Caching</Label>
                  <p className="text-sm text-muted-foreground">
                    Cache workflow definitions for better performance
                  </p>
                </div>
                <Switch
                  checked={settings.enable_workflow_caching}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enable_workflow_caching: checked })
                  }
                />
              </div>
              {settings.enable_workflow_caching && (
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
                        cache_ttl_minutes: parseInt(e.target.value) || 15,
                      })
                    }
                  />
                </div>
              )}
              <div>
                <Label>Max Retry Attempts</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={settings.max_retry_attempts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_retry_attempts: parseInt(e.target.value) || 3,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum retry attempts for failed workflow steps
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Settings */}
        <TabsContent value="integration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
              <CardDescription>Configure external system integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sync with External Systems</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable synchronization with external systems
                  </p>
                </div>
                <Switch
                  checked={settings.sync_with_external_systems}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, sync_with_external_systems: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Webhook on Completion</Label>
                  <p className="text-sm text-muted-foreground">
                    Send webhook when workflow completes
                  </p>
                </div>
                <Switch
                  checked={settings.webhook_on_completion}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, webhook_on_completion: checked })
                  }
                />
              </div>
              {settings.webhook_on_completion && (
                <div>
                  <Label>Webhook URL</Label>
                  <Input
                    value={settings.webhook_url}
                    onChange={(e) =>
                      setSettings({ ...settings, webhook_url: e.target.value })
                    }
                    placeholder="https://example.com/webhook"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

