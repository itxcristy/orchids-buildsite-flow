import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Users, Target } from 'lucide-react';
import type { OnboardingFormData } from '../hooks/useOnboardingState';

interface StepBusinessProps {
  formData: OnboardingFormData;
  updateFormData: (updates: Partial<OnboardingFormData>) => void;
  setCanProceed: (can: boolean) => void;
}

const INDUSTRIES = [
  { value: 'technology', label: 'Technology', icon: '💻' },
  { value: 'finance', label: 'Finance & Banking', icon: '💰' },
  { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'retail', label: 'Retail & E-commerce', icon: '🛍️' },
  { value: 'manufacturing', label: 'Manufacturing', icon: '🏭' },
  { value: 'consulting', label: 'Consulting', icon: '📊' },
  { value: 'real_estate', label: 'Real Estate', icon: '🏢' },
  { value: 'legal', label: 'Legal Services', icon: '⚖️' },
  { value: 'marketing', label: 'Marketing & Advertising', icon: '📣' },
  { value: 'construction', label: 'Construction', icon: '🔨' },
  { value: 'hospitality', label: 'Hospitality', icon: '🏨' },
  { value: 'logistics', label: 'Logistics & Transport', icon: '🚚' },
  { value: 'other', label: 'Other', icon: '🌐' },
];

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees', description: 'Startup / Small Team' },
  { value: '11-50', label: '11-50 employees', description: 'Growing Business' },
  { value: '51-200', label: '51-200 employees', description: 'Medium Enterprise' },
  { value: '201-500', label: '201-500 employees', description: 'Large Enterprise' },
  { value: '500+', label: '500+ employees', description: 'Corporate' },
];

const PRIMARY_FOCUS = [
  { value: 'finance', label: 'Finance & Accounting', description: 'Invoices, expenses, payroll' },
  { value: 'projects', label: 'Project Management', description: 'Tasks, timelines, collaboration' },
  { value: 'hr', label: 'Human Resources', description: 'Employees, attendance, leave' },
  { value: 'crm', label: 'Customer Relations', description: 'Clients, leads, pipeline' },
  { value: 'operations', label: 'Operations', description: 'Inventory, procurement, assets' },
  { value: 'all', label: 'All of the Above', description: 'Full ERP capabilities' },
];

export default function StepBusiness({ formData, updateFormData, setCanProceed }: StepBusinessProps) {
  useEffect(() => {
    const canProceed = !!(formData.industry && formData.companySize);
    setCanProceed(canProceed);
  }, [formData.industry, formData.companySize, setCanProceed]);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3 animate-fade-in-up">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-2">
          <Briefcase className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Tell us about your business
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          This helps us customize your workspace and suggest the right tools.
        </p>
      </div>

      <div className="space-y-6 animate-fade-in-up delay-150">
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Industry
          </Label>
          <Select
            value={formData.industry}
            onValueChange={(value) => updateFormData({ industry: value })}
          >
            <SelectTrigger className="h-12 border-2 text-base">
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent className="max-h-[280px]">
              {INDUSTRIES.map(industry => (
                <SelectItem key={industry.value} value={industry.value} className="py-3">
                  <span className="flex items-center gap-2">
                    <span>{industry.icon}</span>
                    <span>{industry.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Team Size
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COMPANY_SIZES.map((size) => (
              <button
                key={size.value}
                type="button"
                onClick={() => updateFormData({ companySize: size.value })}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all duration-200
                  ${formData.companySize === size.value
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
              >
                <p className="font-medium text-sm">{size.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{size.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Primary Focus <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <p className="text-xs text-muted-foreground -mt-1">
            What will you use this platform for most?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRIMARY_FOCUS.map((focus) => (
              <button
                key={focus.value}
                type="button"
                onClick={() => updateFormData({ primaryFocus: focus.value })}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all duration-200
                  ${formData.primaryFocus === focus.value
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
              >
                <p className="font-medium text-sm">{focus.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{focus.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
