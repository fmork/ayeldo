import { z } from 'zod';
import { CartState, OrderState } from './state';
import type {
  AlbumDto,
  ImageDto,
  PriceItemDto,
  PriceListDto,
  CartItemDto,
  CartDto,
  OrderLineDto,
  OrderDto,
} from './dtos';
import { isoTimestampSchema, ulidSchema } from './events';

export const albumSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  parentAlbumId: z.string().optional(),
  createdAt: isoTimestampSchema,
}) as z.ZodType<AlbumDto>;

export const imageSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  albumId: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  createdAt: isoTimestampSchema,
}) satisfies z.ZodType<ImageDto>;

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

export const cartStateSchema = z.enum([
  CartState.Active,
  CartState.Expired,
  CartState.CheckedOut,
]);

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

export const ulidStringSchema = ulidSchema;
