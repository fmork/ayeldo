import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import type { FC } from 'react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import PageIsLoading from '../../../app/components/PageIsLoading';
import { useSession } from '../../../app/contexts/SessionContext';
import { useUploadQueue } from '../../../app/contexts/UploadQueueContext';
import { useGetAlbumImagesQuery, useGetAlbumQuery, type ImageWithCdnDto } from '../../../services/api/backendApi';
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

  const queryParams = useMemo(() => {
    if (!session?.loggedIn || !session.tenantIds || session.tenantIds.length === 0 || !albumId) {
      return skipToken;
    }
    // Use the first tenant ID for now - in a multi-tenant UI, this would be selected
    return { tenantId: session.tenantIds[0], albumId };
  }, [session, albumId]);

  const { data: album, isLoading: isAlbumLoading, error: albumError } = useGetAlbumQuery(queryParams);
  const { data: images, isLoading: isImagesLoading, error: imagesError } = useGetAlbumImagesQuery(queryParams);

  if (isAlbumLoading || isImagesLoading) {
    return <PageIsLoading />;
  }

  if (albumError) {
    return (
      <Alert severity="error">
        Failed to load album: {String(albumError)}
      </Alert>
    );
  }

  if (imagesError) {
    return (
      <Alert severity="error">
        Failed to load album images: {String(imagesError)}
      </Alert>
    );
  }

  if (!album) {
    return (
      <Alert severity="error">
        Album not found
      </Alert>
    );
  }

  if (!session?.loggedIn || !session.tenantIds || session.tenantIds.length === 0 || !albumId) {
    return (
      <Alert severity="error">
        Please log in to view this album
      </Alert>
    );
  }

  // Prefer an explicit tenantId from the route when present (admin routes).
  const tenantId = routeTenantId ?? session.tenantIds[0];
  const uploadingFiles = jobs.filter(job => job.albumId === albumId &&
    ['queued', 'registering', 'uploading', 'completing'].includes(job.status));

  return (
    <Stack spacing={3}>
      <Typography variant="h4">{album.title}</Typography>

      {album.description && (
        <Typography variant="body1">{album.description}</Typography>
      )}

      <Box>
        <Typography variant="h6" gutterBottom>Upload Images</Typography>
        <AlbumUploadDropzone tenantId={tenantId} albumId={albumId} />

        {uploadingFiles.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Uploading {uploadingFiles.length} file(s)...
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
          Images ({images?.length || 0})
        </Typography>

        {!images || images.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No images in this album yet. Upload some images to get started.
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
                <Card key={image.id} sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
                    sx={{
                      height: 200,
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                    image={imageUrl}
                    alt={image.filename}
                    title={image.filename}
                  />
                </Card>
              );
            })}
          </Box>
        )}
      </Box>
    </Stack>
  );
};

export default AlbumDetailPage;
