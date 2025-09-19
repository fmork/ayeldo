import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';

import type { SelectChangeEvent } from '@mui/material/Select';

const initialsForName = (name?: string): string => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const UserPanel: FC = () => {
    const session = useSession();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const { i18n, t } = useTranslation();

    const handleOpen = (e: React.MouseEvent<HTMLElement>): void => setAnchorEl(e.currentTarget);
    const handleClose = (): void => setAnchorEl(null);

    const handleLangChange = (e: SelectChangeEvent<string>): void => {
        void i18n.changeLanguage(String(e.target.value));
    };

    if (!session) return null;

    return (
        <Box sx={{ ml: 1, display: 'flex', alignItems: 'center' }}>
            {session.loggedIn ? (
                <Button
                    onClick={handleOpen}
                    sx={{ color: 'inherit', textTransform: 'none' }}
                    startIcon={<Avatar sx={{ width: 32, height: 32 }}>{initialsForName(session.user.fullName)}</Avatar>}
                />
            ) : (
                <Button onClick={handleOpen} sx={{ color: 'inherit' }} startIcon={<Avatar sx={{ width: 32, height: 32 }}><AccountCircleIcon /></Avatar>} />
            )}

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Box sx={{ px: 2, py: 1, maxWidth: 320 }}>
                    {session.loggedIn ? (
                        <>
                            <Typography variant="subtitle1">{session.user.fullName}</Typography>
                            <Typography variant="body2" color="text.secondary">{session.user.email}</Typography>
                            <Box sx={{ mt: 1 }}>
                                <MenuItem component={RouterLink} to="/auth/signout" onClick={handleClose}>Sign out</MenuItem>
                            </Box>
                        </>
                    ) : (
                        <MenuItem component={RouterLink} to="/auth/signin" onClick={handleClose}>Sign in</MenuItem>
                    )}

                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">{t('app.language')}</Typography>
                        <Select size="small" value={i18n.resolvedLanguage || 'en'} onChange={handleLangChange}>
                            <MenuItem value="en">English</MenuItem>
                            <MenuItem value="sv">Svenska</MenuItem>
                        </Select>
                    </Box>
                </Box>
            </Menu>
        </Box>
    );
};

export default UserPanel;
