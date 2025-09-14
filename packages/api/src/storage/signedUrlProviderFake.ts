import type { IDownloadUrlProvider, SignedUrlPayload } from '@ayeldo/core';

/**
 * A fake signed URL provider that returns a plausible download URL with an expiry.
 */
export class SignedUrlProviderFake implements IDownloadUrlProvider {
  public async getSignedUrl(params: { readonly key: string; readonly expiresSeconds?: number }): Promise<SignedUrlPayload> {
    const ttl = params.expiresSeconds ?? 5 * 60;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    const url = `https://downloads.example.com/${encodeURIComponent(params.key)}?exp=${encodeURIComponent(expiresAt)}`;
    return { url, expiresAtIso: expiresAt } as const;
  }
}

