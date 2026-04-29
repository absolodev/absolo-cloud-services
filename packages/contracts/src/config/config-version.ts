import { z } from 'zod';
import { IdSchema, TimestampSchema } from '../common/primitives.js';
import { ConfigKeySchema } from './config-entry.js';

/**
 * Snapshot of all config entries for an environment at a point in time.
 *
 * Created automatically on every change. Deploys reference a `configVersionId`
 * so rolling back a deploy rolls back its config.
 *
 * See `docs/plans/41-application-configuration-d1e00e.md` §ConfigVersion.
 */
export const ConfigVersionSchema = z
  .object({
    id: IdSchema,
    projectId: IdSchema,
    environmentId: IdSchema,
    versionNumber: z.number().int().positive(),
    entryCount: z.number().int().nonnegative(),
    /** SHA-256 of the canonicalised entries. */
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    changeSummary: z.string().max(280).default(''),
    createdAt: TimestampSchema,
    createdByUserId: IdSchema.nullable(),
  })
  .strict();
export type ConfigVersion = z.infer<typeof ConfigVersionSchema>;

export const ConfigDiffEntrySchema = z
  .object({
    key: ConfigKeySchema,
    op: z.enum(['added', 'changed', 'removed', 'kind_changed']),
    /** Old value (always masked when `kind=secret`). Null on `added`. */
    fromValue: z.string().nullable(),
    fromKind: z.enum(['plain', 'secret']).nullable(),
    /** New value (always masked when `kind=secret`). Null on `removed`. */
    toValue: z.string().nullable(),
    toKind: z.enum(['plain', 'secret']).nullable(),
  })
  .strict();
export type ConfigDiffEntry = z.infer<typeof ConfigDiffEntrySchema>;

export const ConfigDiffSchema = z
  .object({
    fromVersionId: IdSchema,
    toVersionId: IdSchema,
    fromVersionNumber: z.number().int().positive(),
    toVersionNumber: z.number().int().positive(),
    entries: z.array(ConfigDiffEntrySchema),
  })
  .strict();
export type ConfigDiff = z.infer<typeof ConfigDiffSchema>;
