import type { ITenantMembershipRepo } from '@ayeldo/core/src/ports/repositories';
import type {
  TenantId,
  TenantMembershipDto,
  TenantMembershipId,
  Uuid,
} from '@ayeldo/types';
import { tenantMembershipSchema } from '@ayeldo/types';
import type { DdbClient } from '../ddbClient';
import {
  GSI2_NAME,
  gsi2MembershipByTenant,
  gsi2MembershipByUser,
  pkMembership,
  skMembership,
  skMembershipTenant,
  skMembershipUser,
} from '../keys';

interface TenantMembershipRepoDdbProps {
  readonly tableName: string;
  readonly client: DdbClient;
}

interface TenantMembershipMetadataItem {
  readonly PK: string;
  readonly SK: string;
  readonly type: 'TenantMembershipMetadata';
  readonly membershipId: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly role: TenantMembershipDto['role'];
  readonly status: TenantMembershipDto['status'];
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface TenantMembershipLookupItem {
  readonly PK: string;
  readonly SK: string;
  readonly type: 'TenantMembershipTenantLookup' | 'TenantMembershipUserLookup';
  readonly membershipId: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly role: TenantMembershipDto['role'];
  readonly status: TenantMembershipDto['status'];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly GSI2PK: string;
  readonly GSI2SK: string;
}

type TenantMembershipItem = TenantMembershipMetadataItem | TenantMembershipLookupItem;

function toMetadataItem(dto: TenantMembershipDto): TenantMembershipMetadataItem {
  return {
    PK: pkMembership(dto.membershipId),
    SK: skMembership(dto.membershipId),
    type: 'TenantMembershipMetadata',
    membershipId: dto.membershipId,
    tenantId: dto.tenantId,
    userId: dto.userId,
    role: dto.role,
    status: dto.status,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

function toTenantLookupItem(dto: TenantMembershipDto): TenantMembershipLookupItem {
  return {
    PK: pkMembership(dto.membershipId),
    SK: skMembershipTenant(dto.tenantId, dto.membershipId),
    type: 'TenantMembershipTenantLookup',
    membershipId: dto.membershipId,
    tenantId: dto.tenantId,
    userId: dto.userId,
    role: dto.role,
    status: dto.status,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    ...gsi2MembershipByTenant(dto.tenantId, dto.userId, dto.membershipId),
  };
}

function toUserLookupItem(dto: TenantMembershipDto): TenantMembershipLookupItem {
  return {
    PK: pkMembership(dto.membershipId),
    SK: skMembershipUser(dto.userId, dto.membershipId),
    type: 'TenantMembershipUserLookup',
    membershipId: dto.membershipId,
    tenantId: dto.tenantId,
    userId: dto.userId,
    role: dto.role,
    status: dto.status,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    ...gsi2MembershipByUser(dto.userId, dto.tenantId, dto.membershipId),
  };
}

function toDto(item: TenantMembershipItem): TenantMembershipDto {
  return tenantMembershipSchema.parse({
    membershipId: item.membershipId,
    tenantId: item.tenantId,
    userId: item.userId,
    role: item.role,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });
}

export class TenantMembershipRepoDdb implements ITenantMembershipRepo {
  private readonly tableName: string;
  private readonly client: DdbClient;

  public constructor(props: TenantMembershipRepoDdbProps) {
    this.tableName = props.tableName;
    this.client = props.client;
  }

  public async putMembership(membership: TenantMembershipDto): Promise<void> {
    const metadata = toMetadataItem(membership);
    const tenantLookup = toTenantLookupItem(membership);
    const userLookup = toUserLookupItem(membership);

    await this.client.put({ tableName: this.tableName, item: metadata });
    await this.client.put({ tableName: this.tableName, item: tenantLookup });
    await this.client.put({ tableName: this.tableName, item: userLookup });
  }

  public async deleteMembership(membershipId: TenantMembershipId): Promise<void> {
    const existing = await this.findMembershipById(membershipId);
    if (!existing) {
      return;
    }
    if (!this.client.delete) {
      throw new Error('DdbClient.delete not implemented');
    }
    await this.client.delete({
      tableName: this.tableName,
      key: { PK: pkMembership(membershipId), SK: skMembership(membershipId) },
    });
    await this.client.delete({
      tableName: this.tableName,
      key: {
        PK: pkMembership(membershipId),
        SK: skMembershipTenant(existing.tenantId, membershipId),
      },
    });
    await this.client.delete({
      tableName: this.tableName,
      key: {
        PK: pkMembership(membershipId),
        SK: skMembershipUser(existing.userId, membershipId),
      },
    });
  }

  public async findMembership(
    tenantId: TenantId,
    userId: Uuid,
  ): Promise<TenantMembershipDto | undefined> {
    const { items } = await this.client.query<TenantMembershipLookupItem>({
      tableName: this.tableName,
      indexName: GSI2_NAME,
      keyCondition: '#gpk = :gpk AND begins_with(#gsk, :gsk)',
      names: { '#gpk': 'GSI2PK', '#gsk': 'GSI2SK' },
      values: {
        ':gpk': `LOOKUP#MEMBERSHIP#TENANT#${tenantId}`,
        ':gsk': `USER#${userId}`,
      },
      limit: 1,
    });
    const item = items[0];
    return item ? toDto(item) : undefined;
  }

  public async findMembershipById(
    membershipId: TenantMembershipId,
  ): Promise<TenantMembershipDto | undefined> {
    const { item } = await this.client.get<TenantMembershipMetadataItem>({
      tableName: this.tableName,
      key: { PK: pkMembership(membershipId), SK: skMembership(membershipId) },
    });
    return item ? toDto(item) : undefined;
  }

  public async listMembershipsByUser(userId: Uuid): Promise<readonly TenantMembershipDto[]> {
    const { items } = await this.client.query<TenantMembershipLookupItem>({
      tableName: this.tableName,
      indexName: GSI2_NAME,
      keyCondition: '#gpk = :gpk',
      names: { '#gpk': 'GSI2PK' },
      values: { ':gpk': `LOOKUP#MEMBERSHIP#USER#${userId}` },
    });
    return items.map(toDto);
  }

  public async listMembershipsByTenant(
    tenantId: TenantId,
  ): Promise<readonly TenantMembershipDto[]> {
    const { items } = await this.client.query<TenantMembershipLookupItem>({
      tableName: this.tableName,
      indexName: GSI2_NAME,
      keyCondition: '#gpk = :gpk',
      names: { '#gpk': 'GSI2PK' },
      values: { ':gpk': `LOOKUP#MEMBERSHIP#TENANT#${tenantId}` },
    });
    return items.map(toDto);
  }
}

export default TenantMembershipRepoDdb;
