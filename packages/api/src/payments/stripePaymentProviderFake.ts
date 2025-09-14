import type { CheckoutSession, CreateCheckoutSessionParams, IPaymentProvider } from '@ayeldo/core';
import { makeUlid } from '@ayeldo/utils';

export class StripePaymentProviderFake implements IPaymentProvider {
  public async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
    const id = makeUlid();
    const url = `https://checkout.stripe.com/pay/${id}?tenant=${encodeURIComponent(params.tenantId)}&order=${encodeURIComponent(
      params.orderId,
    )}`;
    return { id, url, provider: 'stripe' } as const;
  }
}

