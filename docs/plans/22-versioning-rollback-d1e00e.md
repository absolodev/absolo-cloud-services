# 22 — Versioning & Rollback (Apps Mode)

The immutable build/release timeline that lets developers redeploy any prior version with one click — covers blue/green, canary, and instant rollback semantics.

## Core idea
- Every successful build produces an immutable **Version** (a.k.a. Release): pinned image digest, source SHA, env snapshot, build metadata, signature.
- Versions are append-only; never edited or deleted (only retired beyond retention).
- A **Deployment** is a request to put a Version live; it produces a state record but doesn't change the Version.

## Domain model
```
Version { id, app_id, sequence_no, image_digest, image_ref, source_kind, source_ref, source_sha,
          builder_version, sbom_url, signature, env_snapshot_id, created_at, retired_at }
EnvSnapshot { id, version_id, vars(json: encrypted), bindings(json) }
Deployment { id, app_id, version_id, strategy:'rolling'|'blue_green'|'canary', status,
             traffic_pct, started_by, started_at, finished_at, prev_version_id, message }
TrafficSplit { app_id, version_id, pct, since } # for canary multi-version live
```

## Strategies
### Rolling (default for Hobby/Starter)
- k8s rolling update with surge=1, unavailable=0.
- Traffic flips per-replica as readiness flips.

### Blue/Green (Pro+)
- Allocate full new ReplicaSet, wait fully ready, atomic edge-proxy swap.
- Old ReplicaSet kept warm for `retain_seconds` (default 5 min) for instant rollback without rebuild.

### Canary (Business+)
- Split traffic e.g. 5% → 25% → 50% → 100% over a configurable timeline with pause gates.
- Auto-rollback on metric breach (5xx > 2%, p99 > 2× baseline).
- Implemented at edge-proxy via weighted upstream config.

## Rollback
- "Roll back to <Version>" button in dashboard.
- If old replicas still warm → instant traffic flip (sub-second).
- Else → spawn new replicas from old Version's image (no rebuild needed) and flip when ready (typically <30s).
- Rollback is itself recorded as a Deployment with `message="Rollback from vN to vM"`.

## Env vars handling on rollback
- Each Version captures `EnvSnapshot` at deploy time.
- Rolling back applies the snapshot atomically (UI shows diff vs current).
- Optional override: "Roll back code only, keep current env" — useful when code regression is unrelated to env.

## Bindings handling on rollback
- DB schema migrations are user code; we don't auto-roll-back schema.
- We keep "soft warning" UI: "This rollback may be incompatible with current DB schema; consider a snapshot first."

## Retention
- Default: keep last 25 versions or 90 days (whichever larger).
- Pinned versions never garbage-collected.
- Retired Versions still queryable; image may be evicted from regional registries to save space (rebuild-from-source button if desired).

## Promotions across environments
- A Version built from `main` → `staging` env can be **promoted** to `production` with the same image digest.
- Image is re-deployed under prod's env snapshot; no rebuild.
- Provides reproducibility across environments.

## API surface
```
GET  /v1/apps/:id/versions                  # list (paginated)
GET  /v1/apps/:id/versions/:vid             # detail (incl. SBOM)
POST /v1/apps/:id/deployments               # body: { version_id, strategy }
POST /v1/apps/:id/rollback                  # body: { to_version_id }
POST /v1/apps/:id/promote                   # body: { from_env, to_env, version_id }
PUT  /v1/apps/:id/traffic                   # body: { splits: [{version_id, pct}] }
POST /v1/apps/:id/versions/:vid/pin
```

## UX
- Versions list view: timeline (newest top), each row shows commit message, author, build time, status badge, traffic share, deploy button, rollback button.
- Diff view between two versions: env diff, source diff link (GitHub compare URL), build-time differences.
- Activity log: deployments, rollbacks, promotions.

## Edge & orchestrator integration
- Orchestrator uses `TrafficSplit` rows to compute weights for `edge-proxy` upstreams.
- Edge-proxy hot-reloads on row changes; weighted random per request, sticky-by-cookie if user opts in (`Set-Cookie: __abso_canary=<vid>`).

## Safety rails
- Rollback to a Version older than current DB schema warns user (we record DB schema change events from migrations and compare).
- Rollback that would re-introduce a known-CVE base image warns user.
- Concurrent deploys serialized at the app level (queue, not race).

## Tests
- Property tests: traffic-split sum always 100% with rounding handled.
- E2E: deploy v1, deploy v2, rollback to v1 in <2s.
- Canary: simulated metric breach triggers auto-rollback.

## Open items
- "Preview environments" per pull request (phase 2): same machinery, ephemeral env per branch.
- Feature-flag-driven deploys (gradual rollouts via OpenFeature) — phase 2.
