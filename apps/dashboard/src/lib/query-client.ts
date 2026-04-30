import { QueryClient } from '@tanstack/react-query';
import { AbsoloApiError } from '@absolo/sdk';

/**
 * Query client used by every route loader. Defaults are biased toward
 * fast UX for control-plane data (low staleness, refetch on focus).
 *
 * Retries skip 4xx — most are caused by validation/auth and won't
 * succeed by retrying.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (error instanceof AbsoloApiError && error.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
});
