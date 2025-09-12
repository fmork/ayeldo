import { describe, expect, test } from '@jest/globals';
import { z } from 'zod';
import { makeEventEnvelopeSchema, ulidSchema } from './events';

const payloadSchema = z.object({ foo: z.string() });
const evtSchema = makeEventEnvelopeSchema('TestEvent', payloadSchema);

describe('EventEnvelope schema', () => {
  test('parses valid envelope', () => {
    const data = {
      id: '01H7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7',
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
      id: '01H7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7',
      type: 'Other',
      occurredAt: '2024-01-01T00:00:00.000Z',
      tenantId: 'tenant-123',
      payload: { foo: 'bar' },
    };
    expect(() => evtSchema.parse(data)).toThrow();
  });

  test('ulid schema validates length and charset', () => {
    expect(ulidSchema.safeParse('short').success).toBe(false);
    expect(ulidSchema.safeParse('01H7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7').success).toBe(true);
  });
});

