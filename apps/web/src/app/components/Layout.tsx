import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import type { FC } from 'react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppBarComponent from './AppBarComponent';
import MobileDrawer from './MobileDrawer';

const Layout: FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = (): void => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBarComponent onMenuToggle={handleDrawerToggle} />
      <MobileDrawer isOpen={mobileOpen} onClose={handleDrawerToggle} />
      <Box component="main" sx={{ p: 2, width: '100%' }}>
        {/* Offset for fixed AppBar */}
        <Toolbar />
        <Container maxWidth="lg">
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
