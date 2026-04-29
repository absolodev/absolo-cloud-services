# 30 — Testing, CI/CD & Environments

The end-to-end discipline for keeping a multi-language monorepo green: testing pyramid, CI pipelines, deploy environments, and release management.

## Testing pyramid
| Layer | Tools | Coverage target | Speed |
|---|---|---|---|
| Unit | Vitest (TS), `cargo test`/`nextest` (Rust) | 80% lines on changed code | sub-1s per file |
| Integration | Jest + Testcontainers (TS), `cargo test --features integration` (Rust) | every public application service | seconds per suite |
| Contract | Pact (TS↔Rust), JSON-Schema (events) | every service-to-service interaction | seconds |
| E2E | Playwright (browser), `cargo test --features e2e` against k3d cluster | critical user journeys | minutes |
| Load | k6, ghz, vegeta | edge proxy, builder, log pipeline | nightly |
| Chaos | Chaos Mesh (k8s), home-grown scripts | DR drills | quarterly |
| Pen test | external + Burp / OWASP ZAP scans | annual + per-release | one-off |

## Critical journeys (Playwright)
- Sign up → verify → create org → add payment → deploy WordPress template → see live URL → change DNS to custom domain → SSL active.
- Sign up → push to GitHub → auto-deploy → roll back → check live.
- Add managed Postgres → bind to app → connect → query.
- Take snapshot → simulate corruption → restore → verify.
- Open Web SSH → run command → close → see recording.

## Repo & branching
- **Trunk-based development**: one `main`, short-lived branches, merge queue.
- **Conventional Commits** (`feat:`, `fix:`, etc.).
- **Squash merge** to `main`; commit history kept clean.
- **Signed commits** required on `main` (gpg/ssh).
- **CODEOWNERS** required reviews: `iam`, `billing`, `security` files need 2 approvals; rest 1.

## CI pipeline (per PR)
- Stage 1 (parallel, < 2 min): lint (ESLint, clippy), format check (Prettier, rustfmt), type-check (tsc, rust check), `tofu fmt -check` + `tofu validate`, Helm chart `helm lint` + schema validation, Packer `packer validate`.
- Stage 2 (parallel, < 5 min): unit tests TS, unit tests Rust, OpenAPI lint, schema check, Helm chart `helm template` snapshot tests.
- Stage 3 (parallel, < 10 min): integration tests (Postgres + NATS + Vault Testcontainers), contract tests, secret scan (gitleaks), security scan (Trivy on built images, osv-scanner on deps, `tfsec`/`checkov` on OpenTofu), license scan.
- Stage 4 (gated, < 15 min on PRs to main): E2E suite against k3d cluster, performance smoke (k6 small), `tofu plan` against ephemeral target stack (no apply).
- Outputs: coverage report, OpenAPI diff, image digests, SBOMs, signed Helm chart artifacts (cosign), `tofu plan` JSON.

## Build, sign, publish (on merge to main)
1. **App images** built (NestJS, Rust services, frontends) with reproducible BuildKit builds.
2. **SBOM** generated per image (`syft`).
3. **Cosign sign** every image with our keyless flow (Sigstore Fulcio + Rekor) or KMS-keyed at v1.
4. **Helm chart** version bumped, packaged, signed, pushed to internal OCI registry under `oci://registry.absolo.cloud/charts/`.
5. **Image promotion**: a small CD job opens a PR against the GitOps repo (`infra/argocd/`) updating the image tag for the `staging` ApplicationSet — ArgoCD reconciles and rolls out.
6. **Argo Image Updater** (alternative path) auto-bumps tags matching a regex pattern with cosign verification before deploy.

## CI tools
- **GitHub Actions** as the runner (or self-hosted **Forgejo Actions** if we go independent later).
- Pre-commit (Husky + lint-staged) for fast local feedback.
- **Nx** or **Turborepo** to scope tasks to changed packages (we use Turborepo since pnpm workspaces are first-class).
- Cargo workspace caching via sccache + GHA cache.

