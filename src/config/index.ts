import { env } from './env';
import { features } from './features';
import { services } from './services';

export const config = {
  app: {
    name: env.VITE_APP_NAME,
    version: env.VITE_APP_VERSION,
    environment: env.VITE_APP_ENVIRONMENT,
  },
  database: {
    url: env.VITE_DATABASE_URL || '', // Not used by frontend (uses HTTP API)
  },
  api: {
    url: env.VITE_API_URL,
  },
  features,
  services,
} as const;

export { env } from './env';
export { features } from './features';
export { services } from './services';