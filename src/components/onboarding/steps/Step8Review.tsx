/**
 * Step 8: Review & Activate
 * Final review before agency creation
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Building2, Globe, Target, MapPin, DollarSign, Shield } from 'lucide-react';
import type { OnboardingFormData, SelectedPage } from '../hooks/useOnboardingState';

interface Step8Props {
  formData: OnboardingFormData;
  selectedPages: SelectedPage[];
  onSubmit: () => void;
  isLoading: boolean;
}

export default function Step8Review({ formData, selectedPages, onSubmit, isLoading }: Step8Props) {
  const pagesCost = selectedPages.reduce((sum, page) => sum + page.base_cost, 0);
  const planPrice = formData.subscriptionPlan === 'starter' ? 29 : formData.subscriptionPlan === 'enterprise' ? 199 : 79;
  const totalCost = planPrice + pagesCost;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Review & Activate</h2>
        <p className="text-muted-foreground">
          Review all information before activating your agency. Once activated, your database will be created.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agency Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Agency Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Agency Name</div>
              <div className="font-semibold">{formData.agencyName}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Domain</div>
              <div className="font-semibold">{formData.domain}{formData.domainSuffix}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Industry</div>
              <div className="font-semibold capitalize">{formData.industry}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Company Size</div>
              <div className="font-semibold">{formData.companySize} employees</div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.address && (
              <div>
                <div className="text-sm text-muted-foreground">Address</div>
                <div className="font-semibold">{formData.address}</div>
              </div>
            )}
            {formData.phone && (
              <div>
                <div className="text-sm text-muted-foreground">Phone</div>
                <div className="font-semibold">{formData.phone}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">GST Enabled</div>
              <Badge variant={formData.enableGST ? 'default' : 'secondary'}>
                {formData.enableGST ? 'Yes' : 'No'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Business Goals */}
        {formData.businessGoals && formData.businessGoals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Business Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {formData.businessGoals.map((goal) => (
                  <Badge key={goal} variant="outline">{goal.replace(/_/g, ' ')}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selected Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Selected Pages ({selectedPages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {selectedPages.map((page) => (
                <div key={page.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{page.title}</span>
                  <span>${page.base_cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
              <span>Total Pages Cost</span>
              <span>${pagesCost.toFixed(2)}/mo</span>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Plan</span>
              <span className="font-semibold capitalize">{formData.subscriptionPlan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan Cost</span>
              <span>${planPrice.toFixed(2)}/mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pages Cost</span>
              <span>${pagesCost.toFixed(2)}/mo</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>${totalCost.toFixed(2)}/month</span>
            </div>
          </CardContent>
        </Card>

        {/* Admin Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Administrator Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Name</div>
              <div className="font-semibold">{formData.adminName}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="font-semibold">{formData.adminEmail}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4 border-t">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-sm text-muted-foreground">
            By activating, you agree to create your agency database and start your subscription.
          </span>
        </div>
        <button
          onClick={onSubmit}
          disabled={isLoading}
          className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
        >
          {isLoading ? 'Creating Agency...' : 'Activate Agency'}
        </button>
      </div>
    </div>
  );
}

