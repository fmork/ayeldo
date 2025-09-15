import type { IEventPublisher, IOrderRepo, IPaymentProvider } from '@ayeldo/core';
import { z } from 'zod';
import {
  createCheckoutSession,
  handleStripeWebhook,
  stripeWebhookPayloadSchema,
} from '../handlers/payments';

export interface PaymentFlowServiceProps {
  readonly orderRepo: IOrderRepo;
  readonly payments: IPaymentProvider;
  readonly publisher: IEventPublisher;
  readonly stripeWebhookSecret: string;
}

export class PaymentFlowService {
  private readonly orderRepo: IOrderRepo;
  private readonly payments: IPaymentProvider;
  private readonly publisher: IEventPublisher;
  private readonly stripeWebhookSecret: string;

  public constructor(props: PaymentFlowServiceProps) {
    this.orderRepo = props.orderRepo;
    this.payments = props.payments;
    this.publisher = props.publisher;
    this.stripeWebhookSecret = props.stripeWebhookSecret;
  }

  public async createCheckout(input: unknown): Promise<ReturnType<typeof createCheckoutSession>> {
    const params = z
      .object({
        tenantId: z.string().min(1),
        orderId: z.string().min(1),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
      .parse(input);
    return createCheckoutSession(params, { orderRepo: this.orderRepo, payments: this.payments });
  }

  public async processStripeWebhook(
    body: unknown,
    signatureHeader: unknown,
  ): Promise<{ ok: true }> {
    const payload = stripeWebhookPayloadSchema.parse(body);
    const sig = z.string().min(1).parse(signatureHeader);
    return handleStripeWebhook(payload, {
      orderRepo: this.orderRepo,
      publisher: this.publisher,
      signatureHeader: sig,
      secret: this.stripeWebhookSecret,
    });
  }
}
