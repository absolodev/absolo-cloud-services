# Absolo Cloud — Master Plan

A modern, opinionated PaaS that lets non-technical users launch real apps (WordPress, WooCommerce, Laravel, Next.js, custom code) on Absolo-owned infrastructure, with hourly billing, managed databases, S3-compatible object storage, free subdomains, custom domains with auto-SSL, live logs, web SSH, snapshots, versioning, and DigitalOcean-grade UX — built on a Rust + TypeScript stack atop k3s/Kubernetes with Longhorn persistent storage and a hardened multi-tenant security model.

> This is the canonical master plan. Detailed designs for each subsystem live in the numbered sub-plans (`01-…` through `40-…`) in this same directory. Suffix `-d1e00e` is appended to every plan filename.

---

## 1. Vision & Positioning

### 1.1 The product in one paragraph
Absolo Cloud is a PaaS that splits the difference between **Heroku/Render** (developer-grade git-push deploys) and **cPanel/Plesk** (template-driven hosting for non-technical owners). It runs on **infrastructure that Absolo provisions and operates** (Hetzner Cloud + Hetzner dedicated / Latitude.sh bare metal at launch) — a managed cloud with hourly billing, autoscaling, managed databases, object storage, and one-click templates. **Enterprise customers** get an opt-in **Bring-Your-Own-Infrastructure** option to attach their own clusters/hardware (`39-enterprise-byo-infra-d1e00e.md`). The look is **DigitalOcean-modern, high-contrast, dark-first** with shadcn/ui.

### 1.2 Two product modes (both in v1)
| Mode | Audience | Core feature | Persistence | Versioning |
|---|---|---|---|---|
| **Sites** (simple hosting) | Non-tech / template users (WP, Woo, Laravel skeleton, static sites) | 1-click templates, persistent volume, web SSH, snapshots | Always-on persistent volume (Longhorn) | Snapshots / restore points |
| **Apps** (app platform) | Developers | Git push / GitHub / Dockerfile / Buildpacks / Templates auto-detect | Stateless containers + bound services (DB, bucket) | Immutable build versions, instant rollback |

### 1.3 Core differentiators
- **Two-mode UX**: the dashboard surfaces the *right* abstraction (template wizard for non-tech, deploy logs + git for devs) instead of one bloated form.
- **Honest hourly billing** with predictable scale-up/scale-down (no surprise egress invoices for v1).
- **Customer staging environments** as a first-class, paid feature (Pro+ gets one staging env free; additional staging envs at usage rates + flat per-env fee).
- **Web SSH + live logs** baked in, never an afterthought.
- **Auto-SSL & free subdomain on day-one** for every project.
- **Enterprise BYO infrastructure** option for customers who must keep workloads on their own hardware (separate product, sales-led).

