import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import type { FC } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

interface NavigationItem {
  readonly label: string;
  readonly path: string;
}

const navigationItems: readonly NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/my/dashboard',
  },
  {
    label: 'Albums',
    path: '/my/albums',
  },
  {
    label: 'Orders',
    path: '/my/orders',
  },
  {
    label: 'Analytics',
    path: '/my/analytics',
  },
  {
    label: 'Settings',
    path: '/my/settings',
  },
];

const MyLayout: FC = () => {
  const location = useLocation();

  const selectedPath = navigationItems.find((item) => location.pathname.startsWith(item.path))?.path
    ?? navigationItems[0].path;

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Tabs
        value={selectedPath}
        indicatorColor="primary"
        textColor="primary"
        aria-label="Creator navigation"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {navigationItems.map((item) => (
          <Tab
            key={item.path}
            label={item.label}
            value={item.path}
            component={Link}
            to={item.path}
          />
        ))}
      </Tabs>
      <Outlet />
    </Box>
  );
};

export default MyLayout;
