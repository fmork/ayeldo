import type { HttpRouter, ILogWriter } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
import { z } from 'zod';
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AxiosHttpClient } from '@fmork/backend-core';
import type { SessionService } from '../services/sessionService';

export interface CartBffControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly apiBaseUrl: string;
  readonly httpClient: AxiosHttpClient;
  readonly sessions?: SessionService;
}

export class CartBffController extends PublicController {
  private readonly apiBaseUrl: string;
  private readonly httpClient: AxiosHttpClient;
  private readonly sessions: SessionService | undefined;

  public constructor(props: CartBffControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.apiBaseUrl = props.apiBaseUrl;
    this.httpClient = props.httpClient;
    this.sessions = props.sessions;
  }

  public initialize(): HttpRouter {
    const requireSession =
      (handler: (req: any, res: any) => Promise<void>) => async (req: any, res: any) => {
        if (!this.sessions) return handler(req, res);
        const sid = req.cookies?.['__Host-sid'] as string | undefined;
        if (!sid) return res.status(401).json({ error: 'Not authenticated' });
        const sess = await this.sessions.getSession(sid);
        if (!sess) return res.status(401).json({ error: 'Not authenticated' });
        (req as any).session = sess;
        return handler(req, res);
      };

    const requireCsrf =
      (handler: (req: any, res: any) => Promise<void>) => async (req: any, res: any) => {
        const token = (req.headers?.['x-csrf-token'] ?? (req.headers as any)?.['X-CSRF-Token']) as
          | string
          | undefined;
        if (!token) return res.status(403).json({ error: 'Missing CSRF token' });
        await handler(req, res);
      };

    // GET /bff/carts/:tenantId/:cartId — fetch cart and priced summary
    this.addGet(
      '/bff/carts/:tenantId/:cartId',
      requireSession(async (req, res) => {
        const params = z
          .object({ tenantId: z.string().min(1), cartId: z.string().min(1) })
          .parse((req as any).params);
        const headers = this.makeAuthHeader(
          (req as any).session?.sub,
          undefined,
          (req as any).session?.roles,
        );
        const cartReq: any = {
          url: `${this.apiBaseUrl}/tenants/${params.tenantId}/carts/${params.cartId}`,
        };
        if (headers) cartReq.headers = headers;
        const cartResp = await this.httpClient.get(cartReq);
        const priceReq: any = {
          url: `${this.apiBaseUrl}/tenants/${params.tenantId}/carts/${params.cartId}/price`,
          body: {},
        };
        if (headers) priceReq.headers = headers;
        const priceResp = await this.httpClient.post(priceReq);
        const cart = JSON.parse(cartResp.body as string);
        const pricing = JSON.parse(priceResp.body as string);
        res.json({ cart, pricing });
      }),
    );

    // POST /bff/carts/:tenantId/:cartId/items — add and return priced cart
    this.addPost(
      '/bff/carts/:tenantId/:cartId/items',
      requireSession(
        requireCsrf(async (req, res) => {
          const params = z
            .object({ tenantId: z.string().min(1), cartId: z.string().min(1) })
            .parse((req as any).params);
          const body = z
            .object({
              imageId: z.string().min(1),
              sku: z.string().min(1),
              quantity: z.number().int().positive(),
            })
            .parse((req as any).body);
          const headers = this.makeAuthHeader(
            (req as any).session?.sub,
            undefined,
            (req as any).session?.roles,
          );
          const addReq: any = {
            url: `${this.apiBaseUrl}/tenants/${params.tenantId}/carts/${params.cartId}/items`,
            body,
          };
          if (headers) addReq.headers = headers;
          await this.httpClient.post(addReq);
          const priceReq: any = {
            url: `${this.apiBaseUrl}/tenants/${params.tenantId}/carts/${params.cartId}/price`,
            body: {},
          };
          if (headers) priceReq.headers = headers;
          const priceResp = await this.httpClient.post(priceReq);
          res.status(201).json(JSON.parse(priceResp.body as string));
        }),
      ),
    );

    // DELETE /bff/carts/:tenantId/:cartId/items — remove and return priced cart
    this.addDelete(
      '/bff/carts/:tenantId/:cartId/items',
      requireSession(
        requireCsrf(async (req, res) => {
          const params = z
            .object({ tenantId: z.string().min(1), cartId: z.string().min(1) })
            .parse((req as any).params);
          const body = z
            .object({ imageId: z.string().min(1), sku: z.string().min(1) })
            .parse((req as any).body);
          const headers = this.makeAuthHeader(
            (req as any).session?.sub,
            undefined,
            (req as any).session?.roles,
          );
          const delReq: any = {
            url: `${this.apiBaseUrl}/tenants/${params.tenantId}/carts/${params.cartId}/items`,
            body,
          };
          if (headers) delReq.headers = headers;
          await this.httpClient.delete(delReq);
          const priceReq: any = {
            url: `${this.apiBaseUrl}/tenants/${params.tenantId}/carts/${params.cartId}/price`,
            body: {},
          };
          if (headers) priceReq.headers = headers;
          const priceResp = await this.httpClient.post(priceReq);
          res.status(200).json(JSON.parse(priceResp.body as string));
        }),
      ),
    );

    return this.getRouter();
  }

  private makeAuthHeader(
    sub?: string,
    tenantId?: string,
    roles?: readonly string[],
  ): Record<string, string> | undefined {
    try {
      if (!this.sessions || !sub) return undefined;
      // For now, we sign a short-lived internal JWT and attach it
      const jwt = this.sessions.signApiJwt(sub, tenantId, roles);
      return { Authorization: `Bearer ${jwt}` } as const;
    } catch {
      return undefined;
    }
  }
}
/* eslint-disable @typescript-eslint/no-explicit-any */
