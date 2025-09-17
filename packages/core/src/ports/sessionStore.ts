import type { SessionRecord, StateRecord } from '@ayeldo/types';

export interface ISessionStore {
  putSession: (rec: SessionRecord) => Promise<void>;
  getSession: (sid: string) => Promise<SessionRecord | undefined>;
  deleteSession: (sid: string) => Promise<void>;
}

export interface IStateStore {
  putState: (rec: StateRecord) => Promise<void>;
  getState: (state: string) => Promise<StateRecord | undefined>;
  deleteState: (state: string) => Promise<void>;
}
