import type { IEventPublisher, ITenantRepo } from '@ayeldo/core';
import type { TenantCreateDto, TenantDto } from '@ayeldo/types';
import { makeEventEnvelopeSchema, tenantCreateSchema } from '@ayeldo/types';
import { makeUuid } from '@ayeldo/utils';
import type { ILogWriter, JsonUtil } from '@fmork/backend-core';
import { z } from 'zod';

export interface TenantServiceDeps {
  readonly tenantRepo: ITenantRepo;
  readonly publisher: IEventPublisher;
  readonly jsonUtil: JsonUtil;
  readonly logger: ILogWriter;
}

export class TenantService {
  private readonly deps: TenantServiceDeps;

  public constructor(deps: TenantServiceDeps) {
    this.deps = deps;
  }

  public async createTenantFromRequest(body: unknown): Promise<TenantDto> {
    // Parse and validate
    const parsed = this.deps.jsonUtil.getParsedRequestBody(body);
    const input = tenantCreateSchema.parse(parsed);

    const createDto = {
      name: input.name,
      ownerEmail: input.ownerEmail,
      ...(input.adminName !== undefined ? { adminName: input.adminName } : {}),
      ...(input.plan !== undefined ? { plan: input.plan } : {}),
    } as unknown as TenantCreateDto;

    const tenant = await this.deps.tenantRepo.createTenant(createDto, makeUuid());

    const evt = {
      id: makeUuid(),
      type: 'TenantCreated' as const,
      occurredAt: new Date().toISOString(),
      tenantId: tenant.id,
      payload: { tenantId: tenant.id, ownerEmail: tenant.ownerEmail },
    };

    makeEventEnvelopeSchema(
      'TenantCreated',
      z.object({ tenantId: z.string(), ownerEmail: z.string().email() }),
    ).parse(evt);
    await this.deps.publisher.publish(evt);

    return tenant;
  }
}
