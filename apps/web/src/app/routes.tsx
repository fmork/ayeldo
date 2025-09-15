import type { FC } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import AlbumPage from '../features/albums/pages/albumPage';
import LoginPage from '../features/auth/pages/loginPage';
import CartPage from '../features/cart/pages/cartPage';
import CheckoutResultPage from '../features/checkout/pages/resultPage';

const Home: FC = () => {

  return (
    <>
      <div>
        <h1>Ayeldo Web</h1>
        <nav>
          <ul>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/albums/demo">Album Demo</Link></li>
            <li><Link to="/cart">Cart</Link></li>
          </ul>
        </nav>
      </div>
    </>
  );

}

const AppRoutes: FC = () => {

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/albums/:id" element={<AlbumPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout/result" element={<CheckoutResultPage />} />
      </Routes>
    </>
  );

}


export default AppRoutes;
