import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
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
import { useGetAlbumQuery } from '../../../services/api/backendApi';
import AlbumUploadDropzone from '../../albums/components/AlbumUploadDropzone';

const AlbumDetailPage: FC = () => {
  const { id } = useParams();
  const session = useSession();
  const { jobs } = useUploadQueue();

  const tenantId = useMemo(() => {
    if (!session?.loggedIn) return undefined;
    return session.tenantIds && session.tenantIds.length > 0 ? session.tenantIds[0] : undefined;
  }, [session]);

  const albumId = typeof id === 'string' && id.length > 0 ? id : undefined;
  const queryArg = tenantId && albumId ? { tenantId, albumId } : skipToken;
  const { data: album, isLoading, isFetching, isError } = useGetAlbumQuery(queryArg);

  const albumJobs = useMemo(
    () =>
      jobs.filter(
        (job) => job.albumId === albumId && job.tenantId === tenantId && job.status !== 'completed',
      ),
    [albumId, jobs, tenantId],
  );

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
      {tenantId && albumId && (
        <AlbumUploadDropzone tenantId={tenantId} albumId={albumId} />
      )}
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
      {albumJobs.length > 0 && (
        <Box>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1" gutterBottom>
            Uploads in progress
          </Typography>
          <Stack spacing={1}>
            {albumJobs.map((job) => (
              <Stack
                key={job.id}
                spacing={0.5}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}
              >
                <Typography variant="body2" noWrap title={job.fileName}>
                  {job.fileName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {statusLabel(job.status)} · {Math.round(job.progress)}%
                </Typography>
                {job.error && (
                  <Typography variant="caption" color="error.main">
                    {job.error}
                  </Typography>
                )}
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
      <Alert severity="info" variant="outlined">
        Media upload and album organization tools will appear here.
      </Alert>
    </Stack>
  );
};

function statusLabel(status: string): string {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'registering':
      return 'Preparing';
    case 'uploading':
      return 'Uploading';
    case 'completing':
      return 'Finishing';
    case 'failed':
      return 'Failed';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
}

export default AlbumDetailPage;
