import { z } from 'zod';

/**
 * Public, externally-visible identifier.
 *
 * Format: prefixed ULID — e.g., `org_01HZX9...`, `prj_01HZX9...`.
 * - Prefix encodes the resource type (3-5 lowercase chars + underscore).
 * - Body is a 26-char ULID (Crockford base32, monotonic, sortable).
 *
 * This shape is enforced by the control-plane on emit; clients should treat
 * IDs as opaque and never parse them.
 */
export const IdSchema = z
  .string()
  .min(5)
  .max(48)
  .regex(/^[a-z]{2,8}_[0-9A-HJKMNP-TV-Z]{26}$/, 'must be a prefixed ULID')
  .describe('Prefixed ULID identifier (e.g., prj_01HZX9...)');

export type Id = z.infer<typeof IdSchema>;

/**
 * URL-safe slug used in user-facing paths and DNS labels.
 *
 * Rules:
 * - Lowercase letters, digits, hyphens.
 * - Must start and end with alphanumeric.
 * - 2-48 chars.
 * - No consecutive hyphens.
 */
export const SlugSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(
    /^[a-z0-9](?:[a-z0-9]|-(?!-))*[a-z0-9]$/,
    'lowercase a-z, 0-9, single hyphens; cannot start or end with hyphen',
  )
  .describe('URL-safe slug');

export type Slug = z.infer<typeof SlugSchema>;

/** ISO-8601 timestamp emitted by the API in UTC, e.g. `2026-04-30T02:59:00.000Z`. */
export const TimestampSchema = z.string().datetime({ offset: false });
export type Timestamp = z.infer<typeof TimestampSchema>;

/** Opaque pagination cursor (base64url-encoded server state). */
export const CursorSchema = z.string().min(1).max(512).describe('Opaque pagination cursor');
export type Cursor = z.infer<typeof CursorSchema>;

/** Standard cursor-pagination envelope returned by list endpoints. */
export const PageMetaSchema = z
  .object({
    nextCursor: CursorSchema.nullable(),
    pageSize: z.number().int().positive().max(200),
  })
  .strict();

export type PageMeta = z.infer<typeof PageMetaSchema>;

/** Standard cursor-pagination query params. */
export const PageQuerySchema = z
  .object({
    cursor: CursorSchema.optional(),
    pageSize: z.coerce.number().int().positive().max(200).default(50),
  })
  .strict();

export type PageQuery = z.infer<typeof PageQuerySchema>;

/**
 * Helper to wrap a list response as `{ data: T[], page: PageMeta }`.
 *
 * Used by every collection endpoint for shape consistency.
 */
export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z
    .object({
      data: z.array(item),
      page: PageMetaSchema,
    })
    .strict();
