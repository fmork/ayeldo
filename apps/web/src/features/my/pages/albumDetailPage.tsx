import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import type { FC } from 'react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import PageIsLoading from '../../../app/components/PageIsLoading';
import { useSession } from '../../../app/contexts/SessionContext';
import { useUploadQueue } from '../../../app/contexts/UploadQueueContext';
import {
  useGetAlbumQuery,
  useListAlbumsQuery,
  type ImageWithCdnDto,
} from '../../../services/api/backendApi';
import AlbumImageCard from '../../albums/components/AlbumImageCard';
import AlbumUploadDropzone from '../../albums/components/AlbumUploadDropzone';
import AlbumsList from '../components/AlbumsList';
import CreateAlbumForm from '../components/CreateAlbumForm';
import AlbumBreadcrumbs from '../components/AlbumBreadcrumbs';

const AlbumDetailPage: FC = () => {
  const session = useSession();
  // Support both route shapes:
  // - /tenants/:tenantId/albums/:albumId (public/admin routes)
  // - /my/albums/:id (authenticated creator routes)
  const params = useParams<{ tenantId?: string; albumId?: string; id?: string }>();
  const albumId = params.albumId ?? params.id;
  const routeTenantId = params.tenantId;
  const { jobs } = useUploadQueue();
  const { t } = useTranslation();

  const queryParams = useMemo(() => {
    if (!session?.loggedIn || !session.tenantIds || session.tenantIds.length === 0 || !albumId) {
      return skipToken;
    }
    // Use the first tenant ID for now - in a multi-tenant UI, this would be selected
    return { tenantId: session.tenantIds[0], albumId };
  }, [session, albumId]);

  const { data: album, isLoading: isAlbumLoading, error: albumError } = useGetAlbumQuery(queryParams);

  const childAlbumsQueryArgs = useMemo(() => {
    if (!session?.loggedIn || !session.tenantIds || session.tenantIds.length === 0 || !albumId) {
      return skipToken;
    }
    return { tenantId: session.tenantIds[0], parentAlbumId: albumId };
  }, [session, albumId]);

  const {
    data: childAlbumsResponse,
    isLoading: isChildAlbumsLoading,
    isFetching: isChildAlbumsFetching,
    isError: isChildAlbumsError,
  } = useListAlbumsQuery(childAlbumsQueryArgs);

  // Debug: log the full images structure whenever it's received so we can
  // inspect variants and CDN URLs in the browser console during troubleshooting.
  useEffect(() => {
    console.info('AlbumDetailPage received images:', childAlbumsResponse?.images);
  }, [childAlbumsResponse]);

  const childAlbumsLoading = isChildAlbumsLoading || isChildAlbumsFetching;
  if (isAlbumLoading || childAlbumsLoading) {
    return <PageIsLoading />;
  }

  if (albumError) {
    return (
      <Alert severity="error">
        {t('albums.failed_to_load_album', { error: String(albumError) })}
      </Alert>
    );
  }

  if (!album) {
    return <Alert severity="error">{t('albums.album_not_found')}</Alert>;
  }

  if (!session?.loggedIn || !session.tenantIds || session.tenantIds.length === 0 || !albumId) {
    return <Alert severity="error">{t('albums.please_log_in')}</Alert>;
  }

  // Prefer an explicit tenantId from the route when present (admin routes).
  const tenantId = routeTenantId ?? session.tenantIds[0];
  const uploadingFiles = jobs.filter(job => job.albumId === albumId &&
    ['queued', 'registering', 'uploading', 'completing'].includes(job.status));
  const albumImages = childAlbumsResponse?.images ?? [];
  const ancestors = childAlbumsResponse?.ancestors ?? [];

  return (
    <Stack spacing={3}>
      <AlbumBreadcrumbs
        ancestors={ancestors}
        currentAlbum={album}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4">{album.title}</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<OpenInNewIcon />}
          href={`/tenants/${tenantId}/albums/${albumId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('albums.visitor_view')}
        </Button>
      </Box>

      {album.description && <Typography variant="body1">{album.description}</Typography>}

      <Box>
        <Typography variant="h6" gutterBottom>{t('albums.upload_images')}</Typography>
        <AlbumUploadDropzone tenantId={tenantId} albumId={albumId} />

        {uploadingFiles.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('albums.uploading_files', { count: uploadingFiles.length })}
            </Typography>
            <Stack spacing={1}>
              {uploadingFiles.map((job, index: number) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2">{job.fileName}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" gutterBottom>
          {t('albums.child_albums')}
        </Typography>
        <CreateAlbumForm tenantId={tenantId} context={{ kind: 'child', parentAlbumId: albumId }} />
        <Box sx={{ mt: 3 }}>
          <AlbumsList
            albums={childAlbumsResponse?.albums}
            isLoading={childAlbumsLoading}
            isError={Boolean(isChildAlbumsError)}
            context={{ kind: 'child' }}
          />
        </Box>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" gutterBottom>
          {t('albums.images_count', { count: albumImages.length })}
        </Typography>

        {albumImages.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('albums.no_images')}
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
            {albumImages.map((image: ImageWithCdnDto) => {
              // Prefer the thumbnail variant; otherwise pick the largest available variant.
              const thumbnailVariant = image.variants?.find(v => v.label === 'thumbnail');
              const largestVariant = image.variants?.slice().sort((a, b) => b.width - a.width)[0];
              const imageUrl = thumbnailVariant?.cdnUrl ?? largestVariant?.cdnUrl;

              if (!imageUrl) return null;

              return (
                <AlbumImageCard
                  key={image.id}
                  image={image}
                  alt={image.filename}
                  sx={{ height: 200, objectFit: 'cover', cursor: 'pointer' }}
                />
              );
            })}
          </Box>
        )}
      </Box>
    </Stack>
  );
};

export default AlbumDetailPage;
