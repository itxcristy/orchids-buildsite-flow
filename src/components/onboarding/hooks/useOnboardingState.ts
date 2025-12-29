/**
 * Onboarding State Hook
 * Manages shared state across onboarding wizard steps
 */

import { useState, useCallback } from 'react';

export interface OnboardingFormData {
  // Step 1
  agencyName: string;
  domain: string;
  domainSuffix: string;
  
  // Step 2
  industry: string;
  companySize: string;
  primaryFocus: string;
  
  // Step 3
  address: string;
  phone: string;
  
  // Step 4
  businessGoals: string[];
  
  // Step 5 (handled separately)
  
  // Step 6
  subscriptionPlan: string;
  
  // Step 7
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
  
  // Other
  enableGST: boolean;
}

export interface SelectedPage {
  id: string;
  path: string;
  title: string;
  category: string;
  base_cost: number;
}

export function useOnboardingState() {
  const [formData, setFormData] = useState<OnboardingFormData>({
    agencyName: '',
    domain: '',
    domainSuffix: '.app',
    industry: '',
    companySize: '',
    primaryFocus: '',
    address: '',
    phone: '',
    businessGoals: [],
    subscriptionPlan: 'professional',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    enableGST: false,
  });

  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>([]);
  const [recommendations, setRecommendations] = useState<any>(null);

  const updateFormData = useCallback((updates: Partial<OnboardingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    formData,
    updateFormData,
    selectedPages,
    setSelectedPages,
    recommendations,
    setRecommendations
  };
}

