import { z } from 'zod';
import type { IOrderRepo, IPaymentProvider } from '@ayeldo/core';
import { nextOrderState, OrderAction } from '@ayeldo/core';
import type { CheckoutSession } from '@ayeldo/core';

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

