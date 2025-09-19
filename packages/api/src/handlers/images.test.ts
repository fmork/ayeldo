import { completeUpload, registerImage } from './images';

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
      fields: { key: 'uploads/t1/alb1/img1/original/photo.jpg' },
      key: 'uploads/t1/alb1/img1/original/photo.jpg',
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
      key: 'uploads/t1/alb1/img1/original/photo.jpg',
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
        logger: {
          info: () => undefined,
          debug: () => undefined,
          warn: () => undefined,
          error: () => undefined,
        } as any,
      }),
    ).rejects.toThrow();
  });

  test('completeUpload publishes ImageUploaded event', async () => {
    const imageId = '550e8400-e29b-41d4-a716-446655440000';
    const input = { tenantId: 't1', albumId: 'alb1', imageId };
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

    const result = await completeUpload(input, {
      publisher: publisher as any,
      logger: logger as any,
    });
    expect(result).toEqual({ ok: true });
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    const evt = published[0];
    expect(evt.type).toBe('ImageUploaded');
    expect(evt.tenantId).toBe('t1');
    expect(evt.payload).toEqual({ albumId: 'alb1', imageId });
    expect(evt.id).toBe(imageId);
    expect(typeof evt.occurredAt).toBe('string');
    expect(evt.occurredAt).toMatch(/T.*Z$/);
  });
});
