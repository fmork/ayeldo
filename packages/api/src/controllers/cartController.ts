import { z } from 'zod';
import type { ILogWriter } from '@fmork/backend-core/dist/logging';
import { PublicController } from '@fmork/backend-core/dist/controllers';
import type { HttpRouter } from '@fmork/backend-core/dist/controllers/http';
import { priceCart, addCartItem, removeCartItem, getCart } from '../handlers/carts';
import type { ICartRepo, IPriceListRepo, IEventPublisher } from '@ayeldo/core';
import { TieredPricingEngine } from '@ayeldo/core';

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
    // Simple CSRF header check middleware
    const requireCsrf = (handler: (req: any, res: any) => Promise<void>) => async (req: any, res: any) => {
      const token = (req.headers?.['x-csrf-token'] ?? (req.headers as any)?.['X-CSRF-Token']) as string | undefined;
      if (!token || token.length === 0) {
        res.status(403).json({ error: 'Missing CSRF token' });
        return;
      }
      await handler(req, res);
    };
    // POST /tenants/:tenantId/carts/:cartId/price
    this.addPost('/tenants/:tenantId/carts/:cartId/price', async (req, res) => {
      const paramsSchema = z.object({ tenantId: z.string().min(1), cartId: z.string().min(1) });
      const { tenantId, cartId } = paramsSchema.parse(
        (req as unknown as { params: { tenantId: string; cartId: string } }).params,
      );
      await this.performRequest(
        () => priceCart({ tenantId, cartId }, { cartRepo: this.cartRepo, priceListRepo: this.priceListRepo, engine: this.engine }),
        res,
      );
    });

    // GET /tenants/:tenantId/carts/:cartId
    this.addGet('/tenants/:tenantId/carts/:cartId', async (req, res) => {
      const paramsSchema = z.object({ tenantId: z.string().min(1), cartId: z.string().min(1) });
      const { tenantId, cartId } = paramsSchema.parse(
        (req as unknown as { params: { tenantId: string; cartId: string } }).params,
      );
      await this.performRequest(() => getCart({ tenantId, cartId }, { cartRepo: this.cartRepo }), res);
    });

    // POST /tenants/:tenantId/carts/:cartId/items (add)
    this.addPost(
      '/tenants/:tenantId/carts/:cartId/items',
      requireCsrf(async (req, res) => {
        const paramsSchema = z.object({ tenantId: z.string().min(1), cartId: z.string().min(1) });
        const bodySchema = z.object({ imageId: z.string().min(1), sku: z.string().min(1), quantity: z.number().int().positive() });
        const { tenantId, cartId } = paramsSchema.parse(
          (req as unknown as { params: { tenantId: string; cartId: string } }).params,
        );
        const body = bodySchema.parse((req as unknown as { body: unknown }).body);
        await this.performRequest(
          () => addCartItem({ tenantId, cartId, ...body }, { cartRepo: this.cartRepo, publisher: this.publisher }),
          res,
          () => 201
        );
      })
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
          () => removeCartItem({ tenantId, cartId, ...body }, { cartRepo: this.cartRepo, publisher: this.publisher }),
          res,
          () => 204
        );
      })
    );

    return this.getRouter();
  }
}
