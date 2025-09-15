import type { FC, ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

export interface SessionInfo {
    readonly loggedIn: boolean;
    readonly sub?: string;
    readonly email?: string;
    readonly name?: string;
}

const SessionContext = createContext<SessionInfo | undefined>(undefined);

export const useSession = (): SessionInfo | undefined => {
    return useContext(SessionContext);
};

export const SessionProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<SessionInfo>({ loggedIn: false });

    useEffect(() => {
        fetch('/session', {
            credentials: 'include',
        })
            .then(async (res) => {
                if (res.ok) {
                    const data = await res.json();
                    setSession({
                        loggedIn: true,
                        sub: data.sub,
                        email: data.email,
                        name: data.name,
                    });
                } else {
                    setSession({ loggedIn: false });
                }
            })
            .catch(() => setSession({ loggedIn: false }));
    }, []);

    return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
};
