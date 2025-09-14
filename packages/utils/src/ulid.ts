const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function getRandomBytes(len: number): Uint8Array {
  const g = globalThis as unknown as { crypto?: { getRandomValues?: (out: Uint8Array) => void } };
  if (typeof globalThis !== 'undefined' && g.crypto && typeof g.crypto.getRandomValues === 'function') {
    const out = new Uint8Array(len);
    g.crypto.getRandomValues?.(out);
    return out;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('node:crypto') as unknown as { randomBytes: (n: number) => Uint8Array };
    return nodeCrypto.randomBytes(len);
  } catch {
    // Fallback — not cryptographically strong but avoids hard dependency
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) out[i] = Math.floor(Math.random() * 256);
    return out;
  }
}

/**
 * Generates a ULID-compatible identifier string (26 chars, Crockford base32, first char 0-7).
 * Note: This is not a monotonic ULID; it satisfies the ULID format for validation purposes.
 */
export function makeUlid(): string {
  const bytes = getRandomBytes(26);
  // First char limited to 0..7 to satisfy ULID regex leading char constraint
  const first = bytes[0] & 0x07; // 0..7
  let out = CROCKFORD[first];
  for (let i = 1; i < 26; i++) {
    const v = bytes[i] & 0x1f; // 0..31
    out += CROCKFORD[v];
  }
  return out;
}
