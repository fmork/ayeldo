import { describe, expect, test, jest } from '@jest/globals';
import { registerImage, completeUpload } from './images';

describe('image upload handlers', () => {
  test('registerImage returns presigned POST payload and calls provider', async () => {
    const input = {
      tenantId: 't1',
      albumId: 'alb1',
      imageId: 'img1',
      filename: 'photo.jpg',
      contentType: 'image/jpeg',
    };

    const mockPresigned = {
      url: 'https://bucket.s3.amazonaws.com',
      fields: { key: 'tenants/t1/albums/alb1/images/img1' },
      key: 'tenants/t1/albums/alb1/images/img1',
      expiresAtIso: new Date(Date.now() + 300_000).toISOString(),
    };

    const upload = {
      createPresignedPost: jest.fn(async () => mockPresigned),
    };

    const logger = {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    } as const;

    const result = await registerImage(input, { upload: upload as any, logger: logger as any });

    expect(upload.createPresignedPost).toHaveBeenCalledTimes(1);
    expect(upload.createPresignedPost).toHaveBeenCalledWith({
      key: 'tenants/t1/albums/alb1/images/img1',
      contentType: 'image/jpeg',
    });
    expect(result).toEqual(mockPresigned);
  });

  test('registerImage validates input and throws on missing fields', async () => {
    const badInput = {
      tenantId: 't1',
      imageId: 'img1',
      filename: 'photo.jpg',
      contentType: 'image/jpeg',
    } as unknown as Parameters<typeof registerImage>[0];

    await expect(
      registerImage(badInput, {
        upload: { createPresignedPost: jest.fn() } as any,
        logger: { info: () => undefined, debug: () => undefined, warn: () => undefined, error: () => undefined } as any,
      }),
    ).rejects.toThrow();
  });

  test('completeUpload publishes ImageUploaded event', async () => {
    const ulid = '01H7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7';
    const input = { tenantId: 't1', albumId: 'alb1', imageId: ulid };
    const published: any[] = [];
    const publisher = {
      publish: jest.fn(async (evt: any) => {
        published.push(evt);
      }),
    };
    const logger = {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    } as const;

    const result = await completeUpload(input, { publisher: publisher as any, logger: logger as any });
    expect(result).toEqual({ ok: true });
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    const evt = published[0];
    expect(evt.type).toBe('ImageUploaded');
    expect(evt.tenantId).toBe('t1');
    expect(evt.payload).toEqual({ albumId: 'alb1', imageId: ulid });
    expect(evt.id).toBe(ulid);
    expect(typeof evt.occurredAt).toBe('string');
    expect(evt.occurredAt).toMatch(/T.*Z$/);
  });
});
