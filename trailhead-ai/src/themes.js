// Two complete token sets. Adding a third theme later means adding one
// more object here — nothing else in the app needs to change.

export const themes = {
  dark: {
    name: 'Forest',
    mode: 'dark',
    base: '#12160F',
    baseGradientTop: '#12160F',
    baseGradientBottom: '#12160F',
    panel: '#1C2118',
    panelRaised: '#23291F',
    line: '#2E3527',
    text: '#EDEAE0',
    muted: '#9BA391',
    mutedDim: '#6B7362',
    accent: '#4FA8E0',
    accentText: '#042C53',
    signal: '#D7A34E',
    success: '#6FAE7A',
  },
  light: {
    name: 'Blue Sky',
    mode: 'light',
    base: '#EAF4FC',
    baseGradientTop: '#DCEEFC',
    baseGradientBottom: '#F5FAFF',
    panel: '#FFFFFF',
    panelRaised: '#F0F7FD',
    line: '#D7E8F7',
    text: '#1B2733',
    muted: '#5D7285',
    mutedDim: '#8FA3B5',
    accent: '#2E8FDD',
    accentText: '#FFFFFF',
    signal: '#DB8A34',
    success: '#2E9E5B',
  },
};

export function tokensToCssVars(tokens) {
  return {
    '--base': tokens.base,
    '--panel': tokens.panel,
    '--panel-raised': tokens.panelRaised,
    '--line': tokens.line,
    '--text': tokens.text,
    '--muted': tokens.muted,
    '--muted-dim': tokens.mutedDim,
    '--accent': tokens.accent,
    '--accent-text': tokens.accentText,
    '--signal': tokens.signal,
    '--success': tokens.success,
  };
}
