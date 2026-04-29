import { z } from 'zod';

/**
 * RFC 7807-style error envelope used by every Absolo API response on failure.
 *
 * - `type` — stable URI (or short slug) identifying the error class.
 * - `title` — human-friendly short summary.
 * - `status` — HTTP status code, mirrored in the body for convenience.
 * - `detail` — optional human-readable explanation for the specific occurrence.
 * - `code` — short machine-readable code (e.g., `RATE_LIMITED`, `VALIDATION_FAILED`).
 * - `requestId` — correlation ID echoed in the `x-request-id` response header.
 * - `errors` — optional list of field-level validation issues.
 */
export const ApiErrorIssueSchema = z
  .object({
    path: z.array(z.union([z.string(), z.number()])),
    code: z.string(),
    message: z.string(),
  })
  .strict();

export type ApiErrorIssue = z.infer<typeof ApiErrorIssueSchema>;

export const ApiErrorSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int().min(400).max(599),
    detail: z.string().optional(),
    code: z.string(),
    requestId: z.string().optional(),
    errors: z.array(ApiErrorIssueSchema).optional(),
  })
  .strict();

export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * Canonical machine-readable error codes. Add new codes here so that clients
 * can do exhaustive switching without breaking on unknown values (which they
 * should also handle defensively).
 */
export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  PRECONDITION_FAILED: 'PRECONDITION_FAILED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  BILLING_REQUIRED: 'BILLING_REQUIRED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
