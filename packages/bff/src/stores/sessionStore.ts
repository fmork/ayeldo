import type { SessionRecord, LoginState } from '../types/session';

export interface ISessionStore {
  getSession(sid: string): Promise<SessionRecord | undefined>;
  putSession(record: SessionRecord): Promise<void>;
  deleteSession(sid: string): Promise<void>;
}

export interface IStateStore {
  getState(state: string): Promise<LoginState | undefined>;
  putState(record: LoginState): Promise<void>;
  deleteState(state: string): Promise<void>;
}

export class MemorySessionStore implements ISessionStore {
  private readonly map = new Map<string, SessionRecord>();
  public async getSession(sid: string): Promise<SessionRecord | undefined> {
    const rec = this.map.get(sid);
    if (!rec) return undefined;
    if (rec.ttl * 1000 < Date.now()) {
      this.map.delete(sid);
      return undefined;
    }
    return rec;
  }
  public async putSession(record: SessionRecord): Promise<void> {
    this.map.set(record.sid, record);
  }
  public async deleteSession(sid: string): Promise<void> {
    this.map.delete(sid);
  }
}

export class MemoryStateStore implements IStateStore {
  private readonly map = new Map<string, LoginState>();
  public async getState(state: string): Promise<LoginState | undefined> {
    const rec = this.map.get(state);
    if (!rec) return undefined;
    if (rec.ttl * 1000 < Date.now()) {
      this.map.delete(state);
      return undefined;
    }
    return rec;
  }
  public async putState(record: LoginState): Promise<void> {
    this.map.set(record.state, record);
  }
  public async deleteState(state: string): Promise<void> {
    this.map.delete(state);
  }
}

