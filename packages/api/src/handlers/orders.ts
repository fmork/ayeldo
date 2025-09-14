import { z } from 'zod';
import type { ICartRepo, IDownloadUrlProvider, IOrderRepo, IPriceListRepo } from '@ayeldo/core';
import { Order, type TieredPricingEngine, nextOrderState, OrderAction } from '@ayeldo/core';
import type { OrderDto } from '@ayeldo/types';
import { makeUlid } from '@ayeldo/utils';

export const createOrderFromCartSchema = z.object({
  tenantId: z.string().min(1),
  cartId: z.string().min(1),
});

export type CreateOrderFromCartInput = z.infer<typeof createOrderFromCartSchema>;

export async function createOrderFromCart(
  input: CreateOrderFromCartInput,
  deps: { cartRepo: ICartRepo; priceListRepo: IPriceListRepo; orderRepo: IOrderRepo; engine: TieredPricingEngine },
): Promise<OrderDto> {
  const { tenantId, cartId } = createOrderFromCartSchema.parse(input);

  const cart = await deps.cartRepo.getById(tenantId, cartId);
  if (!cart) throw new Error('Cart not found');

  const priceList = await deps.priceListRepo.getById(tenantId, cart.priceListId);
  if (!priceList) throw new Error('Price list not found');

  const priced = deps.engine.priceCart({ cart, priceList });
  const nowIso = new Date().toISOString();

  const order = new Order({
    id: makeUlid(),
    tenantId,
    cartId,
    state: 'created',
    lines: priced.lines,
    totalCents: priced.totalCents,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await deps.orderRepo.put(order);

  return {
    id: order.id,
    tenantId: order.tenantId,
    cartId: order.cartId,
    state: order.state,
    lines: order.lines,
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  } as const;
}

export const getOrderSchema = z.object({
  tenantId: z.string().min(1),
  orderId: z.string().min(1),
});

export type GetOrderInput = z.infer<typeof getOrderSchema>;

export async function getOrder(
  input: GetOrderInput,
  deps: { orderRepo: IOrderRepo },
): Promise<OrderDto | undefined> {
  const { tenantId, orderId } = getOrderSchema.parse(input);
  const order = await deps.orderRepo.getById(tenantId, orderId);
  if (!order) return undefined;
  return {
    id: order.id,
    tenantId: order.tenantId,
    cartId: order.cartId,
    state: order.state,
    lines: order.lines,
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  } as const;
}

export const fulfillOrderSchema = z.object({ tenantId: z.string().min(1), orderId: z.string().min(1) });

export type FulfillOrderInput = z.infer<typeof fulfillOrderSchema>;

export async function fulfillOrder(
  input: FulfillOrderInput,
  deps: { orderRepo: IOrderRepo; download: IDownloadUrlProvider },
): Promise<{ downloadUrl: string; expiresAtIso: string }> {
  const { tenantId, orderId } = fulfillOrderSchema.parse(input);
  const existing = await deps.orderRepo.getById(tenantId, orderId);
  if (!existing) throw new Error('Order not found');

  const next = nextOrderState(existing.state, OrderAction.Fulfill);
  const updated = { ...existing, state: next, updatedAt: new Date().toISOString() };
  await deps.orderRepo.put(updated);

  const key = `tenants/${tenantId}/orders/${orderId}/download.zip`;
  const signed = await deps.download.getSignedUrl({ key, expiresSeconds: 5 * 60 });
  return { downloadUrl: signed.url, expiresAtIso: signed.expiresAtIso };
}
