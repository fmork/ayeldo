/// <reference types="jest" />
/* eslint-env jest */

import type { TenantMembershipDto, Uuid } from '@ayeldo/types';
import type { IEventPublisher } from '../ports/events';
import type { ITenantMembershipRepo } from '../ports/repositories';
import { TenantAccessService } from './tenantAccessService';
import { NotFoundError } from '../errors';

describe('TenantAccessService', () => {
  const fixedNow = new Date('2024-01-01T00:00:00.000Z');
  const nowIso = fixedNow.toISOString();

  let uuidValues: readonly Uuid[];
  let uuidIndex: number;
  let membershipRepo: jest.Mocked<ITenantMembershipRepo>;
  let eventPublisher: jest.Mocked<IEventPublisher>;

  const nextUuid = (): Uuid => {
    const value = uuidValues[uuidIndex];
    uuidIndex += 1;
    return value;
  };

  const createService = (): TenantAccessService => {
    return new TenantAccessService({
      membershipRepo,
      eventPublisher,
      uuidGenerator: nextUuid,
      clock: () => fixedNow,
    });
  };

  beforeEach(() => {
    uuidValues = [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
    ];
    uuidIndex = 0;
    membershipRepo = {
      putMembership: jest.fn().mockResolvedValue(undefined),
      deleteMembership: jest.fn().mockResolvedValue(undefined),
      findMembership: jest.fn().mockResolvedValue(undefined),
      findMembershipById: jest.fn().mockResolvedValue(undefined),
      listMembershipsByUser: jest.fn().mockResolvedValue([]),
      listMembershipsByTenant: jest.fn().mockResolvedValue([]),
    };
    eventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('creates a new membership and emits granted event', async () => {
    const service = createService();

    const membership = await service.grantMembership({
      tenantId: 'tenant-1',
      userId: '55555555-5555-4555-8555-555555555555',
      role: 'owner',
      status: 'active',
    });

    expect(membershipRepo.findMembership).toHaveBeenCalledWith(
      'tenant-1',
      '55555555-5555-4555-8555-555555555555',
    );
    expect(membershipRepo.putMembership).toHaveBeenCalledWith({
      membershipId: '11111111-1111-4111-8111-111111111111',
      tenantId: 'tenant-1',
      userId: '55555555-5555-4555-8555-555555555555',
      role: 'owner',
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    expect(eventPublisher.publish).toHaveBeenCalledWith({
      id: '22222222-2222-4222-8222-222222222222',
      type: 'TenantMembershipGranted',
      occurredAt: nowIso,
      tenantId: 'tenant-1',
      payload: {
        membershipId: '11111111-1111-4111-8111-111111111111',
        userId: '55555555-5555-4555-8555-555555555555',
        role: 'owner',
        status: 'active',
      },
    });
    expect(membership).toEqual({
      membershipId: '11111111-1111-4111-8111-111111111111',
      tenantId: 'tenant-1',
      userId: '55555555-5555-4555-8555-555555555555',
      role: 'owner',
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  });

  it('returns existing membership without updates when role/status unchanged', async () => {
    const existing: TenantMembershipDto = {
      membershipId: '11111111-1111-4111-8111-aaaaaaaaaaaa',
      tenantId: 'tenant-1',
      userId: '55555555-5555-4555-8555-555555555555',
      role: 'admin',
      status: 'active',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };
    membershipRepo.findMembership.mockResolvedValue(existing);
    const service = createService();

    const membership = await service.grantMembership({
      tenantId: 'tenant-1',
      userId: '55555555-5555-4555-8555-555555555555',
      role: 'admin',
      status: 'active',
    });

    expect(membership).toBe(existing);
    expect(membershipRepo.putMembership).not.toHaveBeenCalled();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('updates membership when role or status changes', async () => {
    const existing: TenantMembershipDto = {
      membershipId: '11111111-1111-4111-8111-bbbbbbbbbbbb',
      tenantId: 'tenant-1',
      userId: '55555555-5555-4555-8555-555555555555',
      role: 'member',
      status: 'invited',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };
    membershipRepo.findMembership.mockResolvedValue(existing);
    const service = createService();

    const updated = await service.grantMembership({
      tenantId: 'tenant-1',
      userId: '55555555-5555-4555-8555-555555555555',
      role: 'admin',
      status: 'active',
    });

    expect(updated).toEqual({
      ...existing,
      role: 'admin',
      status: 'active',
      updatedAt: nowIso,
    });
    expect(membershipRepo.putMembership).toHaveBeenCalledWith({
      ...existing,
      role: 'admin',
      status: 'active',
      updatedAt: nowIso,
    });
    expect(eventPublisher.publish).toHaveBeenCalledWith({
      id: '11111111-1111-4111-8111-111111111111',
      type: 'TenantMembershipGranted',
      occurredAt: nowIso,
      tenantId: 'tenant-1',
      payload: {
        membershipId: '11111111-1111-4111-8111-bbbbbbbbbbbb',
        userId: '55555555-5555-4555-8555-555555555555',
        role: 'admin',
        status: 'active',
      },
    });
  });

  it('changes role and emits event', async () => {
    const existing: TenantMembershipDto = {
      membershipId: '11111111-1111-4111-8111-cccccccccccc',
      tenantId: 'tenant-1',
      userId: '55555555-5555-4555-8555-555555555555',
      role: 'member',
      status: 'active',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };
    membershipRepo.findMembership.mockResolvedValue(existing);
    const service = createService();

    const updated = await service.changeRole({
      tenantId: 'tenant-1',
      userId: '55555555-5555-4555-8555-555555555555',
      role: 'admin',
    });

    expect(updated).toEqual({
      ...existing,
      role: 'admin',
      updatedAt: nowIso,
    });
    expect(membershipRepo.putMembership).toHaveBeenCalledWith({
      ...existing,
      role: 'admin',
      updatedAt: nowIso,
    });
    expect(eventPublisher.publish).toHaveBeenCalledWith({
      id: '11111111-1111-4111-8111-111111111111',
      type: 'TenantMembershipGranted',
      occurredAt: nowIso,
      tenantId: 'tenant-1',
      payload: {
        membershipId: '11111111-1111-4111-8111-cccccccccccc',
        userId: '55555555-5555-4555-8555-555555555555',
        role: 'admin',
        status: 'active',
      },
    });
  });

  it('throws NotFoundError when changing role for missing membership', async () => {
    const service = createService();

    await expect(
      service.changeRole({
        tenantId: 'tenant-1',
        userId: '55555555-5555-4555-8555-555555555555',
        role: 'admin',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('revokes membership and emits revoked event', async () => {
    const existing: TenantMembershipDto = {
      membershipId: '11111111-1111-4111-8111-dddddddddddd',
      tenantId: 'tenant-1',
      userId: '55555555-5555-4555-8555-555555555555',
      role: 'admin',
      status: 'active',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };
    membershipRepo.findMembership.mockResolvedValue(existing);
    const service = createService();

    const revoked = await service.revokeMembership({
      tenantId: 'tenant-1',
      userId: '55555555-5555-4555-8555-555555555555',
    });

    expect(revoked).toEqual({
      ...existing,
      status: 'revoked',
      updatedAt: nowIso,
    });
    expect(membershipRepo.putMembership).toHaveBeenCalledWith({
      ...existing,
      status: 'revoked',
      updatedAt: nowIso,
    });
    expect(eventPublisher.publish).toHaveBeenCalledWith({
      id: '11111111-1111-4111-8111-111111111111',
      type: 'TenantMembershipRevoked',
      occurredAt: nowIso,
      tenantId: 'tenant-1',
      payload: {
        membershipId: '11111111-1111-4111-8111-dddddddddddd',
        userId: '55555555-5555-4555-8555-555555555555',
        previousRole: 'admin',
        previousStatus: 'active',
      },
    });
  });

  it('returns existing membership when already revoked', async () => {
    const existing: TenantMembershipDto = {
      membershipId: '11111111-1111-4111-8111-eeeeeeeeeeee',
      tenantId: 'tenant-1',
      userId: '55555555-5555-4555-8555-555555555555',
      role: 'admin',
      status: 'revoked',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };
    membershipRepo.findMembership.mockResolvedValue(existing);
    const service = createService();

    const revoked = await service.revokeMembership({
      tenantId: 'tenant-1',
      userId: '55555555-5555-4555-8555-555555555555',
    });

    expect(revoked).toBe(existing);
    expect(membershipRepo.putMembership).not.toHaveBeenCalled();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('delegates list queries to repository', async () => {
    const listByUser: TenantMembershipDto[] = [
      {
        membershipId: '66666666-6666-4666-8666-666666666666',
        tenantId: 'tenant-1',
        userId: '55555555-5555-4555-8555-555555555555',
        role: 'owner',
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];
    const listByTenant: TenantMembershipDto[] = [
      {
        membershipId: '77777777-7777-4777-8777-777777777777',
        tenantId: 'tenant-1',
        userId: '88888888-8888-4888-8888-888888888888',
        role: 'member',
        status: 'invited',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];
    membershipRepo.listMembershipsByUser.mockResolvedValue(listByUser);
    membershipRepo.listMembershipsByTenant.mockResolvedValue(listByTenant);
    const service = createService();

    await expect(service.listMembershipsForUser('user-1')).resolves.toEqual(listByUser);
    await expect(service.listMembershipsForTenant('tenant-1')).resolves.toEqual(listByTenant);
  });
});
