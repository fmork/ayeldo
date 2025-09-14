// Thin wrapper around the certified `openid-client` library.
// Avoids leaking the library API to the rest of our codebase.
export interface OidcOpenIdConfig {
  readonly issuer: string;
  readonly authUrl: string;
  readonly tokenUrl: string;
  readonly jwksUrl?: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly scopes: string;
}

export interface ExchangeCodeParams {
  readonly code: string;
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
}

export interface TokenResponse {
  readonly access_token: string;
  readonly id_token: string;
  readonly refresh_token: string;
  readonly expires_in: number;
  readonly token_type: string;
}

export class OidcClientOpenId {
  private readonly cfg: OidcOpenIdConfig;
  private readonly client: any;

  public constructor(cfg: OidcOpenIdConfig) {
    // Lazy require to avoid type resolution issues if not yet installed in dev
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Issuer } = require('openid-client') as typeof import('openid-client');
    const issuer = new Issuer({
      issuer: cfg.issuer,
      authorization_endpoint: cfg.authUrl,
      token_endpoint: cfg.tokenUrl,
      ...(cfg.jwksUrl ? { jwks_uri: cfg.jwksUrl } : {}),
    });
    this.client = new issuer.Client({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uris: [cfg.redirectUri],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
    });
    this.cfg = cfg;
  }

  public buildAuthorizeUrl(params: { state: string; nonce: string; codeChallenge: string }): string {
    return this.client.authorizationUrl({
      scope: this.cfg.scopes,
      state: params.state,
      nonce: params.nonce,
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
      redirect_uri: this.cfg.redirectUri,
    });
  }

  public async exchangeCode(params: ExchangeCodeParams): Promise<TokenResponse> {
    const tokenSet = await this.client.callback(
      this.cfg.redirectUri,
      { code: params.code, state: params.state },
      { state: params.state, nonce: params.nonce, code_verifier: params.codeVerifier },
    );
    return {
      access_token: tokenSet.access_token as string,
      id_token: tokenSet.id_token as string,
      refresh_token: tokenSet.refresh_token as string,
      expires_in: Number(tokenSet.expires_in ?? 0),
      token_type: tokenSet.token_type as string,
    } as const;
  }
}
