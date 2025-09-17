import { createContext, useContext } from 'react';
import { FrontendConfiguration } from './frontendConfiguration';

function createFrontendConfig(): FrontendConfiguration {
  const gl = globalThis as unknown as { location?: { origin?: string } };
  const webOrigin = typeof gl.location?.origin === 'string' && gl.location.origin.length > 0
    ? gl.location.origin.replace(/\/$/, '')
    : 'http://localhost';

  const raw = (import.meta as unknown as { env: Record<string, string | undefined> }).env['VITE_BFF_BASE_URL'];
  let apiBaseUrl = `${webOrigin}/api`;

  if (typeof raw === 'string' && raw.length > 0) {
    if (/^https?:\/\//i.test(raw)) {
      // Full URL provided
      apiBaseUrl = raw.replace(/\/$/, '');
    } else if (raw.startsWith('/')) {
      // Path only, use current origin
      apiBaseUrl = `${webOrigin}${raw}`;
    }
  }

  // Parse deployment time from environment variable
  const deploymentTimeRaw = (import.meta as unknown as { env: Record<string, string | undefined> }).env['VITE_DEPLOYMENT_TIME'];
  let deploymentTime: Date | undefined;
  if (typeof deploymentTimeRaw === 'string' && deploymentTimeRaw.length > 0) {
    try {
      deploymentTime = new Date(deploymentTimeRaw);
      // Validate that the date is valid
      if (isNaN(deploymentTime.getTime())) {
        deploymentTime = undefined;
      }
    } catch {
      deploymentTime = undefined;
    }
  }

  return new FrontendConfiguration({
    apiBaseUrl,
    webOrigin,
    csrfHeaderName: 'X-CSRF-Token',
    ...(deploymentTime && { deploymentTime }),
  });
}

export const frontendConfig = createFrontendConfig();

export const FrontendConfigurationContext = createContext<FrontendConfiguration>(frontendConfig);

export const useFrontendConfiguration = (): FrontendConfiguration => useContext(FrontendConfigurationContext);
