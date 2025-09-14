import { describe, expect, test, jest } from '@jest/globals';
import { createCheckoutSession } from './payments';

describe('createCheckoutSession', () => {
  test('creates session and updates order state', async () => {
    const order = {
      id: 'o1',
      tenantId: 't1',
      cartId: 'c1',
      state: 'created',
      lines: [{ imageId: 'img1', sku: 'SKU1', quantity: 1, unitPriceCents: 100, lineTotalCents: 100 }],
      totalCents: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;
    const put = jest.fn(async () => {});
    const payments = { createCheckoutSession: jest.fn(async () => ({ id: 'sess_123', url: 'https://checkout/123', provider: 'stripe' as const })) };
    const deps = { orderRepo: { getById: async () => order, put }, payments } as any;

    const result = await createCheckoutSession({ tenantId: 't1', orderId: 'o1', successUrl: 'https://ok', cancelUrl: 'https://cancel' }, deps);

    expect(result.session.id).toBeDefined();
    expect(payments.createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledTimes(1);
    const saved = (put as jest.Mock).mock.calls[0][0];
    expect(saved.state).toBe('pending_payment');
  });

  test('throws if order missing', async () => {
    const deps = { orderRepo: { getById: async () => undefined, put: jest.fn() }, payments: { createCheckoutSession: jest.fn() } } as any;
    await expect(
      createCheckoutSession({ tenantId: 't1', orderId: 'nope', successUrl: 'https://ok', cancelUrl: 'https://cancel' }, deps),
    ).rejects.toThrow('Order not found');
  });
});

