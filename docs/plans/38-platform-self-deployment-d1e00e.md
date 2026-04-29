# 38 — Platform Self-Deployment & Service Updates

How Absolo's own services — control plane (NestJS), edge proxy (Rust), host agent (Rust), builder worker (Rust), log shipper, web-ssh-gateway, metering-aggregator, frontends — are built, signed, shipped, and updated on host machines with **zero downtime for both us and our customers**.

## Principles
1. **Every change to a running service** flows through the same pipeline: PR → CI → signed image + chart → GitOps PR → ArgoCD reconcile → progressive rollout → automatic rollback if SLOs breach.
2. **Customer workloads must never see a deploy of our platform.** Our service updates are invisible to them.
3. **No service is ever deployed without canary + automated rollback** in production.
4. **The host agent updates itself** without operator intervention, in phased waves, with rollback.
5. **Saga and outbox state survives restarts**; an in-flight customer deploy keeps progressing across our control-plane rolling updates.

## Service categories (different rollout strategies)
| Category | Examples | Strategy | Disruption budget |
|---|---|---|---|
| Stateless cluster pods | control-plane, web-ssh-gateway, builder-API | Rolling update with PDB minAvailable=N-1, surge=1 | None |
| Edge ingress | edge-proxy (DaemonSet on edge nodes) | Connection drained, per-node sequential | Brief connection re-establishment, no failed requests |
| DaemonSets on every host | host-agent, log-shipper, vector | Phased per-region waves with health gates | None to customer workloads |
| Stateful operators | CloudNativePG, Longhorn manager, SeaweedFS master | Operator-driven rolling, one replica at a time | None |
| Singletons (leader-elected) | outbox relay, saga advancer, billing shipper | Stop-old → start-new under leader lock | < 30s leadership gap |
| Frontends | marketing, dashboard, admin | Atomic CDN/edge cache swap | None |

## Control plane (NestJS modular monolith)
- **Topology**: 3+ replicas behind k8s Service.
- **Rollout**: Argo Rollouts canary — 5% → 25% → 50% → 100% over 15 min, gated on `5xx_rate < 0.1%` and `p99_latency < 500ms`.
- **PDB**: `minAvailable: 2` always.
- **DB migrations**: forward-only, expand→migrate→contract pattern. Migration job runs as a pre-sync hook in ArgoCD; service rollout begins only after migration succeeds.
- **Outbox + sagas**: state in Postgres survives pod restarts; replicas pick up unfinished work via leader election + work-queue patterns.
- **Sessions**: stored server-side (Redis); pod restarts don't log users out.
- **Background workers**: idempotent; long-running work checkpoints frequently.

## Edge proxy (Rust + Pingora)
- **Topology**: DaemonSet on dedicated edge nodes (per region), behind anycast IPs.
- **Strategy**: rolling restart, **one node at a time per region**.
- **Connection draining**: on SIGTERM:
  1. Edge proxy stops accepting new TCP/QUIC connections.
  2. Existing connections continue until natural close, with a hard cap of 30s.
  3. After cap, remaining connections force-closed; client SDKs/browsers reconnect to a different edge node (anycast routing handles it).
- **Cert hot-reload**: cert rotations don't require a restart at all (rustls cert resolver swaps in-memory).
- **Routing table changes**: live, no restart.
- **Anycast safety**: per-region health-check → BGP withdraws unhealthy nodes; clients re-route automatically with sub-second TTL.

## Host agent (Rust)
The trickiest one — running on every host, auto-updates itself, must never crash a customer's host.

- **Channels**: `stable`, `canary`, `dev`. Each host is pinned to a channel via labels.
- **Update detection**: agent's heartbeat asks "is there a newer version on my channel?" Control plane responds with version + signed download URL + cosign signature.
- **Download**: agent fetches new binary into `/var/lib/absolo/agent.next`, verifies cosign signature against bundled public key.
- **Self-update**:
  1. Acquire local update lock (prevents concurrent updates).
  2. Run new binary in `--self-test` mode; if it doesn't exit 0 in 30s, abort and stay on current.
  3. Atomic swap: rename `agent.next` → `agent`, send SIGUSR2 to current process.
  4. Current process exec's the new binary, **passing open file descriptors** for the heartbeat stream and any in-flight Web SSH session via `SO_REUSEPORT` + descriptor inheritance.
  5. New process resumes the heartbeat; control plane sees no gap.
  6. If new process fails to send a heartbeat within 60s, systemd restarts old binary (kept as `agent.prev`).
