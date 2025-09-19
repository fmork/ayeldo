import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import { useParams } from 'react-router-dom';
import { useGetAlbumImagesQuery, useGetAlbumQuery, type ImageWithCdnDto } from '../../../services/api/backendApi';

const VisitorAlbumPage: FC = () => {
  const { tenantId, albumId } = useParams<{ tenantId: string; albumId: string }>();

  const {
    data: album,
    error: albumError,
    isLoading: albumLoading,
  } = useGetAlbumQuery(
    { tenantId: tenantId || '', albumId: albumId || '' },
    { skip: !tenantId || !albumId }
  );

  const {
    data: images = [],
    error: imagesError,
    isLoading: imagesLoading,
  } = useGetAlbumImagesQuery(
    { tenantId: tenantId || '', albumId: albumId || '' },
    { skip: !tenantId || !albumId }
  );

  if (!tenantId || !albumId) {
    return (
      <Stack spacing={3} component="section">
        <Alert severity="error" variant="outlined">
          Tenant ID and Album ID are required
        </Alert>
      </Stack>
    );
  }

  if (albumLoading || imagesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  const error = albumError || imagesError;
  if (error) {
    return (
      <Stack spacing={3} component="section">
        <Alert severity="error" variant="outlined">
          {'data' in error ? JSON.stringify(error.data) : 'Failed to load album'}
        </Alert>
      </Stack>
    );
  }

  if (!album) {
    return (
      <Stack spacing={3} component="section">
        <Alert severity="warning" variant="outlined">
          Album not found
        </Alert>
      </Stack>
    );
  }

  const getImageUrl = (image: ImageWithCdnDto): string => {
    // Prefer the first variant with CDN URL, fallback to original CDN URL
    if (image.variants && image.variants.length > 0) {
      const variantWithCdn = image.variants.find(v => v.cdnUrl);
      if (variantWithCdn?.cdnUrl) {
        return variantWithCdn.cdnUrl;
      }
    }
    return image.originalCdnUrl || '';
  };

  return (
    <Stack spacing={3} component="section">
      <Box>
        <Typography variant="h3" gutterBottom>
          {album.title}
        </Typography>
        {album.description && (
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {album.description}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {images.length} {images.length === 1 ? 'image' : 'images'}
        </Typography>
      </Box>

      {images.length === 0 ? (
        <Alert severity="info" variant="outlined">
          This album doesn't contain any images yet.
        </Alert>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 2,
          }}
        >
          {images.map((image) => {
            const imageUrl = getImageUrl(image);
            return (
              <Card key={image.id}>
                <CardMedia
                  component="img"
                  image={imageUrl}
                  alt={image.filename}
                  sx={{
                    aspectRatio: '1',
                    objectFit: 'cover',
                  }}
                />
              </Card>
            );
          })}
        </Box>
      )}
    </Stack>
  );
};

export default VisitorAlbumPage;
