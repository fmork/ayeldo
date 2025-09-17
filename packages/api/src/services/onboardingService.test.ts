import OnboardingService from './onboardingService';
import type { TenantService } from './tenantService';

describe('OnboardingService', () => {
  it('delegates tenant creation to TenantService', async () => {
    const fakeTenant = { id: 't-1', name: 'Acme', ownerEmail: 'o@e.com' } as any;
    const tenantSvc = {
      createTenantFromRequest: jest.fn().mockResolvedValue(fakeTenant),
    } as unknown as TenantService;
    const svc = new OnboardingService({ tenantService: tenantSvc, logger: console as any });

    const res = await svc.createTenantAndMaybeSignIn({ name: 'Acme', ownerEmail: 'o@e.com' });

    expect(tenantSvc.createTenantFromRequest).toHaveBeenCalled();
    expect(res.tenant).toEqual(fakeTenant);
    expect(res.session).toBeUndefined();
  });
});
