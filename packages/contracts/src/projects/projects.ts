import { z } from 'zod';
import { IdSchema, SlugSchema, TimestampSchema } from '../common/primitives.js';

/**
 * A `Project` is the top-level grouping a customer creates. It contains one or
 * more `App`s and `Site`s plus their `Environment`s.
 *
 * See `docs/plans/08-projects-apps-service-d1e00e.md` for full lifecycle.
 */
export const ProjectKindSchema = z.enum(['app', 'site', 'mixed']);
export type ProjectKind = z.infer<typeof ProjectKindSchema>;

export const ProjectStatusSchema = z.enum([
  'active',
  'paused',
  'archived',
  'pending_deletion',
]);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectSchema = z
  .object({
    id: IdSchema,
    orgId: IdSchema,
    slug: SlugSchema,
    name: z.string().min(1).max(120),
    description: z.string().max(2000).default(''),
    kind: ProjectKindSchema,
    status: ProjectStatusSchema,
    /** Region the project is pinned to (immutable post-creation). */
    region: z.enum(['eu-central', 'us-east', 'apac-sg']),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectRequestSchema = z
  .object({
    slug: SlugSchema,
    name: z.string().min(1).max(120),
    description: z.string().max(2000).optional(),
    kind: ProjectKindSchema,
    region: ProjectSchema.shape.region.optional(),
    /** If provided, scaffold from a marketplace template (e.g., `wordpress`). */
    templateSlug: SlugSchema.optional(),
  })
  .strict();
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const UpdateProjectRequestSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).optional(),
    status: z.enum(['active', 'paused']).optional(),
  })
  .strict();
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
