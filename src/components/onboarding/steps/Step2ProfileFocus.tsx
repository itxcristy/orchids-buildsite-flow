/**
 * Step 2: Profile & Focus
 * Industry, company size, and primary focus
 */

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target } from 'lucide-react';
import type { OnboardingFormData } from '../hooks/useOnboardingState';

interface Step2Props {
  formData: OnboardingFormData;
  updateFormData: (updates: Partial<OnboardingFormData>) => void;
  onNext: () => void;
}

const INDUSTRIES = [
  'Construction',
  'Architecture',
  'Engineering',
  'Real Estate',
  'Consulting',
  'Manufacturing',
  'Technology',
  'Other'
];

const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '500+'
];

const PRIMARY_FOCUS_OPTIONS = [
  'Project Management',
  'Client Relations',
  'Financial Management',
  'HR & Operations',
  'Sales & Marketing',
  'Inventory & Procurement',
  'Asset Management',
  'Compliance & Reporting'
];

export default function Step2ProfileFocus({ formData, updateFormData, onNext }: Step2Props) {
  const canProceed = formData.industry && formData.companySize && formData.primaryFocus;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Profile & Focus</h2>
        <p className="text-muted-foreground">
          Tell us what kind of work your agency does. We use this to preconfigure defaults and recommend features.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="industry">Industry *</Label>
          <Select
            value={formData.industry}
            onValueChange={(value) => updateFormData({ industry: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map(industry => (
                <SelectItem key={industry} value={industry.toLowerCase().replace(/\s+/g, '-')}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="companySize">Company Size *</Label>
          <Select
            value={formData.companySize}
            onValueChange={(value) => updateFormData({ companySize: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select company size" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map(size => (
                <SelectItem key={size} value={size}>
                  {size} employees
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="primaryFocus">Primary Focus *</Label>
          <Select
            value={formData.primaryFocus}
            onValueChange={(value) => updateFormData({ primaryFocus: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select primary focus" />
            </SelectTrigger>
            <SelectContent>
              {PRIMARY_FOCUS_OPTIONS.map(focus => (
                <SelectItem key={focus} value={focus.toLowerCase().replace(/\s+/g, '_')}>
                  {focus}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {canProceed && (
        <div className="pt-4">
          <button
            onClick={onNext}
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

