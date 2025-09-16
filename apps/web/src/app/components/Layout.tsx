import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import type { FC, MouseEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, Link as RouterLink } from 'react-router-dom';
import { useSession } from '../../app/contexts/SessionContext';
import { useSiteConfiguration } from '../../app/SiteConfigurationContext';
import { getCsrfToken } from '../../services/csrf/getCsrfToken';

const drawerWidth = 240;

const Layout: FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const session = useSession();
  const site = useSiteConfiguration();

  const handleDrawerToggle = (): void => {
    setMobileOpen(!mobileOpen);
  };

  const doLogout = async (e?: MouseEvent<HTMLButtonElement>): Promise<void> => {
    e?.preventDefault();
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          [site.csrfHeaderName]: getCsrfToken() ?? '',
        },
      });
    } finally {
      // Hard reload to refresh session state and cookies
      globalThis.location?.reload();
    }
  };

  const navItems = [
    { label: t('nav.home'), to: '/' },
    { label: t('nav.albumDemo'), to: '/albums/demo' },
    { label: t('nav.cart'), to: '/cart' },
  ] as const;

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        {t('app.title')}
      </Typography>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.to} disablePadding>
            <ListItemButton component={RouterLink} to={item.to} sx={{ textAlign: 'left' }}>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        <Divider sx={{ my: 1 }} />
        {!session?.loggedIn ? (
          <ListItem disablePadding>
            <ListItemButton component={RouterLink} to="/login">
              <ListItemText primary={t('app.login')} />
            </ListItemButton>
          </ListItem>
        ) : (
          <ListItem disablePadding>
            <ListItemButton onClick={() => void doLogout()}>
              <ListItemText primary={t('app.logout')} />
            </ListItemButton>
          </ListItem>
        )}
        <ListItem>
          <Select
            size="small"
            value={i18n.resolvedLanguage || 'en'}
            onChange={(e) => void i18n.changeLanguage(String(e.target.value))}
            variant="outlined"
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="sv">Svenska</MenuItem>
          </Select>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar component="nav" position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
          >
            {t('app.title')}
          </Typography>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            {navItems.map((item) => (
              <Button key={item.to} component={RouterLink} to={item.to} sx={{ color: '#fff' }}>
                {item.label}
              </Button>
            ))}
            {!session?.loggedIn ? (
              <Button component={RouterLink} to="/login" sx={{ color: '#fff' }}>
                {t('app.login')}
              </Button>
            ) : (
              <Button onClick={(e) => void doLogout(e)} sx={{ color: '#fff' }}>
                {t('app.logout')}
              </Button>
            )}
            <Select
              size="small"
              value={i18n.resolvedLanguage || 'en'}
              onChange={(e) => void i18n.changeLanguage(String(e.target.value))}
              sx={{ ml: 1, color: 'inherit', borderColor: 'inherit' }}
            >
              <MenuItem value="en">EN</MenuItem>
              <MenuItem value="sv">SV</MenuItem>
            </Select>
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="nav">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
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
