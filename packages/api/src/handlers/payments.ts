import { z } from 'zod';
import type { IEventPublisher, IOrderRepo, IPaymentProvider } from '@ayeldo/core';
import { nextOrderState, OrderAction } from '@ayeldo/core';
import type { CheckoutSession } from '@ayeldo/core';
import { createHmac } from 'crypto';
import { makeEventEnvelopeSchema } from '@ayeldo/types';
import { makeUlid } from '@ayeldo/utils';

export const createCheckoutSessionSchema = z.object({
  tenantId: z.string().min(1),
  orderId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
  deps: { orderRepo: IOrderRepo; payments: IPaymentProvider },
): Promise<{ session: CheckoutSession }> {
  const { tenantId, orderId, successUrl, cancelUrl } = createCheckoutSessionSchema.parse(input);
  const existing = await deps.orderRepo.getById(tenantId, orderId);
  if (!existing) throw new Error('Order not found');

  // Ensure valid transition to pending_payment
  const next = nextOrderState(existing.state, OrderAction.StartPayment);

  const session = await deps.payments.createCheckoutSession({
    tenantId,
    orderId,
    totalCents: existing.totalCents,
    lines: existing.lines,
    successUrl,
    cancelUrl,
  });

  // Persist state change
  const updated = { ...existing, state: next, updatedAt: new Date().toISOString() };
  await deps.orderRepo.put(updated);

  return { session };
}

export const stripeWebhookPayloadSchema = z.object({
  tenantId: z.string().min(1),
  orderId: z.string().min(1),
  eventType: z.enum(['payment_succeeded', 'payment_failed']),
});

export type StripeWebhookPayload = z.infer<typeof stripeWebhookPayloadSchema>;

export interface StripeWebhookDeps {
  readonly orderRepo: IOrderRepo;
  readonly publisher: IEventPublisher;
  readonly signatureHeader: string;
  readonly secret: string;
}

function verifyHmacSignature(body: unknown, header: string, secret: string): boolean {
  const bodyJson: string = JSON.stringify(body);
  const expected = createHmac('sha256', secret).update(bodyJson).digest('hex');
  const presented = header.startsWith('sha256=') ? header.slice('sha256='.length) : header;
  return presented === expected;
}

export async function handleStripeWebhook(
  payload: StripeWebhookPayload,
  deps: StripeWebhookDeps,
): Promise<{ ok: true }> {
  const parsed = stripeWebhookPayloadSchema.parse(payload);
  if (!verifyHmacSignature(parsed, deps.signatureHeader, deps.secret)) {
    throw new Error('Invalid signature');
  }

  const existing = await deps.orderRepo.getById(parsed.tenantId, parsed.orderId);
  if (!existing) throw new Error('Order not found');

  const action = parsed.eventType === 'payment_succeeded' ? OrderAction.PaymentSucceeded : OrderAction.PaymentFailed;
  const next = nextOrderState(existing.state, action);
  const updated = { ...existing, state: next, updatedAt: new Date().toISOString() };
  await deps.orderRepo.put(updated);

  const evt = {
    id: makeUlid(),
    type: action === OrderAction.PaymentSucceeded ? ('OrderPaid' as const) : ('OrderFailed' as const),
    occurredAt: new Date().toISOString(),
    tenantId: parsed.tenantId,
    payload: { orderId: parsed.orderId },
  };
  // Validate envelope shape at runtime
  makeEventEnvelopeSchema(evt.type, z.object({ orderId: z.string() })).parse(evt);
  await deps.publisher.publish(evt);
  return { ok: true };
}
