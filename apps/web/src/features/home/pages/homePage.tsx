import { Typography } from '@mui/material';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

const HomePage: FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <Typography variant="h3" gutterBottom >{t('app.title')}</Typography>
      <Typography variant="body1">{t('app.welcome')}</Typography>
    </>
  );
};

export default HomePage;
