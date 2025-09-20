// Removed duplicate export
import { z } from 'zod';
import type {
  AlbumDto,
  CartDto,
  CartItemDto,
  ImageDto,
  ImageVariantDto,
  OrderDto,
  OrderLineDto,
  PriceItemDto,
  PriceListDto,
  TenantMembershipCreateDto,
  TenantMembershipDto,
} from './dtos';
import {
  isoTimestampSchema,
  tenantMembershipRoleSchema,
  tenantMembershipStatusSchema,
  uuidSchema,
} from './events';
import { CartState, OrderState } from './state';

export const userCreateSchema = z.object({
  email: z.string().email(),
  oidcSub: z.string().min(1),
  name: z.string().optional(),
});

export const userSchema = userCreateSchema.extend({
  id: z.string().min(1),
  createdAt: z.string().min(1),
});

export const albumSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  parentAlbumId: z.string().optional(),
  createdAt: isoTimestampSchema,
}) as z.ZodType<AlbumDto>;

export const imageVariantSchema = z.object({
  label: z.string().min(1),
  key: z.string().min(1),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  sizeBytes: z.number().int().nonnegative(),
}) satisfies z.ZodType<ImageVariantDto>;

const imageBaseSchema = z.object({
  id: z.string().min(1),
  imageId: z.string().min(1),
  tenantId: z.string().min(1),
  albumId: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  createdAt: isoTimestampSchema,
  originalKey: z.string().min(1).optional(),
  variants: z.array(imageVariantSchema).readonly().optional(),
  processedAt: isoTimestampSchema.optional(),
});

export const imageSchema = imageBaseSchema as z.ZodType<ImageDto>;

export const priceItemSchema = z.object({
  sku: z.string().min(1),
  label: z.string().min(1),
  unitPriceCents: z.number().int().nonnegative(),
}) satisfies z.ZodType<PriceItemDto>;

export const priceListSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  items: z.array(priceItemSchema).readonly(),
  createdAt: isoTimestampSchema,
}) satisfies z.ZodType<PriceListDto>;

export const cartItemSchema = z.object({
  imageId: z.string().min(1),
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
}) satisfies z.ZodType<CartItemDto>;

export const cartStateSchema = z.enum([CartState.Active, CartState.Expired, CartState.CheckedOut]);

export const cartSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  state: cartStateSchema,
  priceListId: z.string().min(1),
  items: z.array(cartItemSchema).readonly(),
  createdAt: isoTimestampSchema,
  expiresAt: isoTimestampSchema.optional(),
}) as z.ZodType<CartDto>;

export const orderLineSchema = z.object({
  imageId: z.string().min(1),
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  lineTotalCents: z.number().int().nonnegative(),
}) satisfies z.ZodType<OrderLineDto>;

export const orderStateSchema = z.enum([
  OrderState.Created,
  OrderState.PendingPayment,
  OrderState.Paid,
  OrderState.Failed,
  OrderState.Fulfilled,
]);

export const orderSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  cartId: z.string().min(1),
  state: orderStateSchema,
  lines: z.array(orderLineSchema).readonly(),
  totalCents: z.number().int().nonnegative(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
}) satisfies z.ZodType<OrderDto>;

export const uuidStringSchema = uuidSchema;

export const tenantMembershipSchema = z.object({
  membershipId: uuidSchema,
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  role: tenantMembershipRoleSchema,
  status: tenantMembershipStatusSchema,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
}) satisfies z.ZodType<TenantMembershipDto>;

export const tenantMembershipCreateSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  role: tenantMembershipRoleSchema,
  status: tenantMembershipStatusSchema,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
}) satisfies z.ZodType<TenantMembershipCreateDto>;

export const tenantCreateSchema = z.object({
  name: z.string().min(1),
  ownerEmail: z.string().email(),
  adminName: z.string().optional(),
  plan: z.string().optional(),
});

export const tenantSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  ownerEmail: z.string().email(),
  plan: z.string().min(1),
  status: z.enum(['active', 'pending', 'suspended']),
  createdAt: isoTimestampSchema,
});
