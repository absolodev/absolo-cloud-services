# 08 — Projects, Apps & Sites Domain

The customer-facing object model that everything else hangs off of: organizations contain projects, projects contain environments, environments contain apps (Apps mode) or sites (Sites mode), each app/site has deployments, domains, env vars, and bindings to managed services (DBs, buckets).

## Domain model
```
Project { id, org_id, slug, name, region_default, created_at, archived_at }
Environment { id, project_id, name, kind:'production'|'staging'|'preview', auto_promote }
App { id, environment_id, slug, mode:'apps', source_kind:'git'|'dockerfile'|'image'|'template', source_ref, default_branch, build_spec(json), runtime_spec(json), created_at }
Site { id, environment_id, slug, mode:'sites', template_id, runtime_spec(json), pv_size_gb, created_at }
EnvVar { id, owner_kind:'app'|'site', owner_id, key, value_encrypted, secret:bool }
Binding { id, owner_kind, owner_id, target_kind:'database'|'bucket', target_id, env_prefix }
Deployment { id, app_id, version_id, source_commit_sha, build_log_url, status, started_at, finished_at, traffic_pct }
Replica { id, app_or_site_id, host_id, pod_name, region, status, started_at, last_seen_at }
ResourceSize { code:'XS'|'S'|'M'|'L'|'XL'|'2XL', cpu_millicores, memory_mb }
```

## Aggregate boundaries
- `Project` is the root for project-scoped consistency (slugs, environments).
- `App` and `Site` are separate aggregates that reference Project. They diverge enough in lifecycle (Apps have Deployments + Versions, Sites have Snapshots) that splitting them is correct.
- `Deployment` is its own aggregate with hard rules (immutable once succeeded; only fwd transitions: queued → building → deploying → live → superseded/rolled-back/failed).

## Lifecycle: App
1. **Create**: user picks source (Git/Dockerfile/image/template) + region + size; we create App, default Environment, attach default subdomain via `dns` module.
2. **Build**: command `BuildApp(appId, sourceRef)` → saga: clone → detect → build (CNB/Dockerfile) → push → create Version (immutable) → trigger deploy.
3. **Deploy**: command `DeployApp(versionId, strategy)` → saga: render manifests → submit to k8s via `orchestrator` → wait for readiness → flip `edge-proxy` → record traffic_pct.
4. **Scale**: command `ScaleApp(size, replicas)` → orchestrator finds capacity, may trigger migration (`23-multi-region-networking-d1e00e.md`).
5. **Rollback**: command `RollbackApp(toVersionId)` → instant traffic flip to existing pods if still warm, else redeploy.
6. **Delete**: soft-delete (14d retention), purge resources, release domains.

## Lifecycle: Site
1. **Create**: user picks template, region, size, PV size; we instantiate per template manifest (see `13-templates-catalog-d1e00e.md`).
2. **Provision**: saga: provision PV (Longhorn) → managed DB (if template requires) → bucket (if template requires) → app pod with template image → DNS → SSL → snapshot policy.
3. **Backup**: scheduled snapshots per `21-snapshots-backups-d1e00e.md`.
4. **Restore**: roll back to a snapshot (creates new PV from snapshot, swaps mount, may incur brief downtime).
5. **Upgrade**: in-place template upgrade flow: take snapshot → upgrade image → run hook (e.g., `wp core update-db`) → mark healthy.
6. **Delete**: soft-delete (14d), purge after grace.

## Environments (production / staging / preview)
- Every Project always has a `production` environment (auto-created).
- **Staging is a first-class, billable environment.** A customer can opt-in via dashboard: "Add staging". On Pro+ plans, the **first** staging env is included free of any flat fee (still pays usage on actual resources running in it). Additional staging envs (or any staging env on Hobby/Starter) cost a flat **$3/mo per environment** in addition to actual usage. Pricing detail in `33-pricing-packaging-d1e00e.md`.
- **Preview** environments (per-pull-request) are phase 2; metered like staging but ephemeral.
- Each environment has its own:
  - Resource sizing (default smaller than prod, e.g., XS instead of M).
  - Env vars (separate from prod).
  - Bound DBs/buckets (separate or shared with prod via a binding policy; default = separate).
  - Free subdomain (`<slug>-staging-<rand>.absolo.app`).
  - Custom domain (optional).
  - Snapshot/version retention (smaller defaults than prod to control cost).
