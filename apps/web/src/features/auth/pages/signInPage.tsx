import {
  Box,
  Button,
  Container,
  Typography
} from '@mui/material';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../../../app/contexts/SessionContext';
import { useSiteConfiguration } from '../../../app/SiteConfigurationContext';
import { useLazyGetAuthorizeUrlQuery } from '../../../services/api/bffApi';

const SignInPage: FC = () => {
  const [trigger, { isFetching, isLoading }] = useLazyGetAuthorizeUrlQuery();
  const { t } = useTranslation();
  const { webOrigin } = useSiteConfiguration();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const hasAttemptedLogin = useRef(false);
  const [showButton, setShowButton] = useState(false);

  // Delay showing the sign-in button to avoid accidental clicks
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 5000);
    return () => clearTimeout(timer);
  }, []);

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
          const urlParams = new URLSearchParams(location.search);
          const returnTo = urlParams.get('returnTo') ?? undefined;
          const signedInPath = returnTo ? `/auth/signedin?returnTo=${encodeURIComponent(returnTo)}` : '/auth/signedin';
          const redirect = `${webOrigin.replace(/\/$/, '')}${signedInPath}`;
          const result = await trigger({ redirect }).unwrap();
          const g = globalThis as unknown as { location?: { assign?: (u: string) => void } };
          g.location?.assign?.(result.url);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Sign-in initiation failed', err);
          const a = globalThis as unknown as { alert?: (m: string) => void };
          a.alert?.('Unable to start sign in. Please try again.');
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
      const urlParams = new URLSearchParams(location.search);
      const returnTo = urlParams.get('returnTo') ?? undefined;
      const signedInPath = returnTo ? `/auth/signedin?returnTo=${encodeURIComponent(returnTo)}` : '/auth/signedin';
      const redirect = `${webOrigin.replace(/\/$/, '')}${signedInPath}`;
      const result = await trigger({ redirect }).unwrap();
      const g = globalThis as unknown as { location?: { assign?: (u: string) => void } };
      g.location?.assign?.(result.url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Sign-in initiation failed', err);
      const a = globalThis as unknown as { alert?: (m: string) => void };
      a.alert?.('Unable to start sign in. Please try again.');
      // Reset the flag so user can try again
      hasAttemptedLogin.current = false;
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h2">
            {t('app.signin')}
          </Typography>
        </Box>

        {/* Show different states based on session and loading */}
        {session === undefined ? (
          <Typography>Loading session...</Typography>
        ) : session.loggedIn ? (
          <Typography>You are already signed in. Redirecting...</Typography>
        ) : isFetching ? (
          <Typography>Starting authentication...</Typography>
        ) : (
          <>
            <Typography sx={{ mb: 2 }}>
              {t("signin.you_will_be_redirected_to_signin")}
            </Typography>

            {(!isFetching && !isLoading) ? (
              showButton ? (
                <>
                  <Typography sx={{ mb: 1 }}>Click the button below to sign in.</Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={() => void onLogin()}
                    disabled={isFetching}
                    sx={{ mt: 2 }}
                  >
                    {isFetching ? 'Redirecting…' : t('app.signin')}
                  </Button>
                </>
              ) : (
                <Typography sx={{ mb: 2 }}>Please wait a moment…</Typography>
              )
            ) : (<></>)}
          </>
        )}
      </Box>
    </Container>
  );

}


export default SignInPage;
