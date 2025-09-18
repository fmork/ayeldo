import { Box, Container, Typography } from '@mui/material';
import type { FC } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageIsLoading from '../../../app/components/PageIsLoading';
import type { SessionInfo } from '../../../app/contexts/SessionContext';
import { useSession, useSessionActions } from '../../../app/contexts/SessionContext';

const SignedInLandingPage: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshSession } = useSessionActions();
  const session = useSession();
  const sessionRef = useRef<SessionInfo | undefined>(session);
  const hasNavigatedRef = useRef<boolean>(false);
  const returnTo = useMemo<string>(() => {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get('returnTo') ?? '/';
  }, [location.search]);

  console.info('SignedInLandingPage mounted, current session:', session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    const maxAttempts = 6;
    const delayMs = 500;

    const refreshUntilReady = async (): Promise<void> => {
      for (let attempt = 0; attempt < maxAttempts && !cancelled; attempt += 1) {
        try {
          await refreshSession();
          console.info(`Session refreshed (attempt ${attempt + 1})`, sessionRef.current);
        } catch (error: unknown) {
          void error;
        }

        if (sessionRef.current?.loggedIn) {
          console.info('Session is logged in:', sessionRef.current);
          return;
        }

        await new Promise<void>((resolve) => {
          setTimeout(resolve, delayMs);
        });
      }
    };

    void refreshUntilReady();

    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!session?.loggedIn || hasNavigatedRef.current) {
      return;
    }

    hasNavigatedRef.current = true;

    const tenantCount = session.tenantIds?.length ?? 0;
    if (tenantCount === 0) {
      console.info('No tenant association found, redirecting to onboarding');
      setTimeout(() => navigate('/auth/onboard', { replace: true }), 1000);
      return;
    }

    console.info(`Session is ready with ${tenantCount} tenant(s), redirecting to ${returnTo}`);
    setTimeout(() => navigate(returnTo, { replace: true }), 1000);
  }, [navigate, returnTo, session]);

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
