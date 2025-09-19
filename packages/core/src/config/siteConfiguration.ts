// SiteConfiguration reads runtime configuration from environment variables.
// Callers should construct with `new SiteConfiguration()`; for tests or local
// runs they may set process.env before constructing the instance.

export class SiteConfiguration {
  private readonly _webOrigin: string;
  private readonly _apiBaseUrl: string;
  // Note: the project previously used a distinct "BFF" service. The HTTP API now
  // includes those responsibilities. `_bffOrigin` is retained for backward compatibility
  // but represents the HTTP API origin (preferred name: API origin).
  private readonly _apiBasePath: string;
  private readonly _csrfHeaderName: string;
  private readonly _oidcScopes: string;
  private readonly _oidcRedirectPath: string;
  private readonly _oidcAuthority: string | undefined;
  private readonly _oidcClientId: string | undefined;
  private readonly _oidcClientSecret: string | undefined;
  private readonly _sessionEncKey: string | undefined;
  private readonly _apiJwtSecret: string | undefined;
  // Infra/deployment hints
  private readonly _tableName: string | undefined;
  private readonly _awsRegion: string | undefined;
  private readonly _eventBusName: string | undefined;
  private readonly _ddbEndpoint: string | undefined;
  private readonly _cdnHost: string | undefined;
  private readonly _serverPort: number | undefined;
  private readonly _mediaBucket: string | undefined;
  private readonly _imageVariantsRaw: string | undefined;

  public constructor() {
    // Read from environment variables. Use globalThis to avoid assuming Node
    // typings are present in all packages (lambdas / bundling contexts).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env: any = (globalThis as any).process?.env ?? (globalThis as any).__ENV__ ?? {};

    const rawWebOrigin = env['WEB_ORIGIN'];
    if (!rawWebOrigin) {
      throw new Error('Missing required environment variable: WEB_ORIGIN');
    }

    // Historically the project used a "BFF" naming; prefer API_BASE_URL but
    // accept BFF_ORIGIN for compatibility in environments that still set it.
    const rawApiBaseUrl = env['API_BASE_URL'] ?? env['BFF_ORIGIN'];
    if (!rawApiBaseUrl) {
      throw new Error('Missing required environment variable: API_BASE_URL');
    }

    this._webOrigin = rawWebOrigin.replace(/\/$/, '');
    this._apiBaseUrl = rawApiBaseUrl.replace(/\/$/, '');

    this._apiBasePath = env['API_BASE_PATH'] ?? '/api';
    this._csrfHeaderName = env['CSRF_HEADER_NAME'] ?? 'X-CSRF-Token';

    this._oidcScopes = env['OIDC_SCOPES'] ?? 'openid email profile';
    this._oidcRedirectPath = env['OIDC_REDIRECT_URI'] ?? '/auth/callback';

    this._oidcAuthority = env['OIDC_ISSUER_URL'];
    this._oidcClientId = env['OIDC_CLIENT_ID'];
    this._oidcClientSecret = env['OIDC_CLIENT_SECRET'];

    this._sessionEncKey = env['SESSION_ENC_KEY'];
    this._apiJwtSecret = env['API_JWT_SECRET'];

    // Infra/deployment
    this._tableName = env['TABLE_NAME'];
    this._awsRegion = env['AWS_REGION'];
    this._eventBusName = env['EVENTS_BUS_NAME'] ?? env['EVENT_BUS_NAME'];
    this._ddbEndpoint = env['DDB_ENDPOINT'];
    this._cdnHost = env['CDN_HOST'];
    this._serverPort = env['PORT'] ? Number.parseInt(env['PORT'], 10) : undefined;
    this._mediaBucket = env['MEDIA_BUCKET'];
    this._imageVariantsRaw = env['IMAGE_VARIANTS'];
  }

  // Infra getters
  public get tableName(): string | undefined {
    return this._tableName;
  }

  public get awsRegion(): string | undefined {
    return this._awsRegion;
  }

  public get eventBusName(): string | undefined {
    return this._eventBusName;
  }

  public get ddbEndpoint(): string | undefined {
    return this._ddbEndpoint;
  }

  public get cdnHost(): string | undefined {
    return this._cdnHost;
  }

  public get serverPort(): number | undefined {
    return this._serverPort;
  }

  public get mediaBucket(): string | undefined {
    return this._mediaBucket;
  }

  public get imageVariantsRaw(): string | undefined {
    return this._imageVariantsRaw;
  }

  public get webOrigin(): string {
    return this._webOrigin;
  }

  // Backwards-compatible alias for documentation clarity: API origin (includes former BFF)
  public get apiOrigin(): string {
    return this._apiBaseUrl;
  }

  public get apiBasePath(): string {
    return this._apiBasePath;
  }

  public get csrfHeaderName(): string {
    return this._csrfHeaderName;
  }

