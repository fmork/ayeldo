import { priceCart, addCartItem, removeCartItem } from './carts';
import { TieredPricingEngine } from '@ayeldo/core';

const engine = new TieredPricingEngine();

describe('priceCart handler', () => {
  it('prices a cart using price list items', async () => {
    const deps = {
      cartRepo: {
        getById: async (_tenant: string, _id: string) => ({
          id: 'c1',
          tenantId: 't1',
          state: 'active',
          priceListId: 'pl1',
          items: [
            { imageId: 'img1', sku: 'SKU1', quantity: 2 },
            { imageId: 'img2', sku: 'SKU2', quantity: 1 },
          ],
          createdAt: new Date().toISOString(),
        }),
      },
      priceListRepo: {
        getById: async (_tenant: string, _id: string) => ({
          id: 'pl1',
          tenantId: 't1',
          items: [
            { sku: 'SKU1', label: 'A', unitPriceCents: 100 },
            { sku: 'SKU2', label: 'B', unitPriceCents: 250 },
          ],
          createdAt: new Date().toISOString(),
        }),
      },
      engine,
    } as const;

    const result = await priceCart({ tenantId: 't1', cartId: 'c1' }, deps);
    expect(result.totalCents).toBe(2 * 100 + 1 * 250);
    expect(result.lines).toHaveLength(2);
  });

  it('throws when cart is missing', async () => {
    const deps = {
      cartRepo: { getById: async () => undefined },
      priceListRepo: { getById: async () => undefined },
      engine,
    } as any;
    await expect(priceCart({ tenantId: 't1', cartId: 'nope' }, deps)).rejects.toThrow('Cart not found');
  });

  it('throws when price list is missing', async () => {
    const deps = {
      cartRepo: {
        getById: async () => ({
          id: 'c1',
          tenantId: 't1',
          state: 'active',
          priceListId: 'pl-missing',
          items: [],
          createdAt: new Date().toISOString(),
        }),
      },
      priceListRepo: { getById: async () => undefined },
      engine,
    } as any;
    await expect(priceCart({ tenantId: 't1', cartId: 'c1' }, deps)).rejects.toThrow('Price list not found');
  });
});

describe('cart update events', () => {
  const baseCart = {
    id: 'c1',
    tenantId: 't1',
    state: 'active',
    priceListId: 'pl1',
    items: [],
    createdAt: new Date().toISOString(),
  } as const;

  test('addCartItem publishes CartUpdated', async () => {
    const put = jest.fn(async () => {});
    const deps = {
      cartRepo: {
        getById: async () => baseCart,
        put,
      },
      publisher: { publish: jest.fn(async () => {}) },
    } as any;

    const input = { tenantId: 't1', cartId: 'c1', imageId: 'img1', sku: 'SKU1', quantity: 1 } as const;
    const result = await addCartItem(input, deps);
    expect(result.items).toHaveLength(1);
    expect(deps.publisher.publish).toHaveBeenCalledTimes(1);
    const evt = (deps.publisher.publish as jest.Mock).mock.calls[0][0];
    expect(evt.type).toBe('CartUpdated');
    expect(evt.tenantId).toBe('t1');
    expect(evt.payload.cartId).toBe('c1');
  });

  test('removeCartItem publishes CartUpdated', async () => {
    const put = jest.fn(async () => {});
    const deps = {
      cartRepo: {
        getById: async () => ({ ...baseCart, items: [{ imageId: 'img1', sku: 'SKU1', quantity: 1 }] }),
        put,
      },
      publisher: { publish: jest.fn(async () => {}) },
    } as any;

    const input = { tenantId: 't1', cartId: 'c1', imageId: 'img1', sku: 'SKU1' } as const;
    const result = await removeCartItem(input, deps);
    expect(result.items).toHaveLength(0);
    expect(deps.publisher.publish).toHaveBeenCalledTimes(1);
    const evt = (deps.publisher.publish as jest.Mock).mock.calls[0][0];
    expect(evt.type).toBe('CartUpdated');
    expect(evt.tenantId).toBe('t1');
    expect(evt.payload.cartId).toBe('c1');
  });
});
