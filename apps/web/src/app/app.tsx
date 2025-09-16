import type { FC } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from './contexts/SessionContext';
import './i18n';
import AppRoutes from './routes';
import { SiteConfigurationContext, siteConfig } from './SiteConfigurationContext';
import { store } from './store';
import { AppThemeProvider } from './theme/AppThemeProvider';

const App: FC = () => {

  return (
    <>
      <SiteConfigurationContext.Provider value={siteConfig}>
        <AppThemeProvider>
          <SessionProvider>
            <Provider store={store}>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </Provider>
          </SessionProvider>
        </AppThemeProvider>
      </SiteConfigurationContext.Provider>
    </>
  );

}


export default App;
