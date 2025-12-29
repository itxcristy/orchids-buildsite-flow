/**
 * Step 6: Pricing Review
 * Shows pricing breakdown for selected plan and pages
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';
import type { OnboardingFormData, SelectedPage } from '../hooks/useOnboardingState';

interface Step6Props {
  formData: OnboardingFormData;
  selectedPages: SelectedPage[];
  onNext: () => void;
}

const PLAN_PRICES: Record<string, number> = {
  starter: 29,
  professional: 79,
  enterprise: 199
};

export default function Step6PricingReview({ formData, selectedPages, onNext }: Step6Props) {
  const planPrice = PLAN_PRICES[formData.subscriptionPlan] || 79;
  const pagesCost = selectedPages.reduce((sum, page) => sum + page.base_cost, 0);
  const totalCost = planPrice + pagesCost;
  const annualCost = totalCost * 12;
  const annualSavings = annualCost * 0.1; // 10% discount for annual

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Pricing Review</h2>
        <p className="text-muted-foreground">
          Review your subscription plan and selected pages pricing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Base Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Subscription Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-semibold capitalize">{formData.subscriptionPlan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Cost</span>
                <span className="font-semibold">${planPrice.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Selected Pages ({selectedPages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedPages.map((page) => (
                <div key={page.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate">{page.title}</span>
                  <span>${page.base_cost.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                <span>Subtotal</span>
                <span>${pagesCost.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Summary */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle>Total Monthly Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-lg">
              <span>Base Plan</span>
              <span>${planPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Selected Pages</span>
              <span>${pagesCost.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-2xl font-bold">
              <span>Total</span>
              <span>${totalCost.toFixed(2)}/month</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Annual cost: ${annualCost.toFixed(2)} (save ${annualSavings.toFixed(2)} with annual billing)
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="pt-4">
        <button
          onClick={onNext}
          className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

