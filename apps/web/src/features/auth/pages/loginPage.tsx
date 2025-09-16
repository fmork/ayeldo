import {
  Box,
  Button,
  Container,
  Typography
} from '@mui/material';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useSiteConfiguration } from '../../../app/SiteConfigurationContext';
import { useLazyGetAuthorizeUrlQuery } from '../../../services/api/bffApi';

const LoginPage: FC = () => {
  const [trigger, { isFetching }] = useLazyGetAuthorizeUrlQuery();
  const { t } = useTranslation();
  const { webOrigin } = useSiteConfiguration();

  const onLogin = async (): Promise<void> => {
    try {
      // Hardcode redirect to web app root using centralized site configuration
      const redirect = webOrigin;
      const result = await trigger({ redirect }).unwrap();
      const g = globalThis as unknown as { location?: { assign?: (u: string) => void } };
      g.location?.assign?.(result.url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Login initiation failed', err);
      const a = globalThis as unknown as { alert?: (m: string) => void };
      a.alert?.('Unable to start login. Please try again.');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h2">
            {t('app.welcome')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => void onLogin()}
          disabled={isFetching}
          sx={{ mt: 2 }}
        >
          {isFetching ? 'Redirecting…' : t('app.login')}
        </Button>
      </Box>
    </Container>
  );

}


export default LoginPage;
