import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
// ...existing imports
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';
import UserPanel from './UserPanel';

interface AppBarComponentProps {
  readonly onMenuToggle: () => void;
}

const AppBarComponent: FC<AppBarComponentProps> = ({ onMenuToggle }) => {
  const { t } = useTranslation();
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

        {/* Navigation buttons (visible on sm and up) */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1, flexWrap: 'nowrap' }}>
          {navItems.map((item) => (
            <Button key={item.to} component={RouterLink} to={item.to} sx={{ color: '#fff' }}>
              {item.label}
            </Button>
          ))}
        </Box>

        {/* Controls: language selector and user panel - visible on all sizes and aligned to the right */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UserPanel />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppBarComponent;
