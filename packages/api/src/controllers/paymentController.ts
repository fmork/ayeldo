import { z } from 'zod';
import type { ILogWriter } from '@fmork/backend-core/dist/logging';
import { PublicController } from '@fmork/backend-core/dist/controllers';
import type { HttpRouter } from '@fmork/backend-core/dist/controllers/http';
import { createCheckoutSession, stripeWebhookPayloadSchema, handleStripeWebhook } from '../handlers/payments';
import type { IEventPublisher, IOrderRepo, IPaymentProvider } from '@ayeldo/core';

export interface PaymentControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly orderRepo: IOrderRepo;
  readonly payments: IPaymentProvider;
  readonly stripeWebhookSecret: string;
  readonly publisher: IEventPublisher;
}

export class PaymentController extends PublicController {
  private readonly orderRepo: IOrderRepo;
  private readonly payments: IPaymentProvider;
  private readonly stripeWebhookSecret: string;
  private readonly publisher: IEventPublisher;

  public constructor(props: PaymentControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.orderRepo = props.orderRepo;
    this.payments = props.payments;
    this.stripeWebhookSecret = props.stripeWebhookSecret;
    this.publisher = props.publisher;
  }

  public initialize(): HttpRouter {
    // POST /tenants/:tenantId/orders/:orderId/checkout-sessions
    this.addPost('/tenants/:tenantId/orders/:orderId/checkout-sessions', async (req, res) => {
      const params = z.object({ tenantId: z.string().min(1), orderId: z.string().min(1) }).parse(
        (req as unknown as { params: { tenantId: string; orderId: string } }).params,
      );
      const body = z.object({ successUrl: z.string().url(), cancelUrl: z.string().url() }).parse(
        (req as unknown as { body: unknown }).body,
      );
      await this.performRequest(
        () => createCheckoutSession({ ...params, ...body }, { orderRepo: this.orderRepo, payments: this.payments }),
        res,
        () => 201,
      );
    });

    // POST /webhooks/stripe — verify signature and update order state
    this.addPost('/webhooks/stripe', async (req, res) => {
      const body = stripeWebhookPayloadSchema.parse((req as unknown as { body: unknown }).body);
      const signatureHeader = (req as unknown as { headers: Record<string, string | string[] | undefined> }).headers[
        'x-stripe-signature'
      ];
      const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
      const sig = z.string().min(1).parse(signature);
      await this.performRequest(() => handleStripeWebhook(body, { orderRepo: this.orderRepo, publisher: this.publisher, signatureHeader: sig, secret: this.stripeWebhookSecret }), res, () => 200);
    });

    return this.getRouter();
  }
}
