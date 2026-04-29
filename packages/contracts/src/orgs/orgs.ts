import { z } from 'zod';
import { IdSchema, SlugSchema, TimestampSchema } from '../common/primitives.js';

/**
 * Organisation roles, roughly from least to most privileged.
 * The control plane enforces all permission checks server-side via Casbin
 * (see `docs/plans/04-iam-rbac-d1e00e.md`); this enum is the public surface.
 */
export const OrgRoleSchema = z.enum([
  'viewer',
  'developer',
  'maintainer',
  'admin',
  'owner',
]);
export type OrgRole = z.infer<typeof OrgRoleSchema>;

export const OrgSchema = z
  .object({
    id: IdSchema,
    slug: SlugSchema,
    name: z.string().min(1).max(120),
    /** Default region for new projects (per `33-pricing-packaging` regions). */
    defaultRegion: z.enum(['eu-central', 'us-east', 'apac-sg']),
    /** Plan tier from the pricing matrix (`33-pricing-packaging`). */
    plan: z.enum(['free', 'starter', 'pro', 'business', 'enterprise']),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();
export type Org = z.infer<typeof OrgSchema>;

export const CreateOrgRequestSchema = z
  .object({
    slug: SlugSchema,
    name: z.string().min(1).max(120),
    defaultRegion: OrgSchema.shape.defaultRegion.optional(),
  })
  .strict();
export type CreateOrgRequest = z.infer<typeof CreateOrgRequestSchema>;

export const UpdateOrgRequestSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    defaultRegion: OrgSchema.shape.defaultRegion.optional(),
  })
  .strict();
export type UpdateOrgRequest = z.infer<typeof UpdateOrgRequestSchema>;

export const OrgMemberSchema = z
  .object({
    id: IdSchema,
    orgId: IdSchema,
    userId: IdSchema,
    email: z.string().email(),
    fullName: z.string(),
    role: OrgRoleSchema,
    joinedAt: TimestampSchema,
  })
  .strict();
export type OrgMember = z.infer<typeof OrgMemberSchema>;

export const InviteOrgMemberRequestSchema = z
  .object({
    email: z.string().email(),
    role: OrgRoleSchema,
  })
  .strict();
export type InviteOrgMemberRequest = z.infer<typeof InviteOrgMemberRequestSchema>;
