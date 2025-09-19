import jwkToPem from 'jwk-to-pem';
import type { HttpClient } from '../IO/HttpClient';
import type { ILogWriter } from '../logging/ILogWriter';
import type { JwksResponse } from '../models/security/JwksResponse';
import type { WellKnownOpenIdConfiguration } from '../models/security/WellKnownOpenIdConfiguration';

interface TokenKeyCacheProps {
  httpClient: HttpClient;
  logWriter: ILogWriter;
}

/**
 * This class caches JWT token keys for validation.
 */
export class TokenKeyCache {
  private readonly cache: Record<string, string> = {};

  constructor(private readonly props: TokenKeyCacheProps) {}

  public getKey = async (issuer: string, kid: string): Promise<string> => {
    const cacheKey = `${issuer}_${kid}`;
    // try to get key from cache
    let key: string = this.cache[cacheKey];

    this.props.logWriter.info(`Key from cache: ${key}`);

    if (!key) {
      // key was not found in cache, so we need to fetch it
      const jwkFromIssuer = await this.getKeyFromIssuer(issuer, kid);
      this.props.logWriter.info(`jwkFromIssuer = ${JSON.stringify(jwkFromIssuer)}`);

      if (jwkFromIssuer) {
        key = jwkToPem(jwkFromIssuer);
        this.cache[cacheKey] = key;
      }
    }

    this.props.logWriter.info(`Cache returning key ${key}`);
    return key;
  };

  private getKeyFromIssuer = async (issuer: string, kid: string): Promise<jwkToPem.JWK | undefined> => {
    this.props.logWriter.info(`getKeyFromIssuer('${issuer}', '${kid}')`);
    const url = await this.getJwksUrl(issuer);

    this.props.logWriter.info(`Requesting key data from ${url}`);

    const jwksJson = await this.props.httpClient.get({ url: url });
    this.props.logWriter.info(`jwksJson: ${jwksJson}`);
    const jwkList = JSON.parse(jwksJson.body as string) as JwksResponse;
    this.props.logWriter.info(JSON.stringify(jwkList));
    const jwk = jwkList.keys.find((x) => x.kid === kid);
    const result = jwk as jwkToPem.JWK;

    return result;
  };

  private getJwksUrl = async (issuer: string): Promise<string> => {
    const wellKnownOidcConfig = await this.getOpenIdConfigurationFromIssuer(issuer);
    return wellKnownOidcConfig.jwks_uri;
  };

  private getOpenIdConfigurationFromIssuer = async (issuer: string): Promise<WellKnownOpenIdConfiguration> => {
    const url = this.getOpenIdConfigurationUrl(issuer);
    console.info(url);
    const oidcConfigJson = await this.props.httpClient.get({ url: url });
    return JSON.parse(oidcConfigJson.body as string) as WellKnownOpenIdConfiguration;
  };

  private getOpenIdConfigurationUrl = (issuer: string): string => {
    let baseUrl = issuer;
    if (!baseUrl.endsWith('/')) {
      baseUrl = `${baseUrl}/`;
    }
    return `${baseUrl}.well-known/openid-configuration`;
  };
}
