import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';

interface ComingSoonMessageProps {
  readonly title: string;
  readonly description: string;
}

const ComingSoonMessage: FC<ComingSoonMessageProps> = ({ title, description }) => {
  return (
    <Stack spacing={2}>
      <Typography variant="h4">{title}</Typography>
      <Typography variant="body1" color="text.secondary">{description}</Typography>
      <Typography variant="body2" color="text.secondary">
        We are designing this workspace. Check back soon for the full experience.
      </Typography>
    </Stack>
  );
};

export default ComingSoonMessage;
