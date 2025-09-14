import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { SiteConfigurationContext, siteConfig } from './SiteConfigurationContext';
import { store } from './store';

export function App(): JSX.Element {
  return (
    <SiteConfigurationContext.Provider value={siteConfig}>
      <Provider store={store}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </Provider>
    </SiteConfigurationContext.Provider>
  );
}
