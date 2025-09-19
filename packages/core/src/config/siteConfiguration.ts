// SiteConfiguration reads runtime configuration from environment variables.
// Callers should construct with `new SiteConfiguration()`; for tests or local
// runs they may set process.env before constructing the instance.

export class SiteConfiguration {
  // Grouped internal structures for clarity
  private readonly _origins: {
    webOrigin: string;
    apiBaseUrl: string; // raw origin (no path)
    apiBasePath: string;
  };

  private readonly _oidc: {
    authority?: string;
    clientId?: string;
    clientSecret?: string;
    scopes: string;
    redirectPath: string;
  };

  private readonly _security: {
    csrfHeaderName: string;
    sessionEncKey?: string;
    apiJwtSecret?: string;
  };

  private readonly _infra: {
    tableName?: string;
    awsRegion?: string;
    eventBusName?: string;
    ddbEndpoint?: string;
    cdnHost?: string;
    mediaBucket?: string;
    imageVariantsRaw?: string;
  };

  private readonly _server: {
    port?: number | undefined;
  };

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

    this._origins = {
      webOrigin: rawWebOrigin.replace(/\/$/, ''),
      apiBaseUrl: rawApiBaseUrl.replace(/\/$/, ''),
      apiBasePath: env['API_BASE_PATH'] ?? '/api',
    };

    this._security = {
      csrfHeaderName: env['CSRF_HEADER_NAME'] ?? 'X-CSRF-Token',
      sessionEncKey: env['SESSION_ENC_KEY'],
      apiJwtSecret: env['API_JWT_SECRET'],
    };

    this._oidc = {
      authority: env['OIDC_ISSUER_URL'],
      clientId: env['OIDC_CLIENT_ID'],
      clientSecret: env['OIDC_CLIENT_SECRET'],
      scopes: env['OIDC_SCOPES'] ?? 'openid email profile',
      redirectPath: env['OIDC_REDIRECT_URI'] ?? '/auth/callback',
    };

    this._infra = {
      tableName: env['TABLE_NAME'],
      awsRegion: env['AWS_REGION'],
      eventBusName: env['EVENTS_BUS_NAME'] ?? env['EVENT_BUS_NAME'],
      ddbEndpoint: env['DDB_ENDPOINT'],
      cdnHost: env['CDN_HOST'],
      mediaBucket: env['MEDIA_BUCKET'],
      imageVariantsRaw: env['IMAGE_VARIANTS'],
    };

