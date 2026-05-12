import { z } from 'zod';

export const BucketSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  projectId: z.string(),
  region: z.string(),
  name: z.string(),
  slug: z.string(),
  publicRead: z.boolean(),
  versioning: z.boolean(),
  createdAt: z.string(),
});

export type Bucket = z.infer<typeof BucketSchema>;

export const CreateBucketRequestSchema = z.object({
  orgId: z.string(),
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  region: z.string().optional().default('eu-central'),
  publicRead: z.boolean().optional().default(false),
  versioning: z.boolean().optional().default(false),
});

export type CreateBucketRequest = z.infer<typeof CreateBucketRequestSchema>;

export const BucketLifecycleRuleSchema = z.object({
  id: z.string(),
  bucketId: z.string(),
  prefix: z.string(),
  expireDays: z.number().int().nullable().optional(),
  transitionDays: z.number().int().nullable().optional(),
  transitionClass: z.string().nullable().optional(),
});

export type BucketLifecycleRule = z.infer<typeof BucketLifecycleRuleSchema>;

export const AccessKeySchema = z.object({
  id: z.string(),
  ownerKind: z.string(),
  ownerId: z.string(),
  scope: z.string(),
  accessKey: z.string(),
  lastUsedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  secretKey: z.string().optional(), // Only present on creation
});

export type AccessKey = z.infer<typeof AccessKeySchema>;
