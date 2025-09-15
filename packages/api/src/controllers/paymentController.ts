import type { IEventPublisher, IOrderRepo, IPaymentProvider } from '@ayeldo/core';
import type { HttpRouter, ILogWriter } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
// zod validation handled inside PaymentFlowService
import { PaymentFlowService } from '../services/paymentFlowService';

export interface PaymentControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly orderRepo: IOrderRepo;
  readonly payments: IPaymentProvider;
  readonly stripeWebhookSecret: string;
  readonly publisher: IEventPublisher;
}

export class PaymentController extends PublicController {
  private readonly flow: PaymentFlowService;

  public constructor(props: PaymentControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.flow = new PaymentFlowService({
      orderRepo: props.orderRepo,
      payments: props.payments,
      publisher: props.publisher,
      stripeWebhookSecret: props.stripeWebhookSecret,
    });
  }

  public initialize(): HttpRouter {
    // POST /tenants/:tenantId/orders/:orderId/checkout-sessions
    this.addPost('/tenants/:tenantId/orders/:orderId/checkout-sessions', async (req, res) => {
      await this.performRequest(
        () => {
          const r = req as unknown as { params: Record<string, unknown>; body: unknown };
          return this.flow.createCheckout({ ...r.params, ...(r.body as object) });
        },
        res,
        () => 201,
      );
    });

    // POST /webhooks/stripe — verify signature and update order state
    this.addPost('/webhooks/stripe', async (req, res) => {
      await this.performRequest(
        () => {
          const r = req as unknown as { headers: Record<string, unknown>; body: unknown };
          const sig = r.headers['x-stripe-signature'];
          return this.flow.processStripeWebhook(r.body, sig);
        },
        res,
        () => 200,
      );
    });

    return this.getRouter();
  }
}
