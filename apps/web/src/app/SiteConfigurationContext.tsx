import { SiteConfiguration } from '@ayeldo/core';
import { createContext, useContext } from 'react';

function createSiteConfig(): SiteConfiguration {
  const gl = globalThis as unknown as { location?: { origin?: string } };
  const webOrigin = typeof gl.location?.origin === 'string' && gl.location.origin.length > 0
    ? gl.location.origin.replace(/\/$/, '')
    : 'http://localhost';

  const raw = (import.meta as unknown as { env: Record<string, string | undefined> }).env['VITE_BFF_BASE_URL'];
  let bffOrigin = webOrigin;
  let apiBasePath = '/api';

  if (typeof raw === 'string' && raw.length > 0) {
    if (/^https?:\/\//i.test(raw)) {
      try {
        const u = new URL(raw);
        bffOrigin = `${u.protocol}//${u.host}`;
        apiBasePath = u.pathname && u.pathname !== '/' ? u.pathname : '';
      } catch {
        // ignore
      }
    } else if (raw.startsWith('/')) {
      bffOrigin = webOrigin;
      apiBasePath = raw;
    }
  }

  return new SiteConfiguration({
    webOrigin,
    bffOrigin,
    apiBasePath: apiBasePath || '/',
    csrfHeaderName: 'X-CSRF-Token',
  });
}

export const siteConfig = createSiteConfig();

export const SiteConfigurationContext = createContext<SiteConfiguration>(siteConfig);

export const useSiteConfiguration = (): SiteConfiguration => useContext(SiteConfigurationContext);
