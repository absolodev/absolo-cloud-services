# 09 — Orchestrator Service

The brain of the data plane: turns user-facing commands ("deploy this app", "scale to L", "migrate to another host") into k8s manifests, handles cross-region scheduling, plans capacity-aware migrations, and runs long-lived sagas with compensations.

## Responsibilities
- Translate domain commands → k8s objects (Namespace, Deployment, StatefulSet, Service, Ingress, NetworkPolicy, PVC, ConfigMap, Secret).
- Schedule workloads to regions and hosts based on capacity, plan tier, isolation requirements, and customer preferences.
- Plan and execute migrations (host-to-host, region-to-region) with zero or minimal downtime.
- Coordinate multi-step provisioning sagas (DB + bucket + app + DNS + SSL).
- Surface real-time saga state to dashboard/admin.

## Architecture
- Lives as a NestJS module (in monolith) for the command/saga API + a singleton Saga Advancer worker (leader-elected via Redis lock).
- Uses `@kubernetes/client-node` to talk to each region's k3s API server (separate kubeconfig per region, stored in Vault).
- Long term: extract to standalone service when CPU/memory becomes dominant.

## Saga engine
- **State storage**: Postgres tables `saga_runs`, `saga_steps`, `saga_events`.
- **Step model**: each step has `command`, `compensation`, `idempotency_key`, `retry_policy`, `timeout`. Steps execute serially by default, with optional fan-out branches.
- **Failure handling**: on step failure beyond retries → run compensations of completed steps in reverse, mark saga `failed`, emit event.
- **Recovery**: advancer polls every 5s for `running` sagas; resumable across restarts because state is in Postgres.

### Example saga: ProvisionApp
```
1. createNamespace(app)                       compensate: deleteNamespace
2. ensureNetworkPolicies(app)                 compensate: deletePolicies
3. createPersistentVolumeClaim(if Sites)      compensate: deletePvc
4. provisionManagedDb(if bound)               compensate: deprovisionDb
5. provisionBucket(if bound)                  compensate: deleteBucket
6. createDeployment(app)                      compensate: deleteDeployment
7. waitForReady(timeout=5m)                   compensate: -
8. createService(app)                         compensate: deleteService
9. createIngressRoute(edge-proxy)             compensate: deleteRoute
10. requestCertificate(domain)                compensate: revokeCert
11. switchTraffic(100%)                       compensate: switchTrafficBack
12. emit AppProvisioned                       compensate: -
```

## Scheduling
- **Region selection**: explicit user choice OR project default OR latency-optimal based on user's signup IP.
- **Host selection within region**: custom scheduler hint via k8s pod labels and node taints; we **don't** reinvent scheduling — k8s does it. We just maintain accurate `Allocatable` reservations and placement constraints.
- **Bin-packing strategy**: prefer packing onto warmer nodes (less idle hardware for billing); avoid hosts with cordon/drain in progress; respect plan-tier taints (Standard pods can't land on Dedicated nodes and vice versa).
- **Anti-affinity**: spread replicas of the same app across distinct hosts and (when ≥3 replicas) across distinct AZs/zones if the region exposes them.

### Capacity reservations
- Each customer pod reserves CPU + memory + PV size at the scheduler level.
- A separate `CapacityForecaster` projects 24h-future demand from current uptime + scheduled scale-ups; admin dashboard shows capacity heatmap.
- When projected free capacity in a region < threshold, alert ops to add hosts.

## Scaling
- **Vertical resize (in-place)**: use k8s 1.33+ in-place resource resize (alpha→beta→GA path, GA in 1.33). For older clusters, fall back to "create new pod, drain old".
- **Horizontal**: k8s HPA with custom metrics adapter (VictoriaMetrics → custom adapter exposing requests-per-sec, queue-depth).
- **Auto-suspend** for Hobby plan: scale to 0 after 30min idle; warm restart on next request via edge-proxy "scale-from-zero" hook.

## Migration plans
- **In-region host change (most common)**:
  1. Capacity check on target host.
  2. For Sites mode (Longhorn PV): trigger Longhorn replica copy → wait healthy → schedule new pod with PV preference for new host → validate readiness → drain old.
  3. For Apps mode (stateless or external state): start new pod on target → readiness → flip traffic → drain old.
- **Cross-region migration** (rare, on user request):
  1. Snapshot PV → ship to target region's Longhorn (cross-region replication).
  2. Restore PV → bring up workload there → DNS/route flip with TTL ramp-down.
  3. Decommission source after grace period.

## k8s objects per app
- `Namespace`: `org-<orgId>-app-<appId>`.
- `Deployment` or `StatefulSet` (Sites with PV).
- `Service`: ClusterIP for in-cluster, edge-proxy reads endpoints.
- `NetworkPolicy`: deny-all default, allow ingress only from edge-proxy, allow egress only to bound DB/bucket and external internet (configurable).
- `PodSecurityPolicy` / **Pod Security Standards** at restricted level by default.
- `ResourceQuota` per namespace matching plan size.
- `ConfigMap` for non-secret env, `Secret` for secret env (sealed-secrets at rest).
- `RuntimeClass` = `gvisor` by default (or `kata-qemu` for Hardened tier, `runc` for Dedicated nodes only).

## Edge-proxy integration
- Orchestrator writes per-app routing rows to a dedicated Postgres `routing_table` schema; `edge-proxy` instances reload routes from a notification (NOTIFY/LISTEN) or short-poll.
- Atomic traffic switches via two rows (current + previous) and a swap.

## Failure modes & how we cope
- **Pod CrashLoop**: surface in dashboard with last logs; backoff; if user-induced (bad code), surface clearly; never auto-rollback unless previous version was healthy.
- **Host failure**: k8s reschedules; Longhorn fails over PV replica; orchestrator alerts and ensures replica count is restored within minutes.
- **k8s API unavailable**: orchestrator queues commands, retries with exponential backoff; user sees "scheduling…" state.
- **Stuck saga**: admin can `force-advance` or `force-compensate` a saga from the admin dashboard with audit.

## API surface (internal, called from `projects` module)
```
orchestrator.scheduleApp(appId)
orchestrator.scaleApp(appId, size, replicas)
orchestrator.migrateApp(appId, targetHostId | targetRegion)
orchestrator.rollback(appId, toVersionId)
orchestrator.suspendApp(appId, reason)
orchestrator.resumeApp(appId)
orchestrator.snapshotSite(siteId)
orchestrator.restoreSite(siteId, snapshotId)
```

## Observability
- Every saga step emits an OTel span; full trace per provision flow.
- Metrics: saga_duration, step_failure_rate, scheduling_latency, capacity_pressure_per_region.
- Per-app debug view in admin showing last 10 sagas with timeline.

## Tests
- Unit: pure command-to-manifest functions.
- Integration: against a kind/k3d cluster in CI.
- E2E: test region with a single tiny host runs full provision/scale/migrate cycle.

## Open items
- Whether to use Argo Workflows under the hood or stick with our own engine — sticking with our own (Argo's overhead not justified for this simple state model).
- Pre-emption policy for free-tier workloads when paid customers need capacity — phase 2.
