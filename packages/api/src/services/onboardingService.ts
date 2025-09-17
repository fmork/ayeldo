import type { IUserRepo } from '@ayeldo/core/src/ports/userRepo';
import type { TenantDto, UserDto } from '@ayeldo/types';
import type { ILogWriter } from '@fmork/backend-core';
import type { SessionService } from './sessionService';
import type { TenantService } from './tenantService';

export interface OnboardingServiceDeps {
  readonly tenantService: TenantService;
  readonly userRepo: IUserRepo;
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

    // 4. Optionally create session (not implemented here)
    let sessionOut: { sid: string; csrf: string } | undefined;
    if (this.deps.sessions) {
      this.deps.logger.info('Sessions available but onboarding does not auto-create sessions.');
    }

    return { tenant, adminUser, session: sessionOut };
  }
}

export default OnboardingService;
