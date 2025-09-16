import { CssBaseline, ThemeProvider } from '@mui/material';
import type { FC, ReactNode } from 'react';
import { createAppTheme, type TenantThemeOptions } from './createAppTheme';

export const AppThemeProvider: FC<{ children: ReactNode; options?: TenantThemeOptions }> = ({ children, options }) => {
    const theme = createAppTheme(options);
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
};
