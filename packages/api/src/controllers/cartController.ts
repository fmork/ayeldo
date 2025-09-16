/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ICartRepo, IEventPublisher, IPriceListRepo } from '@ayeldo/core';
import { TieredPricingEngine } from '@ayeldo/core';
import type { AxiosHttpClient, HttpResponse, HttpRouter, ILogWriter } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
import { z } from 'zod';
import { addCartItem, getCart, priceCart, removeCartItem } from '../handlers/carts';
import { requireCsrfForController, requireCsrfWrapper } from '../middleware/csrfGuard';
import { CartFlowService } from '../services/cartFlowService';
import type { SessionService } from '../services/sessionService';

export interface CartFrontendControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly apiBaseUrl: string;
  readonly httpClient: AxiosHttpClient;
  readonly sessions?: SessionService;
}

export class CartFrontendController extends PublicController {
  private readonly flow: CartFlowService;

  public constructor(props: CartFrontendControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.flow = new CartFlowService({
      apiBaseUrl: props.apiBaseUrl,
      httpClient: props.httpClient,
      logger: props.logWriter,
      sessions: props.sessions,
    });
  }

  public initialize(): HttpRouter {
    const requireSession =
      (handler: (req: any, res: any, sid?: string) => Promise<void>) =>
      async (req: any, res: any) => {
        const sid = req.cookies?.['__Host-sid'] as string | undefined;
        if (!sid) return res.status(401).json({ error: 'Not authenticated' });
        return handler(req, res, sid);
      };

    // Use shared CSRF wrapper (double-submit cookie check)
    const requireCsrf = requireCsrfWrapper;

    // GET /carts/:tenantId/:cartId — fetch cart and priced summary
    this.addGet(
      '/carts/:tenantId/:cartId',
      requireSession(async (req, res, sid) => {
        const params = z
          .object({ tenantId: z.string().min(1), cartId: z.string().min(1) })
          .parse((req as any).params);
        const result = await this.flow.getCartWithPricing({ ...params, sid });
        res.json(result);
      }),
    );

    // POST /carts/:tenantId/:cartId/items — add and return priced cart
    this.addPost(
      '/carts/:tenantId/:cartId/items',
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

    // DELETE /carts/:tenantId/:cartId/items — remove and return priced cart
    this.addDelete(
      '/carts/:tenantId/:cartId/items',
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

    return this.getRouter();
  }

  // Auth header handled inside CartFlowService
}

// Legacy export for compatibility (frontend controller)
export const CartBffController = CartFrontendController as unknown as typeof CartFrontendController;

// ...existing API CartController follows below

export interface CartControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly cartRepo: ICartRepo;
  readonly priceListRepo: IPriceListRepo;
  readonly publisher: IEventPublisher;
}

export class CartController extends PublicController {
  private readonly cartRepo: ICartRepo;
  private readonly priceListRepo: IPriceListRepo;
  private readonly engine: TieredPricingEngine;
  private readonly publisher: IEventPublisher;

  public constructor(props: CartControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.cartRepo = props.cartRepo;
    this.priceListRepo = props.priceListRepo;
    this.engine = new TieredPricingEngine();
    this.publisher = props.publisher;
  }

  public initialize(): HttpRouter {
    // Use shared controller-compatible CSRF guard
    const requireCsrf = requireCsrfForController;
    // POST /tenants/:tenantId/carts/:cartId/price
    this.addPost('/tenants/:tenantId/carts/:cartId/price', async (req, res) => {
      const paramsSchema = z.object({ tenantId: z.string().min(1), cartId: z.string().min(1) });
      const { tenantId, cartId } = paramsSchema.parse(
        (req as unknown as { params: { tenantId: string; cartId: string } }).params,
      );
      await this.performRequest(
        () =>
          priceCart(
            { tenantId, cartId },
            { cartRepo: this.cartRepo, priceListRepo: this.priceListRepo, engine: this.engine },
          ),
        res,
      );
    });

    // GET /tenants/:tenantId/carts/:cartId
    this.addGet('/tenants/:tenantId/carts/:cartId', async (req, res) => {
      const paramsSchema = z.object({ tenantId: z.string().min(1), cartId: z.string().min(1) });
      const { tenantId, cartId } = paramsSchema.parse(
        (req as unknown as { params: { tenantId: string; cartId: string } }).params,
      );
      await this.performRequest(
        () => getCart({ tenantId, cartId }, { cartRepo: this.cartRepo }),
        res,
      );
    });

    // POST /tenants/:tenantId/carts/:cartId/items (add)
    this.addPost(
      '/tenants/:tenantId/carts/:cartId/items',
      requireCsrf(async (req, res) => {
        const paramsSchema = z.object({ tenantId: z.string().min(1), cartId: z.string().min(1) });
        const bodySchema = z.object({
          imageId: z.string().min(1),
          sku: z.string().min(1),
          quantity: z.number().int().positive(),
        });
        const { tenantId, cartId } = paramsSchema.parse(
          (req as unknown as { params: { tenantId: string; cartId: string } }).params,
        );
        const body = bodySchema.parse((req as unknown as { body: unknown }).body);
        await this.performRequest(
          () =>
            addCartItem(
              { tenantId, cartId, ...body },
              { cartRepo: this.cartRepo, publisher: this.publisher },
            ),
          res as unknown as HttpResponse,
          () => 201,
        );
      }),
    );

    // DELETE /tenants/:tenantId/carts/:cartId/items (remove)
    this.addDelete(
      '/tenants/:tenantId/carts/:cartId/items',
      requireCsrf(async (req, res) => {
        const paramsSchema = z.object({ tenantId: z.string().min(1), cartId: z.string().min(1) });
        const bodySchema = z.object({ imageId: z.string().min(1), sku: z.string().min(1) });
        const { tenantId, cartId } = paramsSchema.parse(
          (req as unknown as { params: { tenantId: string; cartId: string } }).params,
        );
        const body = bodySchema.parse((req as unknown as { body: unknown }).body);
        await this.performRequest(
          () =>
            removeCartItem(
              { tenantId, cartId, ...body },
              { cartRepo: this.cartRepo, publisher: this.publisher },
            ),
          res as unknown as HttpResponse,
          () => 204,
        );
      }),
    );

    return this.getRouter();
  }
}
