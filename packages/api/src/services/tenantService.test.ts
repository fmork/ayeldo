import type { IEventPublisher, ITenantRepo } from '@ayeldo/core';
import { TenantService } from './tenantService';

// Mock JsonUtil
const JsonUtil = jest.fn().mockImplementation(() => ({
  getParsedRequestBody: jest.fn((body) => body), // Just return the body as-is
}));

describe('TenantService', () => {
  test('happy path: creates tenant and publishes event', async () => {
    const fakeTenant = {
      id: '01F4Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0',
      name: 'Acme Ltd',
      ownerEmail: 'owner@acme.test',
      plan: 'free',
      status: 'active',
      createdAt: new Date().toISOString(),
    } as const;

    const repo: ITenantRepo = {
      async createTenant(input: any, id: any) {
        return { ...fakeTenant } as any;
      },
      async getTenantById() {
        return undefined;
      },
      async getTenantByOwnerEmail() {
        return undefined;
      },
    } as unknown as ITenantRepo;

    const published: unknown[] = [];
    const publisher: IEventPublisher = {
      async publish(evt: unknown) {
        published.push(evt);
      },
    } as unknown as IEventPublisher;

    const jsonUtil = new JsonUtil({
      logWriter: { info: () => {}, warn: () => {}, error: () => {} } as any,
    });
    const svc = new TenantService({
      tenantRepo: repo,
      publisher,
      jsonUtil,
      logWriter: { info: () => {}, warn: () => {}, error: () => {} } as any,
    });

    const body = { name: 'Acme Ltd', ownerEmail: 'owner@acme.test' } as unknown;
    const result = await svc.createTenantFromRequest(body);

    expect(result).toBeDefined();
    expect(published.length).toBe(1);
  });

  test('validation error: invalid payload', async () => {
    const repo = {} as unknown as ITenantRepo;
    const publisher = {} as unknown as IEventPublisher;
    const jsonUtil = new JsonUtil({
      logWriter: { info: () => {}, warn: () => {}, error: () => {} } as any,
    });
    const svc = new TenantService({
      tenantRepo: repo,
      publisher,
      jsonUtil,
      logWriter: { info: () => {}, warn: () => {}, error: () => {} } as any,
    });

    await expect(
      svc.createTenantFromRequest({ name: '', ownerEmail: 'not-an-email' } as unknown),
    ).rejects.toThrow();
  });
});
