import type { FC } from 'react';
import { Route, Routes } from 'react-router-dom';
import AlbumPage from '../features/albums/pages/albumPage';
import LoginPage from '../features/auth/pages/loginPage';
import CartPage from '../features/cart/pages/cartPage';
import CheckoutResultPage from '../features/checkout/pages/resultPage';
import HomePage from '../features/home/pages/homePage';
import Layout from './components/Layout';

const AppRoutes: FC = () => {

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/albums/:id" element={<AlbumPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout/result" element={<CheckoutResultPage />} />
        </Route>
      </Routes>
    </>
  );

}


export default AppRoutes;
