import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info } from 'lucide-react';
import { GSTSettings } from '@/hooks/useGST';

interface GSTSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSettings?: GSTSettings | null;
  onSave: (settings: Omit<GSTSettings, 'id'>) => Promise<void>;
  loading?: boolean;
}

export const GSTSettingsDialog: React.FC<GSTSettingsDialogProps> = ({
  open,
  onOpenChange,
  existingSettings,
  onSave,
  loading = false
}) => {
  const [formData, setFormData] = useState<Omit<GSTSettings, 'id'>>({
    gstin: '',
    legal_name: '',
    trade_name: '',
    business_type: 'regular',
    filing_frequency: 'monthly',
    composition_scheme: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingSettings) {
      setFormData({
        gstin: existingSettings.gstin || '',
        legal_name: existingSettings.legal_name || '',
        trade_name: existingSettings.trade_name || '',
        business_type: existingSettings.business_type || 'regular',
        filing_frequency: existingSettings.filing_frequency || 'monthly',
        composition_scheme: existingSettings.composition_scheme || false
      });
    }
  }, [existingSettings]);

  const validateGSTIN = (gstin: string): boolean => {
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinPattern.test(gstin);
  };

  const handleSave = async () => {
    if (!validateGSTIN(formData.gstin)) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save GST settings:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingSettings ? 'Update GST Settings' : 'Configure GST Settings'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Configure your GST registration details for compliance and return filing.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN *</Label>
              <Input
                id="gstin"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                className={!validateGSTIN(formData.gstin) && formData.gstin ? 'border-destructive' : ''}
              />
              {!validateGSTIN(formData.gstin) && formData.gstin && (
                <p className="text-sm text-destructive">Please enter a valid GSTIN</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="legal_name">Legal Name *</Label>
              <Input
                id="legal_name"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                placeholder="Enter legal business name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trade_name">Trade Name</Label>
              <Input
                id="trade_name"
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                placeholder="Enter trade name (if different)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_type">Business Type</Label>
              <Select
                value={formData.business_type}
                onValueChange={(value: GSTSettings['business_type']) => 
                  setFormData({ ...formData, business_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="composition">Composition</SelectItem>
                  <SelectItem value="casual">Casual Taxable Person</SelectItem>
                  <SelectItem value="non_resident">Non-Resident</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filing_frequency">Filing Frequency</Label>
              <Select
                value={formData.filing_frequency}
                onValueChange={(value: GSTSettings['filing_frequency']) => 
                  setFormData({ ...formData, filing_frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="composition_scheme"
                checked={formData.composition_scheme}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, composition_scheme: checked })
                }
              />
              <Label htmlFor="composition_scheme">Composition Scheme</Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.gstin || !formData.legal_name || !validateGSTIN(formData.gstin) || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};