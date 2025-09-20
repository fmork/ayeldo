import { PolicyEvaluator } from '@ayeldo/core';
import { getAlbum, listAlbumImages } from './media';

describe('media handlers with policy guard', () => {
  const policy = new PolicyEvaluator();

  test('getAlbum allows public access', async () => {
    const album = {
      id: 'alb1',
      tenantId: 't1',
      title: 'Summer',
      createdAt: new Date().toISOString(),
    } as any;
    const deps = { albumRepo: { getById: async () => album }, policy } as any;
    const out = await getAlbum(
      { tenantId: 't1', albumId: 'alb1', access: { mode: 'public' } as any },
      deps,
    );
    expect(out?.id).toBe('alb1');
  });

  test('getAlbum denies hidden without token', async () => {
    const deps = { albumRepo: { getById: async () => ({}) }, policy } as any;
    await expect(
      getAlbum({ tenantId: 't1', albumId: 'a', access: { mode: 'hidden' } as any }, deps),
    ).rejects.toThrow('Forbidden');
  });

  test('getAlbum allows hidden with token', async () => {
    const album = {
      id: 'a',
      tenantId: 't',
      title: 'x',
      createdAt: new Date().toISOString(),
    } as any;
    const deps = { albumRepo: { getById: async () => album }, policy } as any;
    const out = await getAlbum(
      { tenantId: 't', albumId: 'a', access: { mode: 'hidden', linkToken: 'tok' } as any },
      deps,
    );
    expect(out?.id).toBe('a');
  });

  test('listAlbumImages denies restricted when not member', async () => {
    const deps = { imageRepo: { listByAlbum: async () => [] }, policy } as any;
    await expect(
      listAlbumImages(
        { tenantId: 't', albumId: 'a', access: { mode: 'restricted', isMember: false } as any },
        deps,
      ),
    ).rejects.toThrow('Forbidden');
  });

  test('listAlbumImages allows restricted when member', async () => {
    const image = {
      id: 'img1',
      imageId: 'f',
      tenantId: 't',
      albumId: 'a',
      filename: 'f.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 1,
      width: 1,
      height: 1,
      createdAt: new Date().toISOString(),
    } as any;
    const deps = { imageRepo: { listByAlbum: async () => [image] }, policy } as any;
    const out = await listAlbumImages(
      { tenantId: 't', albumId: 'a', access: { mode: 'restricted', isMember: true } as any },
      deps,
    );
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('img1');
  });
});
