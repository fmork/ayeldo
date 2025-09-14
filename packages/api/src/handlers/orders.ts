import { z } from 'zod';
import type { ICartRepo, IOrderRepo, IPriceListRepo } from '@ayeldo/core';
import { Order, TieredPricingEngine } from '@ayeldo/core';
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

