import { PolicyMode } from '@ayeldo/core';
import { MediaQueryService } from './mediaQueryService';

// Simple in-memory fakes
function mkAlbumRepo(album?: any) {
  return {
    getById: jest.fn().mockResolvedValue(album),
    listRoot: jest.fn().mockResolvedValue([]),
    listChildren: jest.fn().mockResolvedValue([]),
  } as any;
}

function mkImageRepo(images: any[] = []) {
  return {
    listByAlbum: jest.fn().mockResolvedValue(images),
  } as any;
}

describe('MediaQueryService', () => {
  test('getAlbum returns undefined when repo returns nothing', async () => {
    const svc = new MediaQueryService({
      albumRepo: mkAlbumRepo(undefined),
      imageRepo: mkImageRepo(),
    });
    const result = await svc.getAlbum(
      { tenantId: 't1', albumId: 'a1' },
      { mode: PolicyMode.Public },
    );
    expect(result).toBeUndefined();
  });

  test('getAlbum throws for restricted without membership', async () => {
    const svc = new MediaQueryService({
      albumRepo: mkAlbumRepo({
        id: 'a',
        tenantId: 't1',
        title: 'A',
        createdAt: new Date().toISOString(),
      }),
      imageRepo: mkImageRepo(),
    });
    await expect(
      svc.getAlbum({ tenantId: 't1', albumId: 'a' }, { mode: PolicyMode.Restricted }),
    ).rejects.toThrow('Forbidden');
  });

  test('getAlbum allowed for restricted with isMember true', async () => {
    const album = { id: 'a', tenantId: 't1', title: 'A', createdAt: new Date().toISOString() };
    const svc = new MediaQueryService({ albumRepo: mkAlbumRepo(album), imageRepo: mkImageRepo() });
    const result = await svc.getAlbum(
      { tenantId: 't1', albumId: 'a' },
      { mode: PolicyMode.Restricted, isMember: 'true' },
    );
    expect(result).toMatchObject({ id: 'a', title: 'A' });
  });

  test('listAlbumImages denies hidden without token', async () => {
    const svc = new MediaQueryService({ albumRepo: mkAlbumRepo(), imageRepo: mkImageRepo([]) });
    await expect(
      svc.listAlbumImages({ tenantId: 't1', albumId: 'a1' }, { mode: PolicyMode.Hidden }),
    ).rejects.toThrow('Forbidden');
  });

  test('listAlbumImages allows hidden with token and returns images', async () => {
    const images = [
      {
        id: 'i1',
        tenantId: 't1',
        albumId: 'a1',
        filename: 'f.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 1,
        width: 10,
        height: 10,
        createdAt: new Date().toISOString(),
      },
    ];
    const svc = new MediaQueryService({ albumRepo: mkAlbumRepo(), imageRepo: mkImageRepo(images) });
    const result = await svc.listAlbumImages(
      { tenantId: 't1', albumId: 'a1' },
      { mode: PolicyMode.Hidden, linkToken: 'tok123' },
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('i1');
  });
});
