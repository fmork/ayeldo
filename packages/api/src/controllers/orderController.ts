import type { ICartRepo, IDownloadUrlProvider, IOrderRepo, IPriceListRepo } from '@ayeldo/core';
import type { HttpRouter, ILogWriter } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
import { OrderFlowService } from '../services/orderFlowService';

export interface OrderControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly cartRepo: ICartRepo;
  readonly priceListRepo: IPriceListRepo;
  readonly orderRepo: IOrderRepo;
  readonly download: IDownloadUrlProvider;
}

export class OrderController extends PublicController {
  private readonly flow: OrderFlowService;

  public constructor(props: OrderControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.flow = new OrderFlowService({
      cartRepo: props.cartRepo,
      priceListRepo: props.priceListRepo,
      orderRepo: props.orderRepo,
      download: props.download,
    });
  }

  public initialize(): HttpRouter {
    // POST /tenants/:tenantId/carts/:cartId/order — create order from cart
    this.addPost('/tenants/:tenantId/carts/:cartId/order', async (req, res) => {
      await this.performRequest(
        () => this.flow.createFromCart((req as unknown as { params: unknown }).params),
        res,
        () => 201,
      );
    });

    // GET /tenants/:tenantId/orders/:orderId — fetch order status/details
    this.addGet('/tenants/:tenantId/orders/:orderId', async (req, res) => {
      await this.performRequest(
        async () => await this.flow.getOrder((req as unknown as { params: unknown }).params),
        res,
        (result) => (result ? 200 : 404),
      );
    });

    // POST /tenants/:tenantId/orders/:orderId/fulfill — transition to fulfilled and return signed download URL
    this.addPost('/tenants/:tenantId/orders/:orderId/fulfill', async (req, res) => {
      await this.performRequest(
        () => this.flow.fulfill((req as unknown as { params: unknown }).params),
        res,
        () => 200,
      );
    });

    return this.getRouter();
  }
}
