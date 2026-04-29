/**
 * Tailwind preset that wires the Absolo design tokens into Tailwind v4's `@theme` directive.
 * Apps add this in their CSS:
 *   @import "tailwindcss";
 *   @import "@absolo/design-tokens/css";
 *   @plugin "@absolo/design-tokens/tailwind";
 */
import { colors, radii, space, typography } from './tokens.js';

export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        brand: colors.brand,
        accent: colors.accent,
        success: colors.semantic.success,
        warning: colors.semantic.warning,
        danger: colors.semantic.danger,
        info: colors.semantic.info,
        bg: 'var(--absolo-bg)',
        'bg-subtle': 'var(--absolo-bg-subtle)',
        'bg-muted': 'var(--absolo-bg-muted)',
        'bg-elevated': 'var(--absolo-bg-elevated)',
        fg: 'var(--absolo-fg)',
        'fg-muted': 'var(--absolo-fg-muted)',
        'fg-subtle': 'var(--absolo-fg-subtle)',
        border: 'var(--absolo-border)',
        'border-strong': 'var(--absolo-border-strong)',
        ring: 'var(--absolo-ring)',
      },
      borderRadius: radii,
      spacing: space,
      fontFamily: { sans: typography.fontSans, mono: typography.fontMono },
      fontSize: typography.size,
    },
  },
};

export default tailwindPreset;
