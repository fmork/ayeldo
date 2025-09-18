import type {
  TenantId,
  TenantMembershipDto,
  TenantMembershipId,
  TenantMembershipRole,
  TenantMembershipStatus,
  Uuid,
} from '@ayeldo/types';
import {
  tenantMembershipGrantedEventSchema,
  tenantMembershipRevokedEventSchema,
} from '@ayeldo/types';
import type { IEventPublisher } from '../ports/events';
import type { ITenantMembershipRepo } from '../ports/repositories';
import { NotFoundError } from '../errors';

export interface TenantAccessServiceProps {
  readonly membershipRepo: ITenantMembershipRepo;
  readonly eventPublisher: IEventPublisher;
  readonly uuidGenerator: () => Uuid;
  readonly clock?: () => Date;
}

export interface GrantMembershipInput {
  readonly tenantId: TenantId;
  readonly userId: Uuid;
  readonly role: TenantMembershipRole;
  readonly status: TenantMembershipStatus;
}

export interface ChangeRoleInput {
  readonly tenantId: TenantId;
  readonly userId: Uuid;
  readonly role: TenantMembershipRole;
}

export interface RevokeMembershipInput {
  readonly tenantId: TenantId;
  readonly userId: Uuid;
}

export class TenantAccessService {
  private readonly membershipRepo: ITenantMembershipRepo;
  private readonly eventPublisher: IEventPublisher;
  private readonly uuidGenerator: () => Uuid;
  private readonly clock: () => Date;

  public constructor(props: TenantAccessServiceProps) {
    this.membershipRepo = props.membershipRepo;
    this.eventPublisher = props.eventPublisher;
    this.uuidGenerator = props.uuidGenerator;
    this.clock = props.clock ?? ((): Date => new Date());
  }

  public async grantMembership(input: GrantMembershipInput): Promise<TenantMembershipDto> {
    const existing = await this.membershipRepo.findMembership(input.tenantId, input.userId);
    const nowIso = this.clock().toISOString();

    if (existing) {
      if (existing.role === input.role && existing.status === input.status) {
        return existing;
      }
      const updated: TenantMembershipDto = {
        ...existing,
        role: input.role,
        status: input.status,
        updatedAt: nowIso,
      };
      await this.membershipRepo.putMembership(updated);
      await this.publishGrantedEvent(updated, nowIso);
      return updated;
    }

    const membershipId = this.uuidGenerator();
    const membership: TenantMembershipDto = {
      membershipId,
      tenantId: input.tenantId,
      userId: input.userId,
      role: input.role,
      status: input.status,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await this.membershipRepo.putMembership(membership);
    await this.publishGrantedEvent(membership, nowIso);
    return membership;
  }

  public async changeRole(input: ChangeRoleInput): Promise<TenantMembershipDto> {
    const existing = await this.membershipRepo.findMembership(input.tenantId, input.userId);
    if (!existing) {
      throw new NotFoundError(
        `No membership found for tenant ${input.tenantId} and user ${input.userId}`,
      );
    }
    if (existing.role === input.role) {
      return existing;
    }
    const nowIso = this.clock().toISOString();
    const updated: TenantMembershipDto = {
      ...existing,
      role: input.role,
      updatedAt: nowIso,
    };
    await this.membershipRepo.putMembership(updated);
    await this.publishGrantedEvent(updated, nowIso);
    return updated;
  }

  public async revokeMembership(
    input: RevokeMembershipInput,
  ): Promise<TenantMembershipDto | undefined> {
    const existing = await this.membershipRepo.findMembership(input.tenantId, input.userId);
    if (!existing) {
      return undefined;
    }
    if (existing.status === 'revoked') {
      return existing;
    }
    const nowIso = this.clock().toISOString();
    const updated: TenantMembershipDto = {
      ...existing,
      status: 'revoked',
      updatedAt: nowIso,
    };
    await this.membershipRepo.putMembership(updated);
    await this.publishRevokedEvent(existing, nowIso);
    return updated;
  }

  public async getMembership(
    tenantId: TenantId,
    userId: Uuid,
  ): Promise<TenantMembershipDto | undefined> {
    return this.membershipRepo.findMembership(tenantId, userId);
  }

  public async getMembershipById(
    membershipId: TenantMembershipId,
  ): Promise<TenantMembershipDto | undefined> {
    return this.membershipRepo.findMembershipById(membershipId);
  }

  public async listMembershipsForUser(userId: Uuid): Promise<readonly TenantMembershipDto[]> {
    return this.membershipRepo.listMembershipsByUser(userId);
  }

  public async listMembershipsForTenant(
    tenantId: TenantId,
  ): Promise<readonly TenantMembershipDto[]> {
    return this.membershipRepo.listMembershipsByTenant(tenantId);
  }

  private async publishGrantedEvent(
    membership: TenantMembershipDto,
    occurredAt: string,
  ): Promise<void> {
    const event = tenantMembershipGrantedEventSchema.parse({
      id: this.uuidGenerator(),
      type: 'TenantMembershipGranted',
      occurredAt,
      tenantId: membership.tenantId,
      payload: {
        membershipId: membership.membershipId,
        userId: membership.userId,
        role: membership.role,
        status: membership.status,
      },
    });
    await this.eventPublisher.publish(event);
  }

  private async publishRevokedEvent(
    previous: TenantMembershipDto,
    occurredAt: string,
  ): Promise<void> {
    const event = tenantMembershipRevokedEventSchema.parse({
      id: this.uuidGenerator(),
      type: 'TenantMembershipRevoked',
      occurredAt,
      tenantId: previous.tenantId,
      payload: {
        membershipId: previous.membershipId,
        userId: previous.userId,
        previousRole: previous.role,
        previousStatus: previous.status,
      },
    });
    await this.eventPublisher.publish(event);
  }
}
