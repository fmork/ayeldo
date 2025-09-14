import type { DdbClient, GetParams, PutParams, QueryParams, QueryResult, UpdateParams } from './ddbClient';

export interface DdbDocumentClientAdapterProps {
  readonly region: string;
  readonly endpoint?: string;
}

/**
 * DdbClient implementation backed by AWS SDK v3 DynamoDBDocumentClient.
 * Accepts region and optional endpoint (e.g., LocalStack) for configuration.
 */
export class DdbDocumentClientAdapter implements DdbClient {
  private readonly region: string;
  private readonly endpoint: string | undefined;
  private docClientPromise: Promise<any> | undefined;

  public constructor(props: DdbDocumentClientAdapterProps) {
    this.region = props.region;
    this.endpoint = props.endpoint;
  }

  private async getDoc(): Promise<any> {
    if (!this.docClientPromise) {
      this.docClientPromise = (async () => {
        const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb');
        const client = new DynamoDBClient({
          region: this.region,
          ...(this.endpoint ? { endpoint: this.endpoint } : {}),
        });
        const doc = DynamoDBDocumentClient.from(client, {
          marshallOptions: { convertClassInstanceToMap: true, removeUndefinedValues: true },
        });
        return doc;
      })();
    }
    return this.docClientPromise;
  }

  public async get<TItem extends object>(params: GetParams): Promise<{ item?: TItem }> {
    const doc = await this.getDoc();
    const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
    const out = await doc.send(new GetCommand({ TableName: params.tableName, Key: params.key }));
    return out.Item ? { item: out.Item as TItem } : {};
  }

  public async put<TItem extends object>(params: PutParams<TItem>): Promise<void> {
    const doc = await this.getDoc();
    const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
    await doc.send(new PutCommand({ TableName: params.tableName, Item: params.item }));
  }

  public async update(params: UpdateParams): Promise<void> {
    const doc = await this.getDoc();
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    await doc.send(
      new UpdateCommand({
        TableName: params.tableName,
        Key: params.key,
        UpdateExpression: params.update,
        ExpressionAttributeNames: params.names,
        ExpressionAttributeValues: params.values as Record<string, any> | undefined,
      })
    );
  }

  public async query<TItem extends object>(params: QueryParams): Promise<QueryResult<TItem>> {
    const doc = await this.getDoc();
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
      })
    );
    return { items: (out.Items ?? []) as TItem[], lastEvaluatedKey: out.LastEvaluatedKey as any };
  }
}