  // Full base URL the browser should call (HTTP API)
  public get apiBaseUrl(): string {
    return `${this._apiBaseUrl}${this.ensureLeadingSlash(this._apiBasePath)}`;
  }

  // OIDC configuration getters with inference
  public get oidcAuthority(): string | undefined {
    return this._oidcAuthority;
  }

  public get oidcClientId(): string | undefined {
    return this._oidcClientId;
  }

  public get oidcClientSecret(): string | undefined {
    return this._oidcClientSecret;
  }

  public get oidcScopes(): string {
    return this._oidcScopes;
  }

  public get oidcRedirectUri(): string {
    return `${this._apiBaseUrl}${this.ensureLeadingSlash(this._oidcRedirectPath)}`;
  }

  public get sessionEncKey(): string | undefined {
    return this._sessionEncKey;
  }

  public get apiJwtSecret(): string | undefined {
    return this._apiJwtSecret;
  }

  // Inferred OIDC URLs based on authority
  public get oidcAuthUrl(): string | undefined {
    if (!this._oidcAuthority) return undefined;
    const cleanAuthority = this._oidcAuthority.replace(/\/$/, '');
    return `${cleanAuthority}/oauth2/authorize`;
  }

  public get oidcTokenUrl(): string | undefined {
    if (!this._oidcAuthority) return undefined;
    const cleanAuthority = this._oidcAuthority.replace(/\/$/, '');
    return `${cleanAuthority}/oauth2/token`;
  }

  public get oidcJwksUrl(): string | undefined {
    if (!this._oidcAuthority) return undefined;
    const cleanAuthority = this._oidcAuthority.replace(/\/$/, '');
    return `${cleanAuthority}/.well-known/jwks.json`;
  }

  // Utility for fetch wrappers
  public defaultFetchOptions(csrfToken?: string): {
    readonly credentials: 'include';
    readonly headers: Readonly<Record<string, string>>;
  } {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrfToken) {
      headers[this._csrfHeaderName] = csrfToken;
    }
    return {
      credentials: 'include',
      headers: headers as Readonly<Record<string, string>>,
    } as const;
  }

  // Get cookie domain for cross-subdomain access
  public get cookieDomain(): string | undefined {
    try {
      // Extract hostname from webOrigin and API Origin
      const webHostname = this._webOrigin.replace(/^https?:\/\//, '').split('/')[0];
      const apiHostname = this._apiBaseUrl.replace(/^https?:\/\//, '').split('/')[0];

      // Remove port if present
      const webHost = webHostname.split(':')[0];
      const apiHost = apiHostname.split(':')[0];

      // Split into parts
      const webParts = webHost.split('.');
      const apiParts = apiHost.split('.');

      // Check if we have at least 2 parts (domain.tld)
      if (webParts.length >= 2 && apiParts.length >= 2) {
        // Get the last two parts (domain.tld)
        const webDomain = webParts.slice(-2).join('.');
        const apiDomain = apiParts.slice(-2).join('.');

        // If they match and both are subdomains, return the parent domain
        if (webDomain === apiDomain && (webParts.length > 2 || apiParts.length > 2)) {
          return `.${webDomain}`;
        }
      }
    } catch {
      // If parsing fails, return undefined
    }
    return undefined;
  }

  // Get environment variables for Lambda deployment
  public toLambdaEnvironment(): Record<string, string> {
    const env: Record<string, string> = {
      API_BASE_URL: this.apiBaseUrl,
      WEB_ORIGIN: this.webOrigin,
    };

    if (this._oidcAuthority && this._oidcClientId && this._oidcClientSecret) {
      env['OIDC_ISSUER_URL'] = this._oidcAuthority;
      const authUrl = this.oidcAuthUrl;
      const tokenUrl = this.oidcTokenUrl;
      const jwksUrl = this.oidcJwksUrl;
      if (authUrl) env['OIDC_AUTH_URL'] = authUrl;
      if (tokenUrl) env['OIDC_TOKEN_URL'] = tokenUrl;
      if (jwksUrl) env['OIDC_JWKS_URL'] = jwksUrl;
      env['OIDC_CLIENT_ID'] = this._oidcClientId;
      env['OIDC_CLIENT_SECRET'] = this._oidcClientSecret;
      env['OIDC_SCOPES'] = this._oidcScopes;
      env['OIDC_REDIRECT_URI'] = this.oidcRedirectUri;
    }

    if (this._sessionEncKey) {
      env['SESSION_ENC_KEY'] = this._sessionEncKey;
    }

    if (this._apiJwtSecret) {
      env['API_JWT_SECRET'] = this._apiJwtSecret;
    }

    return env;
  }

  private ensureLeadingSlash(p: string): string {
    return p.startsWith('/') ? p : `/${p}`;
  }
}
