import type { Theme } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

export interface TenantThemeOptions {
  readonly palette?: {
    readonly primary?: { main: string };
    readonly secondary?: { main: string };
    readonly background?: { default?: string; paper?: string };
  };
  readonly typography?: {
    readonly fontFamily?: string;
  };
}

export function createAppTheme(opts?: TenantThemeOptions): Theme {
  const theme = createTheme({
    palette: {
      mode: 'light',
      primary: { main: opts?.palette?.primary?.main ?? '#1976d2' },
      secondary: { main: opts?.palette?.secondary?.main ?? '#9c27b0' },
      background: {
        default: opts?.palette?.background?.default ?? '#fafafa',
        paper: opts?.palette?.background?.paper ?? '#ffffff',
      },
    },
    typography: {
      fontFamily: opts?.typography?.fontFamily ?? 'Roboto, Helvetica, Arial, sans-serif',
    },
    shape: { borderRadius: 8 },
  });
  return theme;
}
