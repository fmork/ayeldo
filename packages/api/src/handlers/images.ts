import path from 'node:path';
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
  const { tenantId, albumId, imageId, filename, contentType } = registerImageSchema.parse(input);
  const sanitizedFilename = sanitizeFilename(filename);
  const key = `uploads/${tenantId}/${albumId}/${imageId}/original/${sanitizedFilename}`;
  deps.logger.info(`register image: ${imageId} -> ${key}`);
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

function sanitizeFilename(filename: string): string {
  const stripped = filename.split('\\').pop()?.split('/').pop() ?? 'upload';
  const trimmed = stripped.trim();
  const ext = path.extname(trimmed);
  const base = ext ? trimmed.slice(0, -ext.length) : trimmed;
  const safeBase = base
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'file';
  const extClean = ext
    ? '.' + ext.slice(1).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    : ''; // drop weird characters
  const finalExt = extClean.length > 1 ? extClean : '.bin';
  return `${safeBase}${finalExt}`;
}
