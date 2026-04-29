# 11 — Edge Proxy (Rust + Pingora)

The Rust binary that terminates every public TLS connection: routes HTTP/1.1, HTTP/2, HTTP/3, WebSocket, and gRPC traffic to the right tenant pod across regions, applies WAF + rate limits, and emits per-connection bandwidth events for billing.

## Why Pingora
- **Pingora** (Cloudflare, Apache 2.0) is the open-source core that powers Cloudflare's edge: production-tested at trillions of requests, async Rust, faster and lighter than nginx.
- We get HTTP/1+2+3, mTLS, connection pooling, dynamic upstream selection, and a clean trait-based extension model out of the box.
- Alternatives considered: Envoy (heavier, C++), Traefik (Go, slower TLS), Caddy (Go, less flexible). Pingora wins on perf and language-fit.

## Responsibilities
- TLS termination (rustls), SNI-based routing, ACME-issued certs from cert-manager.
- HTTP/3 (QUIC) on UDP/443.
- Per-tenant routing table lookup (cached in memory, refreshed on NOTIFY/LISTEN from Postgres).
- WAF: OWASP CRS rules (subset), basic bot-block, IP reputation list.
- Rate limiting: per-IP, per-API-key, per-tenant — token-bucket in shared memory + Redis fallback.
- Bandwidth metering: per-connection bytes-sent emitted on close.
- WebSocket and gRPC streaming pass-through.
- Healthcheck-based upstream failover.
- Optional: response caching for static template assets (phase 2).

## Routing model
```
RoutingTable {
  domain (e.g., example.com or app-abcd.absolo.app):
    →  upstream: clusterip://<region>/<namespace>/<service>:<port>
       backup:   clusterip://<region2>/...
       options: { tls_passthrough: false, http3: true, sticky: false }
}
```
- Routing rows stored in Postgres `routing.routes` table, `(domain, region)` PK.
- Edge-proxy receives change notifications via Postgres LISTEN; falls back to 30s short-poll.
- In-memory radix tree keyed by domain for O(log n) lookup.

## Certificate handling
- For `*.absolo.app` and per-custom-domain certs: cert-manager creates Kubernetes `Secret`s; a controller copies the cert/key into a separate `proxy_certs` Postgres table (per-region). Edge-proxy loads from there into rustls cert resolver.
- Hot-reload on cert renewal without dropping connections.
- **OCSP stapling** + Must-Staple where issuer supports.
- TLS 1.2 minimum, TLS 1.3 preferred; ECH (Encrypted Client Hello) phase 2.

## Per-tenant rate limits
- Default plan-tier limits (e.g., Hobby = 50 rps, Starter = 200 rps).
- Override per-app via dashboard; surfaces as `429 Too Many Requests`.
- Implementation: GCRA token bucket; counters in shared memory per worker, periodically reconciled across workers via Redis when bursts exceed local cell.

## WAF
- Coraza (Go, OWASP CRS) is mature but Go; alternative: implement a small ruleset in Rust around `regex` + `httpz` parser. Decision: **embed Coraza via FFI** initially, replace with native Rust later.
- Rules: SQLi, XSS, RCE, path traversal, well-known scanner UAs.
- Per-tenant on/off + sensitivity (`off`, `monitor`, `block`).
- Block events streamed to security audit.

## Bandwidth metering
- Counter per (domain, direction) updated incrementally; on connection close, emit `bandwidth.bytes` event over UDS to local log-shipper, which forwards to NATS `usage.bandwidth.>`.
- Buffered batching to avoid per-connection NATS publishes on high-throughput hosts.

## Observability
- Per-route metrics: rps, p50/p95/p99 latency, error %, upstream connect time, body bytes.
- Tenant-visible metrics surfaced in dashboard `metrics` view.
- OTel traces sampled (1%) for upstream calls; 100% for 5xx.

## Failover
- Health checks against upstream every 5s; mark unhealthy after 3 consecutive fails; recover after 2 successes.
- Cross-region failover: if all in-region upstreams unhealthy and `backup` is set, route to backup region; surface as `degraded` to admin.

## High availability
- Multiple edge-proxy replicas behind anycast IP per region; BGP anycast (`bird` or `frr`) for static IPs the platform owns.
- Connection draining on rolling upgrades: `SO_REUSEPORT` + graceful shutdown.

## Configuration
- TOML config file + dynamic data from Postgres.
- Hot-reload on SIGHUP for config; routing/cert changes are always live.

## API for control plane
- Edge-proxy is mostly read-only against Postgres; control plane writes routes/certs via SQL.
- A small admin UDS endpoint for ops debug (`absolo-proxy-ctl status`, `dump-routes`, `health`) — never exposed externally.

## Testing
- Unit tests for routing logic, GCRA, cert resolver.
- Load tests: vegeta + ghz; goal: 100k rps per modest box at <1ms added latency.
- Conformance: H2spec, h3spec.
- Chaos: kill an upstream during a stream; cert rotate mid-connection; certificate replacement.

## Open items
- Anycast IP procurement (separate networking task).
- Whether to expose IPv6-only ingress option (yes, default both).
- Whether to do response caching for static assets in v1 (no, phase 2).
