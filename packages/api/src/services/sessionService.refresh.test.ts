import type { ILogWriter } from '@ayeldo/backend-core';
import * as crypto from 'node:crypto';
import { decryptTokens, encryptTokens } from './crypto';
import { SessionService } from './sessionService';

const now = Math.floor(Date.now() / 1000);

function makeLogger(): ILogWriter {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as ILogWriter;
}

describe('SessionService refresh flow', () => {
  it('refreshes expired access token and updates session', async () => {
    const sid = 'sess-refresh-1';
    const encKey = crypto.randomBytes(32).toString('base64');

    // initial (expired) token bundle
    const oldBundle = {
      accessToken: 'old-access',
      idToken: 'old-id',
      refreshToken: 'old-refresh',
      expiresAt: now - 10,
    } as const;

    const tokensEnc = encryptTokens(encKey, 'v1', oldBundle as any);

    const sessionRecord = {
      sid,
      sub: 'u1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ttl: now + 3600,
      tokensEnc,
    } as any;

    let stored: any = null;

    const store = {
      getSession: jest.fn(async (s: string) => (s === sid ? sessionRecord : undefined)),
      putSession: jest.fn(async (rec: any) => {
        stored = rec;
      }),
      deleteSession: jest.fn(async () => undefined),
    } as any;

    // Mock OIDC client
    const oidc = {
      refreshToken: jest.fn(async (refreshToken: string) => {
        return {
          access_token: 'new-access-xyz',
          id_token: 'new-id-xyz',
          refresh_token: 'new-refresh-xyz',
          expires_in: 600,
          token_type: 'Bearer',
        };
      }),
    } as any;

    const svc = new SessionService({
      store,
      states: {
        putState: async () => undefined,
        getState: async () => undefined,
        deleteState: async () => undefined,
      } as any,
      encKeyB64: encKey,
      encKid: 'v1',
      bffJwtSecretB64: 'b',
      issuer: 'i',
      audience: 'a',
      logger: makeLogger(),
      oidc,
    });

    const token = await svc.getOidcAccessToken(sid);
    expect(token).toBe('new-access-xyz');
    expect(oidc.refreshToken).toHaveBeenCalledWith('old-refresh');
    expect(store.putSession).toHaveBeenCalled();
    // verify stored tokens were updated and encrypted
    const decrypted = decryptTokens(encKey, stored.tokensEnc);
    expect(decrypted.accessToken).toBe('new-access-xyz');
    expect(decrypted.refreshToken).toBe('new-refresh-xyz');
    // ttl should have been updated to now + 2*expires_in
    expect(stored.ttl).toBeGreaterThan(now + 1000); // conservative
  });
});
