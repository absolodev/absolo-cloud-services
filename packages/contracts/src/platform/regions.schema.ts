import { z } from 'zod';

export const RegionSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  status: z.enum(['active', 'maintenance', 'disabled']),
  capabilities: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Region = z.infer<typeof RegionSchema>;
