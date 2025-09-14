import { priceCart } from './carts';
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