    this._server = {
      port: env['PORT'] ? Number.parseInt(env['PORT'], 10) : undefined,
    };
  }

  // Public grouped accessors
  public get origins(): Readonly<{ webOrigin: string; apiBaseUrl: string; apiBasePath: string }> {
    return Object.freeze({ ...this._origins });
  }

  public get oidc(): Readonly<{
    authority?: string;
    clientId?: string;
    clientSecret?: string;
    scopes: string;
    redirectPath: string;
  }> {
    return Object.freeze({ ...this._oidc });
  }

  public get security(): Readonly<{
    csrfHeaderName: string;
    sessionEncKey?: string;
    apiJwtSecret?: string;
  }> {
    return Object.freeze({ ...this._security });
  }

  public get infra(): Readonly<{
    tableName?: string;
    awsRegion?: string;
    eventBusName?: string;
    ddbEndpoint?: string;
    cdnHost?: string;
    mediaBucket?: string;
    imageVariantsRaw?: string;
  }> {
    return Object.freeze({ ...this._infra });
  }

  public get server(): Readonly<{ port?: number | undefined }> {
    return Object.freeze({ ...this._server });
  }

  // Infra getters
  public get tableName(): string | undefined {
    return this._infra.tableName;
  }

  public get awsRegion(): string | undefined {
    return this._infra.awsRegion;
  }

  public get eventBusName(): string | undefined {
    return this._infra.eventBusName;
  }

  public get ddbEndpoint(): string | undefined {
    return this._infra.ddbEndpoint;
  }

  public get cdnHost(): string | undefined {
    return this._infra.cdnHost;
  }

  public get serverPort(): number | undefined {
    return this._server.port;
  }

  public get mediaBucket(): string | undefined {
    return this._infra.mediaBucket;
  }

  public get imageVariantsRaw(): string | undefined {
    return this._infra.imageVariantsRaw;
  }

  public get webOrigin(): string {
    return this._origins.webOrigin;
  }

  // Backwards-compatible alias for documentation clarity: API origin (includes former BFF)
  public get apiOrigin(): string {
    return this._origins.apiBaseUrl;
  }

  public get apiBasePath(): string {
    return this._origins.apiBasePath;
  }

  public get csrfHeaderName(): string {
    return this._security.csrfHeaderName;
  }

  // Full base URL the browser should call (HTTP API)
  public get apiBaseUrl(): string {
    return `${this._origins.apiBaseUrl}${this.ensureLeadingSlash(this._origins.apiBasePath)}`;
  }

  // OIDC configuration getters with inference
  public get oidcAuthority(): string | undefined {
    return this._oidc.authority;
  }

  public get oidcClientId(): string | undefined {
    return this._oidc.clientId;
  }

  public get oidcClientSecret(): string | undefined {
    return this._oidc.clientSecret;
  }

  public get oidcScopes(): string {
    return this._oidc.scopes;
  }

  public get oidcRedirectUri(): string {
    return `${this._origins.apiBaseUrl}${this.ensureLeadingSlash(this._oidc.redirectPath)}`;
  }

  public get sessionEncKey(): string | undefined {
    return this._security.sessionEncKey;
  }

  public get apiJwtSecret(): string | undefined {
    return this._security.apiJwtSecret;
  }

  // Inferred OIDC URLs based on authority
  public get oidcAuthUrl(): string | undefined {
    if (!this._oidc.authority) return undefined;
    const cleanAuthority = this._oidc.authority.replace(/\/$/, '');
    return `${cleanAuthority}/oauth2/authorize`;
  }

  public get oidcTokenUrl(): string | undefined {
    if (!this._oidc.authority) return undefined;
    const cleanAuthority = this._oidc.authority.replace(/\/$/, '');
    return `${cleanAuthority}/oauth2/token`;
  }

  public get oidcJwksUrl(): string | undefined {
    if (!this._oidc.authority) return undefined;
    const cleanAuthority = this._oidc.authority.replace(/\/$/, '');
    return `${cleanAuthority}/.well-known/jwks.json`;
  }

  // Utility for fetch wrappers
  public defaultFetchOptions(csrfToken?: string): {
    readonly credentials: 'include';
    readonly headers: Readonly<Record<string, string>>;
  } {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrfToken) {
      headers[this._security.csrfHeaderName] = csrfToken;
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
      const webHostname = this._origins.webOrigin.replace(/^https?:\/\//, '').split('/')[0];
      const apiHostname = this._origins.apiBaseUrl.replace(/^https?:\/\//, '').split('/')[0];

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

    if (this.oidcAuthority && this.oidcClientId && this.oidcClientSecret) {
      env['OIDC_ISSUER_URL'] = this.oidcAuthority;
      const authUrl = this.oidcAuthUrl;
      const tokenUrl = this.oidcTokenUrl;
      const jwksUrl = this.oidcJwksUrl;
      if (authUrl) env['OIDC_AUTH_URL'] = authUrl;
      if (tokenUrl) env['OIDC_TOKEN_URL'] = tokenUrl;
      if (jwksUrl) env['OIDC_JWKS_URL'] = jwksUrl;
      env['OIDC_CLIENT_ID'] = this.oidcClientId as string;
      env['OIDC_CLIENT_SECRET'] = this.oidcClientSecret as string;
      env['OIDC_SCOPES'] = this.oidcScopes;
      env['OIDC_REDIRECT_URI'] = this.oidcRedirectUri;
    }

    if (this.sessionEncKey) {
      env['SESSION_ENC_KEY'] = this.sessionEncKey;
    }

    if (this.apiJwtSecret) {
      env['API_JWT_SECRET'] = this.apiJwtSecret;
    }

    return env;
  }

  private ensureLeadingSlash(p: string): string {
    return p.startsWith('/') ? p : `/${p}`;
  }
}
