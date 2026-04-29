/**
 * Programmatic access to the same tokens defined in `tokens.css`.
 * Useful for Tailwind theme extension, design tooling, and tests.
 */

export const colors = {
  brand: {
    50: 'oklch(96% 0.03 260)',
    100: 'oklch(92% 0.06 260)',
    200: 'oklch(85% 0.10 260)',
    300: 'oklch(76% 0.14 260)',
    400: 'oklch(68% 0.17 260)',
    500: 'oklch(60% 0.20 260)',
    600: 'oklch(53% 0.21 260)',
    700: 'oklch(46% 0.20 260)',
    800: 'oklch(38% 0.17 260)',
    900: 'oklch(30% 0.14 260)',
    950: 'oklch(22% 0.10 260)',
  },
  accent: { 500: 'oklch(65% 0.24 305)' },
  semantic: {
    success: 'oklch(70% 0.18 150)',
    warning: 'oklch(78% 0.16 80)',
    danger: 'oklch(64% 0.22 25)',
    info: 'oklch(70% 0.16 230)',
  },
} as const;

export const space = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const;

export const radii = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  full: '9999px',
} as const;

export const typography = {
  fontSans: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  size: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
} as const;

export const motion = {
  ease: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
  },
  duration: { fast: '120ms', base: '200ms', slow: '320ms' },
} as const;

export const elevation = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
  md: '0 4px 8px -2px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
  lg: '0 12px 24px -8px rgb(0 0 0 / 0.10), 0 6px 12px -4px rgb(0 0 0 / 0.06)',
  xl: '0 24px 48px -12px rgb(0 0 0 / 0.18)',
} as const;

export const tokens = { colors, space, radii, typography, motion, elevation } as const;
export type Tokens = typeof tokens;
