export interface DomainConfig {
  readonly baseDomain: string;
  readonly envName: string;
  readonly webHost: string; // Web App host (Vite SPA) – e.g., www.example.com or dev-www.example.com
  readonly apiHost: string; // Domain API host – e.g., api.example.com or dev-api.example.com
  readonly bffHost: string; // BFF host – e.g., backend.example.com or dev-backend.example.com
  readonly cdnHost: string; // CDN host for static assets – e.g., cdn.example.com or dev-cdn.example.com
}

function prefixIfNeeded(envName: string, label: string): string {
  // prod has no env prefix; others get `${envName}-` prefix
  const isProd = envName === 'prod';
  return isProd ? label : `${envName}-${label}`;
}

export function computeDomainConfig(
  envName: string,
  baseDomainFromEnv?: string | null,
): DomainConfig | undefined {
  const baseDomain = (baseDomainFromEnv ?? process.env['FMORK_SITE_DOMAIN_NAME'] ?? '').trim();
  if (baseDomain.length === 0) return undefined;

  const webLabel = prefixIfNeeded(envName, 'www');
  const apiLabel = prefixIfNeeded(envName, 'api');
  const bffLabel = prefixIfNeeded(envName, 'backend');
  const cdnLabel = prefixIfNeeded(envName, 'cdn');

  return {
    baseDomain,
    envName,
    webHost: `${webLabel}.${baseDomain}`,
    apiHost: `${apiLabel}.${baseDomain}`,
    bffHost: `${bffLabel}.${baseDomain}`,
    cdnHost: `${cdnLabel}.${baseDomain}`,
  };
}
