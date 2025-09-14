import { z } from 'zod';
import type { ICartRepo, IPriceListRepo } from '@ayeldo/core';
import { Cart, TieredPricingEngine, type PriceCartResult } from '@ayeldo/core';
import type { CartDto } from '@ayeldo/types';

export const priceCartInputSchema = z.object({
  tenantId: z.string().min(1),
  cartId: z.string().min(1),
});

export type PriceCartInput = z.infer<typeof priceCartInputSchema>;

export async function priceCart(
  input: PriceCartInput,
  deps: { cartRepo: ICartRepo; priceListRepo: IPriceListRepo; engine: TieredPricingEngine },
): Promise<PriceCartResult> {
  const { tenantId, cartId } = priceCartInputSchema.parse(input);
  const cart = await deps.cartRepo.getById(tenantId, cartId);
  if (!cart) {
    throw new Error('Cart not found');
  }
  const priceList = await deps.priceListRepo.getById(tenantId, cart.priceListId);
  if (!priceList) {
    throw new Error('Price list not found');
  }
  return deps.engine.priceCart({ cart, priceList });
}

// Add item to cart
export const addCartItemSchema = z.object({
  tenantId: z.string().min(1),
  cartId: z.string().min(1),
  imageId: z.string().min(1),
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
});
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export async function addCartItem(
  input: AddCartItemInput,
  deps: { cartRepo: ICartRepo },
): Promise<CartDto> {
  const { tenantId, cartId, imageId, sku, quantity } = addCartItemSchema.parse(input);
  const existing = await deps.cartRepo.getById(tenantId, cartId);
  if (!existing) throw new Error('Cart not found');
  const nowItems = existing.items.slice();
  const idx = nowItems.findIndex((i) => i.imageId === imageId && i.sku === sku);
  if (idx >= 0) {
    const updated = { ...nowItems[idx], quantity: nowItems[idx].quantity + quantity };
    nowItems[idx] = updated;
  } else {
    nowItems.push({ imageId, sku, quantity });
  }
  const updatedCart = new Cart({
    id: existing.id,
    tenantId: existing.tenantId,
    state: existing.state,
    priceListId: existing.priceListId,
    items: nowItems,
    createdAt: existing.createdAt,
    ...(existing.expiresAt ? { expiresAt: existing.expiresAt } : {}),
  });
  await deps.cartRepo.put(updatedCart);
  return {
    id: updatedCart.id,
    tenantId: updatedCart.tenantId,
    state: updatedCart.state,
    priceListId: updatedCart.priceListId,
    items: updatedCart.items,
    createdAt: updatedCart.createdAt,
    ...(updatedCart.expiresAt ? { expiresAt: updatedCart.expiresAt } : {}),
  };
}

// Remove item from cart (by imageId + sku)
export const removeCartItemSchema = z.object({
  tenantId: z.string().min(1),
  cartId: z.string().min(1),
  imageId: z.string().min(1),
  sku: z.string().min(1),
});
export type RemoveCartItemInput = z.infer<typeof removeCartItemSchema>;

export async function removeCartItem(
  input: RemoveCartItemInput,
  deps: { cartRepo: ICartRepo },
): Promise<CartDto> {
  const { tenantId, cartId, imageId, sku } = removeCartItemSchema.parse(input);
  const existing = await deps.cartRepo.getById(tenantId, cartId);
  if (!existing) throw new Error('Cart not found');
  const nowItems = existing.items.filter((i) => !(i.imageId === imageId && i.sku === sku));
  const updatedCart = new Cart({
    id: existing.id,
    tenantId: existing.tenantId,
    state: existing.state,
    priceListId: existing.priceListId,
    items: nowItems,
    createdAt: existing.createdAt,
    ...(existing.expiresAt ? { expiresAt: existing.expiresAt } : {}),
  });
  await deps.cartRepo.put(updatedCart);
  return {
    id: updatedCart.id,
    tenantId: updatedCart.tenantId,
    state: updatedCart.state,
    priceListId: updatedCart.priceListId,
    items: updatedCart.items,
    createdAt: updatedCart.createdAt,
    ...(updatedCart.expiresAt ? { expiresAt: updatedCart.expiresAt } : {}),
  };
}

// Get cart
export const getCartSchema = z.object({
  tenantId: z.string().min(1),
  cartId: z.string().min(1),
});
export type GetCartInput = z.infer<typeof getCartSchema>;

export async function getCart(
  input: GetCartInput,
  deps: { cartRepo: ICartRepo },
): Promise<CartDto> {
  const { tenantId, cartId } = getCartSchema.parse(input);
  const existing = await deps.cartRepo.getById(tenantId, cartId);
  if (!existing) throw new Error('Cart not found');
  return {
    id: existing.id,
    tenantId: existing.tenantId,
    state: existing.state,
    priceListId: existing.priceListId,
    items: existing.items,
    createdAt: existing.createdAt,
    ...(existing.expiresAt ? { expiresAt: existing.expiresAt } : {}),
  };
}
