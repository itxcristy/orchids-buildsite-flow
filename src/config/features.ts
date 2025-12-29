import { env } from './env';

// Feature flag management
export const features = {
  ai: {
    enabled: env.VITE_ENABLE_AI_FEATURES === 'true',
    predictiveAnalytics: env.VITE_ENABLE_AI_FEATURES === 'true',
    documentProcessing: env.VITE_ENABLE_AI_FEATURES === 'true',
    smartRecommendations: env.VITE_ENABLE_AI_FEATURES === 'true',
    insights: env.VITE_ENABLE_AI_FEATURES === 'true',
  },
  analytics: {
    enabled: env.VITE_ENABLE_ANALYTICS === 'true',
    realTimeMetrics: env.VITE_ENABLE_ANALYTICS === 'true',
    dashboardCharts: env.VITE_ENABLE_ANALYTICS === 'true',
    reportGeneration: env.VITE_ENABLE_ANALYTICS === 'true',
  },
  projectManagement: {
    enabled: env.VITE_ENABLE_PROJECT_MANAGEMENT === 'true',
    ganttCharts: env.VITE_ENABLE_PROJECT_MANAGEMENT === 'true',
    resourceManagement: env.VITE_ENABLE_PROJECT_MANAGEMENT === 'true',
    timeline: env.VITE_ENABLE_PROJECT_MANAGEMENT === 'true',
  },
  financial: {
    enabled: env.VITE_ENABLE_FINANCIAL_MANAGEMENT === 'true',
    invoicing: env.VITE_ENABLE_FINANCIAL_MANAGEMENT === 'true',
    payroll: env.VITE_ENABLE_FINANCIAL_MANAGEMENT === 'true',
    accounting: env.VITE_ENABLE_FINANCIAL_MANAGEMENT === 'true',
    reimbursements: env.VITE_ENABLE_FINANCIAL_MANAGEMENT === 'true',
  },
  hr: {
    enabled: env.VITE_ENABLE_HR_MANAGEMENT === 'true',
    attendance: env.VITE_ENABLE_HR_MANAGEMENT === 'true',
    leaveManagement: env.VITE_ENABLE_HR_MANAGEMENT === 'true',
    employeeManagement: env.VITE_ENABLE_HR_MANAGEMENT === 'true',
    performanceTracking: env.VITE_ENABLE_HR_MANAGEMENT === 'true',
  },
  crm: {
    enabled: env.VITE_ENABLE_CRM === 'true',
    leadManagement: env.VITE_ENABLE_CRM === 'true',
    clientManagement: env.VITE_ENABLE_CRM === 'true',
    quotations: env.VITE_ENABLE_CRM === 'true',
    communications: env.VITE_ENABLE_CRM === 'true',
  },
} as const;

// Helper functions for feature checking
export const isFeatureEnabled = (feature: keyof typeof features) => {
  return features[feature].enabled;
};

export const isSubFeatureEnabled = (
  feature: keyof typeof features,
  subFeature: string
) => {
  const featureConfig = features[feature] as any;
  return featureConfig?.enabled && featureConfig?.[subFeature] === true;
};