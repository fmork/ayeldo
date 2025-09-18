import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import type { FC } from 'react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useFrontendConfiguration } from '../FrontendConfigurationContext';
import AppBarComponent from './app-navigation/appBarComponent';
import MobileDrawer from './app-navigation/mobileDrawer';

const Layout: FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const frontendConfig = useFrontendConfiguration();

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
        {/* Deployment time comment */}
        {frontendConfig.deploymentTime && (
          <div
            dangerouslySetInnerHTML={{
              __html: `<!-- Deployed: ${frontendConfig.deploymentTime.toISOString()} -->`
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default Layout;
