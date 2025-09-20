// SiteConfiguration reads runtime configuration from environment variables.
// Callers should construct with `new SiteConfiguration()`; for tests or local
// runs they may set process.env before constructing the instance.

class OriginsConfiguration {
  public readonly webOrigin: string;
  public readonly apiBaseUrl: string;
  public readonly apiBasePath: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constructor(env: any) {
    const rawWebOrigin = env['WEB_ORIGIN'];
    if (!rawWebOrigin) throw new Error('Missing required environment variable: WEB_ORIGIN');

    const rawApiBaseUrl = env['API_BASE_URL'] ?? env['BFF_ORIGIN'];
    if (!rawApiBaseUrl) throw new Error('Missing required environment variable: API_BASE_URL');

    this.webOrigin = String(rawWebOrigin).replace(/\/$/, '');
    this.apiBaseUrl = String(rawApiBaseUrl).replace(/\/$/, '');
    this.apiBasePath = env['API_BASE_PATH'] ?? '/api';
  }
}

class OidcConfiguration {
  public readonly authority: string;
  public readonly clientId: string;
  public readonly clientSecret: string;
  public readonly scopes: string;
  public readonly redirectPath: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constructor(env: any) {
    const authority = env['OIDC_ISSUER_URL'];
    const clientId = env['OIDC_CLIENT_ID'];
    const clientSecret = env['OIDC_CLIENT_SECRET'];
    if (!authority) throw new Error('Missing required environment variable: OIDC_ISSUER_URL');
    if (!clientId) throw new Error('Missing required environment variable: OIDC_CLIENT_ID');
    if (!clientSecret) throw new Error('Missing required environment variable: OIDC_CLIENT_SECRET');
    this.authority = String(authority).replace(/\/$/, '');
    this.clientId = String(clientId);
    this.clientSecret = String(clientSecret);
    this.scopes = env['OIDC_SCOPES'] ?? 'openid email profile';
    this.redirectPath = env['OIDC_REDIRECT_URI'] ?? '/auth/callback';
  }
}

class SecurityConfiguration {
  public readonly csrfHeaderName: string;
  public readonly sessionEncKey: string;
  public readonly apiJwtSecret: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constructor(env: any) {
    this.csrfHeaderName = env['CSRF_HEADER_NAME'] ?? 'X-CSRF-Token';
    const sess = env['SESSION_ENC_KEY'];
    const jwt = env['API_JWT_SECRET'];
    if (!sess) throw new Error('Missing required environment variable: SESSION_ENC_KEY');
    if (!jwt) throw new Error('Missing required environment variable: API_JWT_SECRET');
    this.sessionEncKey = String(sess);
    this.apiJwtSecret = String(jwt);
  }
}

class InfraConfiguration {
  public readonly tableName: string;
  public readonly awsRegion: string;
  public readonly eventBusName: string;
  public readonly ddbEndpoint: string;
  public readonly cdnHost: string;
  public readonly mediaBucket: string;
  public readonly imageVariantsRaw: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constructor(env: any) {
    const table = env['TABLE_NAME'];
    const region = env['AWS_REGION'];
    const eventBus = env['EVENTS_BUS_NAME'] ?? env['EVENT_BUS_NAME'];
    const ddb = env['DDB_ENDPOINT'];
    const cdn = env['CDN_HOST'];
    const media = env['MEDIA_BUCKET'];
    const variants = env['IMAGE_VARIANTS'];
    if (!table) throw new Error('Missing required environment variable: TABLE_NAME');
    if (!region) throw new Error('Missing required environment variable: AWS_REGION');
    if (!eventBus) throw new Error('Missing required environment variable: EVENTS_BUS_NAME');
    if (!ddb) throw new Error('Missing required environment variable: DDB_ENDPOINT');
    if (!cdn) throw new Error('Missing required environment variable: CDN_HOST');
    if (!media) throw new Error('Missing required environment variable: MEDIA_BUCKET');
    if (!variants) throw new Error('Missing required environment variable: IMAGE_VARIANTS');
    this.tableName = String(table);
    this.awsRegion = String(region);
    this.eventBusName = String(eventBus);
    this.ddbEndpoint = String(ddb);
    this.cdnHost = String(cdn);
    this.mediaBucket = String(media);
    this.imageVariantsRaw = String(variants);
  }
}

