import type { DdbClient } from './ddbClient';
import TenantRepoDdb from './tenantRepoDdb';

describe('TenantRepoDdb', () => {
  test('createTenant stores item and returns TenantDto', async () => {
    const puts: any[] = [];
    const client: DdbClient = {
      async put({ tableName, item }) {
        puts.push({ tableName, item });
      },
      async get() {
        return { item: undefined };
      },
      async query() {
        return { items: [] };
      },
    } as DdbClient;

    const repo = new TenantRepoDdb({ tableName: 'T', client });

    const created = await repo.createTenant(
      { name: 'Acme', ownerEmail: 'a@b.test' } as any,
      'ID123',
    );

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Acme');
    expect(created.ownerEmail).toBe('a@b.test');
    expect(puts.length).toBe(1);
    const put = puts[0];
    expect(put.tableName).toBe('T');
    expect(put.item.PK).toContain('TENANT#');
    expect(put.item.SK).toContain('METADATA#');
  });

  test('getTenantById returns undefined when not found and returns tenant when present', async () => {
    const id = 'ID999';
    const clientMissing: DdbClient = {
      async get() {
        return { item: undefined };
      },
      async put() {
        return;
      },
      async query() {
        return { items: [] };
      },
    } as DdbClient;

    const repoMissing = new TenantRepoDdb({ tableName: 'T', client: clientMissing });
    const resMissing = await repoMissing.getTenantById(id);
    expect(resMissing).toBeUndefined();

    const clientFound: DdbClient = {
      async get() {
        return {
          item: {
            id: id,
            name: 'Found Co',
            ownerEmail: 'found@x.com',
            plan: 'free',
            status: 'active',
            createdAt: '2020-01-01T00:00:00.000Z',
          },
        };
      },
      async put() {
        return;
      },
      async query() {
        return { items: [] };
      },
    } as DdbClient;

    const repoFound = new TenantRepoDdb({ tableName: 'T', client: clientFound });
    const resFound = await repoFound.getTenantById(id);
    expect(resFound).toBeDefined();
    expect(resFound?.id).toBe(id);
    expect(resFound?.ownerEmail).toBe('found@x.com');
  });

  test('getTenantByOwnerEmail queries and returns first matching item', async () => {
    const client: DdbClient = {
      async get() {
        return { item: undefined };
      },
      async put() {
        return;
      },
      async query() {
        return {
          items: [
            {
              id: 'ID-1',
              name: 'One',
              ownerEmail: 'owner@domain',
              plan: 'free',
              status: 'active',
              createdAt: '2020-01-01T00:00:00.000Z',
            },
          ],
        };
      },
    } as DdbClient;

    const repo = new TenantRepoDdb({ tableName: 'T', client });
    const out = await repo.getTenantByOwnerEmail('owner@domain');
    expect(out).toBeDefined();
    expect(out?.id).toBe('ID-1');
    expect(out?.ownerEmail).toBe('owner@domain');
  });
});
