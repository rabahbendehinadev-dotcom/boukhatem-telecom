/**
 * Brand colors for the BOUKHATEM TELECOM mobile app.
 * Synced from the sibling web artifact's index.css (HSL → hex).
 */

const colors = {
  light: {
    // Legacy aliases
    text: '#162035',
    tint: '#1a56db',

    // Core surfaces
    background: '#ffffff',
    foreground: '#162035',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#162035',

    // Primary: #1a56db (blue — HSL 221 79% 48%)
    primary: '#1a56db',
    primaryForeground: '#ffffff',

    // Secondary/Orange: #f97316 (HSL 25 95% 53%)
    secondary: '#f97316',
    secondaryForeground: '#ffffff',

    // Navy: #1e3a5f (HSL 214 52% 24%)
    navy: '#1e3a5f',
    navyForeground: '#ffffff',

    // Muted surfaces
    muted: '#f0f3f8',
    mutedForeground: '#6b7a92',

    // Accent highlights
    accent: '#f0f3f8',
    accentForeground: '#162035',

    // Destructive actions
    destructive: '#f03535',
    destructiveForeground: '#ffffff',

    // Warning
    warning: '#f59e0b',
    warningForeground: '#ffffff',

    // Borders and inputs
    border: '#dce3ee',
    input: '#c5d0de',
  },

  dark: {
    text: '#fafafa',
    tint: '#4b7ee8',

    background: '#0c1829',
    foreground: '#fafafa',

    card: '#111e2f',
    cardForeground: '#fafafa',

    primary: '#4b7ee8',
    primaryForeground: '#ffffff',

    secondary: '#f9893a',
    secondaryForeground: '#ffffff',

    navy: '#1e3a5f',
    navyForeground: '#ffffff',

    muted: '#1f3045',
    mutedForeground: '#93a5bc',

    accent: '#1f3045',
    accentForeground: '#fafafa',

    destructive: '#c0392b',
    destructiveForeground: '#fafafa',

    warning: '#f59e0b',
    warningForeground: '#ffffff',

    border: '#243650',
    input: '#243650',
  },

  // Border radius (px) — synced from web --radius: 0.5rem = 8px
  radius: 8,
};

export default colors;
