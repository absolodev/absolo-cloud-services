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
import { sql } from 'drizzle-orm';
import {
  pgSchema,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  varchar,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';

// ---------- platform ----------
export const platform = pgSchema('platform');

export const regions = platform.table(
  'regions',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(), // e.g. eu-fra, us-iad
    name: text('name').notNull(), // e.g. Europe (Frankfurt)
    status: text('status').notNull().default('active'), // active, maintenance
    capabilities: jsonb('capabilities').notNull().default('[]'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    codeUnique: uniqueIndex('regions_code_unique').on(t.code),
  }),
);

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
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    spendCapLimitCents: integer('spend_cap_limit_cents').default(10000), // Default  cap
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
    projectSlugUnique: uniqueIndex('environments_project_slug_unique').on(t.projectId, t.slug),
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
    envKeyUnique: uniqueIndex('config_entries_env_key_unique').on(t.environmentId, t.key),
    projectKeySharedUnique: uniqueIndex('config_entries_project_shared_key_unique')
      .on(t.projectId, t.key)
      .where(sql`environment_id IS NULL`),
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
    envPathUnique: uniqueIndex('config_files_env_path_unique').on(t.environmentId, t.path),
  }),
);

// -----------------------------------------------------------------------------
// MESSAGE QUEUE & TRANSACTIONS (Phase 0 -> Phase 1 Outbox & Sagas)
// -----------------------------------------------------------------------------

export const mq = pgSchema('mq');

