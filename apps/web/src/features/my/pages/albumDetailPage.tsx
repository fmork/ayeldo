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
import { useGetAlbumImagesQuery, useGetAlbumQuery, type ImageWithCdnDto } from '../../../services/api/backendApi';
import AlbumImageCard from '../../albums/components/AlbumImageCard';
import AlbumUploadDropzone from '../../albums/components/AlbumUploadDropzone';

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
  const { data: images, isLoading: isImagesLoading, error: imagesError } = useGetAlbumImagesQuery(queryParams, { refetchOnMountOrArgChange: true });

  // Debug: log the full images structure whenever it's received so we can
  // inspect variants and CDN URLs in the browser console during troubleshooting.
  useEffect(() => {
    console.info('AlbumDetailPage received images:', images);
  }, [images]);

  if (isAlbumLoading || isImagesLoading) {
    return <PageIsLoading />;
  }

  if (albumError) {
    return (
      <Alert severity="error">
        {t('albums.failed_to_load_album', { error: String(albumError) })}
      </Alert>
    );
  }

  if (imagesError) {
    return (
      <Alert severity="error">
        {t('albums.failed_to_load_album_images', { error: String(imagesError) })}
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

  return (
    <Stack spacing={3}>
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
          {t('albums.images_count', { count: images?.length || 0 })}
        </Typography>

        {!images || images.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('albums.no_images')}
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
            {images.map((image: ImageWithCdnDto) => {
              // Find thumbnail variant or fallback to original
              const thumbnailVariant = image.variants?.find(v => v.label === 'thumbnail');
              const imageUrl = thumbnailVariant?.cdnUrl || image.originalCdnUrl;

              if (!imageUrl) {
                return null;
              }

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
