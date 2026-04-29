# 14 — Managed Databases

Hourly-billed managed Postgres, MySQL, and Redis offered through the dashboard, deployed on the same k3s clusters via mature Kubernetes operators with HA, backups, and connection security as first-class.

## Offerings at launch
| Engine | Operator | Versions | Storage | HA option |
|---|---|---|---|---|
| Postgres | **CloudNativePG** | 15, 16, 17 | Longhorn block | Sync replicas (1 primary + 2 replicas) |
| MySQL | **Percona Operator for MySQL** | 8.0, 8.4 | Longhorn | Group Replication (3 nodes) |
| Redis | **Spotahome Redis Operator** or **OT Redis Operator** | 7.4 | optional persist | Sentinel HA |

Postgres is our most-loved offering (lots of internal expertise from the control plane). MySQL is must-have for WordPress/WooCommerce templates. Redis is critical for Laravel/Node apps.

## Why CloudNativePG
- Active CNCF Sandbox project, modern, no Pgbouncer-as-mandatory baggage.
- Solid HA, streaming replication, automatic failover, Barman-based backups to S3.
- Already widely used in production; matches our k8s-first stack.
- Alternative considered: Zalando Postgres Operator (mature but older design), Crunchy PGO (mature commercial bias).

## Plans & sizing
- Same size matrix as apps (XS/S/M/L/XL/2XL/4XL).
- HA add-on: doubles compute (primary + 1 sync replica + 1 async replica).
- Storage tier: 1GB-2TB, expand only (no shrink — surfaced as such).
- Backups: 7d standard, 30d/90d add-on.
- IOPS: not capped at v1 (Longhorn natural limits apply); phase 2 differentiated tiers.

## Provisioning flow
1. User picks engine + version + size + storage + HA toggle + region.
2. `databases` module enqueues saga: namespace → operator CR → wait ready → create users → store creds in Vault → emit `DatabaseProvisioned`.
3. Connection info (host:port + creds) shown in dashboard; user can rotate.

## Connection security
- TLS required by default (operator-managed certs); plain TCP available with explicit opt-in (warn).
- IP allowlist: default = "any in-cluster bound apps"; public access opt-in with allowlist (rate-limited).
- Per-app credentials: when an app binds to a DB, we create a per-app role/user with scoped permissions (Postgres: schema-bound; MySQL: db-bound).
- Credential rotation: user-triggered; 7-day automatic for app-bound creds (phase 2).

## Backups
- Postgres: continuous WAL archiving via Barman → S3 (SeaweedFS) — PITR supported.
- MySQL: scheduled XtraBackup snapshots via operator → S3.
- Redis: optional RDB snapshots to S3 (most users use Redis as cache and don't care).
- Restore: new DB instance from backup at chosen PITR (Postgres) or snapshot.

## Backup security
- Encrypted at rest (age + master key in Vault) + in-transit.
- Cross-region copy (phase 2 add-on).
- Immutable bucket policy on backup buckets prevents tampering.

## Maintenance
- Per-DB maintenance window (default Sunday 04:00 UTC tenant local).
- Operator-driven minor version upgrades automatic in maintenance window with notice.
- Major version upgrades = user-initiated with snapshot.

## Performance defaults
- Postgres tuned per size class (`max_connections`, `shared_buffers`, `effective_cache_size`, `work_mem` derived from RAM/CPU).
- PgBouncer sidecar optional (phase 1.5) for connection pooling.

## Observability
- Built-in dashboard panels: connections, qps, slow queries (Postgres pg_stat_statements), replica lag, disk usage, IOPS.
- Slow-query log surfaced in UI.

## Quotas & abuse
- Free plan: no managed DBs (use template-bundled DB only).
- Paid plans: per-plan max DBs and total storage.
- Rate-limited: max 5 DB creations per hour per org to prevent runaway scripts.

## Domain model
```
Database { id, org_id, project_id, environment_id, engine, version, size, ha, region, storage_gb,
           status, endpoint_host, endpoint_port, master_username, vault_secret_path, created_at }
DatabaseUser { id, database_id, username, scope, ttl_at, vault_secret_path }
Backup { id, database_id, kind:'wal'|'snapshot', start_at, end_at, bytes, location_url, status }
MaintenanceWindow { database_id, day_of_week, hour_utc, duration_min }
ParameterGroup { id, engine, version, name, params_json }
```

## API surface (excerpt)
```
POST /v1/projects/:projectId/databases
GET  /v1/databases/:id
POST /v1/databases/:id/users
POST /v1/databases/:id/restore
POST /v1/databases/:id/backups            # on-demand
PUT  /v1/databases/:id/parameter-group
PUT  /v1/databases/:id/scale
GET  /v1/databases/:id/metrics
```

## Pricing
- Compute = uptime hourly per size class (HA doubles).
- Storage = $/GB/mo prorated hourly.
- Backups = included up to 7d retention; add-on for longer.

## Tests
- Operator-level tests in CI (kind cluster, install operator, provision sample DB).
- Disaster drills: kill primary → measure failover time + data loss (target zero).
- Backup/restore drills weekly.

## Open items
- MongoDB offering — phase 2 (Percona MongoDB Operator).
- Vector DB (Postgres + pgvector enabled by default; standalone vector DB phase 2+).
- ClickHouse offering — phase 2.
- BYO storage class (NVMe local-only for high IOPS) — phase 2.
