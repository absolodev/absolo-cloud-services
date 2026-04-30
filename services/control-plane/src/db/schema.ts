/**
 * Drizzle schema for the control plane.
 *
 * Per `docs/plans/28-data-model-postgres-d1e00e.md`, we use one Postgres
 * schema per module. This file declares the tables in:
 *
 * - `iam`        — users, organizations, memberships, sessions
 * - `projects`   — projects, environments, config_entries, config_versions
 *
 * Other modules (billing, versioning, dns, ...) get their own schema files
 * as those features come online.
 */
import {
  pgSchema,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';

// ---------- iam ----------
export const iam = pgSchema('iam');

export const users = iam.table(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    fullName: text('full_name').notNull(),
    avatarUrl: text('avatar_url'),
    passwordHash: text('password_hash').notNull(),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex('users_email_unique').on(t.email),
  }),
);

export const organizations = iam.table(
  'organizations',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    defaultRegion: text('default_region').notNull().default('eu-central'),
    plan: text('plan').notNull().default('free'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    slugUnique: uniqueIndex('organizations_slug_unique').on(t.slug),
  }),
);

export const memberships = iam.table(
  'memberships',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // viewer | developer | maintainer | admin | owner
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.orgId] }),
    orgIdx: index('memberships_org_idx').on(t.orgId),
  }),
);

export const sessions = iam.table(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    userAgent: text('user_agent'),
    ip: text('ip'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('sessions_user_idx').on(t.userId),
  }),
);

// ---------- projects ----------
export const projectsSchema = pgSchema('projects');

export const projects = projectsSchema.table(
  'projects',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    kind: text('kind').notNull(), // app | site | mixed
    status: text('status').notNull().default('active'),
    region: text('region').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    orgSlugUnique: uniqueIndex('projects_org_slug_unique').on(t.orgId, t.slug),
    orgIdx: index('projects_org_idx').on(t.orgId),
  }),
);

export const environments = projectsSchema.table(
  'environments',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    kind: text('kind').notNull(), // production | staging | preview
    status: text('status').notNull().default('provisioning'),
    autoSleepAfterMinutes: integer('auto_sleep_after_minutes'),
    currentDeploymentId: text('current_deployment_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    projectSlugUnique: uniqueIndex('environments_project_slug_unique').on(
      t.projectId,
      t.slug,
    ),
    projectIdx: index('environments_project_idx').on(t.projectId),
  }),
);

/**
 * `config_versions` — snapshot per environment per change.
 * Created automatically by the config service on every write.
 */
export const configVersions = projectsSchema.table(
  'config_versions',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environmentId: text('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    entryCount: integer('entry_count').notNull().default(0),
    contentHash: text('content_hash').notNull(),
    changeSummary: text('change_summary').notNull().default(''),
    createdByUserId: text('created_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    envVersionUnique: uniqueIndex('config_versions_env_version_unique').on(
      t.environmentId,
      t.versionNumber,
    ),
    envIdx: index('config_versions_env_idx').on(t.environmentId),
  }),
);

/**
 * `config_entries` — current state. Each row pinned to the version that
 * produced it (so we never lose the audit trail). On every change a new
 * `config_version` is inserted and this table is mutated transactionally.
 *
 * `value_ciphertext` is always encrypted (envelope encryption — see
 * `docs/plans/26-secrets-management-d1e00e.md`). For phase 0 we store the
 * value as plaintext bytes prefixed with a key version so that turning on
 * Vault later is a data migration, not a breaking change.
 */
export const configEntries = projectsSchema.table(
  'config_entries',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /** Null = project-shared (applies to every environment). */
    environmentId: text('environment_id').references(() => environments.id, {
      onDelete: 'cascade',
    }),
    key: text('key').notNull(),
    valueCiphertext: text('value_ciphertext').notNull(),
    /** Last 4 chars of the plaintext value for display when masked. */
    valuePreview: text('value_preview'),
    kind: text('kind').notNull(), // plain | secret
    source: text('source').notNull().default('user'), // user | binding | template | system
    bindingId: text('binding_id'),
    /** Version this row was last touched in. */
    versionId: text('version_id')
      .notNull()
      .references(() => configVersions.id),
    createdByUserId: text('created_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    envKeyUnique: uniqueIndex('config_entries_env_key_unique').on(
      t.environmentId,
      t.key,
    ),
    projectKeySharedUnique: uniqueIndex('config_entries_project_shared_key_unique')
      .on(t.projectId, t.key)
      .where('environment_id IS NULL' as never),
    projectIdx: index('config_entries_project_idx').on(t.projectId),
  }),
);

/** Everything else (config_files, etc.) lands here as we build it. */
export const configFiles = projectsSchema.table(
  'config_files',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environmentId: text('environment_id').references(() => environments.id, {
      onDelete: 'cascade',
    }),
    path: text('path').notNull(),
    kind: text('kind').notNull(), // env | json | yaml | raw
    permissions: text('permissions').notNull().default('0600'),
    contentCiphertext: text('content_ciphertext').notNull(),
    contentHash: text('content_hash').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    source: text('source').notNull().default('user'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    envPathUnique: uniqueIndex('config_files_env_path_unique').on(
      t.environmentId,
      t.path,
    ),
  }),
);
