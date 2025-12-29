import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  fetchPlans as fetchPlansApi,
  fetchFeatures as fetchFeaturesApi,
  updatePlanApi,
  createPlanApi,
  deactivatePlanApi,
  createFeatureApi,
  updateFeatureApi,
  deleteFeatureApi,
} from '@/services/system-plans';

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  feature_key: string;
  enabled: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  is_active: boolean;
  max_users?: number;
  max_agencies?: number;
  max_storage_gb?: number;
  stripe_product_id?: string;
  stripe_price_id?: string;
  features: PlanFeature[];
}

export const usePlanManagement = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [availableFeatures, setAvailableFeatures] = useState<PlanFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadPlans = async () => {
    try {
      setLoading(true);

      const plansData = await fetchPlansApi();
      setPlans(plansData || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription plans",
        variant: "destructive",
      });
      setPlans([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableFeatures = async () => {
    try {
      const features = await fetchFeaturesApi();
      setAvailableFeatures(features || []);
    } catch (error) {
      console.error('Error fetching features:', error);
      toast({
        title: "Error",
        description: "Failed to load available features",
        variant: "destructive",
      });
      setAvailableFeatures([]); // Set empty array on error
    }
  };

  const updatePlan = async (planId: string, updates: Partial<SubscriptionPlan>) => {
    try {
      await updatePlanApi(planId, updates);

      toast({
        title: "Success",
        description: "Plan updated successfully",
      });

      loadPlans(); // Refresh data
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: "Error",
        description: "Failed to update plan",
        variant: "destructive",
      });
    }
  };

  const createPlan = async (planData: Omit<SubscriptionPlan, 'id'>) => {
    try {
      await createPlanApi(planData);

      toast({
        title: "Success",
        description: "Plan created successfully",
      });

      loadPlans(); // Refresh data
    } catch (error) {
      console.error('Error creating plan:', error);
      toast({
        title: "Error",
        description: "Failed to create plan",
        variant: "destructive",
      });
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      await deactivatePlanApi(planId);

      toast({
        title: "Success",
        description: "Plan deactivated successfully",
      });

      loadPlans(); // Refresh data
    } catch (error) {
      console.error('Error deactivating plan:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate plan",
        variant: "destructive",
      });
    }
  };

  const createFeature = async (featureData: Omit<PlanFeature, 'id' | 'enabled'>) => {
    try {
      await createFeatureApi(featureData);

      toast({
        title: "Success",
        description: "Feature created successfully",
      });

      await loadAvailableFeatures();
    } catch (error: any) {
      console.error('Error creating feature:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create feature",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateFeature = async (featureId: string, updates: Partial<Omit<PlanFeature, 'id' | 'enabled'>>) => {
    try {
      await updateFeatureApi(featureId, updates);

      toast({
        title: "Success",
        description: "Feature updated successfully",
      });

      await loadAvailableFeatures();
    } catch (error: any) {
      console.error('Error updating feature:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update feature",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteFeature = async (featureId: string) => {
    try {
      await deleteFeatureApi(featureId);
      await loadAvailableFeatures();
    } catch (error: any) {
      console.error('Error deleting feature:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete feature",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    loadPlans();
    loadAvailableFeatures();
  }, []);

  return {
    plans,
    availableFeatures,
    loading,
    updatePlan,
    createPlan,
    deletePlan,
    refreshPlans: loadPlans,
    createFeature,
    updateFeature,
    deleteFeature,
    refreshFeatures: loadAvailableFeatures
  };
};