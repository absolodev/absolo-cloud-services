import { z } from 'zod';

export const AppSourceKindSchema = z.enum(['git', 'dockerfile', 'image', 'template']);

export const AppSchema = z.object({
  id: z.string(),
  environmentId: z.string(),
  slug: z.string(),
  sourceKind: AppSourceKindSchema,
  sourceRef: z.string(),
  defaultBranch: z.string().nullable().optional(),
});

export const CreateAppBodySchema = z.object({
  environmentId: z.string(),
  slug: z.string(),
  sourceKind: AppSourceKindSchema,
  sourceRef: z.string(),
  defaultBranch: z.string().optional(),
});

export const AppDeploymentBodySchema = z.object({
  versionId: z.string(),
  sourceCommitSha: z.string().optional(),
});

export type App = z.infer<typeof AppSchema>;
export type CreateAppBody = z.infer<typeof CreateAppBodySchema>;
export type AppDeploymentBody = z.infer<typeof AppDeploymentBodySchema>;
