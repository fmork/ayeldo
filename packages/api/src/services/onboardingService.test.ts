import OnboardingService from './onboardingService';
import type { TenantService } from './tenantService';

describe('OnboardingService', () => {
  it('delegates tenant creation to TenantService and finds existing user', async () => {
    const fakeTenant = { id: 't-1', name: 'Acme', ownerEmail: 'o@e.com' } as any;
    const existingUser = { id: 'user-1', email: 'o@e.com', oidcSub: 'oidc-123' } as any;
    const tenantSvc = {
      createTenantFromRequest: jest.fn().mockResolvedValue(fakeTenant),
    } as unknown as TenantService;
    const userRepo = {
      getUserByOidcSub: jest.fn().mockResolvedValue(existingUser),
      getUserByEmail: jest.fn().mockResolvedValue(null),
    } as any;
    const svc = new OnboardingService({
      tenantService: tenantSvc,
      userRepo,
      logger: console as any,
    });

    const oidcIdentity = { sub: 'oidc-123', email: 'o@e.com', name: 'Owner' };
    const res = await svc.createTenantAndMaybeSignIn(
      { name: 'Acme', ownerEmail: 'o@e.com' },
      oidcIdentity,
    );

    expect(tenantSvc.createTenantFromRequest).toHaveBeenCalled();
    expect(userRepo.getUserByOidcSub).toHaveBeenCalledWith('oidc-123');
    expect(res.tenant).toEqual(fakeTenant);
    expect(res.adminUser).toEqual(existingUser);
    expect(res.session).toBeUndefined();
  });
});
