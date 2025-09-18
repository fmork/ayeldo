import type { Uuid } from '@ayeldo/types';
import type { FC, ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLazyGetSessionQuery } from '../../services/api/backendApi';

export type SessionInfo =
  | { readonly loggedIn: false }
  | {
      readonly loggedIn: true;
      readonly sub: string;
      readonly user: {
        readonly id: Uuid;
        readonly email: string;
        readonly fullName: string;
      };
      readonly tenantIds?: readonly string[]; // empty array if user hasn't completed onboarding
    };

export interface SessionContextType {
  readonly session: SessionInfo | undefined;
  readonly refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = (): SessionInfo | undefined => {
  return useContext(SessionContext)?.session;
};

export const useSessionActions = (): { refreshSession: () => Promise<void> } => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionActions must be used within SessionProvider');
  }
  return { refreshSession: context.refreshSession };
};

export const SessionProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<SessionInfo>({ loggedIn: false });
  const [triggerGetSession] = useLazyGetSessionQuery();

  const fetchSession = useCallback(async (): Promise<void> => {
    try {
      const result = await triggerGetSession().unwrap();
      if (result.loggedIn) {
        const tenantIds: readonly string[] = [...(result.tenantIds ?? [])];
        const sessionInfo: SessionInfo = {
          loggedIn: true,
          sub: result.sub,
          user: {
            id: result.user.id,
            email: result.user.email,
            fullName: result.user.fullName,
          },
          tenantIds,
        };
        setSession(sessionInfo);
      } else {
        setSession({ loggedIn: false });
      }
    } catch {
      setSession({ loggedIn: false });
    }
  }, [triggerGetSession]);

  // Initial session fetch
  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  useEffect(() => {

    console.info('Session updated:', session);

  }, [session]);

  // Refresh session when the window gains focus (useful after OIDC redirect)
  useEffect(() => {
    const handleFocus = (): void => {
      void fetchSession();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchSession]);

  // Refresh session when user returns to the tab (useful after OIDC redirect)
  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (!document.hidden) {
        void fetchSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchSession]);

  const contextValue: SessionContextType = {
    session,
    refreshSession: fetchSession,
  };

  return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>;
};
