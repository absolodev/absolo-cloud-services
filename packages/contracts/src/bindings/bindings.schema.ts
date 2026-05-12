import { z } from 'zod';

export const BindingResourceTypeSchema = z.enum(['database', 'bucket']);

export const BindingSchema = z.object({
  id: z.string(),
  appId: z.string(),
  resourceType: BindingResourceTypeSchema,
  resourceId: z.string(),
  envPrefix: z.string(),
  autoInject: z.boolean(),
  status: z.string(),
  createdAt: z.string(),
  resource: z.unknown().nullable().optional(), // Enriched resource details
});

export type Binding = z.infer<typeof BindingSchema>;

export const CreateBindingRequestSchema = z.object({
  resourceType: BindingResourceTypeSchema,
  resourceId: z.string(),
  envPrefix: z.string().optional(),
});

export type CreateBindingRequest = z.infer<typeof CreateBindingRequestSchema>;
