import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import type { EncBlob, TokenBundle } from '../types/session';

export function base64url(data: Buffer | string): string {
  const b = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function encryptTokens(keyB64: string, kid: string, tokens: TokenBundle): EncBlob {
  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) throw new Error('SESSION_ENC_KEY must be 32 bytes (base64)');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(tokens), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    kid,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  } as const;
}

export function decryptTokens(keyB64: string, blob: EncBlob): TokenBundle {
  const key = Buffer.from(keyB64, 'base64');
  const iv = Buffer.from(blob.iv, 'base64');
  const tag = Buffer.from(blob.tag, 'base64');
  const ciphertext = Buffer.from(blob.ciphertext, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8')) as TokenBundle;
}

export function signHs256Jwt(secretB64: string, payload: Record<string, unknown>): string {
  const secret = Buffer.from(secretB64, 'base64');
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const sig = createHmac('sha256', secret).update(data).digest();
  return `${data}.${base64url(sig)}`;
}

export function randomId(len = 32): string {
  return base64url(randomBytes(len));
}
