import { createTheme } from '@mui/material/styles';
import { themes } from './themes.js';

export function buildTheme(themeName) {
  const t = themes[themeName];

  return createTheme({
    palette: {
      mode: t.mode,
      background: {
        default: t.base,
        paper: t.panel,
      },
      primary: {
        main: t.accent,
        contrastText: t.accentText,
      },
      warning: {
        main: t.signal,
      },
      text: {
        primary: t.text,
        secondary: t.muted,
      },
      divider: t.line,
    },
    typography: {
      fontFamily: "'Inter', sans-serif",
      h1: { fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700 },
      h2: { fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700 },
      h3: { fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 500 },
    },
    shape: {
      borderRadius: 10,
    },
  });
}
