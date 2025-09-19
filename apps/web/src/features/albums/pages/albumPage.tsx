import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import { useParams } from 'react-router-dom';

const VisitorAlbumPage: FC = () => {
  const { id } = useParams();

  return (
    <Stack spacing={3} component="section">
      <Box>
        <Typography variant="h3" gutterBottom>
          Album Preview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Album ID: {id ?? 'unknown'}
        </Typography>
      </Box>
      <Alert severity="info" variant="outlined">
        The public-facing album experience is coming soon. Creators can manage their album content under the <code>/my</code> workspace.
      </Alert>
    </Stack>
  );
};

export default VisitorAlbumPage;
