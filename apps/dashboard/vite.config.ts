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
    port: 5173,
    strictPort: true,
    proxy: {
      // Proxy API calls to the local control plane during dev so we can
      // share cookies / avoid CORS for sign-in flows.
      '/v1': 'http://localhost:4000',
      '/healthz': 'http://localhost:4000',
      '/readyz': 'http://localhost:4000',
    },
  },
});
