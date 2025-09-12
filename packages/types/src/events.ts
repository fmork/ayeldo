import type { Ulid, TenantId } from './dtos';
import { z } from 'zod';

export interface EventEnvelope<TType extends string, TPayload> {
  readonly id: Ulid;
  readonly type: TType;
  readonly occurredAt: string; // ISO timestamp
  readonly tenantId: TenantId;
  readonly payload: TPayload;
}

const ULID_REGEX = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

export const ulidSchema = z
  .string()
  .length(26)
  .regex(ULID_REGEX, 'Invalid ULID');

export const isoTimestampSchema = z.string().datetime({ offset: true });

export const tenantIdSchema = z.string().min(1);

export function makeEventEnvelopeSchema<
  TPayload extends z.ZodTypeAny,
  TType extends string,
>(
  typeLiteral: TType,
  payloadSchema: TPayload,
): z.ZodType<EventEnvelope<TType, z.infer<TPayload>>> {
  return z.object({
    id: ulidSchema,
    type: z.literal(typeLiteral),
    occurredAt: isoTimestampSchema,
    tenantId: tenantIdSchema,
    payload: payloadSchema,
  }) as z.ZodType<EventEnvelope<TType, z.infer<TPayload>>>;
}
