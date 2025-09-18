import { Album } from '@ayeldo/core';
import type { IAlbumRepo } from '@ayeldo/core';
import type { AlbumDto } from '@ayeldo/types';
import { createAlbum, listAlbums } from './albums';

describe('albums handlers', () => {
  const makeRepo = (overrides?: Partial<IAlbumRepo>): IAlbumRepo => {
    return {
      getById: jest.fn().mockResolvedValue(undefined),
      listRoot: jest.fn().mockResolvedValue([]),
      listChildren: jest.fn().mockResolvedValue([]),
      put: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as IAlbumRepo;
  };

  test('createAlbum persists and returns created dto', async () => {
    const repo = makeRepo();
    const result = await createAlbum(
      { tenantId: 'tenant-1', title: 'My Album', description: 'Test album' },
      { albumRepo: repo },
    );

    expect((repo.put as jest.Mock).mock.calls).toHaveLength(1);
    const savedAlbum = (repo.put as jest.Mock).mock.calls[0][0] as Album;
    expect(savedAlbum.title).toBe('My Album');
    expect(result.title).toBe('My Album');
    expect(result.tenantId).toBe('tenant-1');
  });

  test('createAlbum validates parent existence', async () => {
    const repo = makeRepo();
    await expect(
      createAlbum(
        { tenantId: 't1', title: 'Child', parentAlbumId: 'missing' },
        { albumRepo: repo },
      ),
    ).rejects.toThrow('Parent album not found');
  });

  test('listAlbums returns root albums when no parent provided', async () => {
    const albums: readonly AlbumDto[] = [
      {
        id: 'a1',
        tenantId: 't1',
        title: 'Root',
        createdAt: new Date().toISOString(),
      },
    ];
    const repo = makeRepo({ listRoot: jest.fn().mockResolvedValue(albums.map((dto) => new Album(dto))) });

    const result = await listAlbums({ tenantId: 't1' }, { albumRepo: repo });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('a1');
    expect(repo.listRoot).toHaveBeenCalledWith('t1');
  });

  test('listAlbums returns child albums when parent provided', async () => {
    const dto: AlbumDto = {
      id: 'child',
      tenantId: 't1',
      title: 'Child Album',
      parentAlbumId: 'parent',
      createdAt: new Date().toISOString(),
    };
    const repo = makeRepo({
      listChildren: jest.fn().mockResolvedValue([new Album(dto)]),
    });

    const result = await listAlbums({ tenantId: 't1', parentAlbumId: 'parent' }, { albumRepo: repo });
    expect(result).toHaveLength(1);
    expect(result[0]?.parentAlbumId).toBe('parent');
    expect(repo.listChildren).toHaveBeenCalledWith('t1', 'parent');
  });
});

