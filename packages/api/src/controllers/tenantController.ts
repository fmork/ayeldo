import type { IEventPublisher, ITenantRepo } from '@ayeldo/core';
import { makeEventEnvelopeSchema, tenantCreateSchema } from '@ayeldo/types';
import { makeUlid } from '@ayeldo/utils';
import type { HttpResponse, HttpRouter, ILogWriter, JsonUtil } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
import { z } from 'zod';
import { requireCsrfForController } from '../middleware/csrfGuard';

export interface TenantControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly jsonUtil: JsonUtil;
  readonly tenantRepo: ITenantRepo;
  readonly publisher: IEventPublisher;
}

/**
 * Public controller exposing tenant onboarding endpoints.
 * POST /tenants - create a tenant and emit TenantCreated event.
 */
export class TenantController extends PublicController {
  private readonly jsonUtil: JsonUtil;
  private readonly tenantRepo: ITenantRepo;
  private readonly publisher: IEventPublisher;

  public constructor(props: TenantControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.jsonUtil = props.jsonUtil;
    this.tenantRepo = props.tenantRepo;
    this.publisher = props.publisher;
  }

  public initialize(): HttpRouter {
    const requireCsrf = requireCsrfForController;

    // POST /tenants - create a tenant (public endpoint, but require CSRF for safety)
    this.addPost(
      '/tenants',
      requireCsrf(async (req, res) => {
        // Parse/validate body
        const body = this.jsonUtil.getParsedRequestBody((req as unknown as { body: unknown }).body);
        const parsed = tenantCreateSchema.parse(body);

        // Build a TenantCreateDto-compliant object (avoid passing undefined explicitly)
        const input: { name: string; ownerEmail: string; adminName?: string; plan?: string } = {
          name: parsed.name,
          ownerEmail: parsed.ownerEmail,
        };
        if (parsed.adminName !== undefined) input.adminName = parsed.adminName;
        if (parsed.plan !== undefined) input.plan = parsed.plan;

        await this.performRequest(
          async () => {
            const tenant = await this.tenantRepo.createTenant(
              input as unknown as {
                name: string;
                ownerEmail: string;
                adminName?: string;
                plan?: string;
              },
              makeUlid(),
            );

            // Emit TenantCreated event
            const evt = {
              id: makeUlid(),
              type: 'TenantCreated' as const,
              occurredAt: new Date().toISOString(),
              tenantId: tenant.id,
              payload: { tenantId: tenant.id, ownerEmail: tenant.ownerEmail },
            };

            // Validate event envelope shape
            makeEventEnvelopeSchema(
              'TenantCreated',
              z.object({ tenantId: z.string(), ownerEmail: z.string().email() }),
            ).parse(evt);

            await this.publisher.publish(evt);

            return tenant;
          },
          res as unknown as HttpResponse,
          () => 201,
        );
      }),
    );

    return this.getRouter();
  }
}
