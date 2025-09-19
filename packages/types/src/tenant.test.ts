import { tenantCreateSchema, tenantSchema } from './schemas';

describe('Tenant schemas', () => {
  test('tenantCreate: happy path', () => {
    const data = { name: 'My Company', ownerEmail: 'owner@example.com', adminName: 'Alice' };
    const parsed = tenantCreateSchema.parse(data);
    expect(parsed.name).toBe('My Company');
  });

  test('tenantCreate: rejects invalid email', () => {
    const data = { name: 'X', ownerEmail: 'not-an-email' } as unknown;
    expect(() => tenantCreateSchema.parse(data)).toThrow();
  });

  test('tenant: happy path', () => {
    const data = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'My Company',
      ownerEmail: 'owner@example.com',
      plan: 'free',
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    const parsed = tenantSchema.parse(data);
    expect(parsed.status).toBe('active');
  });
});
