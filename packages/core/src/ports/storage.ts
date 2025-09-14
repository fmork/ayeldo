export interface PresignedPostPayload {
  readonly url: string;
  readonly fields: Record<string, string>;
  readonly key: string;
  readonly expiresAtIso: string;
}

export interface IUploadUrlProvider {
  createPresignedPost(params: {
    readonly key: string;
    readonly contentType: string;
    readonly expiresSeconds?: number;
    readonly maxSizeBytes?: number;
  }): Promise<PresignedPostPayload>;
}

export interface SignedUrlPayload {
  readonly url: string;
  readonly expiresAtIso: string;
}

export interface IDownloadUrlProvider {
  getSignedUrl(params: { readonly key: string; readonly expiresSeconds?: number }): Promise<SignedUrlPayload>;
}
