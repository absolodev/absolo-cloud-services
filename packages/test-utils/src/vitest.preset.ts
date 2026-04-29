import { defineConfig, type UserConfig } from 'vitest/config';

/** Shared Vitest preset. Apps spread it and add their own coverage targets / aliases. */
export const vitestPreset: UserConfig = defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'test/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: ['**/dist/**', '**/node_modules/**', '**/*.config.*', '**/types/**'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
});
