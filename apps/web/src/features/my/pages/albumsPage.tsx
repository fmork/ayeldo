import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import type { FC } from 'react';
import { useMemo } from 'react';
import PageIsLoading from '../../../app/components/PageIsLoading';
import { useSession } from '../../../app/contexts/SessionContext';
import { useListAlbumsQuery } from '../../../services/api/backendApi';

import AlbumsList from '../components/AlbumsList';
import CreateAlbumForm from '../components/CreateAlbumForm';


const AlbumsPage: FC = () => {
  const session = useSession();
  const tenantId = useMemo(() => {
    if (!session?.loggedIn) return undefined;
    return session.tenantIds && session.tenantIds.length > 0 ? session.tenantIds[0] : undefined;
  }, [session]);

  const albumsQueryArgs = tenantId ? { tenantId } : skipToken;
  const {
    data: albumsResponse,
    isLoading: isAlbumsLoading,
    isFetching: isAlbumsFetching,
    isError: isAlbumsError,
  } =
    useListAlbumsQuery(albumsQueryArgs);

  if (!session) {
    return <PageIsLoading />;
  }

  if (!session.loggedIn) {
    return (
      <Alert severity="info" variant="outlined">
        You need to sign in to manage albums.
      </Alert>
    );
  }

  if (!tenantId) {
    return (
      <Alert severity="warning" variant="outlined">
        Your account is not associated with any tenant yet. Complete onboarding to start creating albums.
      </Alert>
    );
  }


  const isLoadingAlbums = isAlbumsLoading || isAlbumsFetching;

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Albums
        </Typography>
        <Typography color="text.secondary">
          Create new albums and keep track of your catalogue in one place.
        </Typography>
      </Box>

      <CreateAlbumForm tenantId={tenantId} context={{ kind: 'root' }} />

      <Box>
        <Typography variant="h5" gutterBottom>
          Existing albums
        </Typography>

        <AlbumsList
          albums={albumsResponse?.albums}
          isLoading={isLoadingAlbums}
          isError={!!isAlbumsError}
          context={{ kind: 'root' }}
        />
      </Box>
    </Stack>
  );
};

export default AlbumsPage;
