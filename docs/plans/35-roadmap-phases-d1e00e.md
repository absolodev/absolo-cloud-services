# 35 — Roadmap, Phases & Team Sizing

A realistic execution roadmap for a full-platform launch (apps + sites + managed DBs + buckets + admin) over ~12-14 months, assuming a small but senior team. Each phase has measurable exit criteria.

## Assumptions
- Team size: starts at 2-3 (founder + 1-2 senior engineers), ramps to 6-8 by Month 8.
- Single primary region (EU) operational early; US + APAC online before public launch.
- **Absolo provisions all standard-tier infrastructure** via Hetzner Cloud (control plane + dev/staging) and Hetzner dedicated / Latitude.sh bare metal (compute hosts as we scale).
- **Enterprise BYO** is a phase 6+ product (`39-enterprise-byo-infra-d1e00e.md`); not in launch scope.

## Phase 0 — Foundations (Months 1-2)
**Goal**: lay every track so all teams can run in parallel.

Deliverables:
- Monorepo skeleton (`apps/`, `services/`, `packages/`, `crates/`, `infra/`, `templates/`, `docs/`, `tools/`).
- CI pipelines (lint, test, build, security scan, IaC validate, Helm lint, image sign).
- **OpenTofu stack** for `dev` env on Hetzner Cloud (3 small VMs).
- **Packer image** for Ubuntu 24.04 + `absolo-agent` baked in.
- **ArgoCD bootstrap** in dev cluster + Helm chart skeletons for control-plane, edge-proxy, host-agent.
- Design system v0 (`04-…`) — tokens, base components, dark/light.
- Marketing site shell with home + pricing placeholder.
- Auth/iam shell: signup/login/MFA functional in dev.
- Single-region k3s lab cluster (Hetzner Cloud) with Cilium + Longhorn + CNPG + cert-manager + SeaweedFS.
- host-agent v0 in Rust: bootstrap + heartbeat.
- edge-proxy v0 in Rust: TLS + simple route table.
- Stripe sandbox integration scaffolded.
- Plans signed off (this folder).

Exit criteria:
- "Hello World" Dockerfile app deploys via CLI to lab cluster, gets free subdomain with SSL, accessible via browser.
- A new dev-env VM can be provisioned end-to-end via `tofu apply` + ArgoCD reconciliation in <15 minutes from zero.

## Phase 1 — Core data plane (Months 3-5)
**Goal**: solidify the deployment loop end-to-end.

Deliverables:
- Builder service (Rust) with Buildpacks + Dockerfile detect + push to internal Zot.
- Orchestrator with sagas, scaling, rolling deploys.
- DNS module + free subdomain auto-issuance.
- SSL module + cert-manager integration.
- Edge-proxy v1 with custom domains + WAF + rate-limit.
- Vector + Loki + ClickHouse log pipeline; live tail in dashboard.
- VictoriaMetrics + customer-visible metrics.
- One template (Next.js) end-to-end through Sites mode.
- **Staging OpenTofu stack** for the `eu-fra` region (mirror of prod-eu shape, smaller capacity).
- **ArgoCD multi-cluster**: dev + staging clusters managed from a single ArgoCD instance.
- **Argo Rollouts** integrated for canary deploys of platform services.
- **Customer staging environments**: orchestrator + dashboard support a project's staging env (created on opt-in).

Exit criteria:
- A non-engineer can sign up, click "deploy Next.js template," see a live URL with HTTPS in <90 seconds.
- Custom domain attach + cert auto-issue works across two test domains.
- Live logs and CPU/mem metrics visible in dashboard.

## Phase 2 — Sites mode + versioning + Web SSH (Months 6-7)
**Goal**: make Sites mode and Apps mode production-shaped.

Deliverables:
- WordPress + WooCommerce + Laravel + Ghost + Static templates.
- Snapshots (Longhorn + restic) with schedule + on-demand + restore.
- Persistent volume management UI.
- Web SSH gateway + xterm in dashboard with session recording.
- Versioning + blue/green + instant rollback for Apps mode.
- Stripe billing live: hourly metering for compute + PV, monthly invoicing, dunning, spend-cap.

Exit criteria:
- Owner of a WP site can: install plugin, take snapshot, restore.
- Owner of an Apps app can: deploy v1, deploy v2, roll back to v1 in <2s with traffic flip.
- Hourly billing matches expectations to <0.1% drift in test scenarios.

## Phase 3 — Managed DBs + Object Storage (Months 8-9)
**Goal**: round out the platform.

