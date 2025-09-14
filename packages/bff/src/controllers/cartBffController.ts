import type { ILogWriter } from '@fmork/backend-core/dist/logging';
import { PublicController } from '@fmork/backend-core/dist/controllers';
import type { HttpRouter } from '@fmork/backend-core/dist/controllers/http';
import { z } from 'zod';
import { AxiosHttpClient } from '@fmork/backend-core/dist/IO';

export interface CartBffControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly apiBaseUrl: string;
  readonly httpClient: AxiosHttpClient;
}

export class CartBffController extends PublicController {
  private readonly apiBaseUrl: string;
  private readonly httpClient: AxiosHttpClient;

  public constructor(props: CartBffControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.apiBaseUrl = props.apiBaseUrl;
    this.httpClient = props.httpClient;
  }

  public initialize(): HttpRouter {
    const requireCsrf = (handler: (req: any, res: any) => Promise<void>) => async (req: any, res: any) => {
      const token = (req.headers?.['x-csrf-token'] ?? (req.headers as any)?.['X-CSRF-Token']) as string | undefined;
      if (!token) return res.status(403).json({ error: 'Missing CSRF token' });
      await handler(req, res);
    };

    // GET /bff/carts/:tenantId/:cartId — fetch cart and priced summary
    this.addGet('/bff/carts/:tenantId/:cartId', async (req, res) => {
      const params = z.object({ tenantId: z.string().min(1), cartId: z.string().min(1) }).parse((req as any).params);
      const cartResp = await this.httpClient.get({ url: `${this.apiBaseUrl}/tenants/${params.tenantId}/carts/${params.cartId}` });
      const priceResp = await this.httpClient.post({ url: `${this.apiBaseUrl}/tenants/${params.tenantId}/carts/${params.cartId}/price`, body: {} });
      const cart = JSON.parse(cartResp.body as string);
      const pricing = JSON.parse(priceResp.body as string);
      res.json({ cart, pricing });
    });

    // POST /bff/carts/:tenantId/:cartId/items — add and return priced cart
    this.addPost(
      '/bff/carts/:tenantId/:cartId/items',
      requireCsrf(async (req, res) => {
        const params = z.object({ tenantId: z.string().min(1), cartId: z.string().min(1) }).parse((req as any).params);
        const body = z
          .object({ imageId: z.string().min(1), sku: z.string().min(1), quantity: z.number().int().positive() })
          .parse((req as any).body);
        await this.httpClient.post({ url: `${this.apiBaseUrl}/tenants/${params.tenantId}/carts/${params.cartId}/items`, body });
        const priceResp = await this.httpClient.post({ url: `${this.apiBaseUrl}/tenants/${params.tenantId}/carts/${params.cartId}/price`, body: {} });
        res.status(201).json(JSON.parse(priceResp.body as string));
      })
    );

    // DELETE /bff/carts/:tenantId/:cartId/items — remove and return priced cart
    this.addDelete(
      '/bff/carts/:tenantId/:cartId/items',
      requireCsrf(async (req, res) => {
        const params = z.object({ tenantId: z.string().min(1), cartId: z.string().min(1) }).parse((req as any).params);
        const body = z.object({ imageId: z.string().min(1), sku: z.string().min(1) }).parse((req as any).body);
        await this.httpClient.delete({ url: `${this.apiBaseUrl}/tenants/${params.tenantId}/carts/${params.cartId}/items`, body });
        const priceResp = await this.httpClient.post({ url: `${this.apiBaseUrl}/tenants/${params.tenantId}/carts/${params.cartId}/price`, body: {} });
        res.status(200).json(JSON.parse(priceResp.body as string));
      })
    );

    return this.getRouter();
  }
}
