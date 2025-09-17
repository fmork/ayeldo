import type { ISessionStore, IStateStore } from '@ayeldo/core';
import type { SessionRecord, StateRecord } from '@ayeldo/types';

export class MemorySessionStore implements ISessionStore {
  private readonly map = new Map<string, SessionRecord>();
  public async putSession(rec: SessionRecord): Promise<void> {
    this.map.set(rec.sid, rec);
  }
  public async getSession(sid: string): Promise<SessionRecord | undefined> {
    return this.map.get(sid);
  }
  public async deleteSession(sid: string): Promise<void> {
    this.map.delete(sid);
  }
}

export class MemoryStateStore implements IStateStore {
  private readonly map = new Map<string, StateRecord>();
  public async putState(rec: StateRecord): Promise<void> {
    this.map.set(rec.state, rec);
  }
  public async getState(state: string): Promise<StateRecord | undefined> {
    return this.map.get(state);
  }
  public async deleteState(state: string): Promise<void> {
    this.map.delete(state);
  }
}
