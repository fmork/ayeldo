import { Typography } from '@mui/material';
import type { FC, ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';
import PageIsLoading from '../PageIsLoading';

/*
  Route-compatible protected route component.
  Usage in routes.tsx:
    <EnsureUserIsAuthenticated path="/admin" element={<AdminPage />}>
      <Route path="tenants" element={<TenantsPage />} />
    </EnsureUserIsAuthenticated>

  The component will redirect to /login if the user is not authenticated.
  The component will redirect to /auth/signin if the user is not authenticated.
*/

interface AuthElementProps { element?: ReactNode; children?: ReactNode }

const EnsureUserIsAuthenticated: FC<AuthElementProps> = ({ element, children }) => {
  const session = useSession();

  console.info('RequireAuthentication: session', JSON.stringify(session));

  if (!session) {
    // While session is loading
    return <Typography align="center" variant={'h4'}><PageIsLoading /></Typography>;
  }

  if (!session.loggedIn) {
    const location = useLocation();
    const returnTo = `${location.pathname}${location.search || ''}`;
    return <Navigate to={`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  // Authenticated: render explicit element, children, or nested Outlet
  return (element as ReactNode) ?? (children as ReactNode) ?? <Outlet />;
};

export default EnsureUserIsAuthenticated;
