/**
 * Step 4: Business Goals
 * Questionnaire to understand agency's business objectives
 */

import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { BUSINESS_GOALS } from '@/types/pageCatalog';
import { Target } from 'lucide-react';
import type { OnboardingFormData } from '../hooks/useOnboardingState';

interface Step4Props {
  formData: OnboardingFormData;
  updateFormData: (updates: Partial<OnboardingFormData>) => void;
  onNext: () => void;
}

export default function Step4BusinessGoals({ formData, updateFormData, onNext }: Step4Props) {
  const toggleGoal = (goalId: string) => {
    const currentGoals = formData.businessGoals || [];
    const newGoals = currentGoals.includes(goalId)
      ? currentGoals.filter(g => g !== goalId)
      : [...currentGoals, goalId];
    updateFormData({ businessGoals: newGoals });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Business Goals</h2>
        <p className="text-muted-foreground">
          Select your primary business objectives. This helps us recommend the right pages and features for your agency.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BUSINESS_GOALS.map((goal) => {
          const isSelected = formData.businessGoals?.includes(goal.id);
          return (
            <Card
              key={goal.id}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => toggleGoal(goal.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleGoal(goal.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{goal.label}</h3>
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {formData.businessGoals && formData.businessGoals.length > 0 && (
        <div className="pt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Selected {formData.businessGoals.length} goal{formData.businessGoals.length !== 1 ? 's' : ''}
          </p>
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

