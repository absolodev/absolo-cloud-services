# Contributing to Absolo Cloud Services

> **Status: Phase 0.** This document captures conventions agreed in the plans (`docs/plans/`) and will evolve as the codebase materializes.

## Workflow

1. Branch from `main`. Use short-lived feature branches.
2. Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `infra:`).
3. Sign your commits (`gpg` or `ssh`-signed). Required on `main`.
4. Open a PR; CI must be green and required reviewers must approve.
5. Squash-merge to `main`. Merge queue enforced.

## Branching & releases

- Trunk-based: one long-lived branch (`main`).
- Releases happen via GitOps: CI publishes a signed image + Helm chart, opens a PR against `infra/argocd/`, and ArgoCD reconciles.
- See [`docs/plans/30-testing-ci-cd-d1e00e.md`](docs/plans/30-testing-ci-cd-d1e00e.md) and [`docs/plans/38-platform-self-deployment-d1e00e.md`](docs/plans/38-platform-self-deployment-d1e00e.md).

## Code conventions

### TypeScript

- ESLint flat config + Prettier; CI fails on warnings.
- Strict mode in every `tsconfig.json`.
- File names `kebab-case.ts`. Classes `PascalCase`. Functions/vars `camelCase`. Env vars `SCREAMING_SNAKE`.
- Validate every external boundary with Zod; never trust raw `req.body`.

### Rust

- `cargo fmt --check` + `clippy -D warnings` in CI.
- Files `snake_case.rs`. Crates `absolo-<purpose>`.
- Tagged-union errors via `thiserror`.
- `serde` with `deny_unknown_fields` on external inputs.

### Database

- Tables and columns `snake_case`. Foreign keys `<table>_id`.
- Forward-only migrations; expand → migrate → contract for breaking changes.

## Testing

- Unit (Vitest, `cargo test`/`nextest`): 80% line coverage on changed code.
- Integration: Testcontainers (Postgres + NATS + Vault).
- E2E: Playwright for critical journeys.
- Contract: Pact between services + JSON Schema for events.
- Performance: k6, ghz, vegeta — nightly.

## Security

- Never commit secrets. Sealed Secrets for bootstrap; OpenBao/Vault for runtime.
- Argon2id for password hashing; PASETO v4 for internal tokens.
- See [`docs/plans/25-security-hardening-d1e00e.md`](docs/plans/25-security-hardening-d1e00e.md) and [`docs/plans/26-secrets-management-d1e00e.md`](docs/plans/26-secrets-management-d1e00e.md).

## CODEOWNERS

Path-based ownership lives at [`.github/CODEOWNERS`](.github/CODEOWNERS). `iam`, `billing`, `security`, host-agent, and edge-proxy paths require **2** approvals.

## Reporting security issues

See [`SECURITY.md`](SECURITY.md). Do not file public issues for vulnerabilities.

## Reviewing & merging

- 1 approval default; 2 for sensitive paths.
- All comments resolved before merge.
- CI must be green; flaky tests get auto-quarantined and assigned to CODEOWNER for fix.

## Local development

Will be specified once tooling is bootstrapped. Expected baseline:

- Node.js 22 LTS (`.nvmrc`).
- pnpm 9+.
- Rust 1.83 stable (`rust-toolchain.toml`).
- Docker + k3d for local Kubernetes.
- OpenTofu 1.9+, Helm 3.16+, Packer 1.11+, cosign 2+.

See [`README.md`](README.md) for the high-level overview.
