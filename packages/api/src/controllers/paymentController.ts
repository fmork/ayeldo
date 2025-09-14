import { z } from 'zod';
import type { ILogWriter } from '@fmork/backend-core/dist/logging';
import { PublicController } from '@fmork/backend-core/dist/controllers';
import type { HttpRouter } from '@fmork/backend-core/dist/controllers/http';
import { createCheckoutSession } from '../handlers/payments';
import type { IOrderRepo, IPaymentProvider } from '@ayeldo/core';

export interface PaymentControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly orderRepo: IOrderRepo;
  readonly payments: IPaymentProvider;
}

export class PaymentController extends PublicController {
  private readonly orderRepo: IOrderRepo;
  private readonly payments: IPaymentProvider;

  public constructor(props: PaymentControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.orderRepo = props.orderRepo;
    this.payments = props.payments;
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

    return this.getRouter();
  }
}

