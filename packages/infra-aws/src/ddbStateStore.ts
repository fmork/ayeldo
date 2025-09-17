import type { IStateStore } from '@ayeldo/core';
import type { StateRecord } from '@ayeldo/types';
import type { DdbClient } from './ddbClient';
import { skState } from './keys';

interface DdbStateStoreProps {
  readonly tableName: string;
  readonly client: DdbClient;
}

export class DdbStateStore implements IStateStore {
  private readonly tableName: string;
  private readonly client: DdbClient;

  public constructor(props: DdbStateStoreProps) {
    this.tableName = props.tableName;
    this.client = props.client;
  }

  public async putState(rec: StateRecord): Promise<void> {
    await this.client.put({
      tableName: this.tableName,
      item: {
        PK: `STATE#${rec.state}`,
        SK: skState(rec.state),
        ...rec,
        // DynamoDB TTL attribute for automatic cleanup
        ttl: rec.ttl,
      },
    });
  }

  public async getState(state: string): Promise<StateRecord | undefined> {
    const result = await this.client.get<StateRecord>({
      tableName: this.tableName,
      key: {
        PK: `STATE#${state}`,
        SK: skState(state),
      },
    });
    return result.item;
  }

  public async deleteState(state: string): Promise<void> {
    // For immediate removal, we can set TTL to current time
    const now = Math.floor(Date.now() / 1000);
    if (this.client.update) {
      await this.client.update({
        tableName: this.tableName,
        key: {
          PK: `STATE#${state}`,
          SK: skState(state),
        },
        update: 'SET #ttl = :ttl',
        names: { '#ttl': 'ttl' },
        values: { ':ttl': now },
      });
    }
  }
}
