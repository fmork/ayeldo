import { Album } from '@ayeldo/core';
import { NotFoundError } from '@ayeldo/core';
import type { IAlbumRepo, IEventPublisher, IUploadUrlProvider } from '@ayeldo/core';
import type { PresignedPostPayload } from '@ayeldo/core/src/ports/storage';
import type { PinoLogWriter } from '@ayeldo/utils';
import { AlbumUploadService } from './albumUploadService';

const loggerStub = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn().mockReturnThis(),
} as unknown as PinoLogWriter;

const presigned: PresignedPostPayload = {
  url: 'https://uploads.example.com',
  fields: { key: 'tenants/t1/albums/a1/images/img1' },
  key: 'tenants/t1/albums/a1/images/img1',
  expiresAtIso: new Date().toISOString(),
};

function makeService(overrides?: Partial<AlbumUploadService>): AlbumUploadService {
  const albumRepo: IAlbumRepo = {
    getById: jest.fn().mockResolvedValue(new Album({ id: 'a1', tenantId: 't1', title: 'Album', createdAt: new Date().toISOString() })),
    listRoot: jest.fn(),
    listChildren: jest.fn(),
    put: jest.fn(),
  } as unknown as IAlbumRepo;
  const uploadProvider: IUploadUrlProvider = {
    createPresignedPost: jest.fn().mockResolvedValue(presigned),
  };
  const publisher: IEventPublisher = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  return new AlbumUploadService({
    ...{
      albumRepo,
      uploadProvider,
      publisher,
      logger: loggerStub,
    },
    ...(overrides as unknown as AlbumUploadServiceProps),
  });
}

type AlbumUploadServiceProps = ConstructorParameters<typeof AlbumUploadService>[0];

describe('AlbumUploadService', () => {
  test('createUpload returns image id and presigned data', async () => {
    const albumRepo = {
      getById: jest.fn().mockResolvedValue(new Album({ id: 'a1', tenantId: 't1', title: 'Album', createdAt: new Date().toISOString() })),
      listRoot: jest.fn(),
      listChildren: jest.fn(),
      put: jest.fn(),
    } as unknown as IAlbumRepo;
    const uploadProvider: IUploadUrlProvider = {
      createPresignedPost: jest.fn().mockResolvedValue(presigned),
    };
    const publisher: IEventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const svc = new AlbumUploadService({
      albumRepo,
      uploadProvider,
      publisher,
      logger: loggerStub,
    });

    const result = await svc.createUpload({
      tenantId: 't1',
      albumId: 'a1',
      body: { filename: 'photo.jpg', contentType: 'image/jpeg' },
    });

    expect(result.imageId).toEqual(expect.any(String));
    expect(result.upload).toEqual(presigned);
    expect(uploadProvider.createPresignedPost).toHaveBeenCalledWith(
      expect.objectContaining({ key: expect.stringContaining('uploads/t1/a1/') }),
    );
  });

  test('createUpload throws NotFoundError when album missing', async () => {
    const albumRepo = {
      getById: jest.fn().mockResolvedValue(undefined),
      listRoot: jest.fn(),
      listChildren: jest.fn(),
      put: jest.fn(),
    } as unknown as IAlbumRepo;
    const uploadProvider: IUploadUrlProvider = {
      createPresignedPost: jest.fn(),
    };
    const publisher: IEventPublisher = {
      publish: jest.fn(),
    };

    const svc = new AlbumUploadService({ albumRepo, uploadProvider, publisher, logger: loggerStub });

    await expect(
      svc.createUpload({
        tenantId: 't1',
        albumId: 'missing',
        body: { filename: 'x', contentType: 'image/jpeg' },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test('completeUpload publishes event after verifying album exists', async () => {
    const publishMock = jest.fn().mockResolvedValue(undefined);
    const albumRepo = {
      getById: jest.fn().mockResolvedValue(new Album({ id: 'a1', tenantId: 't1', title: 'Album', createdAt: new Date().toISOString() })),
      listRoot: jest.fn(),
      listChildren: jest.fn(),
      put: jest.fn(),
    } as unknown as IAlbumRepo;
    const uploadProvider: IUploadUrlProvider = {
      createPresignedPost: jest.fn(),
    };
    const publisher: IEventPublisher = {
      publish: publishMock,
    };

    const svc = new AlbumUploadService({ albumRepo, uploadProvider, publisher, logger: loggerStub });

    await svc.completeUpload({ tenantId: 't1', albumId: 'a1', imageId: '11111111-1111-1111-1111-111111111111' });
    expect(publishMock).toHaveBeenCalled();
  });
});
