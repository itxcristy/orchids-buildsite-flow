import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Loader2, Sparkles, Globe, Plus } from 'lucide-react';
import { getApiBaseUrl } from '@/config/api';
import type { OnboardingFormData } from '../hooks/useOnboardingState';

interface StepWelcomeProps {
  formData: OnboardingFormData;
  updateFormData: (updates: Partial<OnboardingFormData>) => void;
  setCanProceed: (can: boolean) => void;
}

const DOMAIN_SUFFIXES = [
  { value: '.app', label: '.app' },
  { value: '.com', label: '.com' },
  { value: '.io', label: '.io' },
  { value: '.co', label: '.co' },
  { value: '.net', label: '.net' },
  { value: '.org', label: '.org' },
  { value: '.dev', label: '.dev' },
  { value: '.tech', label: '.tech' },
  { value: '.agency', label: '.agency' },
  { value: '.biz', label: '.biz' },
  { value: '.info', label: '.info' },
  { value: '.online', label: '.online' },
  { value: 'custom', label: 'Custom TLD' },
];

export default function StepWelcome({ formData, updateFormData, setCanProceed }: StepWelcomeProps) {
  const [domainAvailable, setDomainAvailable] = useState<boolean | null>(null);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [showCustomTld, setShowCustomTld] = useState(formData.domainSuffix?.startsWith('.') && !DOMAIN_SUFFIXES.find(s => s.value === formData.domainSuffix && s.value !== 'custom'));
  const [customTld, setCustomTld] = useState('');

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
      } catch {
        setDomainAvailable(null);
      } finally {
        setCheckingDomain(false);
      }
    };

    const timeout = setTimeout(checkDomain, 500);
    return () => clearTimeout(timeout);
  }, [formData.domain]);

  useEffect(() => {
    const hasValidName = formData.agencyName && formData.agencyName.trim().length >= 2;
    const hasValidDomain = formData.domain && formData.domain.length >= 3;
    const hasValidTld = showCustomTld ? customTld.length >= 2 : formData.domainSuffix && formData.domainSuffix !== 'custom';
    const isDomainAvailable = domainAvailable === true || domainAvailable === null;
    
    const canProceed = !!(hasValidName && hasValidDomain && hasValidTld && isDomainAvailable && !checkingDomain);
    setCanProceed(canProceed);
  }, [formData.agencyName, formData.domain, formData.domainSuffix, domainAvailable, checkingDomain, showCustomTld, customTld, setCanProceed]);

  const handleTldChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomTld(true);
      updateFormData({ domainSuffix: '' });
    } else {
      setShowCustomTld(false);
      setCustomTld('');
      updateFormData({ domainSuffix: value });
    }
  };

  const handleCustomTldChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z.]/g, '');
    const formatted = cleaned.startsWith('.') ? cleaned : `.${cleaned}`;
    setCustomTld(formatted);
    updateFormData({ domainSuffix: formatted });
  };

  const displaySuffix = showCustomTld ? (customTld || '.custom') : formData.domainSuffix;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3 animate-fade-in-up">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-2">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Let's name your agency
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Choose a name that represents your brand. You can always change this later.
        </p>
      </div>

      <div className="space-y-6 animate-fade-in-up delay-150">
        <div className="space-y-2">
          <Label htmlFor="agencyName" className="text-sm font-medium">
            Agency Name
          </Label>
          <div className="input-focus-ring rounded-lg">
            <Input
              id="agencyName"
              value={formData.agencyName}
              onChange={(e) => updateFormData({ agencyName: e.target.value })}
              placeholder="Acme Corporation"
              className="h-12 text-base border-2 focus:border-primary transition-colors"
              autoFocus
            />
          </div>
          {formData.agencyName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              Looking good!
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="domain" className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Workspace URL
          </Label>
          <div className="flex gap-2">
            <div className="flex-1 input-focus-ring rounded-lg">
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => updateFormData({ 
                  domain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                })}
                placeholder="acme-corp"
                className="h-12 text-base border-2 focus:border-primary transition-colors"
              />
            </div>
            {showCustomTld ? (
              <div className="input-focus-ring rounded-lg">
                <Input
                  value={customTld}
                  onChange={(e) => handleCustomTldChange(e.target.value)}
                  placeholder=".custom"
                  className="w-[120px] h-12 border-2 focus:border-primary transition-colors font-mono"
                />
              </div>
            ) : (
              <Select
                value={formData.domainSuffix}
                onValueChange={handleTldChange}
              >
                <SelectTrigger className="w-[120px] h-12 border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {DOMAIN_SUFFIXES.map(suffix => (
                    <SelectItem key={suffix.value} value={suffix.value}>
                      {suffix.value === 'custom' ? (
                        <span className="flex items-center gap-1.5">
                          <Plus className="h-3 w-3" />
                          {suffix.label}
                        </span>
                      ) : (
                        suffix.label
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {showCustomTld && (
            <button
              type="button"
              onClick={() => {
                setShowCustomTld(false);
                setCustomTld('');
                updateFormData({ domainSuffix: '.app' });
              }}
              className="text-xs text-primary hover:underline"
            >
              ← Back to standard TLDs
            </button>
          )}

          {formData.domain && (
            <div className="flex items-center gap-2 text-sm mt-2">
              {checkingDomain ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Checking availability...</span>
                </>
              ) : domainAvailable === true ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-success font-medium">Available!</span>
                </>
              ) : domainAvailable === false ? (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">Already taken. Try another.</span>
                </>
              ) : null}
            </div>
          )}

          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
              Your workspace will be available at:
            </p>
            <p className="text-sm font-medium text-foreground mt-1 font-mono">
              {formData.domain || 'your-agency'}{displaySuffix}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
