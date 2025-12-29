/**
 * Step 1: Agency Essentials
 * Basic agency information and domain selection
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Globe, CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/config/api';
import type { OnboardingFormData } from '../hooks/useOnboardingState';

interface Step1Props {
  formData: OnboardingFormData;
  updateFormData: (updates: Partial<OnboardingFormData>) => void;
  onNext: () => void;
}

const DOMAIN_SUFFIXES = [
  { value: '.app', label: '.app' },
  { value: '.com', label: '.com' },
  { value: '.io', label: '.io' },
  { value: '.net', label: '.net' },
  { value: '.org', label: '.org' },
];

export default function Step1AgencyEssentials({ formData, updateFormData, onNext }: Step1Props) {
  const [domainAvailable, setDomainAvailable] = useState<boolean | null>(null);
  const [checkingDomain, setCheckingDomain] = useState(false);

  useEffect(() => {
    if (!formData.domain || formData.domain.length < 3) {
      setDomainAvailable(null);
      return;
    }

    const checkDomain = async () => {
      setCheckingDomain(true);
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/api/agencies/check-domain?domain=${encodeURIComponent(formData.domain)}`
        );
        const data = await response.json();
        setDomainAvailable(data.available === true);
      } catch (error) {
        setDomainAvailable(null);
      } finally {
        setCheckingDomain(false);
      }
    };

    const timeout = setTimeout(checkDomain, 500);
    return () => clearTimeout(timeout);
  }, [formData.domain]);

  const canProceed = formData.agencyName && formData.domain && domainAvailable === true;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Agency Essentials</h2>
        <p className="text-muted-foreground">
          Start with the basics. You can fine-tune details later inside your workspace.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="agencyName">Agency Name *</Label>
          <Input
            id="agencyName"
            value={formData.agencyName}
            onChange={(e) => updateFormData({ agencyName: e.target.value })}
            placeholder="Your Company Name"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="domain">Workspace Domain *</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="domain"
              value={formData.domain}
              onChange={(e) => updateFormData({ domain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              placeholder="your-company"
              className="flex-1"
            />
            <Select
              value={formData.domainSuffix}
              onValueChange={(value) => updateFormData({ domainSuffix: value })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOMAIN_SUFFIXES.map(suffix => (
                  <SelectItem key={suffix.value} value={suffix.value}>
                    {suffix.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {formData.domain && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              {checkingDomain ? (
                <span className="text-muted-foreground">Checking availability...</span>
              ) : domainAvailable === true ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Domain available!</span>
                </>
              ) : domainAvailable === false ? (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">Domain already taken</span>
                </>
              ) : null}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Your workspace will be accessible at: {formData.domain || 'your-company'}{formData.domainSuffix}
          </p>
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

