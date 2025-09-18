import type { ISessionStore, IStateStore } from '@ayeldo/core';
import type { SessionRecord } from '@ayeldo/types';
import type { ILogWriter } from '@fmork/backend-core';
import * as crypto from 'node:crypto';
import type { TokenBundle } from '../types/session';
import { base64url, decryptTokens, encryptTokens, randomId, signHs256Jwt } from './crypto';
import type { OidcClientOpenId } from './oidcOpenIdClient';

export interface SessionServiceProps {
  readonly store: ISessionStore;
  readonly states: IStateStore;
  readonly encKeyB64: string;
  readonly encKid: string;
  readonly bffJwtSecretB64: string;
  readonly issuer: string;
  readonly audience: string;
  readonly logger: ILogWriter;
}

function toCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64url(hash);
}

export class SessionService {
  private readonly store: ISessionStore;
  private readonly states: IStateStore;
  private readonly encKeyB64: string;
  private readonly encKid: string;
  private readonly bffJwtSecretB64: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly logger: ILogWriter;

  public constructor(props: SessionServiceProps) {
    this.store = props.store;
    this.states = props.states;
    this.encKeyB64 = props.encKeyB64;
    this.encKid = props.encKid;
    this.bffJwtSecretB64 = props.bffJwtSecretB64;
    this.issuer = props.issuer;
    this.audience = props.audience;
    this.logger = props.logger;
  }

  public createLoginState(): {
    state: string;
    nonce: string;
    codeVerifier: string;
    codeChallenge: string;
  } {
    const state = randomId(16);
    const nonce = randomId(16);
    const codeVerifier = randomId(32);
    const codeChallenge = toCodeChallenge(codeVerifier);
    const ttl = Math.floor(Date.now() / 1000) + 10 * 60;
    this.states
      .putState({ state, nonce, codeVerifier, createdAt: new Date().toISOString(), ttl })
      .catch(() => undefined);
    return { state, nonce, codeVerifier, codeChallenge };
  }

  public async completeLogin(
    oidc: Pick<OidcClientOpenId, 'exchangeCode'>,
    params: { code: string; state: string },
  ): Promise<{
    sid: string;
    csrf: string;
    profile: { sub: string; email?: string; name?: string };
  }> {
    this.logger.info(`Completing login for state=${params.state}`);
    const st = await this.states.getState(params.state);
    if (!st) throw new Error('Invalid state');
    this.logger.info(`State retrieved successfully: ${JSON.stringify(st)}`);
    await this.states.deleteState(params.state);
    this.logger.info(`State deleted: ${params.state}. Exchanging code for tokens...`);
    const tokens = await oidc.exchangeCode({
      code: params.code,
      state: params.state,
      nonce: st.nonce,
      codeVerifier: st.codeVerifier,
    });
    this.logger.info('Token exchange successful.');

    const nowSec = Math.floor(Date.now() / 1000);
    const bundle: TokenBundle = {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token,
      expiresAt: nowSec + tokens.expires_in,
    };

    this.logger.info('Encrypting tokens and creating session record...');
    const enc = encryptTokens(this.encKeyB64, this.encKid, bundle);

    const sid = randomId(18);
    const csrf = randomId(18);
    const profile = this.parseIdToken(tokens.id_token);
    const ttl = nowSec + 7 * 24 * 3600; // 7 days default
    const rec: SessionRecord = {
      sid,
      sub: profile.sub ?? '',
      ...(profile.email !== undefined ? { email: profile.email } : {}),
      ...(profile.name !== undefined ? { name: profile.name } : {}),
      ...(typeof (profile as Record<string, unknown>)['cognito:groups'] !== 'undefined'
        ? { roles: (profile as Record<string, unknown>)['cognito:groups'] as readonly string[] }
        : profile.roles !== undefined
          ? { roles: profile.roles }
          : {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ttl,
      tokensEnc: enc,
    } as const;

    this.logger.info(`Session record created successfully: ${JSON.stringify(rec)}`);
    await this.store.putSession(rec);
    const profileOut: { sub: string; email?: string; name?: string } = { sub: rec.sub };
    if (rec.email !== undefined) profileOut.email = rec.email;
    if (rec.name !== undefined) profileOut.name = rec.name;
    return { sid, csrf, profile: profileOut };
  }

  public async getSession(sid: string): Promise<SessionRecord | undefined> {
    const session: SessionRecord | undefined = await this.store.getSession(sid);
    if (!session) {
      return undefined;
    }

    const nowSec: number = Math.floor(Date.now() / 1000);
    if (session.ttl <= nowSec) {
      this.logger.warn(`Session expired for sid=${sid}`);
      return undefined;
    }

    return session;
  }

  public async logout(sid: string): Promise<void> {
    await this.store.deleteSession(sid);
  }

  /**
   * Get the OIDC access token from a session for JWT validation.
   * Returns undefined if session doesn't exist or tokens are expired.
   */
  public async getOidcAccessToken(sid: string): Promise<string | undefined> {
    const session = await this.store.getSession(sid);
    if (!session) return undefined;

    try {
      const tokens = decryptTokens(this.encKeyB64, session.tokensEnc);
      const nowSec = Math.floor(Date.now() / 1000);

      // Check if tokens are still valid (with 1 minute buffer)
      if (tokens.expiresAt <= nowSec + 60) {
        this.logger.warn(`Access token expired for session ${sid}`);
        return undefined;
      }

      return tokens.accessToken;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Failed to decrypt tokens for session ${sid}`, error);
      return undefined;
    }
  }

  public signApiJwt(sub: string, tenantId?: string, roles?: readonly string[]): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.issuer,
      aud: this.audience,
      sub,
      iat: now,
      nbf: now,
      exp: now + 60,
      ...(tenantId ? { tenantId } : {}),
      ...(roles ? { roles } : {}),
      jti: randomId(12),
    } as const;
    return signHs256Jwt(this.bffJwtSecretB64, payload);
  }

  private parseIdToken(idToken: string): {
    sub?: string;
    email?: string;
    name?: string;
    roles?: readonly string[];
  } {
    try {
      const parts = idToken.split('.');
      if (parts.length < 2) return {};
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8')) as unknown;
      return payload as { sub?: string; email?: string; name?: string; roles?: readonly string[] };
    } catch {
      return {};
    }
  }
}
