import { useEffect } from 'react';
import { Rocket, Building2, User, Mail, Globe, Briefcase, Users, Check, Shield } from 'lucide-react';
import type { OnboardingFormData, SelectedPage } from '../hooks/useOnboardingState';

interface StepLaunchProps {
  formData: OnboardingFormData;
  selectedPages: SelectedPage[];
  onSubmit: () => void;
  isLoading: boolean;
  setCanProceed: (can: boolean) => void;
}

const INDUSTRY_LABELS: Record<string, string> = {
  technology: 'Technology',
  finance: 'Finance & Banking',
  healthcare: 'Healthcare',
  education: 'Education',
  retail: 'Retail & E-commerce',
  manufacturing: 'Manufacturing',
  consulting: 'Consulting',
  real_estate: 'Real Estate',
  legal: 'Legal Services',
  marketing: 'Marketing & Advertising',
  construction: 'Construction',
  hospitality: 'Hospitality',
  logistics: 'Logistics & Transport',
  other: 'Other',
};

export default function StepLaunch({ formData, setCanProceed }: StepLaunchProps) {
  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  const ReviewItem = ({ 
    icon: Icon, 
    label, 
    value, 
    highlight = false 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: string; 
    highlight?: boolean;
  }) => (
    <div className={`
      flex items-center gap-4 p-4 rounded-lg border transition-all
      ${highlight 
        ? 'border-primary/30 bg-primary/5' 
        : 'border-border bg-card'
      }
    `}>
      <div className={`
        h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0
        ${highlight ? 'bg-primary/10' : 'bg-muted'}
      `}>
        <Icon className={`h-5 w-5 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
      <Check className="h-4 w-4 text-success flex-shrink-0" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3 animate-fade-in-up">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-success/10 mb-2">
          <Rocket className="h-8 w-8 text-success" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Ready for launch
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Review your details below. Once you launch, your agency workspace will be created instantly.
        </p>
      </div>

      <div className="space-y-3 animate-fade-in-up delay-150">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Agency Details</h3>
        </div>
        
        <ReviewItem 
          icon={Building2} 
          label="Agency Name" 
          value={formData.agencyName}
          highlight 
        />
        <ReviewItem 
          icon={Globe} 
          label="Workspace URL" 
          value={`${formData.domain}${formData.domainSuffix}`}
          highlight
        />
        <ReviewItem 
          icon={Briefcase} 
          label="Industry" 
          value={INDUSTRY_LABELS[formData.industry] || formData.industry || 'Not specified'}
        />
        <ReviewItem 
          icon={Users} 
          label="Team Size" 
          value={formData.companySize ? `${formData.companySize} employees` : 'Not specified'}
        />
      </div>

      <div className="space-y-3 animate-fade-in-up delay-200">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Admin Account</h3>
        </div>
        
        <ReviewItem 
          icon={User} 
          label="Admin Name" 
          value={formData.adminName}
        />
        <ReviewItem 
          icon={Mail} 
          label="Admin Email" 
          value={formData.adminEmail}
        />
      </div>

      <div className="animate-fade-in-up delay-300">
        <div className="p-5 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">What happens next?</h4>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Your dedicated database will be created
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  All core modules will be configured
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  You'll be signed in as Super Admin
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Ready to customize and add your team
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-2 animate-fade-in-up delay-400">
        <p className="text-xs text-muted-foreground">
          By launching, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
