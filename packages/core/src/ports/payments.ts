import type { OrderLineDto, TenantId } from '../types';

export interface CheckoutSession {
  readonly id: string;
  readonly url: string;
  readonly provider: 'stripe';
}

export interface CreateCheckoutSessionParams {
  readonly tenantId: TenantId;
  readonly orderId: string;
  readonly totalCents: number;
  readonly lines: readonly OrderLineDto[];
  readonly successUrl: string;
  readonly cancelUrl: string;
}

export interface IPaymentProvider {
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession>;
}

