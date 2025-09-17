import type { FC } from 'react';
import { Route, Routes } from 'react-router-dom';
import AdminPage from '../features/admin/pages/adminPage';
import TenantsPage from '../features/admin/pages/tenantsPage';
import AlbumPage from '../features/albums/pages/albumPage';
import OnboardPage from '../features/auth/pages/OnboardPage';
import SignInPage from '../features/auth/pages/signInPage';
import SignOutPage from '../features/auth/pages/signOutPage';
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
          <Route path="/auth/signin" element={<SignInPage />} />
          <Route path="/auth/onboard" element={<OnboardPage />} />
          <Route path="/auth/signedin" element={<SignedInLandingPage />} />
          <Route path="/auth/signout" element={<SignOutPage />} />
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