class ServerConfiguration {
  public readonly port: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constructor(env: any) {
    const p = env['PORT'];
    if (!p) throw new Error('Missing required environment variable: PORT');
    const parsed = Number.parseInt(String(p), 10);
    if (Number.isNaN(parsed)) throw new Error('Invalid PORT value');
    this.port = parsed;
  }
}

export class SiteConfiguration {
  private readonly _origins: OriginsConfiguration;
  private readonly _oidc: OidcConfiguration;
  private readonly _security: SecurityConfiguration;
  private readonly _infra: InfraConfiguration;
  private readonly _server: ServerConfiguration;

  public constructor() {
    // Read from environment variables. Use globalThis to avoid assuming Node
    // typings are present in all packages (lambdas / bundling contexts).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env: any = (globalThis as any).process?.env ?? (globalThis as any).__ENV__ ?? {};

    this._origins = new OriginsConfiguration(env);
    this._security = new SecurityConfiguration(env);
    this._oidc = new OidcConfiguration(env);
    this._infra = new InfraConfiguration(env);
    this._server = new ServerConfiguration(env);
  }

  // Public grouped accessors
  public get origins(): Readonly<{ webOrigin: string; apiBaseUrl: string; apiBasePath: string }> {
    return Object.freeze({
      webOrigin: this._origins.webOrigin,
      apiBaseUrl: this._origins.apiBaseUrl,
      apiBasePath: this._origins.apiBasePath,
    });
  }

  public get oidc(): Readonly<{
    authority: string;
    clientId: string;
    clientSecret: string;
    scopes: string;
    redirectPath: string;
  }> {
    return Object.freeze({
      authority: this._oidc.authority,
      clientId: this._oidc.clientId,
      clientSecret: this._oidc.clientSecret,
      scopes: this._oidc.scopes,
      redirectPath: this._oidc.redirectPath,
    });
  }

  public get security(): Readonly<{
    csrfHeaderName: string;
    sessionEncKey: string;
    apiJwtSecret: string;
  }> {
    return Object.freeze({
      csrfHeaderName: this._security.csrfHeaderName,
      sessionEncKey: this._security.sessionEncKey,
      apiJwtSecret: this._security.apiJwtSecret,
    });
  }

  public get infra(): Readonly<{
    tableName: string;
    awsRegion: string;
    eventBusName: string;
    ddbEndpoint: string;
    cdnHost: string;
    mediaBucket: string;
    imageVariantsRaw: string;
  }> {
    return Object.freeze({
      tableName: this._infra.tableName,
      awsRegion: this._infra.awsRegion,
      eventBusName: this._infra.eventBusName,
      ddbEndpoint: this._infra.ddbEndpoint,
      cdnHost: this._infra.cdnHost,
      mediaBucket: this._infra.mediaBucket,
      imageVariantsRaw: this._infra.imageVariantsRaw,
    });
  }

  public get server(): Readonly<{ port: number }> {
    return Object.freeze({ port: this._server.port });
  }

  // Infra getters
  // Full base URL the browser should call (HTTP API)
  public get apiBaseUrl(): string {
    return `${this._origins.apiBaseUrl}${this.ensureLeadingSlash(this._origins.apiBasePath)}`;
  }

  // OIDC configuration getters with inference
  public get oidcRedirectUri(): string {
    return `${this._origins.apiBaseUrl}${this.ensureLeadingSlash(this._oidc.redirectPath)}`;
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

  private ensureLeadingSlash(p: string): string {
    return p.startsWith('/') ? p : `/${p}`;
  }
}
