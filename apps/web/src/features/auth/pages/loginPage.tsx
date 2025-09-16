import {
  Box,
  Button,
  Container,
  Typography
} from '@mui/material';
import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../../app/contexts/SessionContext';
import { useSiteConfiguration } from '../../../app/SiteConfigurationContext';
import { useLazyGetAuthorizeUrlQuery } from '../../../services/api/bffApi';

const LoginPage: FC = () => {
  const [trigger, { isFetching, isLoading }] = useLazyGetAuthorizeUrlQuery();
  const { t } = useTranslation();
  const { webOrigin } = useSiteConfiguration();
  const navigate = useNavigate();
  const session = useSession();
  const hasAttemptedLogin = useRef(false);

  // Redirect to root if already authenticated
  useEffect(() => {
    if (session?.loggedIn) {
      navigate('/');
    }
  }, [session, navigate]);

  // Automatically initiate authentication flow if not authenticated (only once)
  useEffect(() => {
    // Check if we might be returning from OIDC (has code/state params)
    const urlParams = new URLSearchParams(window.location.search);
    const hasOidcParams = urlParams.has('code') || urlParams.has('state') || urlParams.has('error');

    if (session && !session.loggedIn && !isFetching && !hasAttemptedLogin.current && !hasOidcParams) {
      hasAttemptedLogin.current = true;

      const initiateLogin = async (): Promise<void> => {
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
          // Reset the flag so user can try again
          hasAttemptedLogin.current = false;
        }
      };

      void initiateLogin();
    }
  }, [session, isFetching, webOrigin]); // Removed 'trigger' from dependencies

  const onLogin = async (): Promise<void> => {
    if (hasAttemptedLogin.current) {
      return; // Prevent double-clicking
    }

    hasAttemptedLogin.current = true;

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
      // Reset the flag so user can try again
      hasAttemptedLogin.current = false;
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h2">
            {t('app.login')}
          </Typography>
        </Box>

        {/* Show different states based on session and loading */}
        {session === undefined ? (
          <Typography>Loading session...</Typography>
        ) : session.loggedIn ? (
          <Typography>You are already logged in. Redirecting...</Typography>
        ) : isFetching ? (
          <Typography>Starting authentication...</Typography>
        ) : (
          <>
            <Typography sx={{ mb: 2 }}>
              {t("signin.you_will_be_redirected_to_signin")}
            </Typography>
            {
              (!isFetching && !isLoading) ? (
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
              ) : (<></>)
            }

          </>
        )}
      </Box>
    </Container>
  );

}


export default LoginPage;
