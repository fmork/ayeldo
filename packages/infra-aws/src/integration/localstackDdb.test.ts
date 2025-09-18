import { Album, Image } from '@ayeldo/core';
import type { DdbClient, QueryParams, QueryResult } from '../ddbClient';
import { AlbumRepoDdb } from '../repos/albumRepoDdb';
import { ImageRepoDdb } from '../repos/imageRepoDdb';
import TenantMembershipRepoDdb from '../repos/tenantMembershipRepoDdb';
import { UserRepoDdb } from '../userRepoDdb';

// Only run when LocalStack is available
const env = ((globalThis as unknown as { process?: { env?: Record<string, string> } }).process
  ?.env ?? {}) as Record<string, string>;
const hasLocalstack = !!env.LOCALSTACK_URL;
const ddbEndpoint = env.LOCALSTACK_URL ?? '';
const region = env.AWS_REGION ?? 'us-east-1';

// Wrap AWS SDK v3 as a DdbClient implementation
class SdkDdbClient implements DdbClient {
  // Lazy-loaded to avoid requiring AWS SDK unless test runs
  private docClientPromise: Promise<any> | undefined;

  constructor(
    private readonly endpoint: string,
    private readonly regionName: string,
  ) {}

  private async getDocClient(): Promise<any> {
    if (!this.docClientPromise) {
      this.docClientPromise = (async () => {
        const {
          DynamoDBClient,
          GetItemCommand,
          PutItemCommand,
          UpdateItemCommand,
          QueryCommand,
          DeleteItemCommand,
        } = await import('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb');
        const client = new DynamoDBClient({
          region: this.regionName,
          endpoint: this.endpoint,
          credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
        });
        // Return both raw and doc clients and commands for flexibility
        const doc = DynamoDBDocumentClient.from(client, {
          marshallOptions: { convertClassInstanceToMap: true, removeUndefinedValues: true },
        });
        return {
          client,
          doc,
          GetItemCommand,
          PutItemCommand,
          UpdateItemCommand,
          QueryCommand,
          DeleteItemCommand,
        };
      })();
    }
    return this.docClientPromise;
  }

  async get<TItem extends object>(params: {
    tableName: string;
    key: { PK: string; SK: string };
  }): Promise<{ item?: TItem }> {
    const { doc } = await this.getDocClient();
    const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
    const out = await doc.send(
      new GetCommand({
        TableName: params.tableName,
        Key: { PK: params.key.PK, SK: params.key.SK },
      }),
    );
    return out.Item ? { item: out.Item as TItem } : {};
  }

  async put<TItem extends object>(params: { tableName: string; item: TItem }): Promise<void> {
    const { doc } = await this.getDocClient();
    const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
    await doc.send(new PutCommand({ TableName: params.tableName, Item: params.item }));
  }

  async update(params: {
    tableName: string;
    key: { PK: string; SK: string };
    update: string;
    names?: Record<string, string>;
    values?: Record<string, unknown>;
  }): Promise<void> {
    const { doc } = await this.getDocClient();
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    await doc.send(
      new UpdateCommand({
        TableName: params.tableName,
        Key: { PK: params.key.PK, SK: params.key.SK },
        UpdateExpression: params.update,
        ExpressionAttributeNames: params.names,
        ExpressionAttributeValues: params.values as Record<string, any> | undefined,
      }),
    );
  }

  async query<TItem extends object>(params: QueryParams): Promise<QueryResult<TItem>> {
    const { doc } = await this.getDocClient();
    const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    const out = await doc.send(
      new QueryCommand({
        TableName: params.tableName,
        IndexName: params.indexName,
        KeyConditionExpression: params.keyCondition,
        FilterExpression: params.filter,
        ExpressionAttributeNames: params.names,
        ExpressionAttributeValues: params.values as Record<string, any>,
        ScanIndexForward: params.scanIndexForward,
        Limit: params.limit,
        ExclusiveStartKey: params.exclusiveStartKey as any,
      }),
    );
    return { items: (out.Items ?? []) as TItem[], lastEvaluatedKey: out.LastEvaluatedKey as any };
  }

  async delete(params: { tableName: string; key: { PK: string; SK: string } }): Promise<void> {
    const { doc } = await this.getDocClient();
    const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
    await doc.send(new DeleteCommand({ TableName: params.tableName, Key: params.key }));
  }
}

