# 19 — Metrics & Monitoring

The customer-visible metrics surface (CPU, memory, requests, latency, error rate, bandwidth, DB stats) plus the internal metrics platform that powers ops dashboards and alerts.

## Storage: VictoriaMetrics
- **VictoriaMetrics** (Apache 2.0): Prometheus wire-compatible TSDB, 7× more efficient than Prometheus, single binary, easy HA via vmcluster.
- Multi-region: regional clusters + a global aggregator for cross-region rollups (vmagent → vminsert → vmstorage; vmselect for reads).
- 30d hot retention; 13mo aggregated retention via downsampling (vmagent recording rules).

## Collection
- **node-exporter** + **cAdvisor** (k8s standard) on every host → vmagent.
- **kube-state-metrics** for k8s object state.
- **Application metrics**: NestJS exposes `/metrics` (prom-client), Rust services use `metrics` crate → Prometheus exporter; vmagent scrapes.
- **Edge proxy metrics**: emitted directly to vmagent.

## Customer-visible metrics
| Resource | Metrics |
|---|---|
| App/Site pod | CPU %, memory %, mem usage, restarts, uptime |
| Ingress | rps, p50/p95/p99 latency, 2xx/4xx/5xx rate, bandwidth in/out |
| Persistent volume | Used GB / total GB, IOPS, throughput |
| Managed DB (Postgres) | Connections, qps, slow queries, replica lag, disk usage, cache hit ratio |
| Managed DB (MySQL) | Connections, qps, slow queries, replica lag, InnoDB buffer pool hit ratio |
| Managed DB (Redis) | Ops/sec, memory used, connected clients, evictions |
| Bucket | Stored bytes, requests, errors, bandwidth |

## Dashboard UX
- "Overview" tab shows the 4-6 most important charts in a clean grid (DigitalOcean style).
- "Detailed" tab has every metric, time-range picker (1h/6h/24h/7d/30d), comparison overlay.
- Charts: line for time series, sparklines for at-a-glance, donuts for proportions.
- Click a spike to see overlay of recent deploys/scale events.

## Alerts (customer)
- Phase 1: send-only basic email alerts at fixed thresholds (e.g., 95% CPU 5m, 5xx rate > 5%).
- Phase 2: user-configurable thresholds + integrations (Slack, PagerDuty, webhook).

## Internal alerts
- Alertmanager → PagerDuty for ops on-call.
- Strict alert hygiene: every alert must have a runbook; no flappy alerts.
- Critical alerts (must wake someone): control-plane DB primary down, edge-proxy 5xx > 1%, builder backlog > 100, Stripe sync drift > 0.1%.

## SLOs (top-level)
- Control plane API: 99.9% availability (43m/mo budget), p99 < 300ms.
- Edge proxy: 99.95% availability (22m/mo), added latency p99 < 50ms.
- Build success rate: 99% on valid input.
- Deploy time: p95 < 90s for buildpack apps, < 30s for image apps.
- Live log tail latency: p95 < 2s ingest-to-screen.

## Observability stack summary
- **Logs**: Vector → Loki + ClickHouse (`18-…`).
- **Metrics**: Vector/vmagent → VictoriaMetrics.
- **Traces**: OTel SDKs → OTel Collector → Tempo (Grafana, AGPL).
- **Errors**: Sentry/GlitchTip self-hosted.
- **Internal dashboards**: Grafana (read-only).
- **Customer-facing**: native React UI (we don't ship raw Grafana to users — too overwhelming).

## Recording rules
- Per-app `request_rate_5m`, `error_rate_5m`, `cpu_usage_avg_5m` precomputed for fast dashboard loads.
- Daily/monthly aggregates for billing reconciliation cross-checks.

## Cardinality budget
- We pre-define labels users can affect (`app_id`, `pod`, `route`); we never let arbitrary user labels into our central TSDB (would explode cardinality).
- Per-region storage cap; if budget exceeded, alerting + auto-downsample older data.

## API surface
```
GET /v1/apps/:id/metrics?metric=cpu_usage&since=&until=&step=
GET /v1/databases/:id/metrics?...
GET /v1/buckets/:id/metrics?...
WS  /v1/apps/:id/metrics/stream
```
- Server proxies to VictoriaMetrics with automatic tenant scoping (never let user query other tenants).

## Tests
- Synthetic checks every minute from 3+ external regions probing the platform end-to-end.
- Load tests confirm cardinality stays bounded under expected scale.

## Open items
- Custom dashboards: phase 2 — let users build their own panels (read-only PromQL, scoped).
- Metric exports: Prometheus remote-write to user's destination (paid feature, phase 2).
