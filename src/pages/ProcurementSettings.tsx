/**
 * Procurement Settings Page
 * Configure procurement module settings and preferences
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
  ShoppingCart,
  AlertTriangle,
  DollarSign,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProcurementSettings {
  // Approval Settings
  require_approval_for_po: boolean;
  require_approval_for_requisition: boolean;
  auto_approve_below_amount: number;
  
  // Defaults
  default_currency: string;
  default_payment_terms: string;
  default_delivery_terms: string;
  
  // Workflow
  auto_create_po_from_requisition: boolean;
  auto_receive_goods: boolean;
  
  // Notifications
  notify_on_po_created: boolean;
  notify_on_po_approved: boolean;
  notify_on_po_received: boolean;
  notify_on_requisition_created: boolean;
  notify_on_requisition_approved: boolean;
  
  // RFQ Settings
  enable_rfq: boolean;
  rfq_validity_days: number;
  require_multiple_quotes: boolean;
}

export default function ProcurementSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ProcurementSettings>({
    require_approval_for_po: true,
    require_approval_for_requisition: true,
    auto_approve_below_amount: 10000,
    default_currency: 'INR',
    default_payment_terms: 'Net 30',
    default_delivery_terms: 'FOB',
    auto_create_po_from_requisition: false,
    auto_receive_goods: false,
    notify_on_po_created: true,
    notify_on_po_approved: true,
    notify_on_po_received: true,
    notify_on_requisition_created: true,
    notify_on_requisition_approved: true,
    enable_rfq: true,
    rfq_validity_days: 30,
    require_multiple_quotes: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { getProcurementSettings } = await import('@/services/api/settings-service');
      const data = await getProcurementSettings();
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
      const { updateProcurementSettings } = await import('@/services/api/settings-service');
      await updateProcurementSettings(settings);
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
          <h1 className="text-3xl font-bold">Procurement Settings</h1>
          <p className="text-muted-foreground">Configure procurement module preferences and defaults</p>
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
        {/* Approval Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Approval Settings
            </CardTitle>
            <CardDescription>Configure approval requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Approval for PO</Label>
                <p className="text-sm text-muted-foreground">
                  Require approval before creating purchase orders
                </p>
              </div>
              <Switch
                checked={settings.require_approval_for_po}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, require_approval_for_po: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Approval for Requisition</Label>
                <p className="text-sm text-muted-foreground">
                  Require approval before creating purchase requisitions
                </p>
              </div>
              <Switch
                checked={settings.require_approval_for_requisition}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, require_approval_for_requisition: checked })
                }
              />
            </div>
            <div>
              <Label>Auto Approve Below Amount</Label>
              <Input
                type="number"
                min="0"
                value={settings.auto_approve_below_amount}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    auto_approve_below_amount: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <p className="text-sm text-muted-foreground mt-1">
                Automatically approve orders below this amount
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Default Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Default Settings
            </CardTitle>
            <CardDescription>Set default values for new orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Currency</Label>
              <Select
                value={settings.default_currency}
                onValueChange={(value) =>
                  setSettings({ ...settings, default_currency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Payment Terms</Label>
              <Select
                value={settings.default_payment_terms}
                onValueChange={(value) =>
                  setSettings({ ...settings, default_payment_terms: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 45">Net 45</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                  <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Delivery Terms</Label>
              <Select
                value={settings.default_delivery_terms}
                onValueChange={(value) =>
                  setSettings({ ...settings, default_delivery_terms: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOB">FOB - Free On Board</SelectItem>
                  <SelectItem value="CIF">CIF - Cost, Insurance & Freight</SelectItem>
                  <SelectItem value="EXW">EXW - Ex Works</SelectItem>
                  <SelectItem value="DDP">DDP - Delivered Duty Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Workflow Settings
            </CardTitle>
            <CardDescription>Automate procurement processes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Create PO from Requisition</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create purchase orders from approved requisitions
                </p>
              </div>
              <Switch
                checked={settings.auto_create_po_from_requisition}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_create_po_from_requisition: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Receive Goods</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically receive goods when PO is marked as delivered
                </p>
              </div>
              <Switch
                checked={settings.auto_receive_goods}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_receive_goods: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* RFQ Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              RFQ Settings
            </CardTitle>
            <CardDescription>Configure Request for Quotation settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable RFQ</Label>
                <p className="text-sm text-muted-foreground">
                  Enable Request for Quotation functionality
                </p>
              </div>
              <Switch
                checked={settings.enable_rfq}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enable_rfq: checked })
                }
              />
            </div>
            <div>
              <Label>RFQ Validity (Days)</Label>
              <Input
                type="number"
                min="1"
                value={settings.rfq_validity_days}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rfq_validity_days: parseInt(e.target.value) || 30,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Multiple Quotes</Label>
                <p className="text-sm text-muted-foreground">
                  Require quotes from multiple suppliers
                </p>
              </div>
              <Switch
                checked={settings.require_multiple_quotes}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, require_multiple_quotes: checked })
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
                  <Label>PO Created</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when PO is created
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_po_created}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_po_created: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>PO Approved</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when PO is approved
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_po_approved}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_po_approved: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>PO Received</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when goods are received
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_po_received}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_po_received: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Requisition Created</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when requisition is created
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_requisition_created}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_requisition_created: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Requisition Approved</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when requisition is approved
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_requisition_approved}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notify_on_requisition_approved: checked })
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

