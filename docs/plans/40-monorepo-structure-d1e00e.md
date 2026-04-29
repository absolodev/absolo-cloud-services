# 40 — Monorepo Structure (`absolo-cloud-services`)

The concrete directory layout for the project repo, with READMEs in every leaf describing what lives there. Used as the blueprint for scaffolding before any code is written.

## Why one repo (not many)

The platform has tightly-coupled contracts that would otherwise require coordinated multi-repo releases:

- An API change in `packages/contracts/` ripples through **control-plane**, **dashboard**, **admin**, **CLI**, **SDK** — atomic in one PR here, 5+ PRs across 5+ repos otherwise.
- A design-token change must stay consistent across **marketing**, **dashboard**, **admin**.
- A config-entry schema change (plan 41) touches **control-plane** + **host-agent** (Rust) + **dashboard** + **CLI**.
- ArgoCD deploys all services from one image registry with one version-skew policy (plan 38) — easier with one source of truth.

For multi-developer scaling, the monorepo wins because:
- Path-based `CODEOWNERS` enforces team boundaries without inter-repo PR ping-pong.
- Turborepo + Cargo workspace only rebuild/retest what changed (`turbo run --filter=...[origin/main]`).
- One pnpm lockfile + one `Cargo.lock` + one Renovate config = one dependency-upgrade workflow.
- New engineers clone one repo and run `pnpm install && cargo build`.

This mirrors how Vercel, Stripe, Shopify, GitLab, and Linear structure their core platforms.

## Public vs private boundary (extraction-ready discipline)

Some components will eventually be published to npm or moved to public repos (CLI, SDKs, templates). The repo is structured so this can be done with `git filter-repo --subdirectory-filter` — no refactor, no week-long migration.

**Rule**: every directory is tagged in its `package.json` (TS) or `Cargo.toml` (Rust) metadata as either `public` or `private`. CI enforces:

1. **`public` packages may only depend on:** other `public` packages, third-party packages from npm/crates.io, and published artifacts (e.g., the public REST API). They MUST NOT import any `private` package, even transitively.
2. **`private` packages may depend on anything.**

| Path | Visibility | Future home |
|---|---|---|
| `crates/cli/` | `public` | Eventually `absolo/cli` (own repo); only consumes public REST API + published `@absolo/sdk` from npm. |
| `packages/contracts/` | `public` | OpenAPI/Zod schemas; published as `@absolo/contracts` on npm + mirrored to `absolo/api-spec`. |
| `packages/sdk-ts/` | `public` | Generated from `contracts`; published as `@absolo/sdk` on npm; can mirror to `absolo/sdk-js`. |
| `packages/design-tokens/` | `public` | Published as `@absolo/design-tokens` (so external partners can theme integrations). |
| `packages/icons/` | `public` | Published as `@absolo/icons`. |
| `packages/fonts/` | `public` | Published as `@absolo/fonts`. |
| `packages/ui/` | `public` (later) | Initially `private` until API stabilises; published as `@absolo/ui` once locked. |
| `packages/eslint-config/`, `packages/tsconfig/`, `packages/test-utils/` | `private` | Internal tooling only. |
| `templates/*` | `public` | Each template is self-contained (Dockerfile + template.yaml + hooks); mirrored to `absolo/templates-<name>` or one `absolo/templates`. |
| `apps/marketing/`, `apps/dashboard/`, `apps/admin/`, `apps/status/` | `private` | Internal frontends; never extracted. |
| `services/control-plane/` | `private` | Internal backend; never extracted. |
| `crates/host-agent/`, `edge-proxy/`, `builder-worker/`, `metering-aggregator/`, `web-ssh-gateway/`, `log-shipper/` | `private` | Internal services; never extracted. |
| `crates/shared/` | `private` | Internal Rust workspace lib; CLI does NOT depend on it (CLI uses its own minimal types or generated bindings from `contracts`). |
| `infra/*` | `private` (mostly) | Helm charts may be published to `charts.absolo.cloud` OCI registry for Enterprise BYO (plan 39). |

### Extraction procedure (when we choose to publish CLI / SDK / templates)

