import { Box, Container, Typography } from '@mui/material';
import type { FC } from 'react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageIsLoading from '../../../app/components/PageIsLoading';
import { useSessionActions } from '../../../app/contexts/SessionContext';

const SignedInLandingPage: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshSession } = useSessionActions();

  useEffect(() => {
    let mounted = true;

    const waitForSession = async (): Promise<void> => {
      // Try refreshing the session a few times in case the cookie was just set
      const maxAttempts = 6;
      const delayMs = 500;

      const urlParams = new URLSearchParams(location.search);
      const returnTo = urlParams.get('returnTo') ?? '/';

      for (let i = 0; i < maxAttempts && mounted; i += 1) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await refreshSession();
        } catch {
          // ignore and retry
        }

        // We don't call hooks inside the loop; we rely on refreshSession to update
        // the provider. Continue retrying until maxAttempts.

        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, delayMs));
      }

      // After attempting to refresh session a few times, navigate to returnTo.
      // The SessionProvider will have refreshed and updated session state.
      navigate(returnTo, { replace: true });
    };

    void waitForSession();

    return () => {
      mounted = false;
    };
  }, [location.search, navigate, refreshSession]);

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          Finalizing sign-in
        </Typography>
        <PageIsLoading />
        <Typography sx={{ mt: 2 }}>
          Please wait while we complete sign-in and take you to your destination.
        </Typography>
      </Box>
    </Container>
  );
};

export default SignedInLandingPage;
