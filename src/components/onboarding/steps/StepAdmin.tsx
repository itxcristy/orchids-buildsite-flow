import { useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff, Check, X, Mail, User } from 'lucide-react';
import type { OnboardingFormData } from '../hooks/useOnboardingState';

interface StepAdminProps {
  formData: OnboardingFormData;
  updateFormData: (updates: Partial<OnboardingFormData>) => void;
  setCanProceed: (can: boolean) => void;
}

export default function StepAdmin({ formData, updateFormData, setCanProceed }: StepAdminProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({
    adminName: false,
    adminEmail: false,
    adminPassword: false,
    confirmPassword: false,
  });

  const validation = useMemo(() => {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail);
    const passwordLength = formData.adminPassword.length >= 8;
    const passwordHasNumber = /\d/.test(formData.adminPassword);
    const passwordHasLetter = /[a-zA-Z]/.test(formData.adminPassword);
    const passwordsMatch = formData.adminPassword === formData.confirmPassword && formData.confirmPassword.length > 0;

    return {
      name: formData.adminName.trim().length >= 2,
      email: emailValid,
      passwordLength,
      passwordHasNumber,
      passwordHasLetter,
      passwordValid: passwordLength && passwordHasNumber && passwordHasLetter,
      passwordsMatch,
    };
  }, [formData.adminName, formData.adminEmail, formData.adminPassword, formData.confirmPassword]);

  useEffect(() => {
    const canProceed = !!(
      validation.name &&
      validation.email &&
      validation.passwordValid &&
      validation.passwordsMatch
    );
    setCanProceed(canProceed);
  }, [validation, setCanProceed]);

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const PasswordCheck = ({ valid, label }: { valid: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-xs ${valid ? 'text-success' : 'text-muted-foreground'}`}>
      {valid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{label}</span>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3 animate-fade-in-up">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-2">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Create your admin account
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          This will be the primary Super Admin account with full system access.
        </p>
      </div>

      <div className="space-y-5 animate-fade-in-up delay-150">
        <div className="space-y-2">
          <Label htmlFor="adminName" className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Full Name
          </Label>
          <div className="input-focus-ring rounded-lg">
            <Input
              id="adminName"
              value={formData.adminName}
              onChange={(e) => updateFormData({ adminName: e.target.value })}
              onBlur={() => handleBlur('adminName')}
              placeholder="John Smith"
              className="h-12 text-base border-2 focus:border-primary transition-colors"
              autoComplete="name"
            />
          </div>
          {touched.adminName && !validation.name && (
            <p className="text-xs text-destructive">Please enter your full name</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminEmail" className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email Address
          </Label>
          <div className="input-focus-ring rounded-lg">
            <Input
              id="adminEmail"
              type="email"
              value={formData.adminEmail}
              onChange={(e) => updateFormData({ adminEmail: e.target.value })}
              onBlur={() => handleBlur('adminEmail')}
              placeholder="john@company.com"
              className="h-12 text-base border-2 focus:border-primary transition-colors"
              autoComplete="email"
            />
          </div>
          {touched.adminEmail && !validation.email && formData.adminEmail && (
            <p className="text-xs text-destructive">Please enter a valid email address</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminPassword" className="text-sm font-medium">
            Password
          </Label>
          <div className="relative input-focus-ring rounded-lg">
            <Input
              id="adminPassword"
              type={showPassword ? 'text' : 'password'}
              value={formData.adminPassword}
              onChange={(e) => updateFormData({ adminPassword: e.target.value })}
              onBlur={() => handleBlur('adminPassword')}
              placeholder="Create a strong password"
              className="h-12 text-base border-2 focus:border-primary transition-colors pr-12"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          
          {formData.adminPassword && (
            <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Password requirements:</p>
              <PasswordCheck valid={validation.passwordLength} label="At least 8 characters" />
              <PasswordCheck valid={validation.passwordHasLetter} label="Contains a letter" />
              <PasswordCheck valid={validation.passwordHasNumber} label="Contains a number" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </Label>
          <div className="relative input-focus-ring rounded-lg">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => updateFormData({ confirmPassword: e.target.value })}
              onBlur={() => handleBlur('confirmPassword')}
              placeholder="Confirm your password"
              className="h-12 text-base border-2 focus:border-primary transition-colors pr-12"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {touched.confirmPassword && formData.confirmPassword && !validation.passwordsMatch && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <X className="h-3 w-3" />
              Passwords do not match
            </p>
          )}
          {validation.passwordsMatch && (
            <p className="text-xs text-success flex items-center gap-1">
              <Check className="h-3 w-3" />
              Passwords match
            </p>
          )}
        </div>

        <div className="p-4 rounded-lg bg-muted/30 border border-border mt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Super Admin Privileges</p>
              <p className="text-xs text-muted-foreground mt-1">
                As the Super Admin, you'll have complete control over your agency including user management, 
                billing, and system configuration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
