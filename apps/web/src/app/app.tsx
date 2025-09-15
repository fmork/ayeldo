import type { FC } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';
import { SiteConfigurationContext, siteConfig } from './SiteConfigurationContext';
import { store } from './store';

const App: FC = () => {

  return (
    <>
      <SiteConfigurationContext.Provider value={siteConfig}>
        <Provider store={store}>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </Provider>
      </SiteConfigurationContext.Provider>
    </>
  );

}


export default App;
