export interface GetParams {
  readonly tableName: string;
  readonly key: { PK: string; SK: string };
}
export interface PutParams<TItem extends object> {
  readonly tableName: string;
  readonly item: TItem;
}

export interface DdbClient {
  get<TItem extends object>(params: GetParams): Promise<{ item?: TItem }>;
  put<TItem extends object>(params: PutParams<TItem>): Promise<void>;
}
