export interface SiteConfigurationProps {
  readonly webOrigin: string; // e.g., https://www.example.com
  readonly bffOrigin: string; // e.g., https://api.example.com
  readonly apiBasePath?: string; // default '/api' if BFF exposes under a path
  readonly csrfHeaderName?: string; // default 'X-CSRF-Token'
  // OIDC configuration - all optional
  readonly oidcAuthority?: string; // e.g., https://accounts.google.com
  readonly oidcClientId?: string;
  readonly oidcClientSecret?: string;
  readonly oidcScopes?: string; // default 'openid email profile'
  readonly oidcRedirectPath?: string; // default '/auth/callback'
  readonly sessionEncKey?: string; // Base64 encoded encryption key
  readonly bffJwtSecret?: string; // Base64 encoded JWT secret
}

export class SiteConfiguration {
  private readonly _webOrigin: string;
  private readonly _bffOrigin: string;
  private readonly _apiBasePath: string;
  private readonly _csrfHeaderName: string;
  private readonly _oidcScopes: string;
  private readonly _oidcRedirectPath: string;
  private readonly _oidcAuthority: string | undefined;
  private readonly _oidcClientId: string | undefined;
  private readonly _oidcClientSecret: string | undefined;
  private readonly _sessionEncKey: string | undefined;
  private readonly _bffJwtSecret: string | undefined;

  public constructor(props: SiteConfigurationProps) {
    this._webOrigin = props.webOrigin.replace(/\/$/, '');
    this._bffOrigin = props.bffOrigin.replace(/\/$/, '');
    this._apiBasePath = props.apiBasePath ?? '/api';
    this._csrfHeaderName = props.csrfHeaderName ?? 'X-CSRF-Token';
    this._oidcScopes = props.oidcScopes ?? 'openid email profile';
    this._oidcRedirectPath = props.oidcRedirectPath ?? '/auth/callback';
    this._oidcAuthority = props.oidcAuthority;
    this._oidcClientId = props.oidcClientId;
    this._oidcClientSecret = props.oidcClientSecret;
    this._sessionEncKey = props.sessionEncKey;
    this._bffJwtSecret = props.bffJwtSecret;
  }

  public get webOrigin(): string {
    return this._webOrigin;
  }

  public get bffOrigin(): string {
    return this._bffOrigin;
  }

  public get apiBasePath(): string {
    return this._apiBasePath;
  }

  public get csrfHeaderName(): string {
    return this._csrfHeaderName;
  }

  // Full base URL the browser should call (BFF only)
  public get apiBaseUrl(): string {
    return `${this._bffOrigin}${this.ensureLeadingSlash(this._apiBasePath)}`;
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
    return `${this._bffOrigin}${this.ensureLeadingSlash(this._oidcRedirectPath)}`;
  }

  public get sessionEncKey(): string | undefined {
    return this._sessionEncKey;
  }

  public get bffJwtSecret(): string | undefined {
    return this._bffJwtSecret;
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

  // Check if OIDC is configured
  public get isOidcConfigured(): boolean {
    return !!(this._oidcAuthority && this._oidcClientId && this._oidcClientSecret);
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

  // Get environment variables for Lambda deployment
  public toLambdaEnvironment(): Record<string, string> {
    const env: Record<string, string> = {
      API_BASE_URL: this.apiBaseUrl,
      WEB_ORIGIN: this.webOrigin,
    };

    if (this.isOidcConfigured) {
      // These are guaranteed to be defined when isOidcConfigured is true
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
    }

    if (this._sessionEncKey) {
      env['SESSION_ENC_KEY'] = this._sessionEncKey;
    }

    if (this._bffJwtSecret) {
      env['BFF_JWT_SECRET'] = this._bffJwtSecret;
    }

    return env;
  }

  private ensureLeadingSlash(p: string): string {
    return p.startsWith('/') ? p : `/${p}`;
  }
}