- **Phased rollout**: control plane gates how many hosts in each region/channel get the new version per hour. Failure rate > threshold halts the rollout automatically.
- **Customer impact**: zero (Web SSH sessions migrate via fd passing; logs and metrics continue uninterrupted).

## k3s upgrades
- One host at a time per region, scheduled per host's maintenance window.
- Pre-upgrade: cordon → drain → upgrade k3s binary → re-uncordon.
- For control-plane k3s nodes (where applicable): always have ≥2 healthy at all times.

## Kernel patches (host OS)
- Required when a CVE warrants it.
- Workflow: orchestrator picks N hosts per region per night → live-migrates workloads off → reboots → returns to service.
- Customer impact: brief replica re-schedule, no request loss.

## Builder workers
- Stateless dispatch + stateless worker pods.
- Builds in flight: graceful shutdown waits up to 5 min for in-flight build VMs to finish; if exceeded, build is requeued (idempotent on Idempotency-Key).
- Customer-visible: at most one extra "build paused, requeueing" message.

## Log shipper / Vector
- DaemonSet, rolling per node.
- Vector's `disk_buffer` ensures no log lines are lost during restart (lines are flushed to disk; new pod resumes).
- A short ingest gap (<30s) is acceptable; alerts factor that in.

## Web SSH gateway
- Stateless gateway + active connections.
- On rollout: drain new-connection acceptance → existing sessions kept alive until natural close (or up to 5 min) → graceful exit.
- xterm UI shows "Reconnecting…" toast if a session does drop; clean reconnect flow.

## Metering aggregator
- Singleton with leader election.
- Rollout: new pod takes leadership, old pod gracefully releases lock; small (<5s) gap during which usage events buffer in JetStream and are processed once new leader is up.

## Frontend apps (marketing, dashboard, admin, status)
- Built into static assets (Next.js standalone or Vite build).
- Deployed by uploading to a CDN bucket + atomic alias swap — no rolling considerations.
- Old version remains accessible at a versioned URL for 24h for in-flight requests.
- Service worker (if used) handles update detection in the dashboard; user gets a small "Update available — refresh" banner.

## Helm chart conventions for our services
Every chart includes:
- `values.yaml` with safe defaults; `values.<env>.yaml` overrides.
- `templates/deployment.yaml` (or DaemonSet/StatefulSet/Rollout).
- `templates/pdb.yaml` (PodDisruptionBudget).
- `templates/networkpolicy.yaml`.
- `templates/servicemonitor.yaml` for Prometheus.
- `templates/preupgrade-hooks.yaml` for migration jobs.
- Rollout strategy explicitly declared (no `Recreate` allowed in prod).

## SLO-driven auto-rollback
- Argo Rollouts watches Prometheus metrics during canary stages.
- Auto-rollback triggers:
  - `5xx_rate > 1%` for 1 minute.
  - `p99_latency > 2× baseline` for 2 minutes.
  - `pod_restart_rate > 3 in 5 min`.
- On rollback: prior ReplicaSet stays warm 5 min for instant re-flip if needed; ArgoCD app marked `degraded`.

## Database migrations under load
- Pattern: **expand → migrate → contract** (NEVER destructive in a single deploy).
  - Step 1: add new column (nullable / default), deploy code that reads either old or new.
  - Step 2: backfill data in batched job; deploy code that writes both.
  - Step 3 (next release): deploy code that reads only new.
  - Step 4 (next release): drop old column.
- All migrations run as ArgoCD pre-sync hooks; on failure, sync aborts (deploy doesn't proceed).
- Long-running migrations broken into batches with idempotent resume.

## Customer-facing communication
- Status page: planned changes posted 24h ahead for any potentially-disruptive (but no expected impact) work; sub-second blips don't get listed.
- Real outages → status page incident.
- We never email customers about routine deploys.

## Observability of our deploys
- Each deploy emits structured events: `deploy.started`, `deploy.canary_step`, `deploy.completed`, `deploy.rolled_back`.
- Admin dashboard shows: timeline of platform deploys per region; SLO error budget consumed; correlation with customer-impacting incidents.
- Slack channel `#deploys` gets a one-line summary per service deploy.

## Tests for the deploy pipeline itself
- E2E: chaos-test that triggers a deploy of every service while a synthetic customer fleet runs traffic and builds; assert zero customer-visible failures.
- Periodic "rollback drill" deliberately rolls back a service in staging to validate the rollback path stays warm.

## Open items
- Whether to expose customer-controlled deploy windows (i.e., let large customers pin our deploys to off-hours) — phase 2 for enterprise.
- "Maintenance mode" UI surface for the platform itself when we know a deploy might cause minor noise — only used during major version bumps.
