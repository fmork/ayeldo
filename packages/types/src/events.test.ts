import { describe, expect, test } from '@jest/globals';
import { z } from 'zod';
import {
  makeEventEnvelopeSchema,
  tenantCreatedEventSchema,
  tenantCreatedPayloadSchema,
  uuidSchema,
} from './events';

const payloadSchema = z.object({ foo: z.string() });
const evtSchema = makeEventEnvelopeSchema('TestEvent', payloadSchema);

describe('EventEnvelope schema', () => {
  test('parses valid envelope', () => {
    const data = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'TestEvent',
      occurredAt: '2024-01-01T00:00:00.000Z',
      tenantId: 'tenant-123',
      payload: { foo: 'bar' },
    };
    const parsed = evtSchema.parse(data);
    expect(parsed.payload.foo).toBe('bar');
  });

  test('rejects wrong type', () => {
    const data = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'Other',
      occurredAt: '2024-01-01T00:00:00.000Z',
      tenantId: 'tenant-123',
      payload: { foo: 'bar' },
    };
    expect(() => evtSchema.parse(data)).toThrow();
  });

  test('uuid schema validates format', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
  });
});

describe('TenantCreated event', () => {
  test('parses valid TenantCreated event', () => {
    const data = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'TenantCreated',
      occurredAt: '2024-01-01T00:00:00.000Z',
      tenantId: 'tenant-123',
      payload: {
        tenantId: 'tenant-123',
        tenantName: 'Acme Corp',
        adminUserId: 'user-456',
        adminEmail: 'admin@acme.com',
      },
    };
    const parsed = tenantCreatedEventSchema.parse(data);
    expect(parsed.payload.tenantName).toBe('Acme Corp');
    expect(parsed.payload.adminEmail).toBe('admin@acme.com');
  });

  test('rejects invalid email in payload', () => {
    const data = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'TenantCreated',
      occurredAt: '2024-01-01T00:00:00.000Z',
      tenantId: 'tenant-123',
      payload: {
        tenantId: 'tenant-123',
        tenantName: 'Acme Corp',
        adminUserId: 'user-456',
        adminEmail: 'invalid-email',
      },
    };
    expect(() => tenantCreatedEventSchema.parse(data)).toThrow();
  });

  test('payload schema validates independently', () => {
    const payload = {
      tenantId: 'tenant-123',
      tenantName: 'Acme Corp',
      adminUserId: 'user-456',
      adminEmail: 'admin@acme.com',
    };
    const parsed = tenantCreatedPayloadSchema.parse(payload);
    expect(parsed.tenantName).toBe('Acme Corp');
  });
});
