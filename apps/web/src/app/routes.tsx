import type { FC } from 'react';
import { Route, Routes } from 'react-router-dom';
import AdminPage from '../features/admin/pages/adminPage';
import TenantsPage from '../features/admin/pages/tenantsPage';
import AlbumPage from '../features/albums/pages/albumPage';
import LoginPage from '../features/auth/pages/loginPage';
import LogoutPage from '../features/auth/pages/logoutPage';
import SignedInLandingPage from '../features/auth/pages/signedInLandingPage';
import CartPage from '../features/cart/pages/cartPage';
import CheckoutResultPage from '../features/checkout/pages/resultPage';
import HomePage from '../features/home/pages/homePage';
import Layout from './components/Layout';
import ThemeShowcase from './components/ThemeShowcase';
import EnsureUserIsAuthenticated from './components/authentication/RequireAuthentication';

const AppRoutes: FC = () => {

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/signedin" element={<SignedInLandingPage />} />
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/albums/:id" element={<AlbumPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout/result" element={<CheckoutResultPage />} />
          <Route path="/theme-showcase" element={<ThemeShowcase />} />
          <Route path="/admin" element={<EnsureUserIsAuthenticated element={<AdminPage />} />}>
            <Route path="tenants" element={<TenantsPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );

}


export default AppRoutes;
