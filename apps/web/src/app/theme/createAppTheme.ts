import type { Theme } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

// Default color palette variables for maximum reusability

interface ColorDefinition {
  R: number;
  G: number;
  B: number;
}

const colorDefinitions: Record<string, ColorDefinition> = {
  black: { R: 0, G: 0, B: 0 },
  white: { R: 255, G: 255, B: 255 },

  text: {
    R: 0,
    G: 0,
    B: 0,
  },
  contrastText: {
    R: 255,
    G: 255,
    B: 255,
  },
  primary: {
    R: 57,
    G: 97,
    B: 117,
  },
  secondary: {
    R: 160,
    G: 135,
    B: 105,
  },
  backgroundDefault: {
    R: 250,
    G: 250,
    B: 250,
  },
  backgroundPaper: {
    R: 255,
    G: 255,
    B: 255,
  },
  divider: {
    R: 0,
    G: 0,
    B: 0,
  },
};

export const defaultColors = {
  primary: {
    main: `rgba(${colorDefinitions['primary'].R}, ${colorDefinitions['primary'].G}, ${colorDefinitions['primary'].B}, 1)`,
    contrastText: `rgba(${colorDefinitions['contrastText'].R}, ${colorDefinitions['contrastText'].G}, ${colorDefinitions['contrastText'].B}, 1)`,
  },
  secondary: {
    main: `rgba(${colorDefinitions['secondary'].R}, ${colorDefinitions['secondary'].G}, ${colorDefinitions['secondary'].B}, 1)`,
    contrastText: `rgba(${colorDefinitions['contrastText'].R}, ${colorDefinitions['contrastText'].G}, ${colorDefinitions['contrastText'].B}, 1)`,
  },
  background: {
    default: `rgba(${colorDefinitions['backgroundDefault'].R}, ${colorDefinitions['backgroundDefault'].G}, ${colorDefinitions['backgroundDefault'].B}, 1)`,
    paper: `rgba(${colorDefinitions['backgroundPaper'].R}, ${colorDefinitions['backgroundPaper'].G}, ${colorDefinitions['backgroundPaper'].B}, 1)`,
  },
  text: {
    primary: `rgba(${colorDefinitions['text'].R}, ${colorDefinitions['text'].G}, ${colorDefinitions['text'].B}, 0.87)`,
    secondary: `rgba(${colorDefinitions['text'].R}, ${colorDefinitions['text'].G}, ${colorDefinitions['text'].B}, 0.6)`,
    disabled: `rgba(${colorDefinitions['text'].R}, ${colorDefinitions['text'].G}, ${colorDefinitions['text'].B}, 0.38)`,
  },
  divider: `rgba(${colorDefinitions['divider'].R}, ${colorDefinitions['divider'].G}, ${colorDefinitions['divider'].B}, 0.12)`,
} as const;

// Default typography variables
export const defaultTypography = {
  fontFamily: [
    'Alegreya sans',
    'Segoe UI',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
    'sans-serif',
  ].join(','),
  fontSize: 14,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
} as const;

// Default shape variables
export const defaultShape = {
  borderRadius: 8,
} as const;

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
      primary: { main: opts?.palette?.primary?.main ?? defaultColors.primary.main },
      secondary: { main: opts?.palette?.secondary?.main ?? defaultColors.secondary.main },
      background: {
        default: opts?.palette?.background?.default ?? defaultColors.background.default,
        paper: opts?.palette?.background?.paper ?? defaultColors.background.paper,
      },
    },
    typography: {
      fontFamily: opts?.typography?.fontFamily ?? defaultTypography.fontFamily,
    },
    shape: { borderRadius: defaultShape.borderRadius },
  });
  return theme;
}
