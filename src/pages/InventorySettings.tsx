/**
 * Inventory Settings Page
 * Configure inventory module settings and preferences
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
  Package,
  AlertTriangle,
  DollarSign,
  Warehouse,
  RefreshCw,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { getWarehouses, type Warehouse as WarehouseType } from '@/services/api/inventory-service';

interface InventorySettings {
  // Valuation
  default_valuation_method: 'FIFO' | 'LIFO' | 'weighted_average';
  
  // Reorder Settings
  auto_reorder_enabled: boolean;
  low_stock_alert_enabled: boolean;
  low_stock_threshold_percentage: number;
  
  // Defaults
  default_unit_of_measure: string;
  default_warehouse_id?: string;
  
  // Tracking
  enable_serial_tracking: boolean;
  enable_batch_tracking: boolean;
  require_serial_on_sale: boolean;
  
  // Costing
  auto_calculate_cost: boolean;
  include_shipping_in_cost: boolean;
  
  // Notifications
  notify_on_low_stock: boolean;
  notify_on_reorder: boolean;
  notify_on_stock_adjustment: boolean;
}

export default function InventorySettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [settings, setSettings] = useState<InventorySettings>({
    default_valuation_method: 'weighted_average',
    auto_reorder_enabled: false,
    low_stock_alert_enabled: true,
    low_stock_threshold_percentage: 20,
    default_unit_of_measure: 'pcs',
    enable_serial_tracking: false,
    enable_batch_tracking: false,
    require_serial_on_sale: false,
    auto_calculate_cost: true,
    include_shipping_in_cost: false,
    notify_on_low_stock: true,
    notify_on_reorder: true,
    notify_on_stock_adjustment: false,
  });

  useEffect(() => {
    loadSettings();
    loadWarehouses();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { getInventorySettings } = await import('@/services/api/settings-service');
      const data = await getInventorySettings();
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

  const loadWarehouses = async () => {
    try {
      const data = await getWarehouses();
      setWarehouses(data || []);
    } catch (error: any) {
      logError('Failed to load warehouses:', error);
      // Don't show toast for warehouses as it's not critical
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { updateInventorySettings } = await import('@/services/api/settings-service');
      await updateInventorySettings(settings);
      toast({
        title: 'Success',
        description: 'Settings saved successfully',
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
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Settings</h1>
          <p className="text-muted-foreground">Configure inventory module preferences and defaults</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Valuation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Valuation Settings
            </CardTitle>
            <CardDescription>Configure how inventory costs are calculated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Valuation Method</Label>
              <Select
                value={settings.default_valuation_method}
                onValueChange={(value) =>
                  setSettings({ ...settings, default_valuation_method: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIFO">FIFO (First In, First Out)</SelectItem>
                  <SelectItem value="LIFO">LIFO (Last In, First Out)</SelectItem>
                  <SelectItem value="weighted_average">Weighted Average</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Calculate Cost</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically calculate product costs from purchase orders
                </p>
              </div>
              <Switch
                checked={settings.auto_calculate_cost}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_calculate_cost: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Shipping in Cost</Label>
                <p className="text-sm text-muted-foreground">
                  Include shipping costs when calculating product costs
                </p>
              </div>
              <Switch
                checked={settings.include_shipping_in_cost}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, include_shipping_in_cost: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Reorder Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Reorder Settings
            </CardTitle>
            <CardDescription>Configure automatic reordering and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Reorder Enabled</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create purchase orders when stock is low
                </p>
              </div>
              <Switch
                checked={settings.auto_reorder_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_reorder_enabled: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Enable alerts when stock falls below reorder point
                </p>
              </div>
              <Switch
                checked={settings.low_stock_alert_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, low_stock_alert_enabled: checked })
                }
              />
            </div>
            <div>
              <Label>Low Stock Threshold (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.low_stock_threshold_percentage}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    low_stock_threshold_percentage: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-sm text-muted-foreground mt-1">
                Alert when stock is below this percentage of reorder point
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Default Settings
            </CardTitle>
            <CardDescription>Set default values for new products</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Unit of Measure</Label>
              <Select
                value={settings.default_unit_of_measure}
                onValueChange={(value) =>
                  setSettings({ ...settings, default_unit_of_measure: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="g">Grams (g)</SelectItem>
                  <SelectItem value="l">Liters (l)</SelectItem>
                  <SelectItem value="ml">Milliliters (ml)</SelectItem>
                  <SelectItem value="m">Meters (m)</SelectItem>
                  <SelectItem value="cm">Centimeters (cm)</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                  <SelectItem value="pack">Pack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Warehouse (Optional)</Label>
              <Select
                value={settings.default_warehouse_id || ''}
                onValueChange={(value) =>
                  setSettings({ ...settings, default_warehouse_id: value || undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No default warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No default warehouse</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} {warehouse.is_primary && '(Primary)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tracking Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="w-5 h-5" />
              Tracking Settings
            </CardTitle>
            <CardDescription>Configure serial number and batch tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Serial Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Allow tracking products by serial number
                </p>
              </div>
              <Switch
                checked={settings.enable_serial_tracking}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enable_serial_tracking: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Batch Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Allow tracking products by batch/lot number
                </p>
              </div>
              <Switch
                checked={settings.enable_batch_tracking}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enable_batch_tracking: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Serial on Sale</Label>
                <p className="text-sm text-muted-foreground">
                  Require serial number when selling tracked products
                </p>
              </div>
              <Switch
                checked={settings.require_serial_on_sale}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, require_serial_on_sale: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>Configure when to receive notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Low Stock Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when stock is low
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_low_stock}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_low_stock: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Reorder Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when reorder is triggered
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_reorder}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_reorder: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Stock Adjustment Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify on stock adjustments
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_stock_adjustment}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_stock_adjustment: checked })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