Deliverables:
- Postgres (CloudNativePG), MySQL (Percona), Redis (operator) — all hourly-billed.
- Backup/restore UX, parameter groups, slow-query views.
- SeaweedFS S3-compat buckets with per-app keys + lifecycle rules.
- Bindings: bind DB/bucket to app via UI; env vars auto-injected.

Exit criteria:
- Bound DB/bucket flow works with WP/Woo + Laravel + Next.js templates.
- DB failover drill < 60s recovery with zero data loss.

## Phase 4 — Multi-region + admin polish (Months 10-12)
**Goal**: production-grade operations.

Deliverables:
- US + APAC regions online with full data plane.
- GeoDNS + cross-region edge routing.
- Postgres async replicas in US/APAC; manual failover runbooks.
- Admin dashboard: full fleet management, abuse signals, dual-control workflows, finance reports.
- Compliance docs done (ToS/AUP/DPA/Privacy).
- Status page live.
- External pen test passed.

Exit criteria:
- Customer can pick any region for new app/DB/bucket; performance targets met.
- Quarterly chaos drill (region edge blackhole) succeeds.
- ToS/AUP/DPA/Privacy reviewed by legal counsel.

## Phase 5 — Public launch (Months 13-14)
**Goal**: open the doors.

Deliverables:
- Marketing site polish, customer stories, docs reviewed.
- Free tier enabled with anti-abuse safeguards.
- Public pricing finalized.
- 24/7 on-call rotation in place.
- Bug bounty program live.

Exit criteria:
- Launch announcement; first 100 paying customers within 60 days.

## Phase 6+ (post-launch backlog highlights)
- **Enterprise BYO Infrastructure** product launch (`39-enterprise-byo-infra-d1e00e.md`).
- Migration tools (Heroku, Render, Vercel imports).
- Edge POPs in extra cities.
- Advanced WAF + bot management.
- Workers / cron jobs as managed type.
- Queues/streams as managed services.
- Marketplace for third-party templates.
- BYO encryption keys / confidential compute.
- SOC2 Type 2 audit.

## Team plan
| Role | Phase 0 | Phase 1-2 | Phase 3-4 | Phase 5+ |
|---|---|---|---|---|
| Founder/CEO | 1 | 1 | 1 | 1 |
| Sr backend (Rust) | 1 | 2 | 3 | 3 |
| Sr backend (TS/NestJS) | 1 | 2 | 2 | 3 |
| Frontend lead | — | 1 | 2 | 2 |
| SRE / platform | — | 1 | 1 | 2 |
| Designer (PT) | 0.5 | 1 | 1 | 1 |
| DevRel/Docs | — | — | 0.5 | 1 |
| Support | — | — | 1 | 2 |
| Total | 3.5 | 8 | 10.5 | 14 |

## Risk register
- **Provider lock-in risk on Hetzner**: mitigated by OpenTofu modules abstracting provider differences; we keep at least one secondary (Latitude.sh) as a hedge from Phase 1.
- **Equinix Metal sunset (mid-2026)** affects bare-metal options industry-wide — we deliberately avoid Equinix and prefer Hetzner dedicated + Latitude.sh; capacity-plan ahead.
- **k3s/Longhorn at scale**: prove early on a 50-host lab fleet; Longhorn replica replication tested under network partitions.
- **Multi-region complexity**: keep v1 surface narrow; defer active-active to phase 6+.
- **Hourly metering accuracy**: continuous reconciliation + alerts on drift.
- **Talent for Rust roles**: tighten interview loop early; consider one TS-only Rust-curious hire who pairs with a Rust senior.
- **Template maintenance burden**: limit launch templates to top 5; rest follow demand.
- **DDoS during public launch**: pre-arrange Cloudflare standby for emergency mitigation; have anycast scrubbing tested.
- **GitOps repo blast radius**: dual-control on prod ArgoCD AppProjects, branch protection on `main`, cosign mandatory.

## Definition of "ready to launch publicly"
1. Two paying customers running production workloads happily for ≥4 weeks.
2. SLOs met for ≥4 weeks straight.
3. Pen test passed with no Highs unresolved.
4. Legal docs reviewed.
5. Status page running cleanly.
6. On-call drilled twice with no Sev-1 lessons unresolved.
7. Backup/restore drill complete in every region.

## Open items
- Co-founder/CTO hire if not founder.
- Fundraising milestones (seed sufficient for ~14 months at planned headcount?).
- Office vs fully-remote.
