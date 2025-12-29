import { env } from './env';
import { getApiRoot } from './api';

// External service configuration
export const services = {
  stripe: {
    publishableKey: env.VITE_STRIPE_PUBLISHABLE_KEY,
    enabled: !!env.VITE_STRIPE_PUBLISHABLE_KEY,
  },
  googleMaps: {
    apiKey: env.VITE_GOOGLE_MAPS_API_KEY,
    enabled: !!env.VITE_GOOGLE_MAPS_API_KEY,
  },
  analytics: {
    trackingId: env.VITE_ANALYTICS_TRACKING_ID,
    enabled: !!env.VITE_ANALYTICS_TRACKING_ID,
  },
  // Edge function endpoints (these use server-side secrets)
  ai: {
    predictionsEndpoint: '/functions/v1/ai-predictions',
    documentProcessorEndpoint: '/functions/v1/ai-document-processor',
    enabled: true, // Always enabled, server-side keys managed via backend
  },
  notifications: {
    emailEndpoint: '/functions/v1/send-welcome-email',
    enabled: true,
  },
  reporting: {
    generateReportEndpoint: '/functions/v1/generate-report',
    enabled: true,
  },
} as const;

// Service availability helpers
export const isServiceEnabled = (service: keyof typeof services) => {
  return services[service].enabled;
};

export const getServiceConfig = <T extends keyof typeof services>(
  service: T
): typeof services[T] => {
  return services[service];
};

// API endpoints with full URLs
export const getApiEndpoint = (endpoint: string) => {
  const apiUrl = getApiRoot();
  return `${apiUrl.replace(/\/$/, '')}${endpoint}`;
};