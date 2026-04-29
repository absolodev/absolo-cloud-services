import { z } from 'zod';
import { IdSchema, TimestampSchema } from '../common/primitives.js';
import { CONFIG_LIMITS } from './config-entry.js';

/**
 * File-based configuration mount.
 *
 * For customers who prefer dropping a `.env` / `application.yml` / `config.json`
 * into the container instead of (or in addition to) using process env vars.
 *
 * See `docs/plans/41-application-configuration-d1e00e.md` §ConfigFile.
 */
export const ConfigFileKindSchema = z.enum(['env', 'json', 'yaml', 'raw']);
export type ConfigFileKind = z.infer<typeof ConfigFileKindSchema>;

export const ConfigFilePermissionsSchema = z.enum(['0400', '0600', '0644']);
export type ConfigFilePermissions = z.infer<typeof ConfigFilePermissionsSchema>;

export const ConfigFileSchema = z
  .object({
    id: IdSchema,
    projectId: IdSchema,
    environmentId: IdSchema.nullable(),
    /** Absolute filesystem path inside the container. */
    path: z.string().regex(/^\/[\w\-./]{1,255}$/, 'must be an absolute POSIX path'),
    kind: ConfigFileKindSchema,
    permissions: ConfigFilePermissionsSchema.default('0600'),
    /** SHA-256 of the file content. */
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    sizeBytes: z.number().int().min(0).max(CONFIG_LIMITS.FILE_MAX_BYTES),
    /** Mirrors `ConfigEntry.source`. */
    source: z.enum(['user', 'binding', 'template', 'system']),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();
export type ConfigFile = z.infer<typeof ConfigFileSchema>;

export const ConfigFileInputSchema = z
  .object({
    path: ConfigFileSchema.shape.path,
    kind: ConfigFileKindSchema,
    permissions: ConfigFilePermissionsSchema.optional(),
    /** UTF-8 content. Binary not supported in this version. */
    content: z.string().max(CONFIG_LIMITS.FILE_MAX_BYTES),
  })
  .strict();
export type ConfigFileInput = z.infer<typeof ConfigFileInputSchema>;

export const ReplaceConfigFilesRequestSchema = z
  .object({
    files: z.array(ConfigFileInputSchema).max(50),
    changeSummary: z.string().max(280).optional(),
  })
  .strict();
export type ReplaceConfigFilesRequest = z.infer<typeof ReplaceConfigFilesRequestSchema>;
