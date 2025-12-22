'use client';

import { createTheme, ThemeOptions } from '@mui/material/styles';

// Glass morphism component overrides for light mode
const getLightComponentOverrides = (): ThemeOptions['components'] => ({
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 16,
        border: '1px solid rgba(0, 0, 0, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          borderColor: 'rgba(59, 130, 246, 0.3)',
          boxShadow: '0 0 30px rgba(59, 130, 246, 0.15)',
        },
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        textTransform: 'none',
        fontWeight: 600,
      },
      contained: {
        boxShadow: '0 4px 14px rgba(59, 130, 246, 0.25)',
        '&:hover': {
          boxShadow: '0 6px 20px rgba(59, 130, 246, 0.35)',
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 600,
        backdropFilter: 'blur(8px)',
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRadius: '20px 0 0 20px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
      },
    },
  },
  MuiFab: {
    styleOverrides: {
      root: {
        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: '0 6px 25px rgba(59, 130, 246, 0.5)',
        },
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(8px)',
          borderRadius: 10,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
          },
          '&.Mui-focused': {
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
          },
        },
      },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: 12,
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
});

// Glass morphism component overrides for dark mode
const getDarkComponentOverrides = (): ThemeOptions['components'] => ({
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          borderColor: 'rgba(59, 130, 246, 0.5)',
          boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)',
        },
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        textTransform: 'none',
        fontWeight: 600,
      },
      contained: {
        boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
        '&:hover': {
          boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)',
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 600,
        backdropFilter: 'blur(8px)',
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRadius: '20px 0 0 20px',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
      },
    },
  },
  MuiFab: {
    styleOverrides: {
      root: {
        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: '0 6px 25px rgba(59, 130, 246, 0.5)',
        },
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
          backdropFilter: 'blur(8px)',
          borderRadius: 10,
          '&:hover': {
            backgroundColor: 'rgba(30, 41, 59, 0.7)',
          },
          '&.Mui-focused': {
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
          },
        },
      },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
});

// Light theme palette - adapted from magicpatterns
const lightPalette = {
  mode: 'light' as const,
  primary: {
    main: '#3b82f6', // Blue 500
    light: '#60a5fa', // Blue 400
    dark: '#2563eb', // Blue 600
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#8b5cf6', // Violet 500
    light: '#a78bfa', // Violet 400
    dark: '#7c3aed', // Violet 600
    contrastText: '#ffffff',
  },
  success: {
    main: '#10b981', // Emerald 500
    light: '#34d399', // Emerald 400
    dark: '#059669', // Emerald 600
  },
  warning: {
    main: '#f59e0b', // Amber 500
    light: '#fbbf24', // Amber 400
    dark: '#d97706', // Amber 600
  },
  error: {
    main: '#ef4444', // Red 500
    light: '#f87171', // Red 400
    dark: '#dc2626', // Red 600
  },
  info: {
    main: '#8b5cf6', // Violet 500 (AI accent)
    light: '#a78bfa',
    dark: '#7c3aed',
  },
  background: {
    default: '#f1f5f9', // Slate 100
    paper: '#ffffff',
  },
  text: {
    primary: '#0f172a', // Slate 900
    secondary: '#64748b', // Slate 500
  },
  divider: 'rgba(0, 0, 0, 0.08)',
};

// Dark theme palette - original magicpatterns colors
const darkPalette = {
  mode: 'dark' as const,
  primary: {
    main: '#3b82f6', // Blue 500
    light: '#60a5fa', // Blue 400
    dark: '#2563eb', // Blue 600
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#8b5cf6', // Violet 500
    light: '#a78bfa', // Violet 400
    dark: '#7c3aed', // Violet 600
    contrastText: '#ffffff',
  },
  success: {
    main: '#10b981', // Emerald 500
    light: '#34d399', // Emerald 400
    dark: '#059669', // Emerald 600
  },
  warning: {
    main: '#f59e0b', // Amber 500
    light: '#fbbf24', // Amber 400
    dark: '#d97706', // Amber 600
  },
  error: {
    main: '#ef4444', // Red 500
    light: '#f87171', // Red 400
    dark: '#dc2626', // Red 600
  },
  info: {
    main: '#8b5cf6', // Violet 500 (AI accent)
    light: '#a78bfa',
    dark: '#7c3aed',
  },
  background: {
    default: '#0f172a', // Slate 900
    paper: '#1e293b', // Slate 800
  },
  text: {
    primary: '#f8fafc', // Slate 50
    secondary: '#94a3b8', // Slate 400
  },
  divider: 'rgba(255, 255, 255, 0.08)',
};

// Typography configuration
const typography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 600,
  },
  h4: {
    fontSize: '1.25rem',
    fontWeight: 600,
  },
  h5: {
    fontSize: '1rem',
    fontWeight: 600,
  },
  h6: {
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  body1: {
    fontSize: '1rem',
  },
  body2: {
    fontSize: '0.875rem',
  },
  caption: {
    fontSize: '0.75rem',
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  },
};

// Create light theme
export const lightTheme = createTheme({
  palette: lightPalette,
  typography,
  components: getLightComponentOverrides(),
  shape: {
    borderRadius: 12,
  },
});

// Create dark theme
export const darkTheme = createTheme({
  palette: darkPalette,
  typography,
  components: getDarkComponentOverrides(),
  shape: {
    borderRadius: 12,
  },
});

// Default export for convenience
export const theme = darkTheme;