### 1.4 Non-goals (v1)
- No serverless functions / cold-start runtime (phase 2).
- No queues/streams as managed services beyond what's bundled with Apps (phase 2).
- No Windows containers.
- No Kubernetes-as-a-service (we use k8s internally; we don't expose it).

---

## 2. High-Level Architecture

### 2.1 Topology
```
                          ┌────────────────────────────────────────────┐
                          │            Public Internet                  │
                          └───────────────┬────────────────────────────┘
                                          │ Anycast/GeoDNS
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
        ┌─────▼─────┐               ┌─────▼─────┐               ┌─────▼─────┐
        │  EDGE-EU  │               │  EDGE-US  │               │ EDGE-APAC │
        │ Rust prox │               │ Rust prox │               │ Rust prox │
        └─────┬─────┘               └─────┬─────┘               └─────┬─────┘
              │                           │                           │
        ┌─────▼──────────┐          ┌─────▼──────────┐          ┌─────▼──────────┐
        │  REGION EU     │          │  REGION US     │          │  REGION APAC   │
        │  k3s cluster   │          │  k3s cluster   │          │  k3s cluster   │
        │  + Longhorn    │          │  + Longhorn    │          │  + Longhorn    │
        │  + CloudNPG    │          │  + CloudNPG    │          │  + CloudNPG    │
        │  + SeaweedFS   │          │  + SeaweedFS   │          │  + SeaweedFS   │
        │  + cert-mgr    │          │  + cert-mgr    │          │  + cert-mgr    │
        │  + Vector→Loki │          │  + Vector→Loki │          │  + Vector→Loki │
        │  Tenant pods…  │          │  Tenant pods…  │          │  Tenant pods…  │
        └────────────────┘          └────────────────┘          └────────────────┘
                                          ▲
                                          │ gRPC/mTLS
                          ┌───────────────┴────────────────┐
                          │   CONTROL PLANE (multi-region) │
                          │   NestJS modular monolith       │
                          │   + Rust services (builder,     │
                          │     log shipper, metering)      │
                          │   + Postgres (CNPG, primary EU, │
                          │     replicas US/APAC)           │
                          │   + NATS JetStream (events)     │
                          │   + Redis (cache, sessions)     │
                          └────────────────────────────────┘
```

### 2.2 Service inventory (hybrid: standalone services + modular monolith)

**Standalone services (separate processes/containers, scaled independently):**
| Service | Lang | Purpose |
|---|---|---|
| `edge-proxy` | Rust (Pingora) | Public ingress: TLS termination, HTTP routing, rate-limit, WAF, custom-domain SNI |
| `host-agent` | Rust | Runs on every customer-added host: k3s lifecycle, telemetry, exec proxy for Web SSH |
| `builder` | Rust + Go shims | Buildpacks/Dockerfile builds in isolated sandbox, pushes to registry |
| `log-shipper` | Rust (Vector fork or custom) | Tails container logs, ships to Loki/ClickHouse |
| `metering-aggregator` | Rust | Aggregates raw usage events → hourly billing meter events |
| `web-ssh-gateway` | Rust | WebSocket ↔ k8s exec bridge with policy enforcement |

**Modular monolith (`absolo-control-plane`, NestJS, one deployable, multiple modules):**
- `iam` — auth, users, orgs/teams, RBAC, MFA, sessions, API keys, OAuth (Google/GitHub)
- `billing` — Stripe, plans, subscriptions, invoices, usage records, tax, dunning
- `projects` — projects, environments, sites/apps, deploy specs
- `orchestrator` — schedules workloads onto k8s, plans migrations across hosts/regions
- `dns` — free `*.absolo.app` subdomains, custom domain CNAME validation
- `ssl` — cert-manager driver, Let's Encrypt + ZeroSSL fallback, custom certs upload
- `templates` — template catalog (WP, Woo, Laravel, Next.js, etc.) and lifecycle
- `databases` — managed Postgres/MySQL/Redis offering (CloudNativePG/Zalando, etc.)
- `object-storage` — S3-compatible buckets (SeaweedFS), credentials, lifecycle
- `versioning` — App Platform build/release versions, rollback, blue/green
- `snapshots` — Sites mode point-in-time snapshots (Longhorn + restic)
- `fleet` — host onboarding, drain, decommission, region/zone topology
- `domains-marketplace` — (phase 2) buy domain through us, auto-config
- `support` — tickets, abuse reports, audit log viewer
- `admin` — internal-only APIs for the admin dashboard

**Frontends (separate Next.js / React-TS apps):**
| App | Framework | Purpose |
|---|---|---|
| `marketing` | Next.js (App Router) | Public site, pricing, docs portal shell |
| `dashboard` | React 19 + Vite + TS | Customer dashboard (projects, billing, logs, etc.) |
| `admin` | React 19 + Vite + TS | Internal management (fleet, abuse, support, finance) |
| `status` | Next.js | Public status page (phase 1.5) |

### 2.3 Data plane vs control plane
- **Control plane** = NestJS monolith + Rust services + Postgres + NATS + Redis. Highly available, multi-region (active in EU primary, hot-standbys in US/APAC for DB; control APIs run active-active behind GeoDNS).
- **Data plane** = per-region k3s clusters running customer workloads, Longhorn for PV, SeaweedFS for object storage, CloudNativePG for managed DBs, edge-proxy as ingress.
- Strict boundary: control plane never has direct Linux access to data-plane hosts; everything goes through `host-agent` over mTLS.

### 2.4 Infrastructure & GitOps stack (added in revision)
- **OpenTofu** — declarative provisioning of servers, networks, DNS, load balancers (Hetzner Cloud + Latitude.sh providers).
- **Packer** — golden Ubuntu 24.04 images with `absolo-agent` baked in; new hosts boot ready-to-join.
- **ArgoCD** — GitOps app delivery for all Absolo services (UI we embed in admin dashboard, multi-cluster across regions, Argo Image Updater for promoted images, AppProjects for region scoping).
- **Helm** — chart packaging for every Absolo service (control plane, edge proxy, builder, log-shipper, web-ssh-gateway, host-agent DaemonSet).
- **Cosign** — image signing in CI; ArgoCD verifies signatures before deploy.
- **Renovate** — automated dep bumps (TS + Rust + Helm chart deps).
- See `37-infrastructure-as-code-d1e00e.md` for layout and per-region stacks; `38-platform-self-deployment-d1e00e.md` for how our own services update with zero downtime.

---

## 3. Technology Stack (final)

### 3.1 Languages
- **Rust** (1.83+ stable) — `host-agent`, `edge-proxy` (Pingora), `builder`, `log-shipper`, `metering-aggregator`, `web-ssh-gateway`
- **TypeScript** (5.7+, Node 22 LTS) — control-plane monolith (NestJS 11), all frontends
- **Bash/PowerShell** — installers only

### 3.2 Frontend
- **Next.js 15 (App Router, RSC)** — marketing
- **React 19 + Vite + TanStack Router/Query** — dashboard, admin
- **shadcn/ui + Tailwind CSS v4** — components, both dark + light themes, high-contrast tokens
- **Lucide** — icons
- **Recharts / visx** — charts (usage, billing, metrics)
- **xterm.js** — Web SSH terminal
- **react-hook-form + Zod** — forms + validation
- **@kubernetes/client-node** — *server-side only*, for orchestrator module

### 3.3 Backend
- **NestJS 11** with Fastify adapter — control-plane monolith
- **Drizzle ORM** + Postgres 17 — schemas with compile-time SQL safety
- **Zod** + `nestjs-zod` — DTO validation, OpenAPI generation
- **`@nestjs/cqrs`** — CQRS in modules where it pays off (billing, orchestrator); avoid in CRUD modules
- **NATS JetStream** — internal event bus + at-least-once durable streams
- **Redis 7.4** — caching, rate-limit counters, sessions
- **Stripe** + **Stripe Tax** — billing
- **Argon2id** for password hashing, **WebAuthn** + TOTP for MFA
- **Pino** for logs, **OpenTelemetry** for traces (→ Tempo) and metrics (→ VictoriaMetrics)

### 3.4 Rust crates of choice
- `pingora` (Cloudflare) — edge proxy core
- `axum` 0.8 — internal Rust HTTP services
- `tonic` — gRPC for host-agent ↔ control plane
- `tokio` — async runtime
- `sqlx` 0.8 — for Rust services that touch Postgres
- `nix` + `caps` — Linux capabilities/namespaces in agent
- `bollard` — Docker API (only for builder; on hosts we use k8s, not raw Docker)

### 3.5 Kubernetes & data plane
- **k3s** (lightweight Kubernetes, Apache 2.0, free) — one cluster per region
- **Cilium** — CNI with eBPF, network policies, encryption, host firewall
- **Longhorn** — replicated persistent volumes (Sites mode, managed DB storage)
- **CloudNativePG** — managed Postgres operator (also for our control-plane DB)
- **SeaweedFS** — S3-compatible object storage (lighter than MinIO, faster than Ceph)
- **cert-manager** — Let's Encrypt, ZeroSSL DNS-01 wildcards
- **gVisor** — userspace kernel for hardened isolation (default for shared-tenant pods)
- **Kata Containers** — microVM isolation for premium tier
- **External-DNS** — sync DNS records to Cloudflare/Route53
- **Vector** — log shipping
- **Loki** — short-term hot logs (7d), **ClickHouse** for long-term cold logs (90d+)
- **VictoriaMetrics** — time-series for metrics
- **Grafana** — internal dashboards (admin uses our own React UI, but ops uses Grafana)

### 3.6 Why NOT certain things
- **Docker Swarm** — moribund, no replicated PV story.
- **Pure Nomad** — fine, but smaller community; we picked k3s for ecosystem (Longhorn, CNPG, Cilium are k8s-native).
- **MinIO** — license shifted in 2024, we want zero license risk and lighter footprint → SeaweedFS or Garage.
- **Ceph** — too heavy/operational for v1.
- **Fluent Bit** — fine, but Vector's Rust core is more performant and ergonomic.
- **Prometheus** — VictoriaMetrics is wire-compatible but ~7× more efficient on storage; standard at scale.
- **Go control-plane** — user doesn't know Go; TypeScript leverages existing knowledge with no significant runtime penalty for CRUD-heavy services.

---

## 4. Multi-Tenancy & Security Model

### 4.1 Isolation tiers (the plan's recommendation)
| Tier | Plan | Compute | Network | Filesystem | Use cases |
|---|---|---|---|---|---|
| **Standard** | Hobby / Pro | Shared k3s nodes, **gVisor** runtime, cgroup v2 limits | Cilium NetworkPolicy per-namespace, no cross-tenant L3 | Longhorn PV per app, no shared mounts | 95% of users |
| **Hardened** | Business | Shared nodes, **Kata Containers** microVM | Same as Standard + dedicated egress proxy | Encrypted-at-rest PVs (LUKS) | Compliance-leaning |
| **Dedicated** | Enterprise | Dedicated k3s nodes (taints+tolerations), no neighbors | Per-tenant VPC-like overlay | Dedicated Longhorn replicas | High-trust workloads |

Default = **Standard with gVisor**. Hardened/Dedicated are upgrades. This matches the security/density balance of Fly.io, Render, and Northflank.

### 4.2 Threat model summary
Top threats and mitigations (full threat model in `25-security-hardening-d1e00e.md`):
1. **Container escape** → gVisor by default, seccomp profiles, drop all caps except needed, no `privileged` ever, read-only rootfs where possible.
2. **Cross-tenant network access** → Cilium default-deny, namespace isolation, eBPF egress filtering, TLS-only east-west via mTLS.
3. **Host compromise via host-agent** → host-agent runs as restricted user, mTLS pinning, signed binaries, no inbound from internet (only outbound to control plane), append-only audit log.
4. **Stolen tenant credentials** → short-lived JWT (15 min) + refresh, MFA required for billing/admin, IP allowlists for API keys, per-key scopes.
5. **Stripe webhook spoofing** → signature verification, replay protection, idempotency keys.
6. **DNS hijack of free subdomains** → DNSSEC on `absolo.app`, CAA records pinning Let's Encrypt + ZeroSSL.
7. **Build poisoning** → builder runs each build in fresh Kata microVM, no network except registry mirror, SBOM generated.
8. **Resource abuse / cryptominers** → cgroup CPU caps strict, anomaly detection on CPU steady-state, abuse-team workflow.
9. **Insider threat** → admin actions audited, dual-control on financial actions, no production DB shell access (only through admin UI with audit).
10. **Backup tampering** → backups encrypted (age) + immutable bucket policies + cross-region copy.

### 4.3 Compliance posture
- **GDPR-ready** from day 1 (data residency by region, DPA, data export, right-to-delete).
- **SOC2-ready architecture** (audit log, change mgmt, access reviews) — formal audit phase 2.
- **PCI** out of scope (Stripe handles).
- Full details: `32-compliance-legal-d1e00e.md`.

---

## 5. Coding Patterns & Standards

### 5.1 Patterns adopted
- **Domain-Driven Design (DDD)** — bounded contexts = NestJS modules. One aggregate root per context (e.g., `Project`, `Subscription`, `Host`).
- **Hexagonal architecture** — domain core knows nothing of HTTP, DB, Stripe; ports + adapters at the edges.
- **CQRS** — applied selectively where read/write asymmetry justifies it: `billing` (heavy aggregation), `orchestrator` (complex command flows), `versioning` (immutable history). Plain CRUD elsewhere.
- **Event Sourcing** — only for `billing.usage_events` (auditable, replayable). Everything else is state-based with an outbox.
- **Outbox pattern** — every state change that fires an event writes to an `outbox` table in the same Postgres tx; a relay publishes to NATS. Guarantees at-least-once with no dual-write bugs.
- **Saga pattern** — long-running flows (provision app: build → push → deploy → DNS → SSL → traffic switch) are sagas with compensations.
- **Idempotency keys** — all mutating public APIs accept `Idempotency-Key`. All Stripe + payment writes carry one.
- **Feature flags** — Unleash (self-hosted) or OpenFeature; gate every non-trivial feature.
- **Twelve-Factor** — config from env + secrets store, stateless services, logs to stdout.
- **API versioning** — URL-prefixed (`/v1/…`), with `Sunset` headers on deprecated routes.

### 5.2 Repo & code conventions
- **Monorepo** with **pnpm workspaces** + **Turborepo** for TS, **Cargo workspace** for Rust. Single repo: `absolo-cloud-services` with `apps/`, `services/`, `packages/`, `crates/`, `infra/`.
- **Lint/format**: ESLint flat config + Prettier (TS), `cargo fmt` + `clippy -D warnings` (Rust). Pre-commit via Husky + lint-staged. CI rejects on warnings.
- **Naming**: `kebab-case` files, `PascalCase` classes/types, `camelCase` vars, `SCREAMING_SNAKE` env. Tables `snake_case`, columns `snake_case`, foreign keys `<table>_id`.
- **Errors**: tagged-union error types in Rust (`thiserror` + custom enums), typed error classes in NestJS (`AbsoloError` base, machine-readable `code` + `httpStatus`).
- **Logging**: structured JSON, `request_id`, `trace_id`, `tenant_id`, `actor_id` on every line.
- **Tests**: Vitest (unit, TS), Jest (integration, NestJS), Playwright (E2E), `cargo test` + `nextest` (Rust), Pact for contract tests. Coverage gates: 80% lines on changed code.
- **Commits**: Conventional Commits, squash-merge to `main`, signed commits required for `main`.
- **Branching**: trunk-based; short-lived feature branches; merge queue.
- **Reviews**: 1 approval for non-critical, 2 for `billing` / `iam` / `security` / Rust agent.

### 5.3 Security coding practices
- **Inputs**: Zod parse on every boundary; no raw `req.body`. Rust: `serde` with `deny_unknown_fields`.
- **Outputs**: explicit DTO transformers; never serialize raw entities (prevents over-exposure).
- **SQL**: parameterized via Drizzle / sqlx — no string concatenation, ever.
- **Crypto**: never roll our own; use `libsodium` (TS via `@stablelib`/`tweetnacl`, Rust via `sodiumoxide`/`ring`).
- **Secrets**: never in repo; HashiCorp Vault (or **OpenBao** OSS fork) for runtime; sealed-secrets in git for k8s.
- **HTTP**: HSTS, CSP, frame-ancestors none, strict CORS, `SameSite=Lax` cookies, `__Host-` prefix.
- **Auth**: PASETO v4 or compact JWE preferred over JWT for internal tokens; standard JWT (RS256) for OAuth interop.
- **Dependency hygiene**: `pnpm audit`, `cargo audit`, `osv-scanner` in CI; Renovate for updates; SBOM (CycloneDX) per build.
- **Supply chain**: signed container images (cosign), provenance attestations (SLSA L3 target), pinned base images (`distroless`/`chainguard`).

---

## 6. Pricing & Billing Model

### 6.1 Philosophy
- **Hourly metering, monthly invoicing.** Per-hour granularity for compute, storage, bandwidth.
- **No surprise bills.** Bandwidth includes a generous bundle; overage caps configurable; dashboard alerts at 50/80/100%.
- **Predictable plans + a la carte add-ons.** Plans = compute + storage + bandwidth bundle; add-ons = extra DB, extra bucket, extra bandwidth.
- **Free tier**: limited (1 small Site or App with sleep, 1 GB PV, 5 GB egress/mo) — funnels into paid.

### 6.2 Resource units
- **App / Site sizes**: XS (256MB / 0.25 vCPU), S (512MB/0.5), M (1GB/1), L (2GB/2), XL (4GB/4), 2XL (8GB/8). Each charged hourly while running.
- **Persistent volume**: $/GB/month, prorated hourly.
- **Object storage**: $/GB/month stored, prorated hourly + minimal egress per GB.
- **Managed DB**: same size matrix as apps, plus storage GB; HA add-on doubles compute.
- **Bandwidth**: bundled per plan; overage in 100GB packs.

### 6.3 Sample plans (illustrative — finalized in `33-pricing-packaging-d1e00e.md`)
| Plan | Monthly anchor | Compute included | Storage | Bandwidth |
|---|---|---|---|---|
| Hobby | $5 | 1 × XS app w/ sleep | 1 GB | 100 GB |
| Starter | $12 | 1 × S app | 5 GB | 250 GB |
| Pro | $25 | 1 × M app | 25 GB | 500 GB |
| Business | $60 | 2 × M apps + HA option | 100 GB | 1 TB |
| Custom | usage | a la carte | a la carte | a la carte |

### 6.4 Billing technical design (high level)
- Every "billable thing" emits a `usage_event` to NATS `usage.>` subject (uptime ticks every 60s, storage every 5min, bandwidth on connection close).
- `metering-aggregator` (Rust) folds events into hourly buckets in `usage_hourly` (Postgres). Idempotent on `(tenant, resource_id, hour, kind)`.
- `billing` module pushes meter events to Stripe Billing Meters every hour (batched, idempotent).
- Invoices generated by Stripe; we render branded HTML + PDF copy ourselves and attach.
- **Migration path to Paddle** documented in `07-billing-service-d1e00e.md` for international tax offload.

---

## 7. Networking, Domains & SSL

### 7.1 DNS
- Platform domain: `absolo.app` (and `absolo.cloud` for landing/marketing).
- Free subdomain per project: `<project>-<random4>.absolo.app` (auto, lowercase, RFC1035-safe).
- Custom domains: customer creates a CNAME to `<region>.ingress.absolo.app` (or A/AAAA to anycast IPs for apex). We validate via TXT challenge before issuing certs.
- `External-DNS` syncs internal records; Cloudflare/Route53 are the authoritative providers.

### 7.2 SSL
- **Auto** for free subdomains via wildcard cert (`*.absolo.app`) issued via DNS-01.
- **Auto** for custom domains via HTTP-01 (default) or DNS-01 (if user delegates NS or uses our DNS).
- **Custom certificate upload** for enterprise.
- Cert-manager + Let's Encrypt primary, ZeroSSL fallback (rate-limit failover).
- **HSTS preload** opt-in toggle per domain.

### 7.3 Edge proxy
- Custom Rust binary built on **Cloudflare Pingora** (already used in production by Cloudflare's edge).
- Functions: TLS termination (rustls), SNI-based routing to upstream pods, HTTP/3, WebSocket, gRPC, per-tenant rate limiting (eBPF + token-bucket), basic WAF (CRS rules), connection-level metering for bandwidth billing.
- Failover within region; GeoDNS routes users to nearest healthy edge.

---

## 8. Deployment Workflows

### 8.1 Apps mode (developer)
1. User connects GitHub/GitLab or pushes to our Git remote.
2. Webhook → `builder` queues build job.
3. Builder boots a Kata microVM, clones source, **detects**:
   - `Dockerfile` → builds via BuildKit (rootless).
   - `project.toml` or auto-detect → Cloud Native Buildpacks (`pack` CLI under the hood).
   - Template marker → uses curated build profile.
4. Image pushed to internal registry (Harbor or Zot, signed with cosign).
5. `versioning` records immutable `Release { id, image_digest, source_sha, env_snapshot }`.
6. `orchestrator` rolls out via k8s Deployment (blue/green or rolling per plan).
7. `edge-proxy` switches traffic atomically when new pods pass readiness.
8. Old release retained for instant rollback (configurable retention).

### 8.2 Sites mode (template)
1. User picks template (e.g., WooCommerce).
2. `templates` materializes a manifest: image refs, default env, attached PV size, attached managed DB (if any), default theme/plugins.
3. `orchestrator` provisions: PV (Longhorn) → managed DB (CNPG) if needed → app pod → ingress → SSL.
4. Snapshot policy attached (default daily, 7-day retention; configurable).
5. Web SSH unlocked once pod is ready.
6. Updates: in-place template upgrades use snapshot-then-upgrade flow.

### 8.3 Scaling & migration
- Vertical scale-up: if the current node has headroom → in-place pod resize (k8s in-place resource resize, GA in 1.33).
- If no headroom → `orchestrator` finds a target node in the same region with capacity → schedules new pod → Longhorn live-migrates volume (replica handover) → readiness → `edge-proxy` flips traffic → drain old pod.
- Cross-region migration (rare, on user request): version-snapshot the volume, restore in target region, promote.
- Horizontal scale: HPA driven by CPU + custom metrics (request rate, queue depth) — only for Apps mode.

---

## 9. Observability

- **Logs**: stdout/stderr → containerd → Vector → Loki (hot 7d) + ClickHouse (cold 90d). Live tail in dashboard via WebSocket from log-shipper.
- **Metrics**: cAdvisor + node-exporter → VictoriaMetrics. User-visible: CPU, mem, disk, requests, error rate, p50/p95/p99 latency, bandwidth.
- **Traces**: OTel SDK in NestJS + Rust → Tempo. Sampled.
- **Alerts**: Alertmanager → PagerDuty (internal); per-customer alert rules (phase 2).
- **SLOs**: control plane API p99 < 300ms, ingress p99 < 50ms overhead, build success rate > 99%, deploy time p95 < 90s for buildpack apps.

---

## 10. Frontend Design Language

- **Inspiration**: DigitalOcean's 2024-2025 dark UI (deep ink-blue background, electric blue accent, generous spacing, sharp typography). **Not a clone.**
- **Brand colors**: high-contrast pair (TBD finalized in `04-design-system-d1e00e.md`), default theme = dark.
- **Themes**: `dark` (default), `light`, both with `high-contrast` variants. Toggle with system-preference detection.
- **Components**: shadcn/ui (Radix under the hood) — owned, copy-pasted, customized. No bloated component library.
- **Typography**: Inter (UI), JetBrains Mono (code/logs).
- **Iconography**: Lucide.
- **Motion**: subtle, purposeful (Framer Motion only where it adds clarity).
- **Layout**: command-palette (Cmd+K) everywhere, sticky resource sidebar in project view, real-time status badges.

---

## 11. Roadmap & Phases (full-platform launch path)

**Phase 0 — Foundations (Months 1-2)**
- Repo skeleton, CI, OpenTofu + Packer + ArgoCD bootstrap, design system, auth/iam, billing scaffolding, single-region k3s test cluster on Hetzner Cloud.
- Master plan + sub-plans signed off.

**Phase 1 — Core data plane (Months 3-5)**
- host-agent, edge-proxy, orchestrator MVP, builder (Dockerfile + buildpacks), DNS, SSL, free subdomain.
- One template (Next.js) end-to-end.

**Phase 2 — Sites & Apps mode (Months 6-8)**
- Sites mode (WP, Woo templates), persistent volumes, snapshots, web SSH, live logs.
- Apps mode (versioning, rollback, blue/green).
- Stripe billing live with hourly metering for compute + storage.

**Phase 3 — Managed services (Months 9-10)**
- Managed Postgres + MySQL + Redis (CloudNativePG, Zalando MySQL operator or Percona).
- Object storage (SeaweedFS S3-compatible buckets).

**Phase 4 — Multi-region & polish (Months 11-13)**
- 2nd & 3rd region online, cross-region failover, geo-routing.
- Admin dashboard fleet management, abuse tooling, advanced support.

**Phase 5 — Public launch (Month 14)**
- Status page, public docs, marketing site polish, beta → GA.

Detailed milestones in `35-roadmap-phases-d1e00e.md`.

---

## 12. Sub-Plan Index

| # | File | Topic |
|---|---|---|
| 01 | `01-marketing-website-d1e00e.md` | Public Next.js marketing site (DigitalOcean-grade UX) |
| 02 | `02-customer-dashboard-d1e00e.md` | React-TS user dashboard (projects, billing, logs) |
| 03 | `03-admin-dashboard-d1e00e.md` | Internal management/admin dashboard |
| 04 | `04-design-system-d1e00e.md` | shadcn-based design tokens, themes, components |
| 05 | `05-control-plane-architecture-d1e00e.md` | NestJS modular monolith structure & seams |
| 06 | `06-iam-auth-service-d1e00e.md` | Auth, users, orgs, RBAC, MFA, sessions, API keys |
| 07 | `07-billing-service-d1e00e.md` | Stripe metering, invoices, plans, dunning |
| 08 | `08-projects-apps-service-d1e00e.md` | Projects/environments/apps domain |
| 09 | `09-orchestrator-service-d1e00e.md` | k8s scheduling, scaling, migrations, sagas |
| 10 | `10-host-agent-rust-d1e00e.md` | Per-host Rust agent: lifecycle, telemetry, exec |
| 11 | `11-edge-proxy-rust-d1e00e.md` | Pingora-based ingress, TLS, routing, rate-limit |
| 12 | `12-builder-service-d1e00e.md` | Buildpacks + Dockerfile + templates pipeline |
| 13 | `13-templates-catalog-d1e00e.md` | WP/Woo/Laravel/Next.js template specs |
| 14 | `14-managed-databases-d1e00e.md` | Managed Postgres/MySQL/Redis offering |
| 15 | `15-object-storage-s3-d1e00e.md` | SeaweedFS S3-compatible buckets service |
| 16 | `16-dns-subdomain-service-d1e00e.md` | Free `*.absolo.app` subdomains |
| 17 | `17-custom-domains-ssl-d1e00e.md` | Custom domains, cert-manager, auto-SSL |
| 18 | `18-logs-aggregation-d1e00e.md` | Vector → Loki/ClickHouse, live tail |
| 19 | `19-metrics-monitoring-d1e00e.md` | VictoriaMetrics, customer-visible metrics |
| 20 | `20-web-ssh-shell-d1e00e.md` | Browser terminal into containers |
| 21 | `21-snapshots-backups-d1e00e.md` | Longhorn snapshots + restic offsite backup |
| 22 | `22-versioning-rollback-d1e00e.md` | App Platform versions, rollback, blue/green |
| 23 | `23-multi-region-networking-d1e00e.md` | GeoDNS, anycast, region topology |
| 24 | `24-host-onboarding-fleet-d1e00e.md` | Adding/draining hosts, fleet management |
| 25 | `25-security-hardening-d1e00e.md` | Threat model, isolation, gVisor/Kata, hardening |
| 26 | `26-secrets-management-d1e00e.md` | Vault/OpenBao, sealed-secrets, app config |
| 27 | `27-events-eventbus-d1e00e.md` | NATS JetStream, outbox pattern, sagas |
| 28 | `28-data-model-postgres-d1e00e.md` | Postgres schemas across modules |
| 29 | `29-api-design-contracts-d1e00e.md` | REST + WebSocket conventions, OpenAPI, SDKs |
| 30 | `30-testing-ci-cd-d1e00e.md` | Test strategy, CI/CD pipelines, environments |
| 31 | `31-observability-incident-d1e00e.md` | OTel, SLOs, on-call, runbooks |
| 32 | `32-compliance-legal-d1e00e.md` | GDPR, ToS/DPA, data residency, abuse policy |
| 33 | `33-pricing-packaging-d1e00e.md` | Plans, scaling tiers, hourly math |
| 34 | `34-developer-experience-cli-d1e00e.md` | `absolo` CLI, API docs, SDKs |
| 35 | `35-roadmap-phases-d1e00e.md` | Execution roadmap, milestones, team sizing |
| 36 | `36-revision-proposal-2026-04-30-d1e00e.md` | The revision proposal that produced plans 37-40 (kept for record) |
| 37 | `37-infrastructure-as-code-d1e00e.md` | OpenTofu + Packer + ArgoCD + Helm; per-region stacks |
| 38 | `38-platform-self-deployment-d1e00e.md` | How Absolo's own services update with zero downtime |
| 39 | `39-enterprise-byo-infra-d1e00e.md` | Enterprise-only Bring-Your-Own-Infrastructure product |
| 40 | `40-monorepo-structure-d1e00e.md` | Concrete `absolo-cloud-services` directory layout |

---

## 13. Open Questions for Future Iteration
1. Brand name confirmation — using **Absolo Cloud** based on workspace name; rename trivially via `pnpm` workspace metadata.
2. Final pricing numbers (above is illustrative); needs market research vs DO/Render/Railway.
3. Choice of **OpenBao vs Vault OSS** for secrets — defaulting to OpenBao for license clarity.
4. Internal registry: **Zot** (lightweight Rust-friendly OCI) vs **Harbor** (full-featured) — leaning Zot.
5. Whether to offer free tier from day 1 or after public launch (cost control).
6. KYC threshold for free→paid upgrades (anti-abuse).
