import { Alert, Typography } from "@mui/material";
import type { PropsWithChildren } from "react";
import React, { useEffect, useState } from "react";
import { hasAuthParams, useAuth } from 'react-oidc-context';
import type { OidcSigninState } from "../../../@types/OidcSigninState";
import PageIsLoading from "../PageIsLoading";

// const targetUrlReplacements: Record<string, string> = {
//   '/signin': '/myaccount'
// }

/*
    This component ensures that the user is authenticated before rendering
    its child components. If the user is not authenticated, they are redirected
    to the sign-in page.
*/
const EnsureUserIsAuthenticated: React.FC<PropsWithChildren<unknown>> = ({ children }) => {

  const auth = useAuth();

  const [hasTriedSignin, setHasTriedSignin] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [needToRefreshToken, setNeedToRefreshToken] = useState(false)


  /**
   * Automatically refress token when needed
   */
  useEffect(() => {
    if (auth && needToRefreshToken && !isSigningIn) {
      const performSilentSignin = async (): Promise<void> => {
        console.info('Performing silent signin')
        setIsSigningIn(true)
        try {
          console.info('Refreshing token')
          await auth.signinSilent({

          });
        } finally {
          setIsSigningIn(false)
          setNeedToRefreshToken(false)
        }
        setHasTriedSignin(true);
      }

      performSilentSignin();
    }
  }, [auth, isSigningIn, needToRefreshToken])

  /**
   * Perform auto sign in.
   *
   * See {@link https://github.com/authts/react-oidc-context?tab=readme-ov-file#automatic-sign-in}
   */
  useEffect(() => {
    if (!(hasAuthParams() || auth.isAuthenticated || auth.activeNavigator || auth.isLoading || hasTriedSignin)) {
      const performSignin = async (): Promise<void> => {
        const signinState: OidcSigninState = {
          targetUrl: window.location.pathname
        }

        await auth.signinRedirect({
          state: signinState
        });

        setHasTriedSignin(true);
      }

      performSignin();
    }
  }, [auth, hasTriedSignin]);

  useEffect(() => {
    if (auth?.user?.expired) {
      setNeedToRefreshToken(true)
    }
  }, [auth, auth?.user?.expired])

  if (auth.error) {
    return <Alert variant="filled">{auth.error?.message}</Alert>
  }

  if (auth.isLoading) {
    return <>
      <Typography align='center' variant={'h4'}>Loggar in...</Typography>
      <Typography align='center' variant={'body1'}>
        <PageIsLoading />
      </Typography>
    </>
  }

  if (auth.isAuthenticated) {
    return <>{children}</>
  }

  return <Typography align='center' variant={'h4'}><PageIsLoading /></Typography>
}

export default EnsureUserIsAuthenticated;
