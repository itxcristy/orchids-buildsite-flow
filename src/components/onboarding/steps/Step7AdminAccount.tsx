/**
 * Step 7: Admin Account
 * Create the primary administrator account
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { OnboardingFormData } from '../hooks/useOnboardingState';

interface Step7Props {
  formData: OnboardingFormData;
  updateFormData: (updates: Partial<OnboardingFormData>) => void;
  onNext: () => void;
}

export default function Step7AdminAccount({ formData, updateFormData, onNext }: Step7Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const passwordsMatch = formData.adminPassword === formData.confirmPassword;
  const canProceed =
    formData.adminName &&
    formData.adminEmail &&
    validateEmail(formData.adminEmail) &&
    formData.adminPassword &&
    validatePassword(formData.adminPassword) &&
    passwordsMatch;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Administrative Access</h2>
        <p className="text-muted-foreground">
          Create your primary administrator account. This account will have full system access.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="adminName">Full Name *</Label>
          <Input
            id="adminName"
            value={formData.adminName}
            onChange={(e) => updateFormData({ adminName: e.target.value })}
            placeholder="John Doe"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="adminEmail">Email Address *</Label>
          <Input
            id="adminEmail"
            type="email"
            value={formData.adminEmail}
            onChange={(e) => updateFormData({ adminEmail: e.target.value })}
            placeholder="admin@yourcompany.com"
            className="mt-1"
          />
          {formData.adminEmail && !validateEmail(formData.adminEmail) && (
            <p className="text-sm text-red-500 mt-1">Please enter a valid email address</p>
          )}
        </div>

        <div>
          <Label htmlFor="adminPassword">Password *</Label>
          <div className="relative mt-1">
            <Input
              id="adminPassword"
              type={showPassword ? 'text' : 'password'}
              value={formData.adminPassword}
              onChange={(e) => updateFormData({ adminPassword: e.target.value })}
              placeholder="Minimum 8 characters"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {formData.adminPassword && !validatePassword(formData.adminPassword) && (
            <p className="text-sm text-red-500 mt-1">Password must be at least 8 characters</p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm Password *</Label>
          <div className="relative mt-1">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => updateFormData({ confirmPassword: e.target.value })}
              placeholder="Confirm your password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {formData.confirmPassword && !passwordsMatch && (
            <p className="text-sm text-red-500 mt-1">Passwords do not match</p>
          )}
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

