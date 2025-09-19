import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';

interface AppBarComponentProps {
  readonly onMenuToggle: () => void;
}

const AppBarComponent: FC<AppBarComponentProps> = ({ onMenuToggle }) => {
  const { t, i18n } = useTranslation();
  const session = useSession();

  const navItems = [
    { label: t('nav.home'), to: session?.loggedIn ? '/my' : '/' },
    { label: t('nav.albumDemo'), to: '/tenants/t-1/albums/demo' },
    { label: t('nav.cart'), to: '/cart' },
  ] as const;

  return (
    <AppBar component="nav" position="fixed">
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuToggle}
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
          {(!session?.loggedIn) ? (
            <Button component={RouterLink} to="/auth/signin" sx={{ color: '#fff' }}>
              {t('app.signin')}
            </Button>
          ) : (
            <Button component={RouterLink} to="/auth/signout" sx={{ color: '#fff' }}>
              {t('app.signout')}
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
  );
};

export default AppBarComponent;
