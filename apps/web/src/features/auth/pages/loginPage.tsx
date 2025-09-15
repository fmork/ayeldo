import type { FC } from 'react';
import { useSiteConfiguration } from '../../../app/SiteConfigurationContext';
import { useLazyGetAuthorizeUrlQuery } from '../../../services/api/bffApi';

const LoginPage: FC = () => {
  const [trigger, { isFetching }] = useLazyGetAuthorizeUrlQuery();
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
    <>
      <section>
        <h2>Login</h2>
        <button onClick={() => void onLogin()} disabled={isFetching}>
          {isFetching ? 'Redirecting…' : 'Click here to sign in'}
        </button>
      </section>
    </>
  );

}


export default LoginPage;
