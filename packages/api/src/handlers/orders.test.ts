import { describe, expect, test, jest } from '@jest/globals';
import { createOrderFromCart, getOrder } from './orders';
import { TieredPricingEngine } from '@ayeldo/core';

describe('createOrderFromCart', () => {
  const engine = new TieredPricingEngine();

  test('creates an order from a cart and persists it', async () => {
    const cart = {
      id: 'c1',
      tenantId: 't1',
      state: 'active',
      priceListId: 'pl1',
      items: [
        { imageId: 'img1', sku: 'SKU1', quantity: 2 },
        { imageId: 'img2', sku: 'SKU2', quantity: 1 },
      ],
      createdAt: new Date().toISOString(),
    } as const;
    const priceList = {
      id: 'pl1',
      tenantId: 't1',
      items: [
        { sku: 'SKU1', label: 'A', unitPriceCents: 100 },
        { sku: 'SKU2', label: 'B', unitPriceCents: 250 },
      ],
      createdAt: new Date().toISOString(),
    } as const;

    const put = jest.fn(async () => {});

    const deps = {
      cartRepo: { getById: async () => cart },
      priceListRepo: { getById: async () => priceList },
      orderRepo: { put } as any,
      engine,
    } as const;

    const out = await createOrderFromCart({ tenantId: 't1', cartId: 'c1' }, deps);
    expect(out.state).toBe('created');
    expect(out.lines).toHaveLength(2);
    expect(out.totalCents).toBe(2 * 100 + 1 * 250);
    expect(put).toHaveBeenCalledTimes(1);
  });

  test('throws when cart is missing', async () => {
    const deps = {
      cartRepo: { getById: async () => undefined },
      priceListRepo: { getById: async () => undefined },
      orderRepo: { put: jest.fn() },
      engine,
    } as any;
    await expect(createOrderFromCart({ tenantId: 't1', cartId: 'nope' }, deps)).rejects.toThrow('Cart not found');
  });

  test('throws when price list is missing', async () => {
    const deps = {
      cartRepo: { getById: async () => ({
        id: 'c1', tenantId: 't1', state: 'active', priceListId: 'pl-missing', items: [], createdAt: new Date().toISOString()
      }) },
      priceListRepo: { getById: async () => undefined },
      orderRepo: { put: jest.fn() },
      engine,
    } as any;
    await expect(createOrderFromCart({ tenantId: 't1', cartId: 'c1' }, deps)).rejects.toThrow('Price list not found');
  });
});

describe('getOrder', () => {
  test('returns order when found', async () => {
    const order = {
      id: 'o1',
      tenantId: 't1',
      cartId: 'c1',
      state: 'created',
      lines: [],
      totalCents: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;
    const deps = { orderRepo: { getById: async () => order } } as any;
    const out = await getOrder({ tenantId: 't1', orderId: 'o1' }, deps);
    expect(out?.id).toBe('o1');
    expect(out?.tenantId).toBe('t1');
  });

  test('returns undefined when not found', async () => {
    const deps = { orderRepo: { getById: async () => undefined } } as any;
    const out = await getOrder({ tenantId: 't1', orderId: 'missing' }, deps);
    expect(out).toBeUndefined();
  });
});

