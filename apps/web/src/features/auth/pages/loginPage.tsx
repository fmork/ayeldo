import { useLazyGetAuthorizeUrlQuery } from '../../../services/api/bffApi';

export function LoginPage(): JSX.Element {
  const [trigger, { isFetching }] = useLazyGetAuthorizeUrlQuery();

  const onLogin = async (): Promise<void> => {
    try {
      const result = await trigger().unwrap();
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
    <section>
      <h2>Login</h2>
      <button onClick={() => void onLogin()} disabled={isFetching}>
        {isFetching ? 'Redirecting…' : 'Click here to sign in'}
      </button>
    </section>
  );
}
