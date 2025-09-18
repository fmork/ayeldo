import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import type { FC } from 'react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import PageIsLoading from '../../../app/components/PageIsLoading';
import { useSession } from '../../../app/contexts/SessionContext';
import { useGetAlbumQuery } from '../../../services/api/backendApi';

const AlbumPage: FC = () => {
  const { id } = useParams();
  const session = useSession();

  const tenantId = useMemo(() => {
    if (!session?.loggedIn) return undefined;
    return session.tenantIds && session.tenantIds.length > 0 ? session.tenantIds[0] : undefined;
  }, [session]);

  const albumId = typeof id === 'string' && id.length > 0 ? id : undefined;
  const queryArg = tenantId && albumId ? { tenantId, albumId } : skipToken;
  const { data: album, isLoading, isFetching, isError } = useGetAlbumQuery(queryArg);

  if (!session) {
    return <PageIsLoading />;
  }

  if (!albumId) {
    return (
      <Alert severity="error">
        The album you are trying to view could not be determined.
      </Alert>
    );
  }

  if (!tenantId) {
    return (
      <Alert severity="info">
        You do not have access to a tenant. Join a tenant to view and manage albums.
      </Alert>
    );
  }

  if (isLoading || isFetching) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress size={36} />
      </Box>
    );
  }

  if (isError || !album) {
    return (
      <Alert severity="error">
        We could not load this album. It may have been removed or you may not have access.
      </Alert>
    );
  }

  return (
    <Stack spacing={3} component="section">
      <Box>
        <Typography variant="h4" gutterBottom>
          {album.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Created {new Date(album.createdAt).toLocaleString()}
        </Typography>
      </Box>
      {album.description && (
        <Typography variant="body1" color="text.secondary">
          {album.description}
        </Typography>
      )}
      <Alert severity="info" variant="outlined">
        Media upload and album organization tools will appear here.
      </Alert>
    </Stack>
  );
};

export default AlbumPage;