- **Promotion** `staging` → `production`: same Version (immutable image digest) deployed to prod environment with prod env vars and DB bindings. No rebuild.
- Optional `auto_promote_on_passing_checks` — if CI checks reported by webhook all pass, promote automatically (Pro+ only).
- **Suspending an environment** (instead of deleting): orchestrator scales replicas to zero, PVs preserved, billing for compute pauses, PV/storage continues. Useful when a customer wants to keep staging around but not pay compute when idle.

## Environment lifecycle commands
```
POST /v1/projects/:projectId/environments         { kind: 'staging', size_default: 'XS' }
POST /v1/environments/:envId/suspend
POST /v1/environments/:envId/resume
DELETE /v1/environments/:envId                    (keeps 14d before purge)
POST /v1/environments/:envId/promote-to/:targetEnvId
```

## Bindings
- An app or site can be bound to managed DBs and buckets within the same org/region.
- Binding injects connection info as env vars under a configurable prefix (e.g., `DATABASE_URL`, `S3_*`).
- Credentials are short-lived where possible (DB: rotated 7d; bucket: per-app IAM key).

## Domains & SSL hooks
- Each app/site auto-receives `<slug>-<rand4>.absolo.app` (free wildcard SSL).
- Custom domains added through `17-custom-domains-ssl-d1e00e.md`.
- Edge-proxy routing table updated atomically.

## API surface (excerpt)
```
POST /v1/orgs/:orgId/projects
GET  /v1/orgs/:orgId/projects
POST /v1/projects/:projectId/environments
POST /v1/projects/:projectId/apps
POST /v1/apps/:appId/deployments
POST /v1/apps/:appId/rollback
POST /v1/apps/:appId/scale
GET  /v1/apps/:appId/replicas
POST /v1/projects/:projectId/sites
POST /v1/sites/:siteId/snapshots
POST /v1/sites/:siteId/restore
POST /v1/apps-or-sites/:id/env-vars
POST /v1/apps-or-sites/:id/bindings
```

## Real-time channels
- `ws /v1/apps/:id/deployments/:depId/log` — live build/deploy log (until terminal state).
- `ws /v1/apps/:id/replicas/:repId/log` — live runtime log tail.
- `sse /v1/apps/:id/status` — pod status, traffic split, health.

## Validation rules
- Project slug: `[a-z][a-z0-9-]{1,38}[a-z0-9]`, unique per org.
- App/Site slug: same pattern, unique per environment.
- ResourceSize: must be allowed by current plan; downgrade requires no PV constraint violation.
- Region: must be a region the org's plan permits.

## Quotas (enforced at command level)
- Per-plan caps on number of projects, apps, sites, replicas, total memory, total PV.
- **Staging environments** count toward plan limits: Free = 0, Hobby = 1 paid ($3/mo flat), Starter = 1 paid, Pro = 1 free + extras paid, Business = 3 free + extras paid.
- Per-org max env vars per resource (200), max env-var size (256KB), max bindings per resource (10).

## Events
- `projects.created/updated/archived`
- `apps.created/built/deployed/scaled/rolled_back/deleted`
- `sites.created/upgraded/restored/deleted`
- All consumed by: `billing` (uplift checks), `notifications` (email user), `audit`, `dns`, `ssl`.

## Tests
- Domain unit tests with no DB.
- Saga integration tests with Testcontainers (Postgres + NATS).
- E2E: create project → deploy template → see live URL via headless browser.

## Open items
- Pull-request preview environments (per-PR ephemeral envs) — phase 2 (will reuse the staging env machinery; metered like staging without the $3 flat fee since they're auto-cleaned).
- Multi-replica blue/green per region — phase 2.
- Cross-environment data masking on promotion (e.g., scrub PII when copying prod data to staging) — phase 2.
