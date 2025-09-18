function getGlobalCrypto(): { randomUUID?: () => string; getRandomValues?: (out: Uint8Array) => void } | undefined {
  const g = globalThis as unknown as {
    crypto?: { randomUUID?: () => string; getRandomValues?: (out: Uint8Array) => void };
  };
  return g.crypto;
}

function getRandomBytes(length: number): Uint8Array {
  const cryptoApi = getGlobalCrypto();
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const out = new Uint8Array(length);
    cryptoApi.getRandomValues(out);
    return out;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('node:crypto') as { randomBytes: (size: number) => Uint8Array };
    return nodeCrypto.randomBytes(length);
  } catch {
    const out = new Uint8Array(length);
    for (const index of out.keys()) {
      out[index] = Math.floor(Math.random() * 256);
    }
    return out;
  }
}

function formatBytesAsUuid(bytes: Uint8Array): string {
  const hex: string[] = [];
  for (const byte of bytes) {
    hex.push(byte.toString(16).padStart(2, '0'));
  }
  return (
    `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-` +
    `${hex[4]}${hex[5]}-` +
    `${hex[6]}${hex[7]}-` +
    `${hex[8]}${hex[9]}-` +
    `${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`
  );
}

export function makeUuid(): string {
  const cryptoApi = getGlobalCrypto();
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('node:crypto') as { randomUUID?: () => string };
    if (typeof nodeCrypto.randomUUID === 'function') {
      return nodeCrypto.randomUUID();
    }
  } catch {
    // Ignore and fall back to manual generation below.
  }

  const bytes = getRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4 UUID
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  return formatBytesAsUuid(bytes);
}
