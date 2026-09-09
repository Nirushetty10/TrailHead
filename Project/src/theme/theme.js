import { createTheme } from '@mui/material/styles';

// Design tokens — grounded in the Western Ghats coffee-estate setting,
// deliberately avoiding the cream/terracotta "AI default" palette.
export const tokens = {
  espressoBark: '#2B1D14',
  deepForest: '#1F3327',
  mistySage: '#7C8B6F',
  marigold: '#D9A441',
  parchment: '#EDE8DE',
  rustPepper: '#A8492E',
  ivory: '#FBFAF6',
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: tokens.deepForest, contrastText: tokens.ivory },
    secondary: { main: tokens.marigold, contrastText: tokens.espressoBark },
    error: { main: tokens.rustPepper },
    background: { default: tokens.parchment, paper: tokens.ivory },
    text: { primary: tokens.espressoBark, secondary: '#5C4E3F' },
    divider: 'rgba(43, 29, 20, 0.14)',
  },
  typography: {
    fontFamily: '"Work Sans", sans-serif',
    h1: { fontFamily: '"Fraunces", serif', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.05 },
    h2: { fontFamily: '"Fraunces", serif', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.1 },
    h3: { fontFamily: '"Fraunces", serif', fontWeight: 600, lineHeight: 1.15 },
    h4: { fontFamily: '"Fraunces", serif', fontWeight: 500, lineHeight: 1.2 },
    h5: { fontFamily: '"Fraunces", serif', fontWeight: 500 },
    h6: { fontFamily: '"Fraunces", serif', fontWeight: 500 },
    subtitle1: { fontFamily: '"Work Sans", sans-serif', fontWeight: 500 },
    body1: { fontFamily: '"Work Sans", sans-serif', lineHeight: 1.65 },
    button: { fontFamily: '"Work Sans", sans-serif', fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 2, paddingInline: '22px', paddingBlock: '11px' },
        containedSecondary: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
    },
    MuiContainer: {
      styleOverrides: { root: { paddingLeft: '24px', paddingRight: '24px' } },
    },
  },
});

export default theme;
