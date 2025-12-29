/**
 * Asset Settings Page
 * Configuration options for Asset Management module
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
  Building2,
  TrendingDown,
  Wrench,
  MapPin,
  DollarSign,
  Calendar,
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

export default function AssetSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    // General Settings
    default_depreciation_method: 'straight_line',
    default_useful_life_years: 5,
    auto_generate_asset_numbers: true,
    asset_number_prefix: 'AST',
    require_serial_numbers: false,
    require_purchase_dates: true,
    
    // Depreciation Settings
    depreciation_calculation_frequency: 'monthly',
    auto_post_depreciation: false,
    depreciation_rounding: 2,
    allow_manual_depreciation: true,
    
    // Maintenance Settings
    auto_schedule_maintenance: false,
    maintenance_reminder_days: 30,
    require_maintenance_approval: false,
    track_maintenance_costs: true,
    
    // Location Settings
    require_location_assignment: false,
    allow_multiple_locations: false,
    track_location_history: true,
    
    // Disposal Settings
    require_disposal_approval: true,
    auto_calculate_disposal_gain_loss: true,
    disposal_approval_workflow: '',
    
    // Notification Settings
    notify_low_value_assets: false,
    low_value_threshold: 1000,
    notify_upcoming_maintenance: true,
    notify_disposal_requests: true,
    notify_depreciation_posted: false,
    
    // Integration Settings
    sync_with_accounting: false,
    accounting_integration: '',
    auto_create_journal_entries: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { getAssetSettings } = await import('@/services/api/settings-service');
      const data = await getAssetSettings();
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
      const { updateAssetSettings } = await import('@/services/api/settings-service');
      await updateAssetSettings(settings);
      toast({
        title: 'Success',
        description: 'Asset settings saved successfully',
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
          <h1 className="text-3xl font-bold">Asset Settings</h1>
          <p className="text-muted-foreground">Configure asset management preferences</p>
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
          <TabsTrigger value="depreciation">
            <TrendingDown className="w-4 h-4 mr-2" />
            Depreciation
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <Wrench className="w-4 h-4 mr-2" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="location">
            <MapPin className="w-4 h-4 mr-2" />
            Location
          </TabsTrigger>
          <TabsTrigger value="disposal">
            <AlertCircle className="w-4 h-4 mr-2" />
            Disposal
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <AlertCircle className="w-4 h-4 mr-2" />
            Notifications
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
              <CardTitle>General Asset Settings</CardTitle>
              <CardDescription>Basic asset management configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-generate Asset Numbers</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically generate unique asset numbers
                  </p>
                </div>
                <Switch
                  checked={settings.auto_generate_asset_numbers}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, auto_generate_asset_numbers: checked })
                  }
                />
              </div>
              {settings.auto_generate_asset_numbers && (
                <div>
                  <Label>Asset Number Prefix</Label>
                  <Input
                    value={settings.asset_number_prefix}
                    onChange={(e) =>
                      setSettings({ ...settings, asset_number_prefix: e.target.value })
                    }
                    placeholder="AST"
                  />
                </div>
              )}
              <div>
                <Label>Default Depreciation Method</Label>
                <Select
                  value={settings.default_depreciation_method}
                  onValueChange={(value) =>
                    setSettings({ ...settings, default_depreciation_method: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight_line">Straight Line</SelectItem>
                    <SelectItem value="declining_balance">Declining Balance</SelectItem>
                    <SelectItem value="units_of_production">Units of Production</SelectItem>
                    <SelectItem value="sum_of_years">Sum of Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Default Useful Life (Years)</Label>
                <Input
                  type="number"
                  value={settings.default_useful_life_years}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_useful_life_years: parseInt(e.target.value) || 5,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Serial Numbers</Label>
                  <p className="text-sm text-muted-foreground">
                    Make serial numbers mandatory for assets
                  </p>
                </div>
                <Switch
                  checked={settings.require_serial_numbers}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, require_serial_numbers: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Purchase Dates</Label>
                  <p className="text-sm text-muted-foreground">
                    Make purchase dates mandatory
                  </p>
                </div>
                <Switch
                  checked={settings.require_purchase_dates}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, require_purchase_dates: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Depreciation Settings */}
        <TabsContent value="depreciation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Depreciation Settings</CardTitle>
              <CardDescription>Configure depreciation calculation and posting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Depreciation Calculation Frequency</Label>
                <Select
                  value={settings.depreciation_calculation_frequency}
                  onValueChange={(value) =>
                    setSettings({ ...settings, depreciation_calculation_frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-post Depreciation</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically post depreciation entries
                  </p>
                </div>
                <Switch
                  checked={settings.auto_post_depreciation}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, auto_post_depreciation: checked })
                  }
                />
              </div>
              <div>
                <Label>Depreciation Rounding (Decimal Places)</Label>
                <Input
                  type="number"
                  min="0"
                  max="4"
                  value={settings.depreciation_rounding}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      depreciation_rounding: parseInt(e.target.value) || 2,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Manual Depreciation</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to manually adjust depreciation
                  </p>
                </div>
                <Switch
                  checked={settings.allow_manual_depreciation}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allow_manual_depreciation: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Settings */}
        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Settings</CardTitle>
              <CardDescription>Configure maintenance tracking and scheduling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-schedule Maintenance</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically schedule recurring maintenance
                  </p>
                </div>
                <Switch
                  checked={settings.auto_schedule_maintenance}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, auto_schedule_maintenance: checked })
                  }
                />
              </div>
              <div>
                <Label>Maintenance Reminder (Days Before)</Label>
                <Input
                  type="number"
                  value={settings.maintenance_reminder_days}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maintenance_reminder_days: parseInt(e.target.value) || 30,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Maintenance Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    Require approval for maintenance work
                  </p>
                </div>
                <Switch
                  checked={settings.require_maintenance_approval}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, require_maintenance_approval: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Track Maintenance Costs</Label>
                  <p className="text-sm text-muted-foreground">
                    Record and track maintenance expenses
                  </p>
                </div>
                <Switch
                  checked={settings.track_maintenance_costs}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, track_maintenance_costs: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location Settings */}
        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Location Settings</CardTitle>
              <CardDescription>Configure asset location tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Location Assignment</Label>
                  <p className="text-sm text-muted-foreground">
                    Make location assignment mandatory
                  </p>
                </div>
                <Switch
                  checked={settings.require_location_assignment}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, require_location_assignment: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Multiple Locations</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow assets to be in multiple locations
                  </p>
                </div>
                <Switch
                  checked={settings.allow_multiple_locations}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allow_multiple_locations: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Track Location History</Label>
                  <p className="text-sm text-muted-foreground">
                    Maintain history of location changes
                  </p>
                </div>
                <Switch
                  checked={settings.track_location_history}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, track_location_history: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disposal Settings */}
        <TabsContent value="disposal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Disposal Settings</CardTitle>
              <CardDescription>Configure asset disposal process</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Disposal Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    Require approval before disposing assets
                  </p>
                </div>
                <Switch
                  checked={settings.require_disposal_approval}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, require_disposal_approval: checked })
                  }
                />
              </div>
              {settings.require_disposal_approval && (
                <div>
                  <Label>Disposal Approval Workflow</Label>
                  <Select
                    value={settings.disposal_approval_workflow}
                    onValueChange={(value) =>
                      setSettings({ ...settings, disposal_approval_workflow: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select workflow" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="standard">Standard Approval</SelectItem>
                      <SelectItem value="manager">Manager Approval</SelectItem>
                      <SelectItem value="finance">Finance Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-calculate Gain/Loss</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically calculate disposal gain or loss
                  </p>
                </div>
                <Switch
                  checked={settings.auto_calculate_disposal_gain_loss}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, auto_calculate_disposal_gain_loss: checked })
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
              <CardDescription>Configure asset-related notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify Low Value Assets</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications for assets below threshold
                  </p>
                </div>
                <Switch
                  checked={settings.notify_low_value_assets}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_low_value_assets: checked })
                  }
                />
              </div>
              {settings.notify_low_value_assets && (
                <div>
                  <Label>Low Value Threshold</Label>
                  <Input
                    type="number"
                    value={settings.low_value_threshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        low_value_threshold: parseFloat(e.target.value) || 1000,
                      })
                    }
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify Upcoming Maintenance</Label>
                  <p className="text-sm text-muted-foreground">
                    Send reminders for scheduled maintenance
                  </p>
                </div>
                <Switch
                  checked={settings.notify_upcoming_maintenance}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_upcoming_maintenance: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify Disposal Requests</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when disposal requests are submitted
                  </p>
                </div>
                <Switch
                  checked={settings.notify_disposal_requests}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_disposal_requests: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify Depreciation Posted</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when depreciation entries are posted
                  </p>
                </div>
                <Switch
                  checked={settings.notify_depreciation_posted}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_depreciation_posted: checked })
                  }
                />
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
                  <Label>Sync with Accounting</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable synchronization with accounting system
                  </p>
                </div>
                <Switch
                  checked={settings.sync_with_accounting}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, sync_with_accounting: checked })
                  }
                />
              </div>
              {settings.sync_with_accounting && (
                <>
                  <div>
                    <Label>Accounting Integration</Label>
                    <Select
                      value={settings.accounting_integration}
                      onValueChange={(value) =>
                        setSettings({ ...settings, accounting_integration: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select integration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        <SelectItem value="quickbooks">QuickBooks</SelectItem>
                        <SelectItem value="xero">Xero</SelectItem>
                        <SelectItem value="sage">Sage</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-create Journal Entries</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically create journal entries for asset transactions
                      </p>
                    </div>
                    <Switch
                      checked={settings.auto_create_journal_entries}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, auto_create_journal_entries: checked })
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

