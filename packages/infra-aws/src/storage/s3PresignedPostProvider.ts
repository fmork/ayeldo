import type { IUploadUrlProvider, PresignedPostPayload } from '@ayeldo/core';
import type { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

export interface S3PresignedPostProviderProps {
  readonly bucketName: string;
  readonly client: S3Client;
}

export class S3PresignedPostProvider implements IUploadUrlProvider {
  private readonly bucketName: string;
  private readonly client: S3Client;

  constructor(props: S3PresignedPostProviderProps) {
    this.bucketName = props.bucketName;
    this.client = props.client;
  }

  async createPresignedPost(params: {
    readonly key: string;
    readonly contentType: string;
    readonly expiresSeconds?: number;
    readonly maxSizeBytes?: number;
  }): Promise<PresignedPostPayload> {
    const expires = params.expiresSeconds ?? 300;
    const max = params.maxSizeBytes ?? 50 * 1024 * 1024;
    const result = await createPresignedPost(this.client, {
      Bucket: this.bucketName,
      Key: params.key,
      Conditions: [
        ['starts-with', '$Content-Type', params.contentType.split('/')[0]],
        ['content-length-range', 1, max],
      ],
      Fields: {
        'Content-Type': params.contentType,
      },
      Expires: expires,
    });
    const expiresAtIso = new Date(Date.now() + expires * 1000).toISOString();
    return {
      url: result.url,
      fields: result.fields as Record<string, string>,
      key: params.key,
      expiresAtIso,
    };
  }
}

