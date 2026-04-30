/**
 * @absolo/ui — component library for every Absolo frontend.
 *
 * Components are derived from the shadcn/ui patterns and composed with Radix UI
 * primitives, class-variance-authority, and tailwind-merge.
 *
 * Style tokens come from `@absolo/design-tokens` (see `./styles.css` and the
 * Tailwind preset exported there).
 */

export { cn } from './utils/cn.js';

// Inputs
export * from './components/button.js';
export * from './components/input.js';
export * from './components/label.js';
export * from './components/textarea.js';
export * from './components/switch.js';

// Layout / surface
export * from './components/card.js';
export * from './components/badge.js';
export * from './components/skeleton.js';

// Disclosure / overlays
export * from './components/dialog.js';
export * from './components/tabs.js';
export * from './components/tooltip.js';

// Data
export * from './components/table.js';

// Feedback
export * from './components/toast.js';
