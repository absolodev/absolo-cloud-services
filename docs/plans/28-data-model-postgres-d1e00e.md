# 28 — Postgres Data Model

Single primary Postgres database with one schema per module — strong boundaries by convention and DB privilege, while keeping operational simplicity. This file consolidates the canonical tables across modules.

## Database & schemas
- DB: `absolo` on CloudNativePG (Postgres 17).
- Schemas: `iam`, `billing`, `projects`, `versioning`, `orchestrator`, `dns`, `ssl`, `templates`, `databases`, `object_storage`, `snapshots`, `fleet`, `audit`, `routing`, `outbox`, `idempotency`, `notifications`, `support`, `feature_flags`.
- Each schema owned by a role with the same name; the application connects with a role granted USAGE on all schemas but with row-level scoping where appropriate.
- Cross-schema FKs only by ID. JOINs across schemas are allowed in queries but not in module code (modules call other modules' query services).

## Conventions
- IDs: ULIDs stored as `text` (or `bytea`) — sortable, URL-safe, globally unique.
- All tables have `created_at timestamptz default now()` and (where mutable) `updated_at`.
- Soft-delete via `deleted_at timestamptz` on user-facing tables; hard-delete for transient/append-only.
- `tenant_id` (org_id) on every multi-tenant table; partial indexes by `tenant_id`.
- Money: `bigint` cents (NEVER float).
- Enums: native Postgres `CREATE TYPE` enums for stable enums; `text` + check constraint for ones likely to evolve.
- JSON: `jsonb` for semi-structured fields; index where queried.

## Selected core tables (illustrative; full DDL in repo)

### iam
```sql
iam.users(id, email, email_verified_at, password_hash, mfa_required, locked_at, created_at)
iam.identities(id, user_id, provider, subject, email)
iam.organizations(id, slug, name, billing_email, plan_id, created_at)
iam.memberships(user_id, org_id, role_id, created_at, primary key(user_id, org_id))
iam.roles(id, org_id NULL, name, builtin)
iam.permissions(id, key, description)
iam.role_permissions(role_id, permission_id, primary key(role_id, permission_id))
iam.sessions(id, user_id, refresh_token_hash, ua, ip, last_seen_at, revoked_at, created_at)
iam.api_keys(id, owner_kind, owner_id, prefix, hash, scopes, ip_allowlist, expires_at, last_used_at, created_at)
iam.mfa_factors(id, user_id, kind, secret_or_credential, label, last_used_at, created_at)
iam.password_resets(token_hash, user_id, expires_at, used_at)
```

### billing
```sql
billing.plans(id, code, name, monthly_anchor_cents, included_units, archived_at)
billing.subscriptions(id, org_id, plan_id, stripe_subscription_id, status, current_period_start, current_period_end)
billing.subscription_items(id, subscription_id, kind, stripe_price_id, stripe_meter_id)
billing.payment_methods(id, org_id, stripe_pm_id, brand, last4, exp_month, exp_year, is_default)
billing.invoices(id, org_id, stripe_invoice_id, number, status, total_cents, tax_cents, period_start, period_end, pdf_url)
billing.usage_events(id, org_id, resource_id, kind, qty NUMERIC, unit, occurred_at, ingested_at) PARTITION BY RANGE (occurred_at)
billing.usage_hourly(org_id, resource_id, kind, hour, qty, primary key(org_id, resource_id, kind, hour))
billing.meter_shipments(id, hour, kind, batch_id, sent_at, status, error)
billing.tax_profiles(org_id, country, vat_id, validated_at, exempt)
billing.dunning(org_id, level, last_attempt_at, next_attempt_at)
billing.credits(id, org_id, kind, amount_cents, applied_to_invoice_id, expires_at, created_at)
billing.stripe_webhook_events(stripe_event_id PK, type, payload, processed_at)
```

### projects
```sql
projects.projects(id, org_id, slug, name, region_default, archived_at, created_at)
projects.environments(id, project_id, name, kind, auto_promote, created_at)
projects.apps(id, environment_id, slug, mode, source_kind, source_ref, default_branch, build_spec, runtime_spec, deleted_at, created_at)
projects.sites(id, environment_id, slug, mode, template_id, runtime_spec, pv_size_gb, deleted_at, created_at)
projects.env_vars(id, owner_kind, owner_id, key, value_encrypted, secret, created_at)
projects.bindings(id, owner_kind, owner_id, target_kind, target_id, env_prefix, created_at)
projects.replicas(id, app_or_site_id, host_id, pod_name, region, status, started_at, last_seen_at)
```

### versioning
```sql
versioning.versions(id, app_id, sequence_no, image_digest, image_ref, source_kind, source_ref, source_sha, builder_version, sbom_url, signature, env_snapshot_id, created_at, retired_at)
versioning.env_snapshots(id, version_id, vars_encrypted JSONB, bindings JSONB)
versioning.deployments(id, app_id, version_id, strategy, status, traffic_pct, started_by, started_at, finished_at, prev_version_id, message)
versioning.traffic_splits(app_id, version_id, pct, since, primary key(app_id, version_id))
```

### orchestrator
```sql
orchestrator.saga_runs(id, kind, status, started_at, finished_at, last_error)
orchestrator.saga_steps(id, saga_id, idx, name, status, idempotency_key, started_at, finished_at, attempts, last_error, output)
orchestrator.scheduling_decisions(id, app_or_site_id, host_id, region, decided_at, reason)
orchestrator.migration_plans(id, app_or_site_id, source_host_id, target_host_id, status, started_at, finished_at)
```

### dns / ssl
```sql
dns.subdomains(id, full_host UNIQUE, app_or_site_id, owner_org_id, region, allocated_at, released_at)
dns.records(id, zone, name, type, value, ttl, source, last_synced_at)
ssl.domains(id, app_or_site_id, hostname, hostname_ascii, status, verification_method, primary_for_app, hsts, hsts_preload, cert_secret_ref, cert_issuer, cert_expires_at, last_checked_at)
ssl.domain_events(id, domain_id, event_kind, payload, at)
```

### templates
```sql
templates.catalog(id PK, version, name, manifest JSONB, signed_at, archived_at)
templates.assets(id, template_id, kind, ref) -- icons, hero, docs
```

### databases / object_storage
```sql
databases.databases(id, org_id, project_id, environment_id, engine, version, size, ha, region, storage_gb, status, endpoint_host, endpoint_port, master_username, vault_secret_path, deleted_at, created_at)
databases.users(id, database_id, username, scope, ttl_at, vault_secret_path)
databases.backups(id, database_id, kind, start_at, end_at, bytes, location_url, status)
object_storage.buckets(id, org_id, project_id, region, name UNIQUE PER REGION, slug, public_read, versioning, deleted_at, created_at)
object_storage.lifecycle_rules(id, bucket_id, prefix, expire_days, transition_days, transition_class)
object_storage.access_keys(id, owner_kind, owner_id, scope, bucket_id, access_key, secret_hash, last_used_at, created_at)
```

### snapshots
```sql
snapshots.snapshots(id, site_id, kind, longhorn_snap_id, db_snapshot_ref, bytes, started_at, completed_at, status, retention_until, parent_snapshot_id)
snapshots.policies(site_id PK, schedule_cron, retain_count, cross_region, max_size_gb)
snapshots.restore_jobs(id, snapshot_id, target_kind, new_pv_id, status, started_at, completed_at)
```

### fleet
```sql
fleet.regions(code PK, name, status, created_at)
fleet.hosts(id, region, hostname, fqdn, ip_public, ip_private, plan_tier, labels JSONB, taints JSONB, cpu_cores, mem_gb, disk_gb, allocatable_cpu, allocatable_mem, allocatable_pv_gb, agent_version, k3s_version, kernel_version, status, last_heartbeat_at, joined_at, decommissioned_at)
fleet.host_maintenance(id, host_id, kind, scheduled_at, completed_at, status)
```

### audit
```sql
audit.events(id, actor_kind, actor_id, action, target_kind, target_id, payload JSONB, before JSONB, after JSONB, ip, ua, request_id, trace_id, ts) -- partitioned daily
audit.event_chain(id PK, prev_hash, hash) -- tamper-evident chain
```

### routing
```sql
routing.routes(domain PK, region, app_or_site_id, primary_upstream JSONB, backup_upstream JSONB, options JSONB, updated_at)
```

### outbox / idempotency / feature_flags / notifications / support
- `outbox.events(id PK, aggregate_id, kind, payload, tenant, created_at, sent_at, attempts, last_error)`
- `idempotency.keys(actor_id, key, request_hash, response_status, response_body, created_at, expires_at, primary key(actor_id, key))`
- `feature_flags.flags(key PK, enabled, rules JSONB, updated_at)`
- `notifications.deliveries(id, kind:'email'|'in_app'|'webhook', target, payload, status, attempts, sent_at)`
- `support.tickets(id, org_id, status, subject, opened_by, assigned_to, created_at, closed_at)`
- `support.messages(id, ticket_id, author_kind, author_id, body, attachments JSONB, created_at)`

## Indexing strategy
- Tenant-prefixed btree on every multi-tenant table for the most common queries (`(org_id, created_at desc)`).
- GIN on jsonb columns where queried.
- Partial indexes for "active" rows (`WHERE deleted_at IS NULL`).
- Time-series tables (usage_events, audit.events) partitioned daily; retention drops old partitions.

## Migrations
- Drizzle Kit, schema-per-module folders.
- All migrations forward-only; rollback by writing inverse.
- CI verifies migrations are linear (no merge conflicts in ordering).

## Backups & PITR
- Postgres WAL archived continuously to bucket; PITR enabled.
- Daily logical dumps for disaster scenarios where physical restore fails.
- Cross-region replica + S3-archived WAL gives ~RPO=0/RTO<5min via promote.

## Performance budgets
- Average query under 5ms; p99 under 50ms for OLTP paths.
- Reports run on read replicas; no analytic queries on primary.

## Open items
- Pgvector enabled in `templates.catalog` for semantic search across templates — phase 1.5.
- Logical replication to ClickHouse for advanced analytics — phase 2.
