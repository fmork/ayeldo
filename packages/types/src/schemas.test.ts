import { describe, expect, test } from '@jest/globals';
import { albumSchema, cartSchema, orderSchema, priceListSchema } from './schemas';

describe('DTO schemas', () => {
  test('album: happy path', () => {
    const data = {
      id: 'alb_1',
      tenantId: 't_1',
      title: 'My Album',
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    expect(albumSchema.parse(data).title).toBe('My Album');
  });

  test('album: sad path (missing title)', () => {
    const data = {
      id: 'alb_1',
      tenantId: 't_1',
      createdAt: '2024-01-01T00:00:00.000Z',
    } as unknown;
    expect(() => albumSchema.parse(data)).toThrow();
  });

  test('priceList: items and types', () => {
    const pl = {
      id: 'pl_1',
      tenantId: 't_1',
      items: [
        { sku: 'PRINT_10x15', label: '10x15 Print', unitPriceCents: 199 },
        { sku: 'DIGITAL_FULL', label: 'Digital Original', unitPriceCents: 999 },
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    const parsed = priceListSchema.parse(pl);
    expect(parsed.items[0].sku).toBe('PRINT_10x15');
  });

  test('cart: requires positive quantity', () => {
    const cart = {
      id: 'c_1',
      tenantId: 't_1',
      state: 'active',
      priceListId: 'pl_1',
      items: [{ imageId: 'img_1', sku: 'PRINT_10x15', quantity: 0 }],
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    expect(() => cartSchema.parse(cart)).toThrow();
  });

  test('order: totals must be non-negative', () => {
    const order = {
      id: 'o_1',
      tenantId: 't_1',
      cartId: 'c_1',
      state: 'created',
      lines: [
        {
          imageId: 'img_1',
          sku: 'PRINT_10x15',
          quantity: 1,
          unitPriceCents: 199,
          lineTotalCents: 199,
        },
      ],
      totalCents: 199,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    const parsed = orderSchema.parse(order);
    expect(parsed.totalCents).toBe(199);
  });
});

