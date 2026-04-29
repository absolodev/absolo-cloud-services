# 18 — Logs Aggregation & Live Tail

The end-to-end pipeline that collects every container's stdout/stderr, ships it to a fast hot store + cheap cold store, makes it tailable in the dashboard in real time, and searchable historically.

## Pipeline
```
container stdout/stderr
   │
   ▼
containerd CRI (json log files on host)
   │
   ▼
Vector (per host, DaemonSet)        ── filter, tag (org, app, env, region) ──▶ Kafka or NATS-JetStream
   │                                                                          │
   ▼                                                                          ▼
Direct WebSocket fanout              ┌──────────────── Loki ─────────────────┐ (hot, 7d, label-indexed)
(for live tail subscribers)          │                                       │
                                     └──────── ClickHouse (cold, 90d) ───────┘ (full-text, columnar)
```

## Components
- **Vector** (Rust, Datadog-OSS): per-host DaemonSet, lightweight (Rust core), kubernetes_logs source with auto-discovery.
- **NATS JetStream** (or Kafka if scale demands; default = JetStream to reuse existing infra): durable stream for log events; consumer groups feed Loki and ClickHouse writers.
- **Loki** (Grafana, AGPL): hot store with label-based indexing, 7-day retention. Fast tail and recent searches.
- **ClickHouse** (Apache 2.0): cold store, 90-day retention; full-text search via `tokenbf_v1` indexes; aggregate queries.
- **log-stream-gateway** (Rust, custom): WebSocket service that subscribes to a NATS subject filter `logs.org.<orgId>.app.<appId>` and fans out to dashboard clients.

## Why Loki + ClickHouse split
- Loki excels at "show me last 5 minutes of this app's logs" with low cost on label cardinality.
- ClickHouse excels at "search across all my apps for `error.*timeout` in the past 30 days" — Loki struggles at that. Splitting hot/cold gets the best of both at acceptable cost.

## Log line schema
```json
{
  "ts": "2026-04-30T12:34:56.789Z",
  "org_id": "org_abc",
  "project_id": "prj_def",
  "app_id": "app_ghi",
  "env": "production",
  "region": "eu",
  "host_id": "host_jkl",
  "pod": "app-ghi-7d8f9c-xyz",
  "container": "app",
  "stream": "stdout",
  "level": "info",          // best-effort parse from JSON line or pattern
  "msg": "...",
  "raw": "..."              // original line if parsed
}
```
- Vector parses well-known JSON formats (Pino, Bunyan, structlog) into `level`/`msg`; otherwise leaves `raw`.

## Live tail
- Dashboard opens `wss://logs.<region>.absolo.app/v1/apps/:id/logs?since=...&filter=...`.
- Auth: short-lived stream token issued by control plane.
- Server: `log-stream-gateway` subscribes to JetStream consumer with the relevant subject filter; pushes batches at 100ms cadence.
- Client: `xterm`-style pane with auto-scroll, pause, search, level filter, regex highlight.
- Backpressure: if client is slow, drop oldest with a banner (no silent loss without warning).

## Historical search
- Loki via Grafana Loki API for last 7 days.
- ClickHouse for older or full-text-heavy queries; UI translates user-friendly query language to either backend.
- Result limits per query: 10k lines or 10MB, paginated.

## Storage tiering
- Loki backed by SeaweedFS S3-compat for chunk storage (cheap), Boltdb-shipper for index.
- ClickHouse on Longhorn-backed PV with TTL-based partitioning.
- Both compress aggressively (zstd).

## Quotas & abuse
- Per-plan log retention (Hobby 24h, Starter 3d, Pro 7d, Business 30d, with overage purchase).
- Per-org throughput limits to protect the pipeline; over-limit traffic is still tailable in the moment but not durable past 1h.
- Abusive logging (multi-MB lines, log floods) detected by Vector and rate-limited at host level with surfaced warnings.

## PII handling
- We do not auto-redact (would lie to users).
- Pre-built optional redaction transforms users can enable: emails, credit-card patterns, common token patterns. Per-app toggle.
- Audit access to logs: every dashboard tail or search emits an audit event (`audit.logs.tailed`).

## Customer-visible log levels
- Build logs (separate stream, kept 90d): `build.logs.<buildId>`.
- Runtime logs (per-pod): `logs.org.<orgId>.app.<appId>`.
- Edge logs (request log): `edge.logs.org.<orgId>.app.<appId>` (sampled or full toggleable).

## Metrics for the pipeline itself
- Vector: dropped lines, ingest lag, parse errors.
- JetStream: stream pending, consumer lag.
- Loki/ClickHouse: ingest rate, query latency, storage growth.
- Alert if ingest lag > 30s or drop rate > 0.1%.

## API surface
```
GET  /v1/apps/:id/logs?since=&until=&query=&limit=
WS   /v1/apps/:id/logs/stream?filter=
GET  /v1/builds/:id/log
```

## Tests
- Unit: line parser, schema mapper.
- Load: 100k events/sec across the pipeline; verify <2s tail-to-screen.
- Failure: Loki down → fall back to direct JetStream tail; ClickHouse down → degrade search to Loki only.

## Open items
- Whether to allow customer log forwarding to their own destinations (Datadog, S3 export) — phase 1.5 (paid feature).
- Encryption-at-rest with per-tenant key — phase 2.
