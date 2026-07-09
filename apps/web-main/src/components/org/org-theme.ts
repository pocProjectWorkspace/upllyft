import type { CSSProperties } from 'react';

/** Upllyft teal — used whenever an org hasn't picked its own brand colours. */
export const ORG_COLOR_DEFAULTS: { primary: string; secondary: string; accent: string } = {
  primary: '#14b8a6',
  secondary: '#0d9488',
  accent: '#f59e0b',
};

interface OrgColors {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
}

function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(20, 184, 166, ${alpha})`;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/**
 * Black or white, whichever stays legible on top of `hex`.
 * Uses the WCAG relative-luminance threshold rather than a naive brightness average,
 * so mid-tone brand colours (e.g. a saturated teal) don't get unreadable white text.
 */
export function contrastOn(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? '#111827' : '#ffffff';
}

/**
 * CSS custom properties for an org's brand palette. Spread onto a wrapper element;
 * descendants then reference `var(--org-primary)` etc.
 */
export function orgThemeVars(org?: OrgColors | null): CSSProperties {
  const primary = org?.primaryColor || ORG_COLOR_DEFAULTS.primary;
  const secondary = org?.secondaryColor || ORG_COLOR_DEFAULTS.secondary;
  const accent = org?.accentColor || ORG_COLOR_DEFAULTS.accent;

  return {
    '--org-primary': primary,
    '--org-secondary': secondary,
    '--org-accent': accent,
    '--org-primary-soft': rgba(primary, 0.12),
    '--org-primary-border': rgba(primary, 0.35),
    '--org-on-primary': contrastOn(primary),
    '--org-gradient': `linear-gradient(to right, ${primary}, ${secondary})`,
  } as CSSProperties;
}
