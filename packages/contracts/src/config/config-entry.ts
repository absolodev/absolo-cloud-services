import { z } from 'zod';
import { IdSchema, TimestampSchema } from '../common/primitives.js';

/**
 * Maximum sizes (per `docs/plans/41-application-configuration-d1e00e.md` §quotas).
 */
export const CONFIG_LIMITS = {
  KEY_MAX_LENGTH: 128,
  VALUE_MAX_BYTES: 256 * 1024,
  FILE_MAX_BYTES: 1024 * 1024,
  ENTRIES_PER_ENV_DEFAULT: 200,
  ENTRIES_PER_ENV_BUSINESS: 1000,
} as const;

/**
 * Config-entry key.
 *
 * - Must start with an uppercase letter or underscore.
 * - Only A-Z, 0-9, underscore thereafter.
 * - 1-128 chars.
 * - `ABSOLO_*` is reserved for the platform.
 */
export const ConfigKeySchema = z
  .string()
  .min(1)
  .max(CONFIG_LIMITS.KEY_MAX_LENGTH)
  .regex(
    /^[A-Z_][A-Z0-9_]{0,127}$/,
    'must start with A-Z or underscore; A-Z, 0-9, underscore thereafter',
  )
  .refine((k) => !k.startsWith('ABSOLO_'), {
    message: 'ABSOLO_* prefix is reserved for the platform',
  });
export type ConfigKey = z.infer<typeof ConfigKeySchema>;

export const ConfigEntryKindSchema = z.enum(['plain', 'secret']);
export type ConfigEntryKind = z.infer<typeof ConfigEntryKindSchema>;

export const ConfigEntrySourceSchema = z.enum(['user', 'binding', 'template', 'system']);
export type ConfigEntrySource = z.infer<typeof ConfigEntrySourceSchema>;

/**
 * A `ConfigEntry` as returned by the API. Secret values are masked unless the
 * caller has `config.secret.read` and explicitly requests reveal.
 *
 * `value` is always present:
 * - `kind=plain` → real value.
 * - `kind=secret`, masked → string of `•` plus optional 4-char preview suffix.
 * - `kind=secret`, revealed → real value.
 */
export const ConfigEntrySchema = z
  .object({
    id: IdSchema,
    projectId: IdSchema,
    /** `null` means project-scoped (shared across environments). */
    environmentId: IdSchema.nullable(),
    key: ConfigKeySchema,
    /** Always present; masked or revealed depending on permissions and request. */
    value: z.string(),
    /** Whether `value` was returned masked. */
    masked: z.boolean(),
    /** Last 4 chars of the secret value (for visual disambiguation when masked). */
    valuePreview: z.string().max(4).nullable(),
    kind: ConfigEntryKindSchema,
    source: ConfigEntrySourceSchema,
    /** Set when `source=binding` — references the resource binding that emitted this entry. */
    bindingId: IdSchema.nullable(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    createdByUserId: IdSchema.nullable(),
  })
  .strict();
export type ConfigEntry = z.infer<typeof ConfigEntrySchema>;

/** Input shape used by all write endpoints (PUT/PATCH/import). */
export const ConfigEntryInputSchema = z
  .object({
    key: ConfigKeySchema,
    value: z
      .string()
      .max(CONFIG_LIMITS.VALUE_MAX_BYTES, {
        message: `value exceeds ${CONFIG_LIMITS.VALUE_MAX_BYTES} bytes`,
      }),
    kind: ConfigEntryKindSchema.default('plain'),
  })
  .strict();
export type ConfigEntryInput = z.infer<typeof ConfigEntryInputSchema>;

export const ListConfigEntriesQuerySchema = z
  .object({
    /** When `true`, server returns secrets in plaintext. Requires `config.secret.read`. */
    reveal: z.coerce.boolean().default(false),
    /** Include project-scoped entries that affect this environment (default true). */
    includeShared: z.coerce.boolean().default(true),
  })
  .strict();
export type ListConfigEntriesQuery = z.infer<typeof ListConfigEntriesQuerySchema>;

export const ListConfigEntriesResponseSchema = z
  .object({
    /** Effective config: project-shared + environment-scoped + binding + system. */
    entries: z.array(ConfigEntrySchema),
    /** Hash of the effective config — useful for ETag-style revalidation. */
    contentHash: z.string(),
    /** Latest version for this environment. */
    versionNumber: z.number().int().positive(),
    versionId: IdSchema,
  })
  .strict();
export type ListConfigEntriesResponse = z.infer<typeof ListConfigEntriesResponseSchema>;

/** PUT — full replace. */
export const ReplaceConfigRequestSchema = z
  .object({
    entries: z.array(ConfigEntryInputSchema).max(2000),
    /** Optional human-readable change summary stored on the resulting `ConfigVersion`. */
    changeSummary: z.string().max(280).optional(),
  })
  .strict();
export type ReplaceConfigRequest = z.infer<typeof ReplaceConfigRequestSchema>;

/** PATCH — partial: add/update some keys, optionally remove others. */
export const PatchConfigRequestSchema = z
  .object({
    upsert: z.array(ConfigEntryInputSchema).default([]),
    remove: z.array(ConfigKeySchema).default([]),
    changeSummary: z.string().max(280).optional(),
  })
  .strict()
  .refine((v) => v.upsert.length > 0 || v.remove.length > 0, {
    message: 'must include at least one of `upsert` or `remove`',
  });
export type PatchConfigRequest = z.infer<typeof PatchConfigRequestSchema>;

/** POST /import — body: raw `.env` text. Returns the diff that would be applied. */
export const ImportConfigRequestSchema = z
  .object({
    /** Raw `.env`-style content (KEY=VALUE per line, `#` comments). */
    content: z.string().max(CONFIG_LIMITS.FILE_MAX_BYTES),
    /** When `true`, all imported entries are stored as `kind=secret`. */
    treatAllAsSecret: z.boolean().default(false),
    /** When `true`, apply the import; when `false`, only return the diff (dry run). */
    apply: z.boolean().default(false),
    changeSummary: z.string().max(280).optional(),
  })
  .strict();
export type ImportConfigRequest = z.infer<typeof ImportConfigRequestSchema>;
