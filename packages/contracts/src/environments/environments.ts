import { z } from 'zod';
import { IdSchema, SlugSchema, TimestampSchema } from '../common/primitives.js';

/**
 * Environment "kind". Production and staging are first-class billable; preview
 * environments are ephemeral, attached to PRs.
 *
 * See `docs/plans/08-projects-apps-service-d1e00e.md` and pricing in
 * `docs/plans/33-pricing-packaging-d1e00e.md`.
 */
export const EnvironmentKindSchema = z.enum(['production', 'staging', 'preview']);
export type EnvironmentKind = z.infer<typeof EnvironmentKindSchema>;

export const EnvironmentStatusSchema = z.enum([
  'provisioning',
  'active',
  'sleeping',
  'failed',
  'archived',
]);
export type EnvironmentStatus = z.infer<typeof EnvironmentStatusSchema>;

export const EnvironmentSchema = z
  .object({
    id: IdSchema,
    projectId: IdSchema,
    slug: SlugSchema,
    name: z.string().min(1).max(80),
    kind: EnvironmentKindSchema,
    status: EnvironmentStatusSchema,
    /** Auto-suspend idle staging/preview envs after N minutes; null disables. */
    autoSleepAfterMinutes: z.number().int().min(5).max(1440).nullable(),
    /** Latest deployment id (if any). */
    currentDeploymentId: IdSchema.nullable(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();
export type Environment = z.infer<typeof EnvironmentSchema>;

export const CreateEnvironmentRequestSchema = z
  .object({
    slug: SlugSchema,
    name: z.string().min(1).max(80),
    kind: EnvironmentKindSchema,
    autoSleepAfterMinutes: EnvironmentSchema.shape.autoSleepAfterMinutes.optional(),
    /** If provided, copy config entries from this source environment on create. */
    cloneConfigFromEnvironmentId: IdSchema.optional(),
  })
  .strict();
export type CreateEnvironmentRequest = z.infer<typeof CreateEnvironmentRequestSchema>;

export const UpdateEnvironmentRequestSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    autoSleepAfterMinutes: EnvironmentSchema.shape.autoSleepAfterMinutes.optional(),
  })
  .strict();
export type UpdateEnvironmentRequest = z.infer<typeof UpdateEnvironmentRequestSchema>;
