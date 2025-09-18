import { NotFoundError } from '@ayeldo/core';
import type { IAlbumRepo } from '@ayeldo/core';
import type { IEventPublisher, IUploadUrlProvider } from '@ayeldo/core';
import type { PinoLogWriter } from '@ayeldo/utils';
import { makeUuid } from '@ayeldo/utils';
import { z } from 'zod';
import { completeUpload, registerImage } from '../handlers/images';

export interface AlbumUploadServiceProps {
  readonly albumRepo: IAlbumRepo;
  readonly uploadProvider: IUploadUrlProvider;
  readonly publisher: IEventPublisher;
  readonly logger: PinoLogWriter;
}

export class AlbumUploadService {
  private readonly albumRepo: IAlbumRepo;
  private readonly uploadProvider: IUploadUrlProvider;
  private readonly publisher: IEventPublisher;
  private readonly logger: PinoLogWriter;

  public constructor(props: AlbumUploadServiceProps) {
    this.albumRepo = props.albumRepo;
    this.uploadProvider = props.uploadProvider;
    this.publisher = props.publisher;
    this.logger = props.logger;
  }

  public async createUpload(input: {
    readonly tenantId: string;
    readonly albumId: string;
    readonly body: unknown;
  }): Promise<{ readonly imageId: string; readonly upload: Awaited<ReturnType<typeof registerImage>> }>
  {
    const payload = z
      .object({
        filename: z.string().min(1),
        contentType: z.string().min(1),
        imageId: z.string().min(1).optional(),
      })
      .parse(input.body);

    const album = await this.albumRepo.getById(input.tenantId, input.albumId);
    if (!album) {
      throw new NotFoundError(`Album ${input.albumId} not found for tenant ${input.tenantId}`);
    }

    const imageId = payload.imageId ?? makeUuid();
    const presigned = await registerImage(
      {
        tenantId: input.tenantId,
        albumId: input.albumId,
        imageId,
        filename: payload.filename,
        contentType: payload.contentType,
      },
      { upload: this.uploadProvider, logger: this.logger },
    );

    return { imageId, upload: presigned };
  }

  public async completeUpload(params: {
    readonly tenantId: string;
    readonly albumId: string;
    readonly imageId: string;
  }): Promise<{ readonly ok: true }>
  {
    const album = await this.albumRepo.getById(params.tenantId, params.albumId);
    if (!album) {
      throw new NotFoundError(`Album ${params.albumId} not found for tenant ${params.tenantId}`);
    }

    return completeUpload(
      {
        tenantId: params.tenantId,
        albumId: params.albumId,
        imageId: params.imageId,
      },
      { publisher: this.publisher, logger: this.logger },
    );
  }
}

