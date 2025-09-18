import { z } from 'zod';
import type { TenantId, Uuid } from './dtos';

export interface EventEnvelope<TType extends string, TPayload> {
  readonly id: Uuid;
  readonly type: TType;
  readonly occurredAt: string; // ISO timestamp
  readonly tenantId: TenantId;
  readonly payload: TPayload;
}

export const uuidSchema = z.string().uuid();

export const isoTimestampSchema = z.string().datetime({ offset: true });

export const tenantIdSchema = z.string().min(1);

export function makeEventEnvelopeSchema<TPayload extends z.ZodTypeAny, TType extends string>(
  typeLiteral: TType,
  payloadSchema: TPayload,
): z.ZodType<EventEnvelope<TType, z.infer<TPayload>>> {
  return z.object({
    id: uuidSchema,
    type: z.literal(typeLiteral),
    occurredAt: isoTimestampSchema,
    tenantId: tenantIdSchema,
    payload: payloadSchema,
  }) as z.ZodType<EventEnvelope<TType, z.infer<TPayload>>>;
}

// TenantCreated event
export interface TenantCreatedPayload {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly adminUserId: string;
  readonly adminEmail: string;
}

export const tenantCreatedPayloadSchema = z.object({
  tenantId: z.string().min(1),
  tenantName: z.string().min(1),
  adminUserId: z.string().min(1),
  adminEmail: z.string().email(),
});

export const tenantCreatedEventSchema = makeEventEnvelopeSchema(
  'TenantCreated',
  tenantCreatedPayloadSchema,
);

export type TenantCreatedEvent = z.infer<typeof tenantCreatedEventSchema>;
