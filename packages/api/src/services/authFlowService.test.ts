import { AuthFlowService } from './authFlowService';

// Minimal mock types
interface MockOidc {
  buildAuthorizeUrl: (p: { state: string; nonce: string; codeChallenge: string }) => string;
  exchangeCode?: unknown; // not needed directly
}

interface CreatedState {
  state: string;
  nonce: string;
  codeVerifier: string;
  codeChallenge: string;
}

describe('AuthFlowService', () => {
  const mkLogger = () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  });

  function mkUserRepo(overrides?: Partial<any>) {
    return {
      getUserByOidcSub: jest.fn().mockResolvedValue(null),
      getUserByEmail: jest.fn().mockResolvedValue(null),
      createUser: jest.fn().mockResolvedValue({ id: 'user-id', email: 'test@example.com' }),
      updateUserSub: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as any;
  }

  function mkSessionService(overrides?: Partial<any>) {
    const created: CreatedState[] = [];
    return {
      createLoginState: () => {
        const s: CreatedState = {
          state: Math.random().toString(36).slice(2, 10),
          nonce: 'nonce',
          codeVerifier: 'verifier',
          codeChallenge: 'challenge',
        };
        created.push(s);
        return s;
      },
      completeLogin: jest.fn().mockResolvedValue({
        sid: 'sid123',
        csrf: 'csrf456',
        profile: { sub: 'user-sub', email: 'e@example.com', name: 'User' },
      }),
      getSession: jest.fn().mockResolvedValue(undefined),
      logout: jest.fn().mockResolvedValue(undefined),
      _createdStates: created,
      ...overrides,
    } as any;
  }

  function mkOidc(urlTemplate?: (s: CreatedState) => string) {
    return {
      buildAuthorizeUrl: ({ state }: { state: string }) => {
        return urlTemplate
          ? urlTemplate({ state } as any)
          : `https://issuer/authorize?state=${state}`;
      },
      exchangeCode: jest.fn().mockResolvedValue({}),
    } as any;
  }

  function mkTenantAccess(overrides?: Partial<any>) {
    return {
      listMembershipsForUser: jest.fn().mockResolvedValue([]),
      grantMembership: jest.fn(),
      changeRole: jest.fn(),
      revokeMembership: jest.fn(),
      ...overrides,
    } as any;
  }

  test('buildAuthorizeUrl without redirect uses plain state', () => {
    const sessions = mkSessionService();
    const oidc = mkOidc();
    const userRepo = mkUserRepo();
    const tenantAccess = mkTenantAccess();
    const svc = new AuthFlowService({
      oidc,
      sessions,
      userRepo,
      tenantAccess,
      logger: mkLogger() as any,
    });
    const { url } = svc.buildAuthorizeUrl();
    const created = (sessions as any)._createdStates[0];
    expect(url).toContain(`state=${created.state}`);
  });

  test('buildAuthorizeUrl with redirect encodes redirect in state suffix', () => {
    const sessions = mkSessionService();
    const oidc = mkOidc(({ state }) => `auth?state=${state}`);
    const userRepo = mkUserRepo();
    const tenantAccess = mkTenantAccess();
    const svc = new AuthFlowService({
      oidc,
      sessions,
      userRepo,
      tenantAccess,
      logger: mkLogger() as any,
    });
    const { url } = svc.buildAuthorizeUrl('/target/path');
    const created = (sessions as any)._createdStates[0];
    // The authorize URL should contain the base state part
    expect(url).toContain(`state=${created.state}.`);
  });

  test('buildLoginRedirectUrl uses fresh state each call', () => {
    const sessions = mkSessionService();
    const oidc = mkOidc();
    const userRepo = mkUserRepo();
    const tenantAccess = mkTenantAccess();
    const svc = new AuthFlowService({
      oidc,
      sessions,
      userRepo,
      tenantAccess,
      logger: mkLogger() as any,
    });
    const url1 = svc.buildLoginRedirectUrl();
    const url2 = svc.buildLoginRedirectUrl();
    expect(url1).not.toEqual(url2); // random state differs
  });

  test('handleCallback decodes state suffix into redirectTarget', async () => {
    const sessions = mkSessionService();
    const stateBase = 'abc123';
    sessions.createLoginState = () => ({
      state: stateBase,
      nonce: 'n',
      codeVerifier: 'v',
      codeChallenge: 'c',
    });
    const oidc = mkOidc();
    const userRepo = mkUserRepo();
    const tenantAccess = mkTenantAccess();
    const svc = new AuthFlowService({
      oidc,
      sessions,
      userRepo,
      tenantAccess,
      logger: mkLogger() as any,
    });
    // simulate recorded state so completeLogin passes
    (sessions.completeLogin as any).mockResolvedValue({
      sid: 'sid1',
      csrf: 'csrf1',
      profile: { sub: 'sub1' },
    });

    const encodedRedirect = Buffer.from('/after', 'utf8').toString('base64url');
    const result = await svc.handleCallback({
      code: 'codeX',
      state: `${stateBase}.${encodedRedirect}`,
    });
    expect(result.redirectTarget).toBe('/after');
    expect(result.sid).toBe('sid1');
  });

  test('handleCallback sanitizes unsafe redirect', async () => {
    const sessions = mkSessionService();
    const stateBase = 'zzz999';
    sessions.createLoginState = () => ({
      state: stateBase,
      nonce: 'n',
      codeVerifier: 'v',
      codeChallenge: 'c',
    });
    (sessions.completeLogin as any).mockResolvedValue({
      sid: 'sid2',
      csrf: 'csrf2',
      profile: { sub: 'sub2' },
    });
    const oidc = mkOidc();
    const userRepo = mkUserRepo();
    const tenantAccess = mkTenantAccess();
    const svc = new AuthFlowService({
      oidc,
      sessions,
      userRepo,
      tenantAccess,
      logger: mkLogger() as any,
    });

    const encoded = Buffer.from('javascript:alert(1)', 'utf8').toString('base64url');
    const result = await svc.handleCallback({ code: 'x', state: `${stateBase}.${encoded}` });
    expect(result.redirectTarget).toBe('/');
  });

  test('sessionInfo returns loggedOut when no sid', async () => {
    const sessions = mkSessionService();
    const oidc = mkOidc();
    const userRepo = mkUserRepo();
    const tenantAccess = mkTenantAccess();
    const svc = new AuthFlowService({
      oidc,
      sessions,
      userRepo,
      tenantAccess,
      logger: mkLogger() as any,
    });
    const info = await svc.sessionInfo(undefined);
    expect(info.loggedIn).toBe(false);
  });

  test('sessionInfo returns loggedIn profile when session exists', async () => {
    const sessions = mkSessionService({
      getSession: jest.fn().mockResolvedValue({
        sub: 'u1',
        email: 'a@b.c',
        name: 'A',
        fullName: 'Person A',
      }),
    });
    const oidc = mkOidc();
    const userRepo = mkUserRepo();
    const tenantAccess = mkTenantAccess();
    const svc = new AuthFlowService({
      oidc,
      sessions,
      userRepo,
      tenantAccess,
      logger: mkLogger() as any,
    });
    const info = await svc.sessionInfo('sidX');
    expect(info.loggedIn).toBe(true);
    if (info.loggedIn) {
      expect(info.sub).toBe('u1');
      expect(info.user.email).toBe('a@b.c');
      expect(info.user.fullName).toBe('Person A');
      expect(info.user.id).toBe('u1');
      expect(info.tenantIds).toEqual([]);
    }
  });

  test('sessionInfo returns active tenantIds from membership service', async () => {
    const sessions = mkSessionService({
      getSession: jest.fn().mockResolvedValue({
        sub: 'u1',
        email: 'a@b.c',
        name: 'A',
        fullName: 'Person A',
      }),
    });
    const oidc = mkOidc();
    const userRepo = mkUserRepo({
      getUserByOidcSub: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@b.c',
        oidcSub: 'u1',
      }),
    });
    const tenantAccess = mkTenantAccess({
      listMembershipsForUser: jest
        .fn()
        .mockResolvedValue([
          {
            membershipId: '11111111-1111-4111-8111-aaaaaaaaaaaa',
            tenantId: 'tenant-123',
            userId: 'user-1',
            role: 'owner',
            status: 'active',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          {
            membershipId: '22222222-2222-4222-8222-bbbbbbbbbbbb',
            tenantId: 'tenant-999',
            userId: 'user-1',
            role: 'member',
            status: 'invited',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
          },
        ]),
    });
    const svc = new AuthFlowService({
      oidc,
      sessions,
      userRepo,
      tenantAccess,
      logger: mkLogger() as any,
    });
    const info = await svc.sessionInfo('sidX');
    expect(info.loggedIn).toBe(true);
    if (info.loggedIn) {
      expect(info.sub).toBe('u1');
      expect(info.user.email).toBe('a@b.c');
      expect(info.user.id).toBe('user-1');
      expect(info.user.fullName).toBe('Person A');
      expect(info.tenantIds).toEqual(['tenant-123']);
    }
    expect(tenantAccess.listMembershipsForUser).toHaveBeenCalledWith('user-1');
  });

  test('sessionInfo returns empty tenantIds when user has no tenant', async () => {
    const sessions = mkSessionService({
      getSession: jest.fn().mockResolvedValue({
        sub: 'u1',
        email: 'a@b.c',
        name: 'A',
        fullName: 'Person A',
      }),
    });
    const oidc = mkOidc();
    const userRepo = mkUserRepo({
      getUserByOidcSub: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@b.c',
        oidcSub: 'u1',
      }),
    });
    const tenantAccess = mkTenantAccess({
      listMembershipsForUser: jest.fn().mockResolvedValue([]),
    });
    const svc = new AuthFlowService({
      oidc,
      sessions,
      userRepo,
      tenantAccess,
      logger: mkLogger() as any,
    });
    const info = await svc.sessionInfo('sidX');
    expect(info.loggedIn).toBe(true);
    if (info.loggedIn) {
      expect(info.sub).toBe('u1');
      expect(info.user.email).toBe('a@b.c');
      expect(info.user.fullName).toBe('Person A');
      expect(info.tenantIds).toEqual([]);
    }
    expect(tenantAccess.listMembershipsForUser).toHaveBeenCalledWith('user-1');
  });

  test('sessionInfo handles user lookup failure gracefully', async () => {
    const sessions = mkSessionService({
      getSession: jest.fn().mockResolvedValue({
        sub: 'u1',
        email: 'a@b.c',
        name: 'A',
        fullName: 'Person A',
      }),
    });
    const oidc = mkOidc();
    const userRepo = mkUserRepo({
      getUserByOidcSub: jest.fn().mockRejectedValue(new Error('DB connection failed')),
    });
    const tenantAccess = mkTenantAccess();
    const svc = new AuthFlowService({
      oidc,
      sessions,
      userRepo,
      tenantAccess,
      logger: mkLogger() as any,
    });
    const info = await svc.sessionInfo('sidX');
    expect(info.loggedIn).toBe(true);
    if (info.loggedIn) {
      expect(info.sub).toBe('u1');
      expect(info.user.email).toBe('a@b.c');
      expect(info.user.fullName).toBe('Person A');
      expect(info.tenantIds).toEqual([]); // Should not include tenant IDs due to error
    }
  });

  test('logout calls underlying session logout when sid present', async () => {
    const sessions = mkSessionService();
    const oidc = mkOidc();
    const userRepo = mkUserRepo();
    const tenantAccess = mkTenantAccess();
    const svc = new AuthFlowService({
      oidc,
      sessions,
      userRepo,
      tenantAccess,
      logger: mkLogger() as any,
    });
    await svc.logout('sid1');
    expect(sessions.logout).toHaveBeenCalledWith('sid1');
  });
});
