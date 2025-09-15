import type { HttpRouter, ILogWriter } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
import { z } from 'zod';
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AxiosHttpClient } from '@fmork/backend-core';
import { CartBffFlowService } from '../services/cartBffFlowService';
import type { SessionService } from '../services/sessionService';

export interface CartBffControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly apiBaseUrl: string;
  readonly httpClient: AxiosHttpClient;
  readonly sessions?: SessionService;
}

export class CartBffController extends PublicController {
  private readonly flow: CartBffFlowService;

  public constructor(props: CartBffControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.flow = new CartBffFlowService({
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

    const requireCsrf =
      (handler: (req: any, res: any, sid?: string) => Promise<void>) =>
      async (req: any, res: any, sid?: string) => {
        const token = (req.headers?.['x-csrf-token'] ?? (req.headers as any)?.['X-CSRF-Token']) as
          | string
          | undefined;
        if (!token) return res.status(403).json({ error: 'Missing CSRF token' });
        await handler(req, res, sid);
      };

    // GET /bff/carts/:tenantId/:cartId — fetch cart and priced summary
    this.addGet(
      '/bff/carts/:tenantId/:cartId',
      requireSession(async (req, res, sid) => {
        const params = z
          .object({ tenantId: z.string().min(1), cartId: z.string().min(1) })
          .parse((req as any).params);
        const result = await this.flow.getCartWithPricing({ ...params, sid });
        res.json(result);
      }),
    );

    // POST /bff/carts/:tenantId/:cartId/items — add and return priced cart
    this.addPost(
      '/bff/carts/:tenantId/:cartId/items',
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

    // DELETE /bff/carts/:tenantId/:cartId/items — remove and return priced cart
    this.addDelete(
      '/bff/carts/:tenantId/:cartId/items',
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

  // Auth header handled inside CartBffFlowService
}
/* eslint-disable @typescript-eslint/no-explicit-any */
