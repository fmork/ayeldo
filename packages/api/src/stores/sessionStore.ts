import type { SessionRecord } from '../types/session';

export interface IStateRecord {
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly createdAt: string;
  readonly ttl: number;
}

export interface ISessionStore {
  putSession: (rec: SessionRecord) => Promise<void>;
  getSession: (sid: string) => Promise<SessionRecord | undefined>;
  deleteSession: (sid: string) => Promise<void>;
}

export interface IStateStore {
  putState: (rec: IStateRecord) => Promise<void>;
  getState: (state: string) => Promise<IStateRecord | undefined>;
  deleteState: (state: string) => Promise<void>;
}

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
  private readonly map = new Map<string, IStateRecord>();
  public async putState(rec: IStateRecord): Promise<void> {
    this.map.set(rec.state, rec);
  }
  public async getState(state: string): Promise<IStateRecord | undefined> {
    return this.map.get(state);
  }
  public async deleteState(state: string): Promise<void> {
    this.map.delete(state);
  }
}
