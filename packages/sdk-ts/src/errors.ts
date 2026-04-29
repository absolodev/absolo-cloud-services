import type { ApiError, ApiErrorIssue, ErrorCode } from '@absolo/contracts/errors';
import { ApiErrorSchema } from '@absolo/contracts/errors';

/**
 * Thrown by every SDK method on a non-2xx HTTP response.
 *
 * Carries the parsed `ApiError` envelope and the original HTTP status. Always
 * inspect `error.code` (machine-readable) before showing `error.message` (human).
 */
export class AbsoloApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | string;
  readonly type: string;
  readonly detail?: string;
  readonly requestId?: string;
  readonly issues?: readonly ApiErrorIssue[];

  constructor(payload: ApiError) {
    super(payload.title);
    this.name = 'AbsoloApiError';
    this.status = payload.status;
    this.code = payload.code;
    this.type = payload.type;
    this.detail = payload.detail;
    this.requestId = payload.requestId;
    this.issues = payload.errors;
  }

  isAuthRequired(): boolean {
    return this.status === 401;
  }

  isForbidden(): boolean {
    return this.status === 403;
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  isRateLimited(): boolean {
    return this.status === 429;
  }

  isValidation(): boolean {
    return this.status === 422 || this.code === 'VALIDATION_FAILED';
  }
}

/**
 * Thrown when the network call itself fails (DNS, TLS, abort, no connection)
 * before any HTTP response was received.
 */
export class AbsoloNetworkError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AbsoloNetworkError';
    this.cause = cause;
  }
}

/**
 * Parse an unsuccessful Response into an AbsoloApiError. Falls back to a
 * synthetic envelope if the response body isn't a well-formed `ApiError`.
 */
export async function errorFromResponse(res: Response): Promise<AbsoloApiError> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const parsed = ApiErrorSchema.safeParse(body);
  if (parsed.success) {
    return new AbsoloApiError(parsed.data);
  }

  return new AbsoloApiError({
    type: 'about:blank',
    title: res.statusText || 'Request failed',
    status: res.status,
    code: res.status === 401 ? 'AUTHENTICATION_REQUIRED' : 'INTERNAL_ERROR',
    requestId: res.headers.get('x-request-id') ?? undefined,
  });
}