async function createTableWithGsis(
  tableName: string,
  endpoint: string,
  regionName: string,
): Promise<void> {
  const { DynamoDBClient, CreateTableCommand, UpdateTimeToLiveCommand } = await import(
    '@aws-sdk/client-dynamodb'
  );
  const ddb = new DynamoDBClient({
    region: regionName,
    endpoint,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });
  await ddb.send(
    new CreateTableCommand({
      TableName: tableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
        { AttributeName: 'GSI1PK', AttributeType: 'S' },
        { AttributeName: 'GSI1SK', AttributeType: 'S' },
        { AttributeName: 'GSI2PK', AttributeType: 'S' },
        { AttributeName: 'GSI2SK', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'GSI1',
          KeySchema: [
            { AttributeName: 'GSI1PK', KeyType: 'HASH' },
            { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
        {
          IndexName: 'GSI2',
          KeySchema: [
            { AttributeName: 'GSI2PK', KeyType: 'HASH' },
            { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    }),
  );
  const { waitUntilTableExists } = await import('@aws-sdk/client-dynamodb');
  await waitUntilTableExists({ client: ddb, maxWaitTime: 30 }, { TableName: tableName });
  await ddb.send(
    new UpdateTimeToLiveCommand({
      TableName: tableName,
      TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true },
    }),
  );
}

async function deleteTable(tableName: string, endpoint: string, regionName: string): Promise<void> {
  const { DynamoDBClient, DeleteTableCommand } = await import('@aws-sdk/client-dynamodb');
  const ddb = new DynamoDBClient({
    region: regionName,
    endpoint,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });
  await ddb.send(new DeleteTableCommand({ TableName: tableName }));
}

const maybeDescribe: typeof describe = hasLocalstack ? describe : describe.skip;

maybeDescribe('LocalStack DynamoDB integration (GSIs)', () => {
  const tableName = `AyeldoTest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const tenantA = 'tenantA';
  const tenantB = 'tenantB';
  const now = new Date().toISOString();

  let client: DdbClient;

  beforeAll(async () => {
    await createTableWithGsis(tableName, ddbEndpoint, region);
    client = new SdkDdbClient(ddbEndpoint, region);
  }, 60000);

  afterAll(async () => {
    await deleteTable(tableName, ddbEndpoint, region);
  }, 30000);

  it('lists child albums via GSI1 and filters by tenant', async () => {
    const parentId = 'parent1';
    const childId1 = 'child1';
    const childId2 = 'child2';
    const otherTenantChild = 'childX';

    const albumRepo = new AlbumRepoDdb({ tableName, client });

    // seed
    await albumRepo.put(
      new Album({ id: parentId, tenantId: tenantA, title: 'Parent', createdAt: now }),
    );
    await albumRepo.put(
      new Album({
        id: childId1,
        tenantId: tenantA,
        title: 'Child 1',
        parentAlbumId: parentId,
        createdAt: now,
      }),
    );
    await albumRepo.put(
      new Album({
        id: childId2,
        tenantId: tenantA,
        title: 'Child 2',
        parentAlbumId: parentId,
        createdAt: now,
      }),
    );
    // Same parent but different tenant — should be filtered out by tenant PK filter
    await albumRepo.put(
      new Album({
        id: otherTenantChild,
        tenantId: tenantB,
        title: 'Child X',
        parentAlbumId: parentId,
        createdAt: now,
      }),
    );

    const children = await albumRepo.listChildren(tenantA, parentId);
    const ids = children.map((a) => a.id).sort();
    expect(ids).toEqual([childId1, childId2].sort());
  });

  it('lists root albums without parent association', async () => {
    const albumRepo = new AlbumRepoDdb({ tableName, client });

    const rootIds = ['rootA', 'rootB'];
    for (const id of rootIds) {
      await albumRepo.put(
        new Album({ id, tenantId: tenantA, title: `Album ${id}`, createdAt: now }),
      );
    }

    // Child album should not appear in root listing
    await albumRepo.put(
      new Album({
        id: 'nestedChild',
        tenantId: tenantA,
        title: 'Nested',
        parentAlbumId: rootIds[0],
        createdAt: now,
      }),
    );

    const othersTenantRoot = new Album({ id: 'rootOther', tenantId: tenantB, title: 'Other', createdAt: now });
    await albumRepo.put(othersTenantRoot);

    const roots = await albumRepo.listRoot(tenantA);
    const rootList = roots.map((a) => a.id).sort();
    expect(rootList).toEqual(rootIds.sort());
  });

  it('lists images by album via GSI1 and filters by tenant', async () => {
    const albumId = 'album1';
    const img1 = 'img1';
    const img2 = 'img2';
    const imgOtherTenant = 'imgX';

    const imageRepo = new ImageRepoDdb({ tableName, client });

    // seed images in same album for two tenants
    await imageRepo.put(
      new Image({
        id: img1,
        tenantId: tenantA,
        albumId,
        filename: 'a.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 100,
        width: 10,
        height: 10,
        createdAt: now,
      }),
    );
    await imageRepo.put(
      new Image({
        id: img2,
        tenantId: tenantA,
        albumId,
        filename: 'b.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 100,
        width: 10,
        height: 10,
        createdAt: now,
      }),
    );
    await imageRepo.put(
      new Image({
        id: imgOtherTenant,
        tenantId: tenantB,
        albumId,
        filename: 'x.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 100,
        width: 10,
        height: 10,
        createdAt: now,
      }),
    );

    const found = await imageRepo.listByAlbum(tenantA, albumId);
    const ids = found.map((i) => i.id).sort();
    expect(ids).toEqual([img1, img2].sort());
  });

  it('retrieves users via the shared lookup GSI', async () => {
    const userRepo = new UserRepoDdb({ tableName, client });

    const created = await userRepo.createUser({
      email: 'person@example.com',
      oidcSub: 'sub-123',
      name: 'Test User',
    });

    const bySub = await userRepo.getUserByOidcSub('sub-123');
    expect(bySub).toBeDefined();
    expect(bySub?.id).toEqual(created.id);

    const byEmail = await userRepo.getUserByEmail('person@example.com');
    expect(byEmail).toBeDefined();
    expect(byEmail?.id).toEqual(created.id);

    await userRepo.updateUserSub(created.id, 'sub-456');

    const updatedBySub = await userRepo.getUserByOidcSub('sub-456');
    expect(updatedBySub).toBeDefined();
    expect(updatedBySub?.id).toEqual(created.id);

    const oldLookup = await userRepo.getUserByOidcSub('sub-123');
    expect(oldLookup).toBeUndefined();
  });

  it('manages tenant memberships via dedicated repo and GSIs', async () => {
    const membershipRepo = new TenantMembershipRepoDdb({ tableName, client });

    const membership = {
      membershipId: '11111111-1111-4111-8111-aaaaaaaaaaaa',
      tenantId: tenantA,
      userId: '55555555-5555-4555-8555-555555555555',
      role: 'owner' as const,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    };

    await membershipRepo.putMembership(membership);

    const foundByTenantUser = await membershipRepo.findMembership(tenantA, membership.userId);
    expect(foundByTenantUser).toEqual(membership);

    const listedByTenant = await membershipRepo.listMembershipsByTenant(tenantA);
    expect(listedByTenant).toEqual([membership]);

    const listedByUser = await membershipRepo.listMembershipsByUser(membership.userId);
    expect(listedByUser).toEqual([membership]);

    const foundById = await membershipRepo.findMembershipById(membership.membershipId);
    expect(foundById).toEqual(membership);

    const updatedAtLater = new Date(new Date(now).getTime() + 1000).toISOString();
    const updated = {
      ...membership,
      role: 'admin' as const,
      status: 'invited' as const,
      updatedAt: updatedAtLater,
    };

    await membershipRepo.putMembership(updated);

    const afterUpdate = await membershipRepo.findMembershipById(membership.membershipId);
    expect(afterUpdate).toEqual(updated);

    await membershipRepo.deleteMembership(membership.membershipId);

    const afterDelete = await membershipRepo.findMembershipById(membership.membershipId);
    expect(afterDelete).toBeUndefined();

    const tenantListAfterDelete = await membershipRepo.listMembershipsByTenant(tenantA);
    expect(tenantListAfterDelete).toHaveLength(0);

    const userListAfterDelete = await membershipRepo.listMembershipsByUser(membership.userId);
    expect(userListAfterDelete).toHaveLength(0);
  });
});

// If LocalStack is not configured, provide a hint in a skipped suite
if (!hasLocalstack) {
  describe.skip('LocalStack DynamoDB integration (skipped)', () => {
    it('Set LOCALSTACK_URL (e.g., http://localhost:4566) to enable this suite', () => {
      /* noop */
    });
  });
}
