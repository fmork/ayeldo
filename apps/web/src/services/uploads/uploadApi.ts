import type { AlbumDto } from '@ayeldo/types';
import { frontendConfig } from '../../app/FrontendConfigurationContext';
import { getCsrfToken } from '../csrf/getCsrfToken';

interface RegisterUploadResponse {
  readonly imageId: string;
  readonly upload: {
    readonly url: string;
    readonly fields: Record<string, string>;
    readonly key: string;
    readonly expiresAtIso: string;
  };
}

export async function registerAlbumUpload(params: {
  readonly tenantId: string;
  readonly albumId: string;
  readonly file: File;
}): Promise<RegisterUploadResponse> {
  const csrf = getCsrfToken();
  const response = await fetch(
    `${frontendConfig.apiBaseUrl}/creator/tenants/${params.tenantId}/albums/${params.albumId}/uploads`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? { [frontendConfig.csrfHeaderName]: csrf } : {}),
      },
      body: JSON.stringify({
        filename: params.file.name,
        contentType: params.file.type || 'application/octet-stream',
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to register upload (${response.status})`);
  }

  return (await response.json()) as RegisterUploadResponse;
}

export async function completeAlbumUpload(params: {
  readonly tenantId: string;
  readonly albumId: string;
  readonly imageId: string;
}): Promise<void> {
  const csrf = getCsrfToken();
  const response = await fetch(
    `${frontendConfig.apiBaseUrl}/creator/tenants/${params.tenantId}/albums/${params.albumId}/uploads/${params.imageId}/complete`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(csrf ? { [frontendConfig.csrfHeaderName]: csrf } : {}),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to complete upload (${response.status})`);
  }
}

export async function fetchAlbumMetadata(params: {
  readonly tenantId: string;
  readonly albumId: string;
}): Promise<AlbumDto | undefined> {
  const response = await fetch(
    `${frontendConfig.apiBaseUrl}/tenants/${params.tenantId}/albums/${params.albumId}`,
    { method: 'GET', credentials: 'include' },
  );
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Failed to fetch album (${response.status})`);
  return (await response.json()) as AlbumDto;
}

