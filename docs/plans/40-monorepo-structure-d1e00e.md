# 40 — Monorepo Structure (`absolo-cloud-services`)

The concrete directory layout for the project repo, with READMEs in every leaf describing what lives there. Used as the blueprint for scaffolding before any code is written.

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
- Whether `services/` and `crates/` should merge into a single `services/` (with a sub-naming convention by language) — keeping them separate is more idiomatic for the Rust workspace.
- Whether `templates/` should be its own repo at some point (depends on if we open-source templates) — keep in monorepo for now.
- Devcontainer (`tools/devcontainer/`) phasing — defer to Phase 0 mid-point once language toolchains are stable.
