import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import type { AlbumDto } from '@ayeldo/types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import AlbumCard from './AlbumCard';

export type AlbumsListContext = { readonly kind: 'root' } | { readonly kind: 'child' };

interface Props {
  readonly albums: readonly AlbumDto[] | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly context: AlbumsListContext;
}

const AlbumsList: FC<Props> = ({ albums, isLoading, isError, context }) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (isError) {
    return <Alert severity="error">{t('albums.error_loading_albums')}</Alert>;
  }

  const hasAlbums = (albums?.length ?? 0) > 0;

  if (!hasAlbums) {
    const message =
      context.kind === 'child'
        ? t('albums.no_sub_albums')
        : t('albums.no_albums');
    return (
      <Alert severity="info" variant="outlined">
        {message}
      </Alert>
    );
  }

  return (
    <Box
      display="grid"
      gap={3}
      sx={{ gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}
    >
      {albums?.map((album) => (
        <AlbumCard key={album.id} album={album} />
      ))}
    </Box>
  );
};

export default AlbumsList;
