export interface GetParams {
  readonly tableName: string;
  readonly key: { PK: string; SK: string };
}
export interface PutParams<TItem extends object> {
  readonly tableName: string;
  readonly item: TItem;
}

export interface UpdateParams {
  readonly tableName: string;
  readonly key: { PK: string; SK: string };
  readonly update: string; // UpdateExpression
  readonly names?: Record<string, string>; // ExpressionAttributeNames
  readonly values?: Record<string, unknown>; // ExpressionAttributeValues
}

export interface QueryParams {
  readonly tableName: string;
  readonly indexName?: string; // optional GSI name
  readonly keyCondition: string; // KeyConditionExpression
  readonly names?: Record<string, string>; // ExpressionAttributeNames
  readonly values: Record<string, unknown>; // ExpressionAttributeValues
  readonly filter?: string; // FilterExpression
  readonly scanIndexForward?: boolean; // sort order
  readonly limit?: number;
  readonly exclusiveStartKey?: Record<string, unknown>;
}

export interface QueryResult<TItem extends object> {
  readonly items: readonly TItem[];
  readonly lastEvaluatedKey?: Record<string, unknown>;
}

export interface DdbClient {
  get<TItem extends object>(params: GetParams): Promise<{ item?: TItem }>;
  put<TItem extends object>(params: PutParams<TItem>): Promise<void>;
  update?(params: UpdateParams): Promise<void>;
  query<TItem extends object>(params: QueryParams): Promise<QueryResult<TItem>>;
}
