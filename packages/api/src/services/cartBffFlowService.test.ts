import { CartFlowService } from './cartFlowService';

// Minimal mock logger
const mkLogger = () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() });

function mkHttpClient() {
  return {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
  } as any;
}

function mkSessions(overrides?: Partial<any>) {
  return {
    getSession: jest.fn().mockResolvedValue({ sub: 'user-1', roles: ['member'] }),
    signApiJwt: jest.fn().mockReturnValue('jwt-token'),
    ...overrides,
  } as any;
}

describe('CartFlowService', () => {
  const apiBaseUrl = 'https://internal-api';

  test('getCartWithPricing performs two calls and returns parsed bodies', async () => {
    const http = mkHttpClient();
    http.get.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ id: 'c1', items: [] }),
      headers: {},
    });
    http.post.mockResolvedValue({ status: 200, body: JSON.stringify({ total: 0 }), headers: {} });
    const sessions = mkSessions();
    const svc = new CartFlowService({
      apiBaseUrl,
      httpClient: http,
      logger: mkLogger() as any,
      sessions,
    });
    const result = await svc.getCartWithPricing({ tenantId: 't1', cartId: 'c1', sid: 'sid123' });
    expect(result.cart).toEqual({ id: 'c1', items: [] });
    expect(result.pricing).toEqual({ total: 0 });
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledTimes(1); // pricing call
    const authHeader = http.get.mock.calls[0][0].headers.Authorization;
    expect(authHeader).toBe('Bearer jwt-token');
  });

  test('addItemAndPrice validates payload and posts then prices', async () => {
    const http = mkHttpClient();
    http.post
      .mockResolvedValueOnce({ status: 204, body: '', headers: {} })
      .mockResolvedValueOnce({ status: 200, body: JSON.stringify({ total: 42 }), headers: {} });
    const svc = new CartFlowService({ apiBaseUrl, httpClient: http, logger: mkLogger() as any });
    const priced = await svc.addItemAndPrice({
      tenantId: 't1',
      cartId: 'c9',
      body: { imageId: 'i1', sku: 'S', quantity: 2 },
    });
    expect(priced).toEqual({ total: 42 });
    expect(http.post).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ url: `${apiBaseUrl}/tenants/t1/carts/c9/items` }),
    );
    expect(http.post).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ url: `${apiBaseUrl}/tenants/t1/carts/c9/price` }),
    );
  });

  test('addItemAndPrice rejects invalid payload (quantity <=0)', async () => {
    const http = mkHttpClient();
    const svc = new CartFlowService({ apiBaseUrl, httpClient: http, logger: mkLogger() as any });
    await expect(
      svc.addItemAndPrice({
        tenantId: 't1',
        cartId: 'c1',
        body: { imageId: 'i', sku: 'S', quantity: 0 },
      }),
    ).rejects.toThrow(/quantity/);
    expect(http.post).not.toHaveBeenCalled();
  });

  test('removeItemAndPrice issues delete then price and returns parsed pricing', async () => {
    const http = mkHttpClient();
    http.delete.mockResolvedValue({ status: 204, body: '', headers: {} });
    http.post.mockResolvedValue({ status: 200, body: JSON.stringify({ total: 10 }), headers: {} });
    const svc = new CartFlowService({ apiBaseUrl, httpClient: http, logger: mkLogger() as any });
    const priced = await svc.removeItemAndPrice({
      tenantId: 't1',
      cartId: 'c7',
      body: { imageId: 'img', sku: 'SKU' },
    });
    expect(priced).toEqual({ total: 10 });
    expect(http.delete).toHaveBeenCalledWith(
      expect.objectContaining({ url: `${apiBaseUrl}/tenants/t1/carts/c7/items` }),
    );
  });

  test('buildAuthHeader omitted when no session service', async () => {
    const http = mkHttpClient();
    http.get.mockResolvedValue({ status: 200, body: JSON.stringify({ id: 'c1' }), headers: {} });
    http.post.mockResolvedValue({ status: 200, body: JSON.stringify({ total: 0 }), headers: {} });
    const svc = new CartFlowService({ apiBaseUrl, httpClient: http, logger: mkLogger() as any });
    await svc.getCartWithPricing({ tenantId: 't', cartId: 'c' });
    expect(http.get.mock.calls[0][0].headers).toBeUndefined();
  });

  test('buildAuthHeader handles signing failure gracefully', async () => {
    const http = mkHttpClient();
    http.get.mockResolvedValue({ status: 200, body: JSON.stringify({ id: 'c1' }), headers: {} });
    http.post.mockResolvedValue({ status: 200, body: JSON.stringify({ total: 0 }), headers: {} });
    const sessions = mkSessions({
      signApiJwt: jest.fn(() => {
        throw new Error('boom');
      }),
    });
    const logger = mkLogger();
    const svc = new CartFlowService({
      apiBaseUrl,
      httpClient: http,
      logger: logger as any,
      sessions,
    });
    await svc.getCartWithPricing({ tenantId: 't', cartId: 'c', sid: 'sid' });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to sign API JWT'));
  });
});
