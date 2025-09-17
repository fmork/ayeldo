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
    const eventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as any;
    const svc = new OnboardingService({
      tenantService: tenantSvc,
      userRepo,
      eventPublisher,
      logger: console as any,
    });

    const oidcIdentity = { sub: 'oidc-123', email: 'o@e.com', name: 'Owner' };
    const res = await svc.createTenantAndMaybeSignIn(
      { name: 'Acme', ownerEmail: 'o@e.com' },
      oidcIdentity,
    );

    expect(tenantSvc.createTenantFromRequest).toHaveBeenCalled();
    expect(userRepo.getUserByOidcSub).toHaveBeenCalledWith('oidc-123');
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TenantCreated',
        tenantId: 't-1',
        payload: expect.objectContaining({
          tenantId: 't-1',
          tenantName: 'Acme',
          adminUserId: 'user-1',
          adminEmail: 'o@e.com',
        }),
      }),
    );
    expect(res.tenant).toEqual(fakeTenant);
    expect(res.adminUser).toEqual(existingUser);
    expect(res.session).toBeUndefined();
  });

  it('performs seeding when album and price list repos are provided', async () => {
    const fakeTenant = { id: 't-2', name: 'Beta Corp', ownerEmail: 'b@example.com' } as any;
    const existingUser = { id: 'user-2', email: 'b@example.com', oidcSub: 'oidc-456' } as any;
    const tenantSvc = {
      createTenantFromRequest: jest.fn().mockResolvedValue(fakeTenant),
    } as unknown as TenantService;
    const userRepo = {
      getUserByOidcSub: jest.fn().mockResolvedValue(existingUser),
      getUserByEmail: jest.fn().mockResolvedValue(null),
    } as any;
    const eventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as any;
    const albumRepo = {
      getById: jest.fn().mockResolvedValue(null), // No existing album
      put: jest.fn().mockResolvedValue(undefined),
    } as any;
    const priceListRepo = {
      getById: jest.fn().mockResolvedValue(null), // No existing price list
      put: jest.fn().mockResolvedValue(undefined),
    } as any;

    const svc = new OnboardingService({
      tenantService: tenantSvc,
      userRepo,
      eventPublisher,
      albumRepo,
      priceListRepo,
      logger: console as any,
    });

    const oidcIdentity = { sub: 'oidc-456', email: 'b@example.com', name: 'Beta User' };
    const res = await svc.createTenantAndMaybeSignIn(
      { name: 'Beta Corp', ownerEmail: 'b@example.com' },
      oidcIdentity,
    );

    // Verify seeding operations were called
    expect(albumRepo.getById).toHaveBeenCalledWith('t-2', 'sample-album');
    expect(albumRepo.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sample-album',
        tenantId: 't-2',
        title: 'Sample Album',
      }),
    );
    expect(priceListRepo.getById).toHaveBeenCalledWith('t-2', 'default-prices');
    expect(priceListRepo.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'default-prices',
        tenantId: 't-2',
        items: expect.arrayContaining([
          expect.objectContaining({ sku: 'print-4x6', unitPriceCents: 50 }),
        ]),
      }),
    );

    expect(res.tenant).toEqual(fakeTenant);
    expect(res.adminUser).toEqual(existingUser);
  });

  it('skips seeding when repos are not provided', async () => {
    const fakeTenant = { id: 't-3', name: 'Gamma LLC', ownerEmail: 'g@example.com' } as any;
    const existingUser = { id: 'user-3', email: 'g@example.com', oidcSub: 'oidc-789' } as any;
    const tenantSvc = {
      createTenantFromRequest: jest.fn().mockResolvedValue(fakeTenant),
    } as unknown as TenantService;
    const userRepo = {
      getUserByOidcSub: jest.fn().mockResolvedValue(existingUser),
      getUserByEmail: jest.fn().mockResolvedValue(null),
    } as any;
    const eventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as any;

    const svc = new OnboardingService({
      tenantService: tenantSvc,
      userRepo,
      eventPublisher,
      logger: console as any,
    });

    const oidcIdentity = { sub: 'oidc-789', email: 'g@example.com', name: 'Gamma User' };
    const res = await svc.createTenantAndMaybeSignIn(
      { name: 'Gamma LLC', ownerEmail: 'g@example.com' },
      oidcIdentity,
    );

    // Should still work without seeding repos
    expect(res.tenant).toEqual(fakeTenant);
    expect(res.adminUser).toEqual(existingUser);
    expect(res.session).toBeUndefined();
  });
});
