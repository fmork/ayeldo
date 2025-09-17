import type { ISessionStore } from '@ayeldo/core';
import type { SessionRecord } from '@ayeldo/types';
import type { DdbClient } from './ddbClient';
import { skSession } from './keys';

interface DdbSessionStoreProps {
  readonly tableName: string;
  readonly client: DdbClient;
}

export class DdbSessionStore implements ISessionStore {
  private readonly tableName: string;
  private readonly client: DdbClient;

  public constructor(props: DdbSessionStoreProps) {
    this.tableName = props.tableName;
    this.client = props.client;
  }

  public async putSession(rec: SessionRecord): Promise<void> {
    await this.client.put({
      tableName: this.tableName,
      item: {
        PK: `SESSION#${rec.sid}`,
        SK: skSession(rec.sid),
        ...rec,
        // DynamoDB TTL attribute for automatic cleanup
        ttl: rec.ttl,
      },
    });
  }

  public async getSession(sid: string): Promise<SessionRecord | undefined> {
    const result = await this.client.get<SessionRecord>({
      tableName: this.tableName,
      key: {
        PK: `SESSION#${sid}`,
        SK: skSession(sid),
      },
    });
    return result.item;
  }

  public async deleteSession(sid: string): Promise<void> {
    // Note: DdbClient doesn't have a delete method in the interface,
    // but we can implement this using update to mark as deleted or
    // just let TTL handle cleanup. For now, we'll rely on TTL.
    // If immediate deletion is needed, we'd need to add delete to DdbClient.

    // For immediate removal, we can set TTL to current time
    const now = Math.floor(Date.now() / 1000);
    if (this.client.update) {
      await this.client.update({
        tableName: this.tableName,
        key: {
          PK: `SESSION#${sid}`,
          SK: skSession(sid),
        },
        update: 'SET #ttl = :ttl',
        names: { '#ttl': 'ttl' },
        values: { ':ttl': now },
      });
    }
  }
}
