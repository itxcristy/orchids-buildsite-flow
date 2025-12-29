/**
 * Step 3: Contact Details
 * Address and phone information
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { MapPin, Phone } from 'lucide-react';
import type { OnboardingFormData } from '../hooks/useOnboardingState';

interface Step3Props {
  formData: OnboardingFormData;
  updateFormData: (updates: Partial<OnboardingFormData>) => void;
  onNext: () => void;
}

export default function Step3ContactDetails({ formData, updateFormData, onNext }: Step3Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Contact Details</h2>
        <p className="text-muted-foreground">
          Add where you operate and how clients can reach you. These details appear on documents and invoices.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => updateFormData({ address: e.target.value })}
            placeholder="Street address, city, state, zip code"
            className="mt-1"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => updateFormData({ phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
            className="mt-1"
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label htmlFor="enableGST" className="text-base font-medium">
              Enable GST/Tax Management
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable GST compliance features for your region
            </p>
          </div>
          <Switch
            id="enableGST"
            checked={formData.enableGST}
            onCheckedChange={(checked) => updateFormData({ enableGST: checked })}
          />
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={onNext}
          className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