export const outbox = mq.table('outbox', {
  id: varchar('id', { length: 32 }).primaryKey(),
  topic: varchar('topic', { length: 255 }).notNull(),
  payload: jsonb('payload').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sagaState = mq.table('saga_state', {
  id: varchar('id', { length: 32 }).primaryKey(),
  sagaType: varchar('saga_type', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  context: jsonb('context').notNull(),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------- compute ----------
export const computeSchema = pgSchema('compute');

export type AppSourceKind = 'git' | 'dockerfile' | 'image' | 'template';

export const apps = computeSchema.table(
  'apps',
  {
    id: text('id').primaryKey(),
    environmentId: text('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    sourceKind: text('source_kind').notNull(), // AppSourceKind
    sourceRef: text('source_ref').notNull(),
    defaultBranch: text('default_branch'),
    buildSpec: jsonb('build_spec'),
    runtimeSpec: jsonb('runtime_spec'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('idx_apps_env_slug').on(table.environmentId, table.slug)],
);

export const deployments = computeSchema.table(
  'deployments',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    versionId: text('version_id').notNull(),
    sourceCommitSha: text('source_commit_sha'),
    buildLogUrl: text('build_log_url'),
    status: text('status').notNull(), // 'queued', 'building', 'deploying', 'live', 'superseded', 'failed'
    trafficPct: integer('traffic_pct').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_deployments_app').on(table.appId)],
);

export const sites = computeSchema.table(
  'sites',
  {
    id: text('id').primaryKey(),
    environmentId: text('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    templateId: text('template_id').notNull(),
    runtimeSpec: jsonb('runtime_spec'),
    pvSizeGb: integer('pv_size_gb').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('idx_sites_env_slug').on(table.environmentId, table.slug)],
);

// --- Phase 1: Domains & Routing ---
export const domainsSchema = pgSchema('domains');

export const subdomains = domainsSchema.table('subdomains', {
  id: text('id').primaryKey(),
  fullHost: text('full_host').notNull().unique(), // e.g. "my-shop-7fk2.absolo.app"
  appId: text('app_id').references(() => apps.id, { onDelete: 'set null' }),
  orgId: text('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customDomains = domainsSchema.table('custom_domains', {
  id: text('id').primaryKey(),
  domainName: text('domain_name').notNull().unique(), // e.g. "www.example.com"
  appId: text('app_id').references(() => apps.id, { onDelete: 'set null' }),
  orgId: text('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('PENDING_VERIFICATION'), // PENDING_VERIFICATION, ACTIVE, ERROR
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// BILLING (Phase 2 — Stripe Billing Meters + hourly metering)
// See: docs/plans/07-billing-service-d1e00e.md
// -----------------------------------------------------------------------------

export const billingSchema = pgSchema('billing');

/**
 * Plans — product tiers. Each plan has an anchor monthly fee + included
 * unit allowances per resource kind (e.g. 100 GB egress free).
 */
export const plans = billingSchema.table('plans', {
  id: text('id').primaryKey(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  name: text('name').notNull(),
  monthlyAnchorCents: integer('monthly_anchor_cents').notNull().default(0),
  /** JSON map of included units per resource kind, e.g. { "bandwidth_gb": 100, "compute_hours": 720 } */
  includedUnits: jsonb('included_units').notNull().default({}),
  displayOrder: integer('display_order').notNull().default(0),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Subscriptions — one per org, linked to a Stripe Subscription.
 */
export const subscriptions = billingSchema.table(
  'subscriptions',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    planId: text('plan_id')
      .notNull()
      .references(() => plans.id),
    stripeSubscriptionId: text('stripe_subscription_id'),
    status: text('status').notNull().default('active'), // active | past_due | canceled | trialing
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index('subscriptions_org_idx').on(t.orgId),
    orgUnique: uniqueIndex('subscriptions_org_unique').on(t.orgId),
  }),
);

/**
 * Subscription items — each maps to a Stripe Price + Billing Meter for metered resources.
 */
export const subscriptionItems = billingSchema.table(
  'subscription_items',
  {
    id: text('id').primaryKey(),
    subscriptionId: text('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // compute_app | compute_site | postgres_db | mysql_db | redis_db | object_storage | bandwidth | persistent_volume
    stripePriceId: text('stripe_price_id'),
    stripeMeterId: text('stripe_meter_id'),
    stripeSubscriptionItemId: text('stripe_subscription_item_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    subIdx: index('subscription_items_sub_idx').on(t.subscriptionId),
  }),
);

/**
 * Payment methods — Stripe PM references per org.
 */
export const paymentMethods = billingSchema.table(
  'payment_methods',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    stripePmId: text('stripe_pm_id').notNull(),
    brand: text('brand'), // visa | mastercard | amex | ...
    last4: text('last4'),
    expMonth: integer('exp_month'),
    expYear: integer('exp_year'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index('payment_methods_org_idx').on(t.orgId),
  }),
);

/**
 * Invoices — Stripe invoice mirror.
 */
export const invoices = billingSchema.table(
  'invoices',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    stripeInvoiceId: text('stripe_invoice_id').unique(),
    number: text('number'),
    status: text('status').notNull().default('draft'), // draft | open | paid | void | uncollectible
    totalCents: integer('total_cents').notNull().default(0),
    taxCents: integer('tax_cents').notNull().default(0),
    currency: text('currency').notNull().default('usd'),
    periodStart: timestamp('period_start', { withTimezone: true }),
    periodEnd: timestamp('period_end', { withTimezone: true }),
    pdfUrl: text('pdf_url'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index('invoices_org_idx').on(t.orgId),
    statusIdx: index('invoices_status_idx').on(t.status),
  }),
);

/**
 * Usage events — raw, append-only. Partitioned by day in production.
 * Natural key: (org, resource, kind, occurred_at).
 */
export const usageEvents = billingSchema.table(
  'usage_events',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    resourceId: text('resource_id').notNull(), // app_xxx | db_xxx | bucket_xxx
    kind: text('kind').notNull(), // compute_tick | pv_size | bandwidth_bytes | db_io_bytes
    qty: integer('qty').notNull(),
    unit: text('unit').notNull(), // ticks | bytes | mb
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgResourceIdx: index('usage_events_org_resource_idx').on(t.orgId, t.resourceId),
    occurredIdx: index('usage_events_occurred_idx').on(t.occurredAt),
  }),
);

/**
 * Usage hourly — rolled-up per (org, resource, kind, hour).
 */
export const usageHourly = billingSchema.table(
  'usage_hourly',
  {
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    resourceId: text('resource_id').notNull(),
    kind: text('kind').notNull(),
    hour: timestamp('hour', { withTimezone: true }).notNull(),
    qty: integer('qty').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.orgId, t.resourceId, t.kind, t.hour] }),
  }),
);

/**
 * Meter shipments — tracks batched meter events sent to Stripe Billing Meters.
 */
export const meterShipments = billingSchema.table(
  'meter_shipments',
  {
    id: text('id').primaryKey(),
    hour: timestamp('hour', { withTimezone: true }).notNull(),
    kind: text('kind').notNull(),
    batchId: text('batch_id').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    stripeEventCount: integer('stripe_event_count').notNull().default(0),
    status: text('status').notNull().default('pending'), // pending | sent | failed
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    hourKindIdx: uniqueIndex('meter_shipments_hour_kind_batch_idx').on(t.hour, t.kind, t.batchId),
  }),
);

/**
 * Tax profiles — VAT/GST IDs per org.
 */
export const taxProfiles = billingSchema.table('tax_profiles', {
  orgId: text('org_id')
    .primaryKey()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  country: text('country').notNull(),
  vatId: text('vat_id'),
  validatedAt: timestamp('validated_at', { withTimezone: true }),
  exempt: boolean('exempt').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Dunning state — payment failure escalation per org.
 * Levels: 1 (retry +3d), 2 (+5d email), 3 (+7d suspend non-prod),
 *         4 (+10d suspend all), 5 (+14d cancel + final notice).
 */
export const dunningState = billingSchema.table('dunning_state', {
  orgId: text('org_id')
    .primaryKey()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  level: integer('level').notNull().default(0),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Credits — promotional and comp credits per org.
 */
export const credits = billingSchema.table(
  'credits',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // promo | comp | refund
    amountCents: integer('amount_cents').notNull(),
    remainingCents: integer('remaining_cents').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    appliedToInvoiceId: text('applied_to_invoice_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index('credits_org_idx').on(t.orgId),
  }),
);

/**
 * Stripe webhook events — idempotent event log. Replay-safe via event.id dedupe.
 */
export const stripeWebhookEvents = billingSchema.table(
  'stripe_webhook_events',
  {
    stripeEventId: text('stripe_event_id').primaryKey(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    typeIdx: index('stripe_webhook_events_type_idx').on(t.eventType),
  }),
);

// -----------------------------------------------------------------------------
// DATABASES (Phase 3 — Managed Postgres, MySQL, Redis)
// See: docs/plans/14-managed-databases-d1e00e.md
// -----------------------------------------------------------------------------

export const databasesSchema = pgSchema('databases');

/**
 * Engine enum values.
 */
export const DB_ENGINES = ['postgres', 'mysql', 'redis'] as const;
export const DB_SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '4xl'] as const;
export const DB_STATUSES = [
  'provisioning',
  'ready',
  'scaling',
  'backing_up',
  'restoring',
  'maintenance',
  'failed',
  'deleting',
  'deleted',
] as const;

/**
 * Managed databases — core resource table.
 */
export const managedDatabases = databasesSchema.table(
  'managed_databases',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environmentId: text('environment_id').references(() => environments.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    engine: text('engine').notNull(), // postgres | mysql | redis
    version: text('version').notNull(), // e.g. "17", "8.4", "7.4"
    size: text('size').notNull().default('s'), // xs | s | m | l | xl | 2xl | 4xl
    ha: boolean('ha').notNull().default(false),
    region: text('region').notNull().default('eu-central'),
    storageGb: integer('storage_gb').notNull().default(1),
    status: text('status').notNull().default('provisioning'),
    endpointHost: text('endpoint_host'),
    endpointPort: integer('endpoint_port'),
    masterUsername: text('master_username').notNull().default('absolo'),
    /** Encrypted master password — decrypted at runtime, never exposed in API responses */
    masterPasswordEnc: text('master_password_enc'),
    /** K8s namespace where the operator CR lives */
    k8sNamespace: text('k8s_namespace'),
    /** K8s CR name for the operator instance */
    k8sCrName: text('k8s_cr_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    orgIdx: index('managed_databases_org_idx').on(t.orgId),
    projectIdx: index('managed_databases_project_idx').on(t.projectId),
    statusIdx: index('managed_databases_status_idx').on(t.status),
  }),
);

/**
 * Database users — per-app scoped credentials.
 */
export const databaseUsers = databasesSchema.table(
  'database_users',
  {
    id: text('id').primaryKey(),
    databaseId: text('database_id')
      .notNull()
      .references(() => managedDatabases.id, { onDelete: 'cascade' }),
    username: text('username').notNull(),
    passwordEnc: text('password_enc'),
    scope: text('scope').notNull().default('full'), // full | readonly | app
    boundAppId: text('bound_app_id').references(() => apps.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    dbIdx: index('database_users_db_idx').on(t.databaseId),
  }),
);

/**
 * Database backups — WAL archives + snapshots.
 */
export const databaseBackups = databasesSchema.table(
  'database_backups',
  {
    id: text('id').primaryKey(),
    databaseId: text('database_id')
      .notNull()
      .references(() => managedDatabases.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // wal | snapshot
    status: text('status').notNull().default('running'), // running | completed | failed
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    sizeBytes: integer('size_bytes'),
    locationUrl: text('location_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    dbIdx: index('database_backups_db_idx').on(t.databaseId),
  }),
);

/**
 * Maintenance windows — per-DB schedule for automatic minor upgrades.
 */
export const maintenanceWindows = databasesSchema.table('maintenance_windows', {
  databaseId: text('database_id')
    .primaryKey()
    .references(() => managedDatabases.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull().default(0), // 0=Sunday
  hourUtc: integer('hour_utc').notNull().default(4),
  durationMin: integer('duration_min').notNull().default(60),
});

/**
 * Parameter groups — engine-specific tuning profiles.
 */
export const parameterGroups = databasesSchema.table('parameter_groups', {
  id: text('id').primaryKey(),
  engine: text('engine').notNull(),
  version: text('version').notNull(),
  name: text('name').notNull(),
  /** JSON map of parameter_name → value */
  params: jsonb('params').notNull().default({}),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// STORAGE (Phase 3 — S3-compatible object storage via SeaweedFS)
// See: docs/plans/15-object-storage-s3-d1e00e.md
// -----------------------------------------------------------------------------

export const storageSchema = pgSchema('storage');

/**
 * Buckets — S3-compatible object storage.
 */
export const buckets = storageSchema.table(
  'buckets',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    region: text('region').notNull().default('eu-central'),
    name: text('name').notNull(), // Display name
    slug: text('slug').notNull(), // Used for S3 bucket name: <org-slug>-<slug>
    publicRead: boolean('public_read').notNull().default(false),
    versioning: boolean('versioning').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    orgIdx: index('buckets_org_idx').on(t.orgId),
    projectIdx: index('buckets_project_idx').on(t.projectId),
    slugUnique: uniqueIndex('buckets_org_slug_unique').on(t.orgId, t.slug),
  }),
);

/**
 * Bucket lifecycle rules — per-prefix expiry/transition.
 */
export const bucketLifecycleRules = storageSchema.table(
  'bucket_lifecycle_rules',
  {
    id: text('id').primaryKey(),
    bucketId: text('bucket_id')
      .notNull()
      .references(() => buckets.id, { onDelete: 'cascade' }),
    prefix: text('prefix').notNull().default(''),
    expireDays: integer('expire_days'),
    transitionDays: integer('transition_days'),
    transitionClass: text('transition_class'), // cold | archive (phase 2)
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    bucketIdx: index('bucket_lifecycle_rules_bucket_idx').on(t.bucketId),
  }),
);

/**
 * Access keys — S3 credentials per org or per app.
 */
export const accessKeys = storageSchema.table(
  'access_keys',
  {
    id: text('id').primaryKey(),
    ownerKind: text('owner_kind').notNull(), // org | app
    ownerId: text('owner_id').notNull(), // org_xxx or app_xxx
    scope: text('scope').notNull().default('org'), // org | bucket
    bucketId: text('bucket_id').references(() => buckets.id, { onDelete: 'cascade' }),
    accessKey: text('access_key').notNull().unique(),
    /** Hashed secret — only shown once on creation */
    secretHash: text('secret_hash').notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    ownerIdx: index('access_keys_owner_idx').on(t.ownerKind, t.ownerId),
  }),
);

/**
 * Object stats — hourly per-bucket usage snapshots.
 */
export const objectStats = storageSchema.table(
  'object_stats',
  {
    bucketId: text('bucket_id')
      .notNull()
      .references(() => buckets.id, { onDelete: 'cascade' }),
    hour: timestamp('hour', { withTimezone: true }).notNull(),
    bytesStoredAvg: integer('bytes_stored_avg').notNull().default(0),
    bytesEgress: integer('bytes_egress').notNull().default(0),
    requests: integer('requests').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.bucketId, t.hour] }),
  }),
);

// -----------------------------------------------------------------------------
// BINDINGS (Phase 3 — bind DB/bucket to app, auto-inject env vars)
// -----------------------------------------------------------------------------

export const bindingsSchema = pgSchema('bindings');

/**
 * Bindings — connect an app to a database or bucket.
 * When bound, the system auto-injects connection env vars into the app.
 */
export const bindings = bindingsSchema.table(
  'bindings',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    resourceType: text('resource_type').notNull(), // database | bucket
    resourceId: text('resource_id').notNull(), // managed_db_xxx or bucket_xxx
    envPrefix: text('env_prefix').notNull(), // e.g. DATABASE, REDIS, S3
    autoInject: boolean('auto_inject').notNull().default(true),
    status: text('status').notNull().default('active'), // active | pending | error
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    appIdx: index('bindings_app_idx').on(t.appId),
    resourceIdx: index('bindings_resource_idx').on(t.resourceType, t.resourceId),
    uniqueBinding: uniqueIndex('bindings_app_resource_unique').on(
      t.appId,
      t.resourceType,
      t.resourceId,
    ),
  }),
);

// -----------------------------------------------------------------------------
// ENTERPRISE (Phase 6 — BYO Infrastructure)
// -----------------------------------------------------------------------------

export const enterpriseSchema = pgSchema('enterprise');

export const enterpriseClusters = enterpriseSchema.table(
  'clusters',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    location: text('location').notNull(),
    planKind: text('plan_kind').notNull().default('byo'),
    regionProxy: text('region_proxy'), // the absolo region this cluster connects to
    totalHosts: integer('total_hosts').notNull().default(0),
    complianceTags: jsonb('compliance_tags').notNull().default('[]'),
    onboardingStatus: text('onboarding_status').notNull().default('pending'), // pending | provisioning | active | suspended
    contractStart: timestamp('contract_start', { withTimezone: true }),
    contractEnd: timestamp('contract_end', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index('enterprise_clusters_org_idx').on(t.orgId),
  }),
);

export const clusterHosts = enterpriseSchema.table(
  'cluster_hosts',
  {
    id: text('id').primaryKey(),
    clusterId: text('cluster_id')
      .notNull()
      .references(() => enterpriseClusters.id, { onDelete: 'cascade' }),
    fqdn: text('fqdn').notNull(),
    role: text('role').notNull(), // control-plane | worker
    status: text('status').notNull().default('offline'), // offline | online | cordoned | upgrading
    agentVersion: text('agent_version'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    clusterIdx: index('cluster_hosts_cluster_idx').on(t.clusterId),
  }),
);

export const clusterContracts = enterpriseSchema.table(
  'cluster_contracts',
  {
    id: text('id').primaryKey(),
    clusterId: text('cluster_id')
      .notNull()
      .references(() => enterpriseClusters.id, { onDelete: 'cascade' }),
    msaUrl: text('msa_url'),
    dpaUrl: text('dpa_url'),
    slaTarget: text('sla_target'), // e.g. "99.99"
    slaCreditsTerms: text('sla_credits_terms'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    clusterIdx: uniqueIndex('cluster_contracts_cluster_unique').on(t.clusterId),
  }),
);
