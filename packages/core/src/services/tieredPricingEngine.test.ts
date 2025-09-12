import { TieredPricingEngine } from './tieredPricingEngine';
import type { CartDto, PriceListDto } from '../types';

describe('TieredPricingEngine', () => {
  const priceList: PriceListDto = {
    id: 'pl1',
    tenantId: 't1',
    createdAt: new Date().toISOString(),
    items: [
      { sku: 'PRINT_4x6', label: '4x6 Print', unitPriceCents: 25 },
      { sku: 'PRINT_8x10', label: '8x10 Print', unitPriceCents: 199 },
    ],
  };

  it('prices a cart with line totals and sum', () => {
    const cart: CartDto = {
      id: 'c1',
      tenantId: 't1',
      state: 'active',
      priceListId: 'pl1',
      createdAt: new Date().toISOString(),
      items: [
        { imageId: 'img1', sku: 'PRINT_4x6', quantity: 4 },
        { imageId: 'img2', sku: 'PRINT_8x10', quantity: 1 },
      ],
    };

    const engine = new TieredPricingEngine();
    const result = engine.priceCart({ cart, priceList });

    expect(result.lines).toHaveLength(2);
    const line1 = result.lines.find((l) => l.sku === 'PRINT_4x6');
    const line2 = result.lines.find((l) => l.sku === 'PRINT_8x10');
    expect(line1).toBeDefined();
    expect(line2).toBeDefined();
    expect(line1?.unitPriceCents).toBe(25);
    expect(line1?.lineTotalCents).toBe(25 * 4);
    expect(line2?.unitPriceCents).toBe(199);
    expect(line2?.lineTotalCents).toBe(199 * 1);
    expect(result.totalCents).toBe(25 * 4 + 199);
  });

  it('throws if a SKU is not priced', () => {
    const cart: CartDto = {
      id: 'c1',
      tenantId: 't1',
      state: 'active',
      priceListId: 'pl1',
      createdAt: new Date().toISOString(),
      items: [{ imageId: 'img1', sku: 'MISSING', quantity: 1 }],
    };

    const engine = new TieredPricingEngine();
    expect(() => engine.priceCart({ cart, priceList })).toThrow(
      /No price for SKU 'MISSING'/,
    );
  });
});

