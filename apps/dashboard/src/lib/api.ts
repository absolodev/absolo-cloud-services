import { AbsoloClient } from '@absolo/sdk';

/**
 * Singleton HTTP client used by every TanStack Query loader / mutation.
 *
 * In dev we point at the current origin so Vite's proxy forwards `/v1/*`
 * to the local control plane (see `vite.config.ts`). In production the
 * dashboard is served from the same domain as the API, so the same
 * origin works there too.
 *
 * Override via `VITE_API_BASE_URL` for cross-origin scenarios. The SDK
 * already sets `credentials: 'include'`, which lets the session cookie
 * travel with every request.
 */
const baseUrl =
  import.meta.env.VITE_API_BASE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');

export const api = new AbsoloClient({ baseUrl });
