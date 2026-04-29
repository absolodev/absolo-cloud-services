# Absolo Cloud — Implementation Progress

> **Single source of truth** for what's done vs pending across the monorepo. Updated on every meaningful commit.
>
> Each plan file (`docs/plans/NN-…-d1e00e.md`) also has its own **Progress** section at the bottom; this file aggregates them per phase.

Legend: `[x]` done · `[~]` in progress · `[ ]` not started · `[s]` skipped/deferred

---

## Phase 0 — Foundations (Months 1-2 per `35-roadmap-phases-d1e00e.md`)

### Repo & tooling
- [x] Monorepo skeleton (top-level dirs + per-leaf READMEs).
- [x] Root config: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`.
- [x] Rust workspace: `Cargo.toml`, `rust-toolchain.toml`.
- [x] `.gitignore`, `.editorconfig`, `.nvmrc`, `.prettierrc.json`.
- [x] `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE` (placeholder Apache-2.0).
- [x] `.github/CODEOWNERS`, `.github/pull_request_template.md`.
- [x] `.github/workflows/ci.yml` (skeleton — placeholders for lint/test/iac/security).
- [ ] CI workflow filled in (real lint/test/build/security steps).
- [ ] Pre-commit hooks (Husky + lint-staged).
- [ ] Renovate config.
- [ ] Devcontainer config (`tools/devcontainer/`).

### Plans
- [x] Plans 00-35 written (initial revision).
- [x] Plan 36 (revision proposal) recorded.
- [x] Plans 37-40 added (IaC, self-deployment, Enterprise BYO, monorepo structure).
- [x] Plan 41 added (application configuration & env vars).
- [x] Existing plans updated to reflect Absolo-owned infra + staging-as-paid-feature + IaC stack.
- [~] Per-plan **Progress** sections added to plans being actively worked on (00, 04, 05, 08, 41).
- [ ] Per-plan **Progress** sections added to remaining plans (will happen as each subsystem starts).

### Shared TS packages (`packages/`)
- [x] Folder scaffolding with READMEs.
- [x] `tsconfig` — shared tsconfig presets (base / library / next / vite-react / node).
- [x] `eslint-config` — shared flat ESLint config (base / react / next / node).
- [x] `design-tokens` — CSS variables, dark/light themes.
- [x] `icons` — Lucide re-exports + brand mark placeholder.
- [x] `fonts` — Inter + JetBrains Mono via fontsource.
- [x] `ui` — shadcn-derived component library (Button, Input, Card, Badge, Dialog, Toast).
- [x] `test-utils` — Vitest config + factories scaffold.
- [x] `contracts` — OpenAPI YAML + Zod schemas (auth, projects, environments, env-vars).
- [x] `sdk-ts` — TypeScript SDK (typed fetch client based on contracts).

### Frontends (`apps/`)
- [x] `marketing` — Next.js 15 (App Router): home, pricing, docs portal shell.
- [x] `dashboard` — Vite + React 19 + TanStack Router/Query: sign-in shell, projects list, env-vars editor mock UI.
- [x] `admin` — Vite + React 19: fleet shell, abuse shell.
- [ ] `status` — Next.js public status page (deferred to Phase 1.5).

### Control plane (`services/control-plane/`)
- [x] NestJS 11 app skeleton (Fastify adapter, modular monolith layout).
- [x] Modules scaffolded: `iam`, `projects`, `environments`, `env-vars`, `health`.
- [x] Drizzle ORM schemas drafted: `users`, `orgs`, `projects`, `environments`, `config_entries`, `config_versions`.
- [x] Health endpoints (`/healthz`, `/readyz`).
- [x] OpenAPI emission via `@nestjs/swagger`.
- [ ] Real auth (JWT/PASETO + Argon2 password hashing).
- [ ] DB migrations runner integrated.
- [ ] Stripe sandbox scaffolding.
- [ ] Outbox + saga base.

### Local dev infrastructure
- [x] `docker-compose.yml` for local Postgres 17 + Redis 7 + NATS JetStream + MailHog (smtp catcher).
- [x] `.env.example` for control-plane (DB url, NATS, JWT secrets).
- [x] Root `pnpm dev` runs all frontends + control plane via Turborepo.
- [ ] Seed data + dev fixtures.
- [ ] k3d local cluster recipe (Phase 1).

### Rust hot-path services
- [ ] `host-agent` — Phase 0 stretch / Phase 1.
- [ ] `edge-proxy` — Phase 1.
- [ ] `builder-worker` — Phase 1.
- [ ] `metering-aggregator` — Phase 1.
- [ ] `web-ssh-gateway` — Phase 2.
- [ ] `log-shipper` — Phase 1.
- [ ] `cli` — Phase 1.

### IaC
- [ ] OpenTofu modules (`infra/tofu/modules/*`) — Phase 0 late-stage / Phase 1.
- [ ] Packer image (`infra/packer/absolo-host-base`) — Phase 0 late-stage.
- [ ] ArgoCD bootstrap manifests — Phase 0 late-stage.
- [ ] Helm charts skeletons (`infra/helm/charts/*`) — Phase 0 late-stage / Phase 1.

### Templates (`templates/`)
- [ ] All template Dockerfiles + `template.yaml` — Phase 1+ (one template Phase 1 = `nextjs`).

---

## How to update this file
1. Tick boxes as items complete.
2. Add new sub-items under the relevant phase if scope expands.
3. Mirror big changes into the per-plan Progress section.
4. Mention this file in commit messages so the trail is auditable: `chore(progress): mark X done`.

---

## Quick links
- Master plan: `plans/00-master-plan-d1e00e.md`
- Roadmap & phases: `plans/35-roadmap-phases-d1e00e.md`
- Monorepo structure: `plans/40-monorepo-structure-d1e00e.md`
- IaC stack: `plans/37-infrastructure-as-code-d1e00e.md`
- Self-deployment: `plans/38-platform-self-deployment-d1e00e.md`
- App configuration: `plans/41-application-configuration-d1e00e.md`
