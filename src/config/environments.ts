import { config } from '@/config';
import { features } from '@/config/features';

// Development environment configuration
export const devConfig = {
  app: {
    name: config.app.name,
    version: config.app.version,
    environment: 'development',
    debug: true,
    logLevel: 'debug',
  },
  features: {
    ...features,
    // Development-specific feature overrides
    ai: {
      ...features.ai,
      mockMode: true, // Use mock responses when API keys not configured
    },
  },
  api: {
    timeout: 30000,
    retries: 3,
    mockResponses: true,
  },
  ui: {
    showDebugInfo: true,
    enableDevTools: true,
    showFeatureFlags: true,
  },
} as const;

// Production environment configuration  
export const prodConfig = {
  app: {
    name: config.app.name,
    version: config.app.version,
    environment: 'production',
    debug: false,
    logLevel: 'error',
  },
  features: {
    ...features,
    // Production-specific feature overrides
    ai: {
      ...features.ai,
      mockMode: false,
    },
  },
  api: {
    timeout: 10000,
    retries: 1,
    mockResponses: false,
  },
  ui: {
    showDebugInfo: false,
    enableDevTools: false,
    showFeatureFlags: false,
  },
} as const;

// Get environment-specific configuration
export const getEnvConfig = () => {
  const environment = config.app.environment;
  
  switch (environment) {
    case 'production':
      return prodConfig;
    case 'staging':
      return { ...prodConfig, app: { ...prodConfig.app, environment: 'staging' } };
    case 'development':
    default:
      return devConfig;
  }
};

export const envConfig = getEnvConfig();