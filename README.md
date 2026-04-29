# Absolo Cloud Services

Monorepo for **Absolo Cloud** — a modern PaaS that lets non-technical users launch real apps (WordPress, WooCommerce, Laravel, Next.js, custom code) on Absolo-owned infrastructure, with hourly billing, managed databases, S3-compatible object storage, free subdomains, custom domains with auto-SSL, live logs, web SSH, snapshots, versioning, and DigitalOcean-grade UX.

> **Status: Phase 0 / Foundations.** No source code yet — only the directory scaffold and the canonical plans live in [`docs/plans/`](docs/plans/).

## Where to start

1. Read the master plan: [`docs/plans/00-master-plan-d1e00e.md`](docs/plans/00-master-plan-d1e00e.md).
2. Skim the per-subsystem plans (`01-…` through `40-…`) to understand each component.
3. Review the roadmap: [`docs/plans/35-roadmap-phases-d1e00e.md`](docs/plans/35-roadmap-phases-d1e00e.md).
4. Review the repo layout: [`docs/plans/40-monorepo-structure-d1e00e.md`](docs/plans/40-monorepo-structure-d1e00e.md).

## Repository layout (high level)

```
apps/         Customer-facing & internal frontends (Next.js / Vite + React)
services/     NestJS modular monolith (control plane)
crates/       Rust workspace (host-agent, edge-proxy, builder, CLI, ...)
packages/     Shared TS workspace packages (contracts, SDK, design system)
templates/    Customer-deployable application templates (WordPress, Laravel, ...)
infra/        Infrastructure-as-code (OpenTofu), Packer images, Helm charts, ArgoCD
docs/         Engineering docs, architecture, and the canonical plans
tools/        Repo-internal scripts and tooling
```

Each subdirectory has a `README.md` explaining its purpose and pointing to the relevant plan.

## Tech stack (summary)

- **Languages**: Rust (1.83+) for hot-path services; TypeScript (5.7+) for control plane and frontends.
- **Frontend**: Next.js 15 (marketing), React 19 + Vite + TanStack (dashboard, admin), shadcn/ui + Tailwind v4.
- **Backend**: NestJS 11 modular monolith, Drizzle ORM, PostgreSQL 17, NATS JetStream, Redis 7.4.
- **Hot-path Rust**: Pingora (edge proxy), Tokio, Axum, Tonic, sqlx.
- **Kubernetes**: k3s + Cilium + Longhorn + CloudNativePG + SeaweedFS + cert-manager.
- **Infra**: OpenTofu + Packer + ArgoCD + Helm + Cosign.
- **Hosting**: Hetzner Cloud (control plane + dev/staging) + Hetzner dedicated / Latitude.sh bare metal (compute).

Full rationale in [`docs/plans/00-master-plan-d1e00e.md`](docs/plans/00-master-plan-d1e00e.md).

## Local development (placeholder)

Local dev workflow will be defined as Phase 0 progresses. Expected toolchain:

- Node.js 22 LTS (pinned in `.nvmrc`).
- pnpm 9+.
- Rust 1.83 stable (pinned in `rust-toolchain.toml`).
- Docker + a local k3d cluster.
- OpenTofu 1.9+, Packer 1.11+, Helm 3.16+.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for evolving guidance.

## License

Apache-2.0 (placeholder; final license decision tracked as an open question in the master plan).
