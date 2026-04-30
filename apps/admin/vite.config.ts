import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/v1': 'http://localhost:4000',
      '/admin': 'http://localhost:4000',
      '/healthz': 'http://localhost:4000',
      '/readyz': 'http://localhost:4000',
    },
  },
});
