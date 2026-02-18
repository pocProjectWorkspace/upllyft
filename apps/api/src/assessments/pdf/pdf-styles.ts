// ── A4 Page Dimensions (points: 1pt = 1/72 inch) ──────────────────────────
export const PAGE = {
  width: 595.28,
  height: 841.89,
  marginTop: 40,
  marginBottom: 40,
  marginLeft: 40,
  marginRight: 40,
} as const;

export const CONTENT_WIDTH = PAGE.width - PAGE.marginLeft - PAGE.marginRight;

// ── Fonts (PDFKit built-ins — no files needed) ─────────────────────────────
export const FONT = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  oblique: 'Helvetica-Oblique',
} as const;

// ── Font Sizes ─────────────────────────────────────────────────────────────
export const SIZE = {
  h1: 24,
  h2: 18,
  h3: 14,
  body: 12,
  small: 11,
  caption: 10,
  tiny: 9,
} as const;

// ── Colors ─────────────────────────────────────────────────────────────────
export const COLOR = {
  // Brand
  primary: '#2563eb',
  primaryDark: '#1e40af',

  // Text
  textMain: '#1e293b',
  textMuted: '#64748b',
  textLight: '#9ca3af',

  // Status
  green: '#22c55e',
  greenBg: '#dcfce7',
  greenText: '#166534',
  yellow: '#eab308',
  yellowBg: '#fef9c3',
  yellowText: '#854d0e',
  red: '#ef4444',
  redBg: '#fee2e2',
  redText: '#991b1b',

  // Backgrounds
  bgLight: '#f8fafc',
  bgGray: '#f3f4f6',
  bgBlue: '#eff6ff',
  bgBlueBorder: '#dbeafe',
  bgYellow: '#fefce8',
  bgYellowBorder: '#fef3c7',
  bgRedLight: '#fef2f2',
  bgRedBorder: '#fecaca',
  bgSkyLight: '#f0f9ff',
  bgSkyBorder: '#bae6fd',

  // Misc
  white: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#e5e7eb',
  scoreBg: '#1e40af',
} as const;

// ── Spacing ────────────────────────────────────────────────────────────────
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  section: 40,
} as const;