## Environments
| Env | Purpose | Data | Access | Backed by |
|---|---|---|---|---|
| `dev` (local) | Each engineer's box | docker-compose / k3d | personal | local |
| `ci` | Per-PR ephemeral | fresh Testcontainers | bot | GitHub Actions runners |
| `preview` | Per-PR ephemeral on staging cluster | sandboxed | reviewer | ArgoCD ApplicationSet generator |
| `staging` | Mirrors prod, multi-region lite | scrubbed prod-like | engineering | Hetzner Cloud (smaller k3s cluster) |
| `prod-eu` / `prod-us` / `prod-apac` | Customer-facing per region | live | restricted | Hetzner Cloud + Hetzner dedicated / Latitude.sh bare metal |

- Each env has its own **OpenTofu stack** in `infra/tofu/stacks/<env>/` and its own **ArgoCD AppProject**.
- Preview envs: every PR that touches `apps/dashboard` or `apps/marketing` gets a Vercel-like preview URL (ArgoCD ApplicationSet templates one Application per PR; namespace torn down on close).
- Staging is rebuilt nightly from `main` via ArgoCD auto-sync; production deploys are gated (manual sync or PR-based promotion).

## Release process (GitOps with ArgoCD)
- `main` always deployable.
- **Trunk → staging** auto-deploy on merge: CI publishes signed image + Helm chart → GitOps PR auto-opened by bot → auto-merged on green checks → ArgoCD reconciles staging within ~60s.
- **Staging → production** gated by:
  - All staging E2E green for ≥1 hour.
  - No active critical incident.
  - Release manager approval (rotating) — manifests as a manual `kubectl argo rollouts promote` or a PR-merge approval against `infra/argocd/prod/*`.
  - cosign signature verification by ArgoCD before any pull.
- **Canary** (prod): Argo Rollouts + edge-proxy weight management roll 5% → 25% → 100% over 30 minutes with **auto-rollback** on Prometheus alert (`p99_latency`, `error_rate`, `pod_restart_rate`).
- **Hotfix**: same pipeline but expedited; staging soak 15 min minimum; emergency override path documented in runbook (still cosign-verified).
- **Versioning**: monorepo version uses `YYYY.MM.WW.<n>` (e.g., `2026.04.4.7` = week 4 of April, build 7).
- **Rollback**: ArgoCD app history retains last N revisions; `argocd app rollback` returns to a previous Helm chart version (with image digest) instantly.
- See `38-platform-self-deployment-d1e00e.md` for the full zero-downtime story (rolling deploys, edge-proxy connection drain, host-agent self-update channel).

## Secrets & config in CI
- GitHub Encrypted Secrets for non-prod.
- Production deploys read from Vault via OIDC federation (no long-lived secrets in CI).

## Migration discipline
- Forward-only migrations; pre-deploy DB migration step is its own job that must succeed before app deploy.
- Two-deploy pattern for breaking schema: (1) add column compatible with old code, (2) deploy new code, (3) drop old column in next release.
- Migration smoke test on a copy of staging data.

## Performance gates (CI)
- Lighthouse on marketing pages: regression > 5pts blocks merge.
- Bundle size budget on dashboard: > 5% increase requires explicit ack.
- Backend p99 micro-benchmarks: regression > 20% blocks.

## Flaky test policy
- Auto-quarantine on 3 flakes in 7 days; CODEOWNER notified to fix within 5 days or test is removed.

## Test data
- Factories (TS: `@faker-js/faker` + custom factories; Rust: `fake` crate) for deterministic seeding.
- Anonymized prod snapshot for staging refreshed monthly.

## Documentation tests
- All MDX code blocks compile; doc samples run as part of `docs-tests` job.

## Production readiness checklist (per service)
Required before a service can move to prod:
- [ ] Health endpoints (`/healthz`, `/readyz`).
- [ ] OTel traces + Prom metrics + structured logs.
- [ ] Runbook published.
- [ ] SLO defined.
- [ ] Alert rules with non-zero ack.
- [ ] Dashboard.
- [ ] Disaster recovery test.
- [ ] Threat model entry.
- [ ] Audit logging on state changes.

## Open items
- Mutation testing (Stryker for TS) — phase 2.
- Property-based testing more broadly (fast-check) — phase 1.5 in critical modules.
