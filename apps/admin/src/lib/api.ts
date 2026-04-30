import { AbsoloClient } from '@absolo/sdk';
import { QueryClient } from '@tanstack/react-query';
import { AbsoloApiError } from '@absolo/sdk';

/**
 * Admin SDK client. Always hits the same origin so the Vite dev proxy
 * forwards `/v1/*` and `/admin/*` to the local control plane.
 *
 * Production: the admin console is served from a separate, internal-only
 * subdomain that the edge proxy routes to the control plane with extra
 * authentication. Same `credentials: 'include'` cookie auth as the dashboard.
 */
const baseUrl =
  import.meta.env.VITE_API_BASE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');

export const api = new AbsoloClient({ baseUrl });

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (failureCount, error) => {
        if (error instanceof AbsoloApiError && error.status < 500) return false;
        return failureCount < 1;
      },
    },
    mutations: { retry: false },
  },
});
