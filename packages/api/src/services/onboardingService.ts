import type { TenantDto } from '@ayeldo/types';
import type { ILogWriter } from '@fmork/backend-core';
import type { SessionService } from './sessionService';
import type { TenantService } from './tenantService';

export interface OnboardingServiceDeps {
  readonly tenantService: TenantService;
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
  public async createTenantAndMaybeSignIn(body: unknown): Promise<{
    tenant: TenantDto;
    session?: { sid: string; csrf: string } | undefined;
  }> {
    // Delegate tenant creation to TenantService (validates input and emits events)
    const tenant = await this.deps.tenantService.createTenantFromRequest(body);

    // Placeholder: user creation would happen here if a user repo exists.

    // If sessions service is available, create a session-like response. The
    // SessionService in this repo exposes completeLogin for OIDC flows, but
    // does not include a direct create-for-user helper; therefore creating a
    // minimal session is out-of-scope. We'll return undefined for now.
    let sessionOut: { sid: string; csrf: string } | undefined;
    if (this.deps.sessions) {
      // Many setups create sid/csrf via SessionService.completeLogin; we don't
      // have an identity token here, so skip creating a server session for
      // now. Leave sessionOut undefined.
      this.deps.logger.info('Sessions available but onboarding does not auto-create sessions.');
    }

    return { tenant, session: sessionOut };
  }
}

export default OnboardingService;
