import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
// ...existing imports
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
// ...existing imports

const drawerWidth = 240;

interface MobileDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const MobileDrawer: FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  // session not needed here anymore; auth handled in UserPanel

  const navItems = [
    { label: t('nav.home'), to: '/' },
    { label: t('nav.albumDemo'), to: '/tenants/t-1/albums/demo' },
    { label: t('nav.cart'), to: '/cart' },
  ] as const;

  const drawerContent = (
    <Box onClick={onClose} sx={{ textAlign: 'center' }}>
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
        {/* Auth actions moved to app bar user panel */}
        {/* Language selection moved into UserPanel menu */}
      </List>
    </Box>
  );

  return (
    <Box component="nav">
      <Drawer
        variant="temporary"
        open={isOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default MobileDrawer;
