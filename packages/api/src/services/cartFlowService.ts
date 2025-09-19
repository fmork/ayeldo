import type { AxiosHttpClient, ILogWriter } from '@ayeldo/backend-core';
import { z } from 'zod';
import type { SessionService } from './sessionService';

export interface CartFlowServiceProps {
  readonly apiBaseUrl: string;
  readonly httpClient: AxiosHttpClient;
  readonly logger: ILogWriter;
  readonly sessions?: SessionService | undefined;
}

export interface SessionContext {
  readonly sub: string;
  readonly roles?: readonly string[];
}

export interface CartAndPricingResult {
  readonly cart: unknown;
  readonly pricing: unknown;
}

export class CartFlowService {
  private readonly apiBaseUrl: string;
  private readonly http: AxiosHttpClient;
  private readonly logger: ILogWriter;
  private readonly sessions: SessionService | undefined;

  public constructor(props: CartFlowServiceProps) {
    this.apiBaseUrl = props.apiBaseUrl;
    this.http = props.httpClient;
    this.logger = props.logger;
    this.sessions = props.sessions;
  }

  public async getCartWithPricing(input: {
    tenantId: string;
    cartId: string;
    sid?: string | undefined;
  }): Promise<CartAndPricingResult> {
    const headers = await this.buildAuthHeader(input.sid);
    const cartResp = await this.http.get({
      url: `${this.apiBaseUrl}/tenants/${input.tenantId}/carts/${input.cartId}`,
      ...(headers ? { headers } : {}),
    });
    const priceResp = await this.http.post({
      url: `${this.apiBaseUrl}/tenants/${input.tenantId}/carts/${input.cartId}/price`,
      body: {},
      ...(headers ? { headers } : {}),
    });
    return {
      cart: JSON.parse(cartResp.body as string),
      pricing: JSON.parse(priceResp.body as string),
    } as const;
  }

  public async addItemAndPrice(input: {
    tenantId: string;
    cartId: string;
    sid?: string | undefined;
    body: unknown;
  }): Promise<unknown> {
    const payload = z
      .object({
        imageId: z.string().min(1),
        sku: z.string().min(1),
        quantity: z.number().int().positive(),
      })
      .parse(input.body);
    const headers = await this.buildAuthHeader(input.sid);
    await this.http.post({
      url: `${this.apiBaseUrl}/tenants/${input.tenantId}/carts/${input.cartId}/items`,
      body: payload,
      ...(headers ? { headers } : {}),
    });
    const priced = await this.http.post({
      url: `${this.apiBaseUrl}/tenants/${input.tenantId}/carts/${input.cartId}/price`,
      body: {},
      ...(headers ? { headers } : {}),
    });
    return JSON.parse(priced.body as string) as unknown;
  }

  public async removeItemAndPrice(input: {
    tenantId: string;
    cartId: string;
    sid?: string | undefined;
    body: unknown;
  }): Promise<unknown> {
    const payload = z
      .object({ imageId: z.string().min(1), sku: z.string().min(1) })
      .parse(input.body);
    const headers = await this.buildAuthHeader(input.sid);
    await this.http.delete({
      url: `${this.apiBaseUrl}/tenants/${input.tenantId}/carts/${input.cartId}/items`,
      body: payload,
      ...(headers ? { headers } : {}),
    });
    const priced = await this.http.post({
      url: `${this.apiBaseUrl}/tenants/${input.tenantId}/carts/${input.cartId}/price`,
      body: {},
      ...(headers ? { headers } : {}),
    });
    return JSON.parse(priced.body as string) as unknown;
  }

  private async buildAuthHeader(sid?: string): Promise<Record<string, string> | undefined> {
    if (!this.sessions || !sid) return undefined;
    const sess = await this.sessions.getSession(sid);
    if (!sess) return undefined;
    try {
      const jwt = this.sessions.signApiJwt(sess.sub, undefined, sess.roles);
      return { Authorization: `Bearer ${jwt}` } as const;
    } catch (err) {
      this.logger.warn?.(`Failed to sign API JWT: ${(err as Error).message}`);
      return undefined;
    }
  }
}

// Legacy export for compatibility
export const CartBffFlowService = CartFlowService as unknown as typeof CartFlowService;
