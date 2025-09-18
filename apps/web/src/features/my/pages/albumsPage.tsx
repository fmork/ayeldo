import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import type { FC, FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import PageIsLoading from '../../../app/components/PageIsLoading';
import { useSession } from '../../../app/contexts/SessionContext';
import {
  useCreateAlbumMutation,
  useListAlbumsQuery,
} from '../../../services/api/backendApi';

const MAX_DESCRIPTION_LENGTH = 2000;

const AlbumsPage: FC = () => {
  const session = useSession();
  const tenantId = useMemo(() => {
    if (!session?.loggedIn) return undefined;
    return session.tenantIds && session.tenantIds.length > 0 ? session.tenantIds[0] : undefined;
  }, [session]);

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | undefined>();

  const albumsQueryArgs = tenantId ? { tenantId } : skipToken;
  const {
    data: albums,
    isLoading: isAlbumsLoading,
    isFetching: isAlbumsFetching,
    isError: isAlbumsError,
  } = useListAlbumsQuery(albumsQueryArgs);

  const [createAlbum, { isLoading: isCreating }] = useCreateAlbumMutation();

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

  const handleCreateAlbum = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length === 0) {
      setFormError('Album title is required.');
      return;
    }

    setFormError(undefined);
    setSubmitError(undefined);

    try {
      await createAlbum({
        tenantId,
        title: trimmedTitle,
        ...(trimmedDescription.length > 0 ? { description: trimmedDescription } : {}),
      }).unwrap();
      setTitle('');
      setDescription('');
    } catch {
      setSubmitError('Unable to create the album right now. Please try again.');
    }
  };

  const isLoadingAlbums = isAlbumsLoading || isAlbumsFetching;
  const hasAlbums = (albums?.length ?? 0) > 0;

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

      <Card component="section">
        <CardContent>
          <Stack
            component="form"
            spacing={3}
            onSubmit={handleCreateAlbum}
            noValidate
            autoComplete="off"
          >
            <Box>
              <Typography variant="h6">Create a new album</Typography>
              <Typography variant="body2" color="text.secondary">
                Give your album a short title and an optional description. You can add media after creating it.
              </Typography>
            </Box>

            {formError && (
              <Alert severity="warning" onClose={() => setFormError(undefined)}>
                {formError}
              </Alert>
            )}
            {submitError && (
              <Alert severity="error" onClose={() => setSubmitError(undefined)}>
                {submitError}
              </Alert>
            )}

            <TextField
              label="Album title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              fullWidth
              inputProps={{ maxLength: 200 }}
            />

            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              fullWidth
              multiline
              minRows={3}
              helperText={`${description.length}/${MAX_DESCRIPTION_LENGTH}`}
              inputProps={{ maxLength: MAX_DESCRIPTION_LENGTH }}
            />

            <Box display="flex" justifyContent="flex-end">
              <Button
                type="submit"
                variant="contained"
                disabled={isCreating}
                startIcon={<AddPhotoAlternateOutlinedIcon />}
              >
                {isCreating ? 'Creating…' : 'Create album'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Box>
        <Typography variant="h5" gutterBottom>
          Existing albums
        </Typography>

        {isLoadingAlbums && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={32} />
          </Box>
        )}

        {!isLoadingAlbums && isAlbumsError && (
          <Alert severity="error">We could not load your albums. Please try again later.</Alert>
        )}

        {!isLoadingAlbums && !isAlbumsError && !hasAlbums && (
          <Alert severity="info" variant="outlined">
            You do not have any albums yet. Use the form above to create your first one.
          </Alert>
        )}

        {!isLoadingAlbums && !isAlbumsError && hasAlbums && (
          <Box
            display="grid"
            gap={3}
            sx={{ gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}
          >
            {albums?.map((album) => (
              <Card key={album.id} variant="outlined">
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="h6">{album.title}</Typography>
                    {album.description && (
                      <Typography variant="body2" color="text.secondary">
                        {album.description}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Created {new Date(album.createdAt).toLocaleString()}
                    </Typography>
                    <Button
                      component={RouterLink}
                      to={`/albums/${album.id}`}
                      size="small"
                      variant="text"
                    >
                      Open album
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    </Stack>
  );
};

export default AlbumsPage;
