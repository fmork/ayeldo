import { z } from 'zod';
import type { PinoLogWriter } from '@ayeldo/utils';
import type { IEventPublisher, IUploadUrlProvider } from '@ayeldo/core';
import { makeEventEnvelopeSchema } from '@ayeldo/types';

export const registerImageSchema = z.object({
  tenantId: z.string().min(1),
  albumId: z.string().min(1),
  imageId: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

export type RegisterImageInput = z.infer<typeof registerImageSchema>;

export interface RegisterImageResult {
  readonly url: string;
  readonly fields: Record<string, string>;
  readonly key: string;
  readonly expiresAtIso: string;
}

export async function registerImage(
  input: RegisterImageInput,
  deps: { upload: IUploadUrlProvider; logger: PinoLogWriter },
): Promise<RegisterImageResult> {
  const { tenantId, albumId, imageId, contentType } = registerImageSchema.parse(input);
  const key = `tenants/${tenantId}/albums/${albumId}/images/${imageId}`;
  deps.logger.info(`register image: ${imageId}`);
  const presigned = await deps.upload.createPresignedPost({ key, contentType });
  return presigned;
}

export const completeUploadSchema = z.object({
  tenantId: z.string().min(1),
  albumId: z.string().min(1),
  imageId: z.string().min(1),
});

export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;

export async function completeUpload(
  input: CompleteUploadInput,
  deps: { publisher: IEventPublisher; logger: PinoLogWriter },
): Promise<{ ok: true }> {
  const { tenantId, albumId, imageId } = completeUploadSchema.parse(input);
  deps.logger.info(`complete upload: ${imageId}`);
  const evt = {
    id: imageId,
    type: 'ImageUploaded' as const,
    occurredAt: new Date().toISOString(),
    tenantId,
    payload: { albumId, imageId },
  };
  makeEventEnvelopeSchema('ImageUploaded', z.object({ albumId: z.string(), imageId: z.string() })).parse(evt);
  await deps.publisher.publish(evt);
  return { ok: true };
}

