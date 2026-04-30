import absoloPreset from '@absolo/design-tokens/tailwind';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [absoloPreset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};
