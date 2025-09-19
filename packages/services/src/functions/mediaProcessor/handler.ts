import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Image } from '@ayeldo/core';
import { DdbDocumentClientAdapter, EventBridgePublisher, ImageRepoDdb } from '@ayeldo/infra-aws';
import type { ImageProcessedEvent, ImageVariantDto } from '@ayeldo/types';
import type { ILogWriter } from '@fmork/backend-core';
import type { S3Event } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';

interface VariantConfig {
  readonly label: string;
  readonly longEdge: number;
}

const REGION = process.env['AWS_REGION'] ?? 'us-east-1';
const TABLE_NAME = process.env['TABLE_NAME'] ?? '';
const MEDIA_BUCKET = process.env['MEDIA_BUCKET'] ?? '';
const EVENT_BUS_NAME = process.env['EVENT_BUS_NAME'] ?? '';

const VARIANT_CONFIG: readonly VariantConfig[] = ((): readonly VariantConfig[] => {
  const raw = process.env['IMAGE_VARIANTS'];
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as VariantConfig[];
      const cleaned = parsed
        .map((item) => ({
          label: String(item.label ?? '').trim(),
          longEdge: Number(item.longEdge) || 0,
        }))
        .filter((item) => item.label.length > 0 && item.longEdge > 0);
      if (cleaned.length > 0) {
        return cleaned;
      }
    } catch (error) {
      console.warn('Failed to parse IMAGE_VARIANTS env var', error);
    }
  }
  return [
    { label: 'xl', longEdge: 1900 },
    { label: 'lg', longEdge: 1200 },
    { label: 'md', longEdge: 800 },
  ];
})();

const s3 = new S3Client({ region: REGION });
const eventBridge = new EventBridgeClient({ region: REGION });
const logWriter: ILogWriter = {
  debug(text) {
    console.debug(text);
  },
  info(text) {
    console.info(text);
  },
  warn(text) {
    console.warn(text);
  },
  error(text) {
    console.error(text);
  },
};
const ddb = new DdbDocumentClientAdapter({ region: REGION, logger: logWriter });
const imageRepo = new ImageRepoDdb({ tableName: TABLE_NAME, client: ddb });
const eventPublisher = new EventBridgePublisher({
  client: eventBridge,
  eventBusName: EVENT_BUS_NAME,
  source: 'ayeldo.media-processor',
});

export async function main(event: S3Event): Promise<void> {
  for (const record of event.Records ?? []) {
    try {
      await processRecord(record);
    } catch (error) {
      console.error('Failed to process S3 record', error);
      throw error;
    }
  }
}

interface UploadDescriptor {
  readonly tenantId: string;
  readonly albumId: string;
  readonly imageId: string;
  readonly filename: string;
}

async function processRecord(record: S3Event['Records'][number]): Promise<void> {
  const bucket = record.s3.bucket.name;
  if (bucket !== MEDIA_BUCKET) {
    console.warn(`Skipping record for bucket ${bucket}`);
    return;
  }

  const rawKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  const descriptor = parseUploadKey(rawKey);
  if (!descriptor) {
    console.warn(`Skipping key ${rawKey} (does not match uploads prefix)`);
    return;
  }

  const prefix = path
    .join('public', descriptor.tenantId, descriptor.albumId, descriptor.imageId)
    .replace(/\\/g, '/');

  const workDir = await mkdtemp(path.join(tmpdir(), 'media-'));
  try {
    const originalPath = path.join(workDir, descriptor.filename);
    const { contentType } = await downloadOriginal(rawKey, originalPath);

    const originalStats = await stat(originalPath);
    const originalMeta = await sharp(originalPath).rotate().metadata();

    const variants: ImageVariantDto[] = [];
    for (const variant of VARIANT_CONFIG) {
      const variantPath = path.join(workDir, `${variant.label}-${descriptor.filename}`);
      const info = await generateVariant(originalPath, variantPath, variant.longEdge);
      const variantKey = `${prefix}/${variant.label}/${descriptor.filename}`;
      await uploadFile(variantPath, variantKey, contentType);
      variants.push({
        label: variant.label,
        key: variantKey,
        width: info.width ?? 0,
        height: info.height ?? 0,
        sizeBytes: info.size ?? 0,
      });
      await rm(variantPath, { force: true }).catch(() => undefined);
    }

    const originalPublicKey = `${prefix}/original/${descriptor.filename}`;
    await uploadFile(originalPath, originalPublicKey, contentType);

    const existing = await imageRepo
      .getById(descriptor.tenantId, descriptor.imageId)
      .catch(() => undefined);
    const nowIso = new Date().toISOString();
    const imageEntity = new Image({
      id: descriptor.imageId,
      tenantId: descriptor.tenantId,
      albumId: descriptor.albumId,
      filename: existing?.filename ?? descriptor.filename,
      contentType: contentType ?? existing?.contentType ?? 'application/octet-stream',
      sizeBytes: originalStats.size,
      width: originalMeta.width ?? existing?.width ?? 0,
      height: originalMeta.height ?? existing?.height ?? 0,
      createdAt: existing?.createdAt ?? nowIso,
      originalKey: originalPublicKey,
      variants,
      processedAt: nowIso,
    });
    await imageRepo.put(imageEntity);

    // Emit ImageProcessed event
    const imageProcessedEvent: ImageProcessedEvent = {
      id: randomUUID(),
      type: 'ImageProcessed',
      occurredAt: nowIso,
      tenantId: descriptor.tenantId,
      payload: {
        albumId: descriptor.albumId,
        imageId: descriptor.imageId,
        originalKey: originalPublicKey,
        variants,
      },
    };
    await eventPublisher.publish(imageProcessedEvent);

    await s3
      .send(new DeleteObjectCommand({ Bucket: bucket, Key: rawKey }))
      .catch((error) => console.warn('Failed to delete original upload object', error));
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function parseUploadKey(key: string): UploadDescriptor | undefined {
  const parts = key.split('/');
  if (parts.length < 6) return undefined;
  const [prefix, tenantId, albumId, imageId, originalDir, ...rest] = parts;
  if (
    prefix !== 'uploads' ||
    !tenantId ||
    !albumId ||
    !imageId ||
    originalDir !== 'original' ||
    rest.length === 0
  ) {
    return undefined;
  }
  const filename = rest.join('/');
  if (!filename) return undefined;
  return { tenantId, albumId, imageId, filename };
}

async function downloadOriginal(
  key: string,
  destination: string,
): Promise<{ contentType: string | undefined }> {
  const result = await s3.send(new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: key }));
  const body = result.Body as NodeJS.ReadableStream | undefined;
  if (!body || typeof body.pipe !== 'function') {
    throw new Error('S3 GetObject did not return a stream');
  }
  await pipeline(body, createWriteStream(destination));
  return { contentType: result.ContentType ?? undefined };
}

async function generateVariant(
  sourcePath: string,
  targetPath: string,
  longEdge: number,
): Promise<sharp.OutputInfo> {
  return sharp(sourcePath)
    .rotate()
    .resize({ width: longEdge, height: longEdge, fit: 'inside', withoutEnlargement: true })
    .toFile(targetPath);
}

async function uploadFile(localPath: string, key: string, contentType?: string): Promise<void> {
  const params = {
    Bucket: MEDIA_BUCKET,
    Key: key,
    Body: createReadStream(localPath),
  } as const;
  const upload = new Upload({
    client: s3,
    params: contentType ? { ...params, ContentType: contentType } : params,
  });
  await upload.done();
}