1. CI already publishes the artifact (npm package, container image, Helm chart) — that's the primary distribution path. **Most "public" components never need a separate git repo.**
2. If a separate **git history** is desired (e.g., for community PRs against the CLI):
   ```bash
   git clone --no-local . /tmp/absolo-cli-extract
   cd /tmp/absolo-cli-extract
   git filter-repo --subdirectory-filter crates/cli
   git remote add origin git@github.com:absolo/cli.git
   git push -u origin main
   ```
3. Set up a one-way sync (GitHub Action) from monorepo → public repo on every merge to `main` that touches the subtree. Source of truth stays in monorepo.
4. PRs from the community land in the public repo and are reverse-merged via cherry-pick or scheduled sync.

This is the same model Google uses for Bazel, Meta uses for React, and Shopify uses for their CLI.

## Top-level layout
```
absolo-cloud-services/
  apps/                       # Customer-facing & internal frontends
    marketing/                # Public Next.js site (absolo.cloud)
    dashboard/                # Customer dashboard (Vite + React + TanStack)
    admin/                    # Internal management console (Vite + React)
    status/                   # Public status page (Next.js, phase 1.5)
  services/                   # NestJS modular monolith (control plane)
    control-plane/
      src/
        modules/              # iam, billing, projects, orchestrator, ...
        shared/               # cross-cutting infrastructure
        main.ts
      test/
      package.json
      Dockerfile
  crates/                     # Rust workspace
    host-agent/               # Per-host agent (k3s lifecycle, Web SSH proxy, telemetry)
    edge-proxy/               # Pingora-based public ingress
    builder-worker/           # Build job consumer (microVM orchestration)
    metering-aggregator/      # Usage event roll-up service
    web-ssh-gateway/          # WS ↔ host-agent exec bridge
    log-shipper/              # Vector configuration + custom transforms
    cli/                      # `absolo` CLI binary
    shared/                   # Shared types, telemetry, config (workspace lib)
    Cargo.toml                # workspace
  packages/                   # TypeScript workspace packages
    contracts/                # OpenAPI specs, Zod schemas, JSON Schema, .proto files
    sdk-ts/                   # TypeScript SDK generated from contracts
    design-tokens/            # CSS variables, theme JSON
    ui/                       # shadcn-derived component library (consumed by all frontends)
    icons/                    # Lucide re-exports + brand icons
    fonts/                    # Self-hosted Inter + JetBrains Mono via fontsource
    eslint-config/            # Shared flat ESLint config
    tsconfig/                 # Shared tsconfig presets
    test-utils/               # Shared testing helpers (factories, MSW, etc.)
  templates/                  # Customer-deployable application templates
    wordpress/
      Dockerfile
      template.yaml
      hooks/
      forms/
      docs/
    woocommerce/
    laravel/
    nextjs/
    ghost/
    static-site/
    nodejs-express/
    python-fastapi/
  infra/                      # IaC + GitOps + Helm
    tofu/
      modules/
        host-cluster/
        hetzner-vm/
        hetzner-dedicated/
        latitude-bare-metal/
        cloudflare-zone/
        vault-cluster/
        postgres-cnpg/
        argocd-bootstrap/
      stacks/
        dev/
        staging/
        prod-eu/
        prod-us/
        prod-apac/
      backend.tf
    packer/
      absolo-host-base/
        packer.pkr.hcl
        provisioners/
        tests/
    helm/
      charts/
        control-plane/
        edge-proxy/
        host-agent/
        builder-worker/
        web-ssh-gateway/
        log-shipper/
        metering-aggregator/
        templates-registry/
        monitoring/
        ingress/
    argocd/
      bootstrap/
      projects/
      apps/
      image-updater/
    runbooks/
  docs/                       # Engineering & product documentation
    plans/                    # ALL plan files live here (canonical)
    architecture/             # Diagrams (mermaid + svg), ADRs
    runbooks/                 # Mirror of infra/runbooks (or symlink); incident playbooks
    contributing/             # Onboarding for engineers
  tools/                      # Repo-internal tooling and scripts
    scripts/                  # Bash/Node scripts: codegen, migration helpers, etc.
    devcontainer/             # VS Code Dev Container config (phase 1.5)
  .github/
    workflows/                # GitHub Actions: ci.yml, release.yml, infra.yml
    CODEOWNERS                # path-based ownership rules
    pull_request_template.md
  .windsurfrules              # (existing) Cascade rules, if any
  .gitignore
  .editorconfig
  .nvmrc
  .prettierrc.json
  Cargo.toml                  # Rust workspace manifest
  rust-toolchain.toml         # Pinned Rust version (1.83 stable)
  package.json                # Root package.json with scripts
  pnpm-workspace.yaml         # pnpm workspace manifest
  turbo.json                  # Turborepo task graph
  tsconfig.base.json          # Root TS config
  README.md                   # Top-level README: what is Absolo, how to run locally
  CONTRIBUTING.md             # Contributing guidelines, branching, conventions
  CODEOWNERS                  # (also at .github/CODEOWNERS; one is canonical)
  LICENSE                     # Apache-2.0 placeholder (final TBD per master plan open question)
  SECURITY.md                 # How to report security issues
```

