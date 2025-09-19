import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
// ...existing imports
import type { AlbumDto } from '@ayeldo/types';
import type { FC } from 'react';
import AlbumCard from './AlbumCard';

interface Props {
    readonly albums?: readonly AlbumDto[] | undefined;
    readonly isLoading: boolean;
    readonly isError: boolean;
}

const AlbumsList: FC<Props> = ({ albums, isLoading, isError }) => {
    const isLoadingAlbums = isLoading;

    if (isLoadingAlbums) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (isError) {
        return <Alert severity="error">We could not load your albums. Please try again later.</Alert>;
    }

    const hasAlbums = (albums?.length ?? 0) > 0;

    if (!hasAlbums) {
        return (
            <Alert severity="info" variant="outlined">
                You do not have any albums yet. Use the form above to create your first one.
            </Alert>
        );
    }

    return (
        <Box display="grid" gap={3} sx={{ gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
            {albums?.map((album) => (
                <AlbumCard key={album.id} album={album} />
            ))}
        </Box>
    );
};

export default AlbumsList;
