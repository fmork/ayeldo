import type { CartDto, CartItemDto, OrderLineDto, PriceListDto } from '../types';
import { PricingError } from '../errors';

export interface PriceCartResult {
  readonly lines: readonly OrderLineDto[];
  readonly totalCents: number;
}

/** Prices a cart by SKU, producing order lines and a total. */
export class TieredPricingEngine {
  priceCart(params: { cart: CartDto; priceList: PriceListDto }): PriceCartResult {
    const { cart, priceList } = params;
    const priceBySku: Record<string, number> = Object.create(null);
    for (const item of priceList.items) {
      priceBySku[item.sku] = item.unitPriceCents;
    }

    const lines: OrderLineDto[] = cart.items.map((ci: CartItemDto) => {
      const unit = priceBySku[ci.sku];
      if (typeof unit !== 'number') {
        throw new PricingError(`No price for SKU '${ci.sku}'`);
      }
      const quantity: number = ci.quantity;
      const unitPriceCents: number = unit;
      const lineTotalCents: number = unitPriceCents * quantity;
      return {
        imageId: ci.imageId,
        sku: ci.sku,
        quantity,
        unitPriceCents,
        lineTotalCents,
      };
    });

    const totalCents: number = lines.reduce((sum: number, l: OrderLineDto) => sum + l.lineTotalCents, 0);
    return { lines, totalCents };
  }
}
