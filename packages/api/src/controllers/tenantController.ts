// types from core are not required here; TenantService handles repo/publisher
import type { HttpResponse, HttpRouter, ILogWriter } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
import type { TenantService } from '../services/tenantService';
// zod not used in this controller
import { requireCsrfForController } from '../middleware/csrfGuard';

export interface TenantControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly tenantService: TenantService;
}

/**
 * Public controller exposing tenant onboarding endpoints.
 * POST /tenants - create a tenant and emit TenantCreated event.
 */
export class TenantController extends PublicController {
  private readonly tenantService: TenantService;
  public constructor(props: TenantControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.tenantService = props.tenantService;
  }

  public initialize(): HttpRouter {
    const requireCsrf = requireCsrfForController;

    // POST /tenants - create a tenant (public endpoint, but require CSRF for safety)
    this.addPost(
      '/tenants',
      requireCsrf(async (req, res) => {
        // Delegate creation to injected TenantService (one-liner)
        await this.performRequest(
          () =>
            this.tenantService.createTenantFromRequest((req as unknown as { body: unknown }).body),
          res as unknown as HttpResponse,
          () => 201,
        );
      }),
    );

    return this.getRouter();
  }
}
