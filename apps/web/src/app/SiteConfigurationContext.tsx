import { createContext, useContext } from 'react';
import type { SiteConfigurationProps } from './siteConfiguration';
import { SiteConfiguration } from './siteConfiguration';

const defaultConfig: SiteConfigurationProps = {
  apiBaseUrl: import.meta.env['VITE_BFF_BASE_URL'] ?? '/api',
  // Add more defaults as needed
};

export const siteConfig = new SiteConfiguration(defaultConfig);

export const SiteConfigurationContext = createContext<SiteConfiguration>(siteConfig);

export const useSiteConfiguration = (): SiteConfiguration => useContext(SiteConfigurationContext);
