import type { CheckoutSession, CreateCheckoutSessionParams, IPaymentProvider } from '@ayeldo/core';
import { makeUuid } from '@ayeldo/utils';

/**
 * A fake Stripe provider implementation that constructs a plausible checkout URL
 * and returns a session id without performing any network calls.
 */
export class StripePaymentProviderFake implements IPaymentProvider {
  public async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
    const id = makeUuid();
    const url = `https://checkout.stripe.com/pay/${id}?tenant=${encodeURIComponent(params.tenantId)}&order=${encodeURIComponent(
      params.orderId,
    )}`;
    return { id, url, provider: 'stripe' } as const;
  }
}