## Path conventions
- All app code under `apps/`, `services/`, `crates/`, `packages/`, `templates/`.
- All infra under `infra/`.
- All documentation under `docs/`.
- Nothing essential at top-level except config files.

## Workspace boundaries
- **TypeScript workspace** = `apps/*` + `services/*` + `packages/*` (managed by `pnpm-workspace.yaml` + `turbo.json`).
- **Rust workspace** = `crates/*` (managed by root `Cargo.toml`).
- Cross-language contracts live in `packages/contracts/` (TS source) and produce Rust types via `build.rs` codegen.

## Per-leaf README contract
Every directory under `apps/`, `services/`, `crates/`, `packages/`, `templates/`, and `infra/helm/charts/` must have a `README.md` containing:
1. **Purpose** — one-paragraph description.
2. **Reference** — link to the relevant plan (e.g., `../../docs/plans/11-edge-proxy-rust-d1e00e.md`).
3. **Local dev** — how to run and test it.
4. **Build & ship** — how to produce the artifact.
5. **Owners** — CODEOWNERS reference.

## Naming conventions
- **Folders**: `kebab-case`.
- **TS files**: `kebab-case.ts`.
- **Rust files**: `snake_case.rs`.
- **Crate names**: `absolo-<purpose>` (e.g., `absolo-host-agent`, `absolo-edge-proxy`).
- **TS package names**: `@absolo/<name>` for libraries; apps use the directory name.

## Service ↔ chart ↔ image mapping
Every service has 1:1:
- A folder (under `services/` or `crates/`).
- A Helm chart (under `infra/helm/charts/`).
- A container image (`registry.absolo.cloud/<service>:<tag>`).

This rigidity makes ArgoCD configuration trivial.

## Files we'll scaffold first (no code yet)
- Top-level: `README.md`, `CONTRIBUTING.md`, `CODEOWNERS`, `LICENSE`, `SECURITY.md`, `.gitignore`, `.editorconfig`, `.nvmrc`.
- TS workspace: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.prettierrc.json`.
- Rust workspace: `Cargo.toml`, `rust-toolchain.toml`.
- Each leaf directory: `README.md` placeholder.
- `.github/workflows/ci.yml` (skeleton, no jobs yet).
- `.github/CODEOWNERS` (initial ownership rules).
- `docs/plans/` already exists with the 41 plan files.

## What's intentionally NOT scaffolded yet
- Actual source code (TS, Rust).
- Helm chart contents (just empty directories with READMEs).
- OpenTofu modules (just empty directories with READMEs).
- Packer manifests (placeholder only).
- Application templates (Dockerfiles, etc.).
- CI workflow steps (the file is a skeleton).

These come in Phase 0 implementation per `35-roadmap-phases-d1e00e.md`.

## Validation rules in CI (added later)
- Every directory under `apps/`, `services/`, `crates/`, `packages/`, `templates/`, `infra/helm/charts/` must have a `README.md` (lint job).
- Every chart must reference a service that exists, and every service should have a chart (cross-validation script).
- Every plan file referenced in master must exist.

## Open items
- Whether `services/` and `crates/` should merge into a single `services/` (with a sub-naming convention by language) — keeping them separate is more idiomatic for the Rust workspace and we'll keep them split.
- Whether to open-source templates from day one or after Phase 1 stabilises — does not change directory layout (already extraction-ready); only changes the timing of the public mirror.
- Devcontainer (`tools/devcontainer/`) phasing — defer to Phase 0 mid-point once language toolchains are stable.
- CI lint job that enforces the `public → public-only` import rule (TS via `eslint-plugin-import` resolver, Rust via `cargo-deny` or a custom workspace check).
