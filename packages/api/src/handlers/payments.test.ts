import { createHmac } from 'crypto';
import { createCheckoutSession, handleStripeWebhook } from './payments';

describe('createCheckoutSession', () => {
  test('creates session and updates order state', async () => {
    const order = {
      id: 'o1',
      tenantId: 't1',
      cartId: 'c1',
      state: 'created',
      lines: [
        { imageId: 'img1', sku: 'SKU1', quantity: 1, unitPriceCents: 100, lineTotalCents: 100 },
      ],
      totalCents: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;
    const put = jest.fn(async () => {});
    const payments = {
      createCheckoutSession: jest.fn(async () => ({
        id: 'sess_123',
        url: 'https://checkout/123',
        provider: 'stripe' as const,
      })),
    };
    const deps = { orderRepo: { getById: async () => order, put }, payments } as any;

    const result = await createCheckoutSession(
      { tenantId: 't1', orderId: 'o1', successUrl: 'https://ok', cancelUrl: 'https://cancel' },
      deps,
    );

    expect(result.session.id).toBeDefined();
    expect(payments.createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledTimes(1);
    const saved = (put as jest.Mock).mock.calls[0][0];
    expect(saved.state).toBe('pending_payment');
  });

  test('throws if order missing', async () => {
    const deps = {
      orderRepo: { getById: async () => undefined, put: jest.fn() },
      payments: { createCheckoutSession: jest.fn() },
    } as any;
    await expect(
      createCheckoutSession(
        { tenantId: 't1', orderId: 'nope', successUrl: 'https://ok', cancelUrl: 'https://cancel' },
        deps,
      ),
    ).rejects.toThrow('Order not found');
  });
});

describe('handleStripeWebhook', () => {
  test('updates order to paid on payment_succeeded', async () => {
    const order = {
      id: 'o1',
      tenantId: 't1',
      cartId: 'c1',
      state: 'pending_payment',
      lines: [
        { imageId: 'img1', sku: 'SKU1', quantity: 1, unitPriceCents: 100, lineTotalCents: 100 },
      ],
      totalCents: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;
    const put = jest.fn(async () => {});
    const published: any[] = [];
    const publisher = {
      publish: jest.fn(async (evt: any) => {
        published.push(evt);
      }),
    };
    const deps = { orderRepo: { getById: async () => order, put }, publisher } as any;
    const payload = { tenantId: 't1', orderId: 'o1', eventType: 'payment_succeeded' } as const;
    const secret = 'shh';
    const sig = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    await handleStripeWebhook(payload, {
      orderRepo: deps.orderRepo,
      publisher,
      secret,
      signatureHeader: `sha256=${sig}`,
    });
    expect(put).toHaveBeenCalledTimes(1);
    const saved = (put as jest.Mock).mock.calls[0][0];
    expect(saved.state).toBe('paid');
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(published[0].type).toBe('OrderPaid');
    expect(published[0].payload).toEqual({ orderId: 'o1' });
  });

  test('updates order to failed on payment_failed', async () => {
    const order = {
      id: 'o2',
      tenantId: 't2',
      cartId: 'c2',
      state: 'pending_payment',
      lines: [
        { imageId: 'img1', sku: 'SKU1', quantity: 1, unitPriceCents: 100, lineTotalCents: 100 },
      ],
      totalCents: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;
    const put = jest.fn(async () => {});
    const published: any[] = [];
    const publisher = {
      publish: jest.fn(async (evt: any) => {
        published.push(evt);
      }),
    };
    const deps = { orderRepo: { getById: async () => order, put }, publisher } as any;
    const payload = { tenantId: 't2', orderId: 'o2', eventType: 'payment_failed' } as const;
    const secret = 'shh2';
    const sig = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    await handleStripeWebhook(payload, {
      orderRepo: deps.orderRepo,
      publisher,
      secret,
      signatureHeader: `sha256=${sig}`,
    });
    expect(put).toHaveBeenCalledTimes(1);
    const saved = (put as jest.Mock).mock.calls[0][0];
    expect(saved.state).toBe('failed');
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(published[0].type).toBe('OrderFailed');
    expect(published[0].payload).toEqual({ orderId: 'o2' });
  });

  test('throws on invalid signature', async () => {
    const order = {
      id: 'o3',
      tenantId: 't3',
      cartId: 'c3',
      state: 'pending_payment',
      lines: [
        { imageId: 'img1', sku: 'SKU1', quantity: 1, unitPriceCents: 100, lineTotalCents: 100 },
      ],
      totalCents: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;
    const deps = { orderRepo: { getById: async () => order, put: jest.fn(async () => {}) } } as any;
    const payload = { tenantId: 't3', orderId: 'o3', eventType: 'payment_succeeded' } as const;
    await expect(
      handleStripeWebhook(payload, {
        orderRepo: deps.orderRepo,
        publisher: { publish: jest.fn() } as any,
        secret: 'right',
        signatureHeader: 'sha256=wrong',
      }),
    ).rejects.toThrow('Invalid signature');
  });
});
