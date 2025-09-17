/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ICartRepo, IEventPublisher, IPriceListRepo } from '@ayeldo/core';
import { TieredPricingEngine } from '@ayeldo/core';
import type { AxiosHttpClient, HttpRouter, ILogWriter } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
import { z } from 'zod';
import { COOKIE_NAMES } from '../constants';
import { priceCart } from '../handlers/carts';
import { requireCsrfWrapper } from '../middleware/csrfGuard';
import { CartFlowService } from '../services/cartFlowService';
import type { SessionService } from '../services/sessionService';

export interface CartControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly apiBaseUrl: string;
  readonly httpClient: AxiosHttpClient;
  readonly sessions?: SessionService;
  readonly cartRepo?: ICartRepo;
  readonly priceListRepo?: IPriceListRepo;
  readonly publisher?: IEventPublisher;
}

export class CartController extends PublicController {
  private readonly flow: CartFlowService;
  private cartRepo: ICartRepo | undefined;
  private priceListRepo: IPriceListRepo | undefined;
  private engine: TieredPricingEngine | undefined;
  private publisher: IEventPublisher | undefined;

  public constructor(props: CartControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.flow = new CartFlowService({
      apiBaseUrl: props.apiBaseUrl,
      httpClient: props.httpClient,
      logger: props.logWriter,
      sessions: props.sessions,
    });
    this.cartRepo = props.cartRepo;
    this.priceListRepo = props.priceListRepo;
    this.publisher = props.publisher;
    if (props.cartRepo && props.priceListRepo) {
      this.engine = new TieredPricingEngine();
    }
  }

  public initialize(): HttpRouter {
    const requireSession =
      (handler: (req: any, res: any, sid?: string) => Promise<void>) =>
      async (req: any, res: any) => {
        const sid = req.cookies?.[COOKIE_NAMES.SESSION_ID] as string | undefined;
        if (!sid) return res.status(401).json({ error: 'Not authenticated' });
        return handler(req, res, sid);
      };

    // Use shared CSRF wrapper (double-submit cookie check)
    const requireCsrf = requireCsrfWrapper;

    // GET /carts/:cartId — fetch cart and priced summary
    this.addGet(
      '/carts/:cartId',
      requireSession(async (req, res, sid) => {
        const params = z
          .object({ tenantId: z.string().min(1), cartId: z.string().min(1) })
          .parse((req as any).params);
        const result = await this.flow.getCartWithPricing({ ...params, sid });
        res.json(result);
      }),
    );

    // POST /carts/:cartId/items — add and return priced cart
    this.addPost(
      '/carts/:cartId/items',
      requireSession(
        requireCsrf(async (req, res, sid) => {
          const params = z
            .object({ tenantId: z.string().min(1), cartId: z.string().min(1) })
            .parse((req as any).params);
          const result = await this.flow.addItemAndPrice({
            ...params,
            sid,
            body: (req as any).body,
          });
          res.status(201).json(result);
        }),
      ),
    );

    // DELETE /carts/:cartId/items — remove and return priced cart
    this.addDelete(
      '/carts/:cartId/items',
      requireSession(
        requireCsrf(async (req, res, sid) => {
          const params = z
            .object({ tenantId: z.string().min(1), cartId: z.string().min(1) })
            .parse((req as any).params);
          const result = await this.flow.removeItemAndPrice({
            ...params,
            sid,
            body: (req as any).body,
          });
          res.status(200).json(result);
        }),
      ),
    );

    // Backend-specific endpoint: POST /carts/:cartId/price
    if (this.cartRepo && this.priceListRepo && this.engine) {
      const cartRepo = this.cartRepo;
      const priceListRepo = this.priceListRepo;
      const engine = this.engine;
      this.addPost('/carts/:cartId/price', async (req, res) => {
        const paramsSchema = z.object({ tenantId: z.string().min(1), cartId: z.string().min(1) });
        const { tenantId, cartId } = paramsSchema.parse(
          (req as unknown as { params: { tenantId: string; cartId: string } }).params,
        );
        await this.performRequest(
          () => priceCart({ tenantId, cartId }, { cartRepo, priceListRepo, engine }),
          res,
        );
      });
    }

    return this.getRouter();
  }

  // Auth header handled inside CartFlowService
}
