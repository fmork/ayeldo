import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useSiteConfiguration } from '../../../app/SiteConfigurationContext';
import { useLazyGetAuthorizeUrlQuery } from '../../../services/api/bffApi';

const LoginPage: FC = () => {
  const [trigger, { isFetching }] = useLazyGetAuthorizeUrlQuery();
  const { t, i18n } = useTranslation();
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
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{t('app.welcome')}</h2>
          <div>
            <label htmlFor="lang">Language: </label>
            <select
              id="lang"
              onChange={(e) => void i18n.changeLanguage(String(e.target.value))}
              value={i18n.resolvedLanguage || 'en'}
            >
              <option value="en">English</option>
              <option value="sv">Svenska</option>
            </select>
          </div>
        </header>
        <button onClick={() => void onLogin()} disabled={isFetching}>
          {isFetching ? 'Redirecting…' : t('app.login')}
        </button>
      </section>
    </>
  );

}


export default LoginPage;
