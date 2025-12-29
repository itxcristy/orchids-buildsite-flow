import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getApiBaseUrl } from '@/config/api';
import { Building2, Briefcase, Shield, Rocket, Check, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useOnboardingState } from './hooks/useOnboardingState';
import { logError } from '@/utils/consoleLogger';

import StepWelcome from './steps/StepWelcome';
import StepBusiness from './steps/StepBusiness';
import StepAdmin from './steps/StepAdmin';
import StepLaunch from './steps/StepLaunch';

const STEPS = [
  { 
    id: 1, 
    key: 'welcome',
    title: 'Agency Identity', 
    subtitle: 'Name your workspace',
    icon: Building2,
  },
  { 
    id: 2, 
    key: 'business',
    title: 'Business Profile', 
    subtitle: 'Tell us about you',
    icon: Briefcase,
  },
  { 
    id: 3, 
    key: 'admin',
    title: 'Your Account', 
    subtitle: 'Secure access',
    icon: Shield,
  },
  { 
    id: 4, 
    key: 'launch',
    title: 'Launch', 
    subtitle: 'Go live',
    icon: Rocket,
  },
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');
  const [canProceed, setCanProceed] = useState(false);

  const {
    formData,
    updateFormData,
    selectedPages,
    setSelectedPages,
  } = useOnboardingState();

  useEffect(() => {
    const savedDraft = localStorage.getItem('agency_onboarding_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        updateFormData(parsed.formData || {});
        setCurrentStep(parsed.currentStep || 1);
        if (parsed.selectedPages) {
          setSelectedPages(parsed.selectedPages);
        }
      } catch (error) {
        logError('Error loading draft:', error);
      }
    }
  }, []);

  useEffect(() => {
    const draft = {
      formData,
      currentStep,
      selectedPages
    };
    localStorage.setItem('agency_onboarding_draft', JSON.stringify(draft));
  }, [formData, currentStep, selectedPages]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length) {
      setStepDirection('forward');
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setStepDirection('backward');
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/agencies/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agencyName: formData.agencyName,
          domain: `${formData.domain}${formData.domainSuffix}`,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
          subscriptionPlan: formData.subscriptionPlan || 'professional',
          phone: formData.phone,
          address: formData.address,
          industry: formData.industry,
          companySize: formData.companySize,
          primaryFocus: formData.primaryFocus,
          enableGST: formData.enableGST,
          business_goals: formData.businessGoals || [],
          page_ids: selectedPages.map(p => p.id)
        }),
      });

      let result;
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      if (isJson) {
        result = await response.json();
      } else {
        const text = await response.text();
        result = text ? { error: text } : { error: `Server error: ${response.status}` };
      }

      if (!response.ok) {
        const errorMessage = result.error || result.message || `Server error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      if (!result.success) {
        throw new Error(result.error || result.message || 'Failed to create agency');
      }

      localStorage.removeItem('agency_onboarding_draft');
      
      await signIn(formData.adminEmail, formData.adminPassword);
      
      toast({
        title: 'Welcome aboard!',
        description: 'Your agency is ready. Let\'s build something great.',
      });
      
      navigate('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create agency. Please try again.';
      logError('Agency creation error:', error);
      toast({
        title: 'Something went wrong',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData, selectedPages, signIn, navigate, toast]);

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  const renderStep = () => {
    const animationClass = stepDirection === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left';
    
    switch (currentStep) {
      case 1:
        return (
          <div key="step-1" className={animationClass}>
            <StepWelcome
              formData={formData}
              updateFormData={updateFormData}
              setCanProceed={setCanProceed}
            />
          </div>
        );
      case 2:
        return (
          <div key="step-2" className={animationClass}>
            <StepBusiness
              formData={formData}
              updateFormData={updateFormData}
              setCanProceed={setCanProceed}
            />
          </div>
        );
      case 3:
        return (
          <div key="step-3" className={animationClass}>
            <StepAdmin
              formData={formData}
              updateFormData={updateFormData}
              setCanProceed={setCanProceed}
            />
          </div>
        );
      case 4:
        return (
          <div key="step-4" className={animationClass}>
            <StepLaunch
              formData={formData}
              selectedPages={selectedPages}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              setCanProceed={setCanProceed}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen onboarding-bg">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground tracking-tight">
                  Create Your Agency
                </h1>
                <p className="text-xs text-muted-foreground">
                  Step {currentStep} of {STEPS.length}
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{Math.round(progress)}%</span>
              <span>complete</span>
            </div>
          </div>

          <div className="relative">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="hidden md:flex justify-between mt-4">
              {STEPS.map((step, index) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                const StepIcon = step.icon;
                
                return (
                  <div 
                    key={step.id} 
                    className={`flex items-center gap-2 transition-all duration-300 ${
                      isCompleted || isCurrent ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    <div className={`
                      h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300
                      ${isCompleted 
                        ? 'bg-success text-success-foreground' 
                        : isCurrent 
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' 
                          : 'bg-muted text-muted-foreground'
                      }
                    `}>
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <StepIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="hidden lg:block">
                      <p className={`text-xs font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {step.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <main className="pt-32 md:pt-40 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {renderStep()}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            <div className="flex items-center gap-1.5 sm:hidden">
              {STEPS.map((step) => (
                <div 
                  key={step.id}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentStep >= step.id 
                      ? 'w-6 bg-primary' 
                      : 'w-1.5 bg-muted'
                  }`}
                />
              ))}
            </div>

            {currentStep < STEPS.length ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed || isLoading}
                className="gap-2 min-w-[120px]"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed || isLoading}
                className="gap-2 min-w-[160px] bg-success hover:bg-success/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    <span>Launch Agency</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
