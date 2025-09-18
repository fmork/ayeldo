import type { IAlbumRepo } from '@ayeldo/core';
import type { AlbumDto } from '@ayeldo/types';
import { z } from 'zod';
import { createAlbum, listAlbums } from '../handlers/albums';

export interface AlbumManagementServiceProps {
  readonly albumRepo: IAlbumRepo;
}

export class AlbumManagementService {
  private readonly albumRepo: IAlbumRepo;

  public constructor(props: AlbumManagementServiceProps) {
    this.albumRepo = props.albumRepo;
  }

  public async listAlbums(input: unknown): Promise<readonly AlbumDto[]> {
    const params = z
      .object({
        tenantId: z.string().min(1),
        parentAlbumId: z.string().min(1).optional(),
      })
      .parse(input);
    return listAlbums(params, { albumRepo: this.albumRepo });
  }

  public async createAlbum(input: { tenantId: string; body: unknown }): Promise<AlbumDto> {
    const payload = z
      .object({
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        parentAlbumId: z.string().min(1).optional(),
      })
      .parse(input.body);

    return createAlbum(
      {
        tenantId: input.tenantId,
        title: payload.title.trim(),
        ...(payload.description !== undefined
          ? { description: payload.description.trim() }
          : {}),
        ...(payload.parentAlbumId !== undefined
          ? { parentAlbumId: payload.parentAlbumId }
          : {}),
      },
      { albumRepo: this.albumRepo },
    );
  }
}

