import type { ICartRepo, IDownloadUrlProvider, IOrderRepo, IPriceListRepo } from '@ayeldo/core';
import { TieredPricingEngine } from '@ayeldo/core';
import { z } from 'zod';
import { createOrderFromCart, fulfillOrder, getOrder } from '../handlers/orders';

export interface OrderFlowServiceProps {
  readonly cartRepo: ICartRepo;
  readonly priceListRepo: IPriceListRepo;
  readonly orderRepo: IOrderRepo;
  readonly download: IDownloadUrlProvider;
}

export class OrderFlowService {
  private readonly cartRepo: ICartRepo;
  private readonly priceListRepo: IPriceListRepo;
  private readonly orderRepo: IOrderRepo;
  private readonly download: IDownloadUrlProvider;
  private readonly engine: TieredPricingEngine;

  public constructor(props: OrderFlowServiceProps) {
    this.cartRepo = props.cartRepo;
    this.priceListRepo = props.priceListRepo;
    this.orderRepo = props.orderRepo;
    this.download = props.download;
    this.engine = new TieredPricingEngine();
  }

  public async createFromCart(input: unknown): Promise<ReturnType<typeof createOrderFromCart>> {
    const params = z
      .object({ tenantId: z.string().min(1), cartId: z.string().min(1) })
      .parse(input);
    return createOrderFromCart(params, {
      cartRepo: this.cartRepo,
      priceListRepo: this.priceListRepo,
      orderRepo: this.orderRepo,
      engine: this.engine,
    });
  }

  public async getOrder(input: unknown): Promise<ReturnType<typeof getOrder>> {
    const params = z
      .object({ tenantId: z.string().min(1), orderId: z.string().min(1) })
      .parse(input);
    return getOrder(params, { orderRepo: this.orderRepo });
  }

  public async fulfill(input: unknown): Promise<ReturnType<typeof fulfillOrder>> {
    const params = z
      .object({ tenantId: z.string().min(1), orderId: z.string().min(1) })
      .parse(input);
    return fulfillOrder(params, { orderRepo: this.orderRepo, download: this.download });
  }
}
