// @ts-check
import react from './react.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...react,
  {
    rules: {
      // Next.js owns these via its own plugin (added in the app config).
    },
  },
];
