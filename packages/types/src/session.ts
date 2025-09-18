import type { Uuid } from './dtos';

export interface EncBlob {
  readonly kid: string;
  readonly iv: string; // base64
  readonly tag: string; // base64
  readonly ciphertext: string; // base64
}

export interface TokenBundle {
  readonly accessToken: string;
  readonly idToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number; // epoch seconds
}

export interface SessionRecord {
  readonly sid: string;
  readonly sub: string;
  readonly email?: string;
  readonly name?: string;
  readonly fullName?: string;
  readonly roles?: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly ttl: number; // epoch seconds
  readonly tokensEnc: EncBlob;
}

export interface SessionInfoUser {
  readonly id: Uuid;
  readonly email: string;
  readonly fullName: string;
}

export interface SessionInfoLoggedOut {
  readonly loggedIn: false;
}

export interface SessionInfoLoggedIn {
  readonly loggedIn: true;
  readonly sub: string;
  readonly user: SessionInfoUser;
  readonly tenantIds?: readonly string[]; // empty array if user hasn't completed onboarding
}

export type SessionInfo = SessionInfoLoggedOut | SessionInfoLoggedIn;

export interface StateRecord {
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly createdAt: string;
  readonly ttl: number;
}
