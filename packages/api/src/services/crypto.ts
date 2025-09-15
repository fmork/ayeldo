import * as crypto from 'node:crypto';

export function randomId(len: number): string {
  return crypto.randomBytes(len).toString('base64url');
}

export function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}

import type { EncBlob, TokenBundle } from '../types/session';

export function encryptTokens(keyB64: string, kid: string, bundle: TokenBundle): EncBlob {
  const key = Buffer.from(keyB64, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const payload = Buffer.from(JSON.stringify(bundle), 'utf8');
  const enc = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    kid,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: enc.toString('base64'),
  } as const;
}

export function signHs256Jwt(secretB64: string, payload: Record<string, unknown>): string {
  const secret = Buffer.from(secretB64, 'base64');
  const header = { alg: 'HS256', typ: 'JWT' };
  const enc = (obj: unknown): string =>
    Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
  const input = `${enc(header)}.${enc(payload)}`;
  const sig = crypto.createHmac('sha256', secret).update(input).digest('base64url');
  return `${input}.${sig}`;
}
