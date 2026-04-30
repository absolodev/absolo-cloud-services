import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest needs SWC for the same reason `pnpm dev` does: NestJS DI by type
 * relies on `emitDecoratorMetadata`, which esbuild (vitest's default
 * transformer) does not produce. `unplugin-swc` reads `.swcrc` so the
 * transform matches dev exactly.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
  plugins: [swc.vite()],
});
