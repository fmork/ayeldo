import { z } from 'zod';
import type {
  TenantId,
  TenantMembershipId,
  TenantMembershipRole,
  TenantMembershipStatus,
  Uuid,
  ImageVariantDto,
} from './dtos';

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

export const tenantMembershipRoleSchema = z.enum(['owner', 'admin', 'member']);

export const tenantMembershipStatusSchema = z.enum(['active', 'invited', 'revoked']);

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

export interface TenantMembershipGrantedPayload {
  readonly membershipId: TenantMembershipId;
  readonly userId: Uuid;
  readonly role: TenantMembershipRole;
  readonly status: TenantMembershipStatus;
}

export const tenantMembershipGrantedPayloadSchema = z.object({
  membershipId: uuidSchema,
  userId: uuidSchema,
  role: tenantMembershipRoleSchema,
  status: tenantMembershipStatusSchema,
});

export const tenantMembershipGrantedEventSchema = makeEventEnvelopeSchema(
  'TenantMembershipGranted',
  tenantMembershipGrantedPayloadSchema,
);

export type TenantMembershipGrantedEvent = z.infer<typeof tenantMembershipGrantedEventSchema>;

export interface TenantMembershipRevokedPayload {
  readonly membershipId: TenantMembershipId;
  readonly userId: Uuid;
  readonly previousRole: TenantMembershipRole;
  readonly previousStatus: TenantMembershipStatus;
}

export const tenantMembershipRevokedPayloadSchema = z.object({
  membershipId: uuidSchema,
  userId: uuidSchema,
  previousRole: tenantMembershipRoleSchema,
  previousStatus: tenantMembershipStatusSchema,
});

export const tenantMembershipRevokedEventSchema = makeEventEnvelopeSchema(
  'TenantMembershipRevoked',
  tenantMembershipRevokedPayloadSchema,
);

export type TenantMembershipRevokedEvent = z.infer<typeof tenantMembershipRevokedEventSchema>;

export interface ImageProcessedPayload {
  readonly albumId: string;
  readonly imageId: string;
  readonly originalKey: string;
  readonly variants: readonly ImageVariantDto[];
}

export const imageProcessedPayloadSchema = z.object({
  albumId: z.string().min(1),
  imageId: z.string().min(1),
  originalKey: z.string().min(1),
  variants: z.array(z.object({
    label: z.string().min(1),
    key: z.string().min(1),
    width: z.number().int().nonnegative(),
    height: z.number().int().nonnegative(),
    sizeBytes: z.number().int().nonnegative(),
  })).readonly(),
});

export const imageProcessedEventSchema = makeEventEnvelopeSchema(
  'ImageProcessed',
  imageProcessedPayloadSchema,
);

export type ImageProcessedEvent = z.infer<typeof imageProcessedEventSchema>;
