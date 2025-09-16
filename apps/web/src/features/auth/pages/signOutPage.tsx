import {
  Box,
  Container,
  Typography
} from '@mui/material';
import type { FC } from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession, useSessionActions } from '../../../app/contexts/SessionContext';
import { useLogoutMutation } from '../../../services/api/bffApi';

const SignOutPage: FC = () => {
  const { t } = useTranslation();
  const session = useSession();
  const { refreshSession } = useSessionActions();
  const [logout, { isLoading, isSuccess, isError }] = useLogoutMutation();

  // Automatically perform sign out when component mounts
  useEffect(() => {
    const performLogout = async (): Promise<void> => {
      try {
        console.info('Initiating sign out process');
        await logout().unwrap();
        // Refresh session state to reflect sign out
        await refreshSession();
        // Small delay to ensure session is updated, then redirect
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Sign out failed', err);
        // Still refresh session and redirect even if logout API fails
        try {
          await refreshSession();
        } catch {
          // Ignore refresh errors
        }
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    };

    // Only attempt sign out if user is logged in or session is undefined (to be safe)
    if (session?.loggedIn !== false) {
      void performLogout();
    } else {
      // User is already signed out, redirect immediately
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    }
  }, [logout, session, refreshSession]);

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h2" sx={{ mb: 3 }}>
          {t('app.goodbye', 'Goodbye')}
        </Typography>

        {isLoading && (
          <Typography>Signing you out...</Typography>
        )}

        {isSuccess && (
          <Typography>You have been signed out. Redirecting...</Typography>
        )}

        {isError && (
          <Typography>Error during sign out. Redirecting...</Typography>
        )}

        {session?.loggedIn === false && (
          <Typography>You are signed out. Redirecting...</Typography>
        )}
      </Box>
    </Container>
  );
};

export default SignOutPage;
