import { Album, PriceList } from '@ayeldo/core';
import type { IEventPublisher } from '@ayeldo/core/src/ports/events';
import type { IAlbumRepo, IPriceListRepo } from '@ayeldo/core/src/ports/repositories';
import type { IUserRepo } from '@ayeldo/core/src/ports/userRepo';
import type { TenantDto, UserDto } from '@ayeldo/types';
import { makeUlid } from '@ayeldo/utils';
import type { ILogWriter } from '@fmork/backend-core';
import type { SessionService } from './sessionService';
import type { TenantService } from './tenantService';

export interface OnboardingServiceDeps {
  readonly tenantService: TenantService;
  readonly userRepo: IUserRepo;
  readonly eventPublisher: IEventPublisher;
  readonly albumRepo?: IAlbumRepo; // optional for seeding
  readonly priceListRepo?: IPriceListRepo; // optional for seeding
  readonly sessions?: SessionService; // optional in case BFF sessions are not configured
  readonly logger: ILogWriter;
}

export class OnboardingService {
  private readonly deps: OnboardingServiceDeps;

  public constructor(deps: OnboardingServiceDeps) {
    this.deps = deps;
  }

  /**
   * Create tenant (and optionally an admin user). Returns created tenant and,
   * if sessions are available, a session payload { sid, csrf } suitable for
   * setting cookies.
   */
  public async createTenantAndMaybeSignIn(
    body: unknown,
    oidcIdentity?: { sub: string; email: string; name?: string },
  ): Promise<{
    tenant: TenantDto;
    adminUser: UserDto;
    session?: { sid: string; csrf: string } | undefined;
  }> {
    // 1. Create tenant
    const tenant = await this.deps.tenantService.createTenantFromRequest(body);

    // 2. Find existing admin user by OIDC identity
    if (!oidcIdentity) {
      throw new Error('OIDC identity required for onboarding admin user');
    }

    // User should already exist from sign-in flow
    let adminUser = await this.deps.userRepo.getUserByOidcSub(oidcIdentity.sub);
    if (!adminUser) {
      // Fallback: try to find by email
      adminUser = await this.deps.userRepo.getUserByEmail(oidcIdentity.email);
      if (!adminUser) {
        throw new Error(
          `No user found for OIDC identity ${oidcIdentity.sub} or email ${oidcIdentity.email}`,
        );
      }
    }

    // 3. Associate user with tenant (update user's tenantId)
    // For now, we'll assume the user is created with the correct tenantId
    // In a more sophisticated system, we might need to update the user's tenant association

    // 4. Emit TenantCreated event
    await this.deps.eventPublisher.publish({
      id: makeUlid(),
      type: 'TenantCreated' as const,
      occurredAt: new Date().toISOString(),
      tenantId: tenant.id,
      payload: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
      },
    });

    // 5. Perform optional seeding if repositories are available
    if (this.deps.albumRepo && this.deps.priceListRepo) {
      await this.performSeeding(tenant.id);
    }

    // 6. Optionally create session (not implemented here)
    let sessionOut: { sid: string; csrf: string } | undefined;
    if (this.deps.sessions) {
      this.deps.logger.info('Sessions available but onboarding does not auto-create sessions.');
    }

    return { tenant, adminUser, session: sessionOut };
  }

  /**
   * Perform optional seeding for new tenant (sample album and price list).
   * This is idempotent - if the sample data already exists, it won't be duplicated.
   */
  private async performSeeding(tenantId: string): Promise<void> {
    // We checked that both repos exist before calling this method
    const albumRepo = this.deps.albumRepo as IAlbumRepo;
    const priceListRepo = this.deps.priceListRepo as IPriceListRepo;

    // Create sample album (idempotent - check if exists first)
    const sampleAlbumId = 'sample-album';
    const existingAlbum = await albumRepo.getById(tenantId, sampleAlbumId);
    if (!existingAlbum) {
      const sampleAlbum = new Album({
        id: sampleAlbumId,
        tenantId,
        title: 'Sample Album',
        description: 'Welcome to your first album! Upload images here to get started.',
        createdAt: new Date().toISOString(),
      });
      await albumRepo.put(sampleAlbum);
      this.deps.logger.info(`Created sample album for tenant ${tenantId}`);
    }

    // Create sample price list (idempotent - check if exists first)
    const samplePriceListId = 'default-prices';
    const existingPriceList = await priceListRepo.getById(tenantId, samplePriceListId);
    if (!existingPriceList) {
      const samplePriceList = new PriceList({
        id: samplePriceListId,
        tenantId,
        items: [
          { sku: 'print-4x6', label: '4x6 Print', unitPriceCents: 50 },
          { sku: 'print-5x7', label: '5x7 Print', unitPriceCents: 150 },
          { sku: 'print-8x10', label: '8x10 Print', unitPriceCents: 500 },
          { sku: 'digital-hires', label: 'High Resolution Digital', unitPriceCents: 1000 },
        ],
        createdAt: new Date().toISOString(),
      });
      await priceListRepo.put(samplePriceList);
      this.deps.logger.info(`Created sample price list for tenant ${tenantId}`);
    }
  }
}

export default OnboardingService;
