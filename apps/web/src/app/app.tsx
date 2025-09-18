import type { FC } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from './contexts/SessionContext';
import { FrontendConfigurationContext, frontendConfig } from './FrontendConfigurationContext';
import './i18n';
import AppRoutes from './routes';
import { store } from './store';
import { AppThemeProvider } from './theme/AppThemeProvider';
import { UploadQueueProvider } from './contexts/UploadQueueContext';

const App: FC = () => {

  return (
    <>
      <FrontendConfigurationContext.Provider value={frontendConfig}>
        <AppThemeProvider>
          <Provider store={store}>
            <SessionProvider>
              <UploadQueueProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </UploadQueueProvider>
            </SessionProvider>
          </Provider>
        </AppThemeProvider>
      </FrontendConfigurationContext.Provider>
    </>
  );

}


export default App;
