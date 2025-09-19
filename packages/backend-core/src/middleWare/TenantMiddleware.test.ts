import { expect, test } from '@jest/globals';
import { TenantMiddleware } from './TenantMiddleware';

class DummyLog {
  info(_t: string) {}
  debug(_t: string) {}
  warn(_t: string) {}
  error(_t: string, _err: Error) {}
}

test('requireTenant returns 403 when no tenant present', () => {
  const middleware = new TenantMiddleware({ logWriter: new DummyLog() as any });
  const req: any = { headers: {} };
  const res: any = { status: jest.fn(() => res), json: jest.fn() };
  const next = jest.fn();

  middleware.requireTenant(req, res, next);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});

test('requireTenant calls next when tenant present', () => {
  const middleware = new TenantMiddleware({ logWriter: new DummyLog() as any });
  const req: any = { headers: {}, tenant: { tenantId: 't1', userId: 'u1' } };
  const res: any = { status: jest.fn(() => res), json: jest.fn() };
  const next = jest.fn();

  middleware.requireTenant(req, res, next);

  expect(next).toHaveBeenCalled();
  expect((req as any).tenantContext).toBeDefined();
  expect((req as any).tenantContext.tenantId).toBe('t1');
});
