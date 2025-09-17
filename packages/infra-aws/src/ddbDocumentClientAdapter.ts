import type { ILogWriter } from '@fmork/backend-core';
import type {
  DdbClient,
  GetParams,
  PutParams,
  QueryParams,
  QueryResult,
  UpdateParams,
} from './ddbClient';

export interface DdbDocumentClientAdapterProps {
  readonly region: string;
  readonly endpoint?: string;
  readonly logger: ILogWriter;
}

/**
 * DdbClient implementation backed by AWS SDK v3 DynamoDBDocumentClient.
 * Accepts region and optional endpoint (e.g., LocalStack) for configuration.
 */
export class DdbDocumentClientAdapter implements DdbClient {
  private readonly region: string;
  private readonly endpoint: string | undefined;
  private readonly logger: ILogWriter;
  private docClientPromise: Promise<unknown> | undefined;

  public constructor(props: DdbDocumentClientAdapterProps) {
    this.region = props.region;
    this.endpoint = props.endpoint;
    this.logger = props.logger;
  }

  private async getDoc(): Promise<unknown> {
    if (!this.docClientPromise) {
      this.docClientPromise = (async (): Promise<unknown> => {
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
    const doc = (await this.getDoc()) as { send: (cmd: unknown) => Promise<unknown> };
    const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
    const command = new GetCommand({ TableName: params.tableName, Key: params.key });
    try {
      // Log the raw Get request
      try {
        this.logger.debug(
          `DDB Get request: ${JSON.stringify({ TableName: params.tableName, Key: params.key })}`,
        );
      } catch (err) {
        // ensure logging never throws
        try {
          this.logger.debug('DDB Get request: <unserializable>');
        } catch (e) {
          // swallow
        }
      }

      const out = (await doc.send(command)) as { Item?: unknown };

      // Log the raw Get response
      try {
        this.logger.debug(`DDB Get response: ${JSON.stringify(out ?? {})}`);
      } catch (err) {
        try {
          this.logger.debug('DDB Get response: <unserializable>');
        } catch (e) {
          // swallow
        }
      }

      return out && 'Item' in out && out.Item ? { item: out.Item as TItem } : {};
    } catch (err) {
      // Log the error and rethrow
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.logger.error('DDB Get error', err as Error);
      } catch (e) {
        // swallow
      }
      throw err;
    }
  }

  public async put<TItem extends object>(params: PutParams<TItem>): Promise<void> {
    const doc = (await this.getDoc()) as { send: (cmd: unknown) => Promise<unknown> };
    const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
    await doc.send(new PutCommand({ TableName: params.tableName, Item: params.item }));
  }

  public async update(params: UpdateParams): Promise<void> {
    const doc = (await this.getDoc()) as { send: (cmd: unknown) => Promise<unknown> };
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    await doc.send(
      new UpdateCommand({
        TableName: params.tableName,
        Key: params.key,
        UpdateExpression: params.update,
        ExpressionAttributeNames: params.names,
        ExpressionAttributeValues: params.values as Record<string, unknown> | undefined,
      }),
    );
  }

  public async query<TItem extends object>(params: QueryParams): Promise<QueryResult<TItem>> {
    const doc = (await this.getDoc()) as { send: (cmd: unknown) => Promise<unknown> };
    const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    const out = await doc.send(
      new QueryCommand({
        TableName: params.tableName,
        IndexName: params.indexName,
        KeyConditionExpression: params.keyCondition,
        FilterExpression: params.filter,
        ExpressionAttributeNames: params.names,
        ExpressionAttributeValues: params.values as Record<string, unknown>,
        ScanIndexForward: params.scanIndexForward,
        Limit: params.limit,
        ExclusiveStartKey: params.exclusiveStartKey as Record<string, unknown> | undefined,
      }),
    );
    const outTyped = (out as {
      Items?: unknown[];
      LastEvaluatedKey?: Record<string, unknown>;
    }) ?? { Items: [], LastEvaluatedKey: undefined };
    const items = (outTyped.Items ?? []) as TItem[];
    return outTyped.LastEvaluatedKey !== undefined
      ? { items, lastEvaluatedKey: outTyped.LastEvaluatedKey }
      : { items };
  }
}
