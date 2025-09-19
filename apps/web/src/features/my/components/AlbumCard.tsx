import type { AlbumDto } from '@ayeldo/types';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface Props {
    readonly album: AlbumDto;
}

const AlbumCard: FC<Props> = ({ album }) => {
    return (
        <Card variant="outlined">
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
                    <Button component={RouterLink} to={`/my/albums/${album.id}`} size="small" variant="text">
                        Open album
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default AlbumCard;
