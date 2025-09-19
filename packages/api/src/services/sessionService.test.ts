import type { ILogWriter } from '@ayeldo/backend-core';
import type { ISessionStore, IStateStore } from '@ayeldo/core';
import { SessionService } from './sessionService';

const now = Math.floor(Date.now() / 1000);

function makeMockStore() {
  const map = new Map<string, any>();
  return {
    putSession: jest.fn(async (rec: any) => map.set(rec.sid, rec)),
    getSession: jest.fn(async (sid: string) => map.get(sid)),
    deleteSession: jest.fn(async (sid: string) => map.delete(sid)),
  } as unknown as ISessionStore;
}

function makeMockStates(): IStateStore {
  return {
    putState: async () => undefined,
    getState: async () => undefined,
    deleteState: async () => undefined,
  } as IStateStore;
}

function makeLogger(): ILogWriter {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as ILogWriter;
}

describe('SessionService extendSessionTtlIfNeeded', () => {
  it('updates session when sessionRemaining < accessRemaining', async () => {
    const store = makeMockStore();
    const svc = new SessionService({
      store,
      states: makeMockStates(),
      encKeyB64: 'a',
      encKid: 'k',
      bffJwtSecretB64: 's',
      issuer: 'i',
      audience: 'a',
      logger: makeLogger(),
    });

    const sid = 's1';
    const session = {
      sid,
      sub: 'u1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date(new Date().getTime() - 120 * 1000).toISOString(), // older than 60s
      ttl: now + 30, // session ends soon
      tokensEnc: { kid: 'k', iv: '', tag: '', ciphertext: '' },
    } as any;

    await svc['extendSessionTtlIfNeeded'](session, now + 300);

    expect(store.putSession).toHaveBeenCalled();
    const updated = (store.putSession as jest.Mock).mock.calls[0][0];
    expect(updated.sid).toBe(sid);
    expect(updated.ttl).toBeGreaterThan(now + 30);
  });

  it('does not update when sessionRemaining > accessRemaining and updated recently', async () => {
    const store = makeMockStore();
    const svc = new SessionService({
      store,
      states: makeMockStates(),
      encKeyB64: 'a',
      encKid: 'k',
      bffJwtSecretB64: 's',
      issuer: 'i',
      audience: 'a',
      logger: makeLogger(),
    });

    const sid = 's2';
    const session = {
      sid,
      sub: 'u2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), // recent
      ttl: now + 1000, // plenty of session left
      tokensEnc: { kid: 'k', iv: '', tag: '', ciphertext: '' },
    } as any;

    await svc['extendSessionTtlIfNeeded'](session, now + 100);

    expect(store.putSession).not.toHaveBeenCalled();
  });
});
