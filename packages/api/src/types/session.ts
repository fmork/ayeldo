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
  /** Optional convenience metadata for fast checks (kept in sync with tokensEnc) */
  readonly accessExpiresAt?: number; // epoch seconds
  readonly refreshExpiresAt?: number; // epoch seconds | undefined
  readonly tokensEnc: EncBlob;
}
