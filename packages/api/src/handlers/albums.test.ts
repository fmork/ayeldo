import { Album, Image } from '@ayeldo/core';
import type { IAlbumRepo, IImageRepo } from '@ayeldo/core';
import type { AlbumDto, ImageDto } from '@ayeldo/types';
import { createAlbum, listAlbums } from './albums';

describe('albums handlers', () => {
  const makeAlbumRepo = (overrides?: Partial<IAlbumRepo>): IAlbumRepo => {
    return {
      getById: jest.fn().mockResolvedValue(undefined),
      listRoot: jest.fn().mockResolvedValue([]),
      listChildren: jest.fn().mockResolvedValue([]),
      put: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as IAlbumRepo;
  };

  const makeImageRepo = (overrides?: Partial<IImageRepo>): IImageRepo => {
    return {
      getById: jest.fn().mockResolvedValue(undefined),
      listByAlbum: jest.fn().mockResolvedValue([]),
      put: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as IImageRepo;
  };

  test('createAlbum persists and returns created dto', async () => {
    const repo = makeAlbumRepo();
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
    const repo = makeAlbumRepo();
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
    const albumRepo = makeAlbumRepo({ listRoot: jest.fn().mockResolvedValue(albums.map((dto) => new Album(dto))) });
    const imageRepo = makeImageRepo();

    const result = await listAlbums(
      { tenantId: 't1' },
      { albumRepo, imageRepo, cdnHost: 'cdn.test' },
    );
    expect(result.albums).toHaveLength(1);
    expect(result.albums[0]?.id).toBe('a1');
    expect(result.images).toHaveLength(0);
    expect(result.ancestors).toHaveLength(0);
    expect(albumRepo.listRoot).toHaveBeenCalledWith('t1');
    expect(imageRepo.listByAlbum).not.toHaveBeenCalled();
  });

  test('listAlbums returns child albums when parent provided', async () => {
    const dto: AlbumDto = {
      id: 'child',
      tenantId: 't1',
      title: 'Child Album',
      parentAlbumId: 'parent',
      createdAt: new Date().toISOString(),
    };
    const parentEntity = new Album({
      id: 'parent',
      tenantId: 't1',
      title: 'Parent Album',
      createdAt: new Date().toISOString(),
    });
    const albumRepo = makeAlbumRepo({
      listChildren: jest.fn().mockResolvedValue([new Album(dto)]),
      getById: jest.fn().mockImplementation(async (_tenantId, albumId: string) => {
        if (albumId === 'parent') {
          return parentEntity;
        }
        return undefined;
      }),
    });
    const image: ImageDto = {
      id: 'img1',
      imageId: 'img1',
      tenantId: 't1',
      albumId: 'parent',
      filename: 'file.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 100,
      width: 10,
      height: 10,
      createdAt: new Date().toISOString(),
    };
    const imageRepo = makeImageRepo({
      listByAlbum: jest.fn().mockResolvedValue([new Image(image)]),
    });

    const result = await listAlbums(
      { tenantId: 't1', parentAlbumId: 'parent' },
      { albumRepo, imageRepo, cdnHost: 'cdn.test' },
    );
    expect(result.albums).toHaveLength(1);
    expect(result.albums[0]?.parentAlbumId).toBe('parent');
    expect(result.images).toHaveLength(1);
    expect(result.images[0]?.id).toBe('img1');
    expect(result.images[0]?.variants).toBeUndefined();
    expect(result.ancestors).toHaveLength(1);
    expect(result.ancestors[0]?.id).toBe('parent');
    expect(albumRepo.listChildren).toHaveBeenCalledWith('t1', 'parent');
    expect(imageRepo.listByAlbum).toHaveBeenCalledWith('t1', 'parent');
  });
});
