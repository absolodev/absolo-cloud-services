import absoloPreset from '@absolo/design-tokens/tailwind';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [absoloPreset],
  content: [
    './src/**/*.{ts,tsx,mdx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};
