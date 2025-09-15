import type { ICartRepo, IDownloadUrlProvider, IOrderRepo, IPriceListRepo } from '@ayeldo/core';
import { TieredPricingEngine } from '@ayeldo/core';
import type { HttpRouter, ILogWriter } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
import { z } from 'zod';
import { createOrderFromCart, fulfillOrder, getOrder } from '../handlers/orders';

export interface OrderControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly cartRepo: ICartRepo;
  readonly priceListRepo: IPriceListRepo;
  readonly orderRepo: IOrderRepo;
  readonly download: IDownloadUrlProvider;
}

export class OrderController extends PublicController {
  private readonly cartRepo: ICartRepo;
  private readonly priceListRepo: IPriceListRepo;
  private readonly orderRepo: IOrderRepo;
  private readonly engine: TieredPricingEngine;
  private readonly download: IDownloadUrlProvider;

  public constructor(props: OrderControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.cartRepo = props.cartRepo;
    this.priceListRepo = props.priceListRepo;
    this.orderRepo = props.orderRepo;
    this.engine = new TieredPricingEngine();
    this.download = props.download;
  }

  public initialize(): HttpRouter {
    // POST /tenants/:tenantId/carts/:cartId/order — create order from cart
    this.addPost('/tenants/:tenantId/carts/:cartId/order', async (req, res) => {
      const params = z
        .object({ tenantId: z.string().min(1), cartId: z.string().min(1) })
        .parse((req as unknown as { params: { tenantId: string; cartId: string } }).params);
      await this.performRequest(
        () =>
          createOrderFromCart(params, {
            cartRepo: this.cartRepo,
            priceListRepo: this.priceListRepo,
            orderRepo: this.orderRepo,
            engine: this.engine,
          }),
        res,
        () => 201,
      );
    });

    // GET /tenants/:tenantId/orders/:orderId — fetch order status/details
    this.addGet('/tenants/:tenantId/orders/:orderId', async (req, res) => {
      const params = z
        .object({ tenantId: z.string().min(1), orderId: z.string().min(1) })
        .parse((req as unknown as { params: { tenantId: string; orderId: string } }).params);
      await this.performRequest(
        () => getOrder(params, { orderRepo: this.orderRepo }),
        res,
        (result) => (result ? 200 : 404),
      );
    });

    // POST /tenants/:tenantId/orders/:orderId/fulfill — transition to fulfilled and return signed download URL
    this.addPost('/tenants/:tenantId/orders/:orderId/fulfill', async (req, res) => {
      const params = z
        .object({ tenantId: z.string().min(1), orderId: z.string().min(1) })
        .parse((req as unknown as { params: { tenantId: string; orderId: string } }).params);
      await this.performRequest(
        () => fulfillOrder(params, { orderRepo: this.orderRepo, download: this.download }),
        res,
        () => 200,
      );
    });

    return this.getRouter();
  }
}
