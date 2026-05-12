import { z } from 'zod';

export const DatabaseEngineSchema = z.enum(['postgres', 'mysql', 'redis']);
export const DatabaseSizeSchema = z.enum(['xs', 's', 'm', 'l', 'xl', '2xl', '4xl']);
export const DatabaseStatusSchema = z.enum([
  'provisioning',
  'ready',
  'scaling',
  'backing_up',
  'restoring',
  'maintenance',
  'failed',
  'deleting',
  'deleted',
]);

export const ManagedDatabaseSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  projectId: z.string(),
  environmentId: z.string().nullable().optional(),
  name: z.string(),
  engine: DatabaseEngineSchema,
  version: z.string(),
  size: DatabaseSizeSchema,
  ha: z.boolean(),
  region: z.string(),
  storageGb: z.number().int(),
  status: DatabaseStatusSchema,
  endpointHost: z.string().nullable().optional(),
  endpointPort: z.number().int().nullable().optional(),
  masterUsername: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ManagedDatabase = z.infer<typeof ManagedDatabaseSchema>;

export const CreateDatabaseRequestSchema = z.object({
  orgId: z.string(),
  name: z.string().min(1),
  engine: DatabaseEngineSchema,
  version: z.string(),
  size: DatabaseSizeSchema.optional().default('s'),
  ha: z.boolean().optional().default(false),
  region: z.string().optional().default('eu-central'),
  storageGb: z.number().int().min(1).optional().default(1),
  environmentId: z.string().optional(),
});

export type CreateDatabaseRequest = z.infer<typeof CreateDatabaseRequestSchema>;

export const ScaleDatabaseRequestSchema = z.object({
  size: DatabaseSizeSchema,
  storageGb: z.number().int().min(1).optional(),
});

export type ScaleDatabaseRequest = z.infer<typeof ScaleDatabaseRequestSchema>;

export const DatabaseUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  scope: z.string(),
  boundAppId: z.string().nullable().optional(),
  createdAt: z.string(),
  password: z.string().optional(), // Only present on creation
});

export type DatabaseUser = z.infer<typeof DatabaseUserSchema>;

export const CreateDatabaseUserRequestSchema = z.object({
  username: z.string().min(1),
  scope: z.string().optional().default('full'),
});

export type CreateDatabaseUserRequest = z.infer<typeof CreateDatabaseUserRequestSchema>;

export const DatabaseBackupSchema = z.object({
  id: z.string(),
  databaseId: z.string(),
  kind: z.enum(['wal', 'snapshot']),
  status: z.enum(['running', 'completed', 'failed']),
  startedAt: z.string(),
  completedAt: z.string().nullable().optional(),
  sizeBytes: z.number().int().nullable().optional(),
  createdAt: z.string(),
});

export type DatabaseBackup = z.infer<typeof DatabaseBackupSchema>;

export const ParameterGroupSchema = z.object({
  id: z.string(),
  engine: z.string(),
  version: z.string(),
  name: z.string(),
  params: z.record(z.string(), z.unknown()),
  isDefault: z.boolean(),
});

export type ParameterGroup = z.infer<typeof ParameterGroupSchema>;
