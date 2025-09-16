import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';

const PageIsLoading: FC<unknown> = () => {
  return <Typography align='center' variant={'h2'}><CircularProgress /></Typography>
}

export default PageIsLoading
