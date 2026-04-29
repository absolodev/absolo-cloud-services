# 12 — Builder Service

The pipeline that converts user source (Git repo, uploaded tarball, Dockerfile, or template) into a signed OCI image ready to deploy: auto-detects the right path (Buildpacks → Dockerfile → Template), runs each build inside a fresh microVM for safety, caches aggressively, and produces SBOM + provenance.

## Pipeline overview
```
[git push / upload] → builder-api (NestJS) → enqueue Build → builder-worker (Rust)
                                                              │
                                          ┌───────────────────┴────────────────────┐
                                          │  Boot Kata microVM with build sandbox  │
                                          │  Clone source / unpack tarball         │
                                          │  Detect strategy:                      │
                                          │    1. Dockerfile present → BuildKit    │
                                          │    2. Template marker → curated build  │
                                          │    3. Else → Cloud Native Buildpacks   │
                                          │  Build → produce OCI layers            │
                                          │  Generate SBOM (syft) + sign (cosign)  │
                                          │  Push to internal registry (Zot)       │
                                          │  Emit BuildSucceeded event             │
                                          └───────────────────┬────────────────────┘
                                                              │
                                                versioning module records Release
                                                              │
                                                         orchestrator deploys
```

## Components
- `builder-api` (NestJS module): receives webhook/CLI/dashboard build requests, validates plan limits, enqueues NATS job, streams logs over WS.
- `builder-worker` (Rust): consumes NATS jobs, orchestrates microVM build, monitors timeouts, ships logs.
- `builder-vm-image`: minimal Linux + buildpacks lifecycle + BuildKit + git + cosign + syft. Updated weekly.
- `internal-registry`: **Zot** (Apache 2.0, Rust) — OCI-compliant, lightweight, supports cosign.

## Detection rules
1. If user explicitly specified a strategy (UI/CLI), honor it.
2. Else: `Dockerfile` at repo root → Dockerfile.
3. Else: `project.toml` (CNB) or recognized framework → Buildpacks.
4. Else: explicit `template_id` → curated build profile.
5. Else: fail with friendly message + suggestions.

## Buildpacks integration
- Use upstream **Cloud Native Buildpacks** with the `pack` CLI inside the build VM.
- Builder image: `paketobuildpacks/builder-jammy-base` for v1; we curate a list of supported buildpacks: Node, Python, Go, Java, PHP, Static, Ruby.
- Custom internal buildpacks for templates (e.g., a "wp-deploy" buildpack that bundles config). Phase 2.
- Layer caching mounted from a per-org cache PVC (size-capped, LRU evict).

## Dockerfile path
- BuildKit (`buildx`) inside the VM, rootless mode.
- Disallow `RUN --network=host`, `--privileged`.
- Strip multi-platform builds at v1 (single arch per region; both arches built when needed).
- Cache via `cache-to=type=registry,ref=...` to internal registry.

## Template path
- Templates ship pre-built images (registry refs); "build" is mostly applying user inputs (env, theme, plugins) to a manifest. No code build.

## Sandbox / isolation
- Each build runs in a fresh **Kata Containers microVM** spawned on dedicated builder nodes (not customer-tenant nodes).
- VM has tight egress: only registry mirror + `npm/pypi/maven/composer/golang/cargo` mirrors (caching proxies we run, e.g., Verdaccio for npm, devpi for pypi).
- **No outbound to arbitrary internet** by default; configurable per-build "open net" mode for users that need it (rate-limited, audited).
- Memory: build CPU/memory caps from plan; default 2 vCPU + 4 GB RAM, 30-min timeout.

## SBOM & provenance
- `syft` runs post-build → CycloneDX SBOM stored beside image.
- `cosign sign` with our keyless OIDC (Sigstore Fulcio + transparency log Rekor) — phase 2; phase 1 uses a managed key in Vault Transit.
- SLSA L2 target at v1, L3 (hermetic, two-party review) at phase 2.

## Build metadata recorded as Release
```
Release { id, app_id, image_ref, image_digest, source_kind, source_ref, source_sha,
          builder_version, sbom_url, signature, env_snapshot, started_at, finished_at }
```
Releases are immutable. Used for instant rollback and reproducibility.

## Logs
- Every build streams stdout to `builder-worker` → NATS `build.logs.<buildId>` → dashboard live tail.
- Persisted to ClickHouse for 90d so user can re-read old build logs.

## Caching strategy
- Per-org PVC: ~5GB default, plan-tunable.
- npm, pip, composer, maven, cargo caches.
- BuildKit layer cache pushed to internal registry under per-app cache tag.
- Cache eviction: LRU per org, with 30-day max age.

## Build queue & priorities
- NATS JetStream queue group `builds` with concurrency = N per region (matches builder VM count).
- Plan tiers map to priority; paid > free; admin can pin priority for migration windows.
- Per-org concurrency cap (e.g., Hobby 1, Pro 3, Business 5).

## Failure handling
- Timeouts: hard 30min, soft warning at 20min.
- OOM: surfaced clearly; suggest larger build size.
- Flaky deps: automatic retry once on transient failures (DNS, network).
- All errors mapped to user-friendly messages with docs links.

## Security
- Source code never persists outside the VM (RAM-disk for build root).
- Registry access keys per-build, ephemeral.
- Builder workers themselves run with seccomp, no privileged.
- Webhook signatures verified (GitHub HMAC, GitLab token).

## API surface (excerpt)
```
POST /v1/apps/:appId/builds                  (create build)
GET  /v1/apps/:appId/builds                  (list)
GET  /v1/builds/:buildId
GET  /v1/builds/:buildId/log                 (SSE)
POST /v1/builds/:buildId/cancel
```

## Tests
- Unit tests for detector, manifest renderers.
- Integration: full build of canonical Node, Python, PHP, Go, Dockerfile sample apps in CI.
- Soak: 100 concurrent builds across types; measure tail latency, OOMs.

## Open items
- Whether to expose `nix` build path for reproducibility — phase 2.
- Whether to support `pack rebase` for fast base-image security updates — yes, phase 1.5.
