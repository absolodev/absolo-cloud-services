# 23 — Multi-Region Networking

The plumbing for routing traffic to the nearest healthy region, replicating control-plane data, isolating per-region data planes, and enabling user workloads to live anywhere we have capacity.

## Regions at launch
- `eu-fra` (Frankfurt) — primary control plane.
- `us-iad` (Ashburn / N. Virginia).
- `apac-sg` (Singapore).
- More added by request/demand.

Each region = one k3s cluster + dedicated edge-proxy fleet + regional VictoriaMetrics + Loki/ClickHouse + SeaweedFS + control-plane replica nodes.

## Public-facing routing
- **GeoDNS** at the authoritative provider (Cloudflare): maps `*.absolo.app`, `s3.<region>.absolo.app`, `ingress.absolo.app` to nearest region's anycast IPs.
- Each region announces a small set of anycast `/29` blocks via BGP (we own a small ASN; intermediate setup uses peering with our IXP partners or static routing via colocation provider — operational task to set up before launch).
- Failover: if a region's edge proxies fail health, GeoDNS withdraws that region (low TTL = 60s) and traffic shifts.

## Region selection model
- Apps/sites have a `region` attribute set on creation; pinned (no auto-rebalancing across regions).
- Free subdomain DNS resolves per region for region-pinned URLs (`<slug>-<rand>.eu.absolo.app`) and to GeoDNS for the canonical name.
- Custom domains: customer chooses region (and we tell them where their DNS should point); we can map a domain to multiple regions for active-active in the future (phase 2).

## Cross-region traffic flow
- **Customer traffic**: terminates at the closest edge-proxy; if upstream is in the same region, direct; if cross-region (rare), edge bridges over private backbone (WireGuard mesh) to remote upstream.
- **Inter-service traffic** (control plane → host-agent, edge-proxy → orchestrator): mTLS over public internet for v1, optional WireGuard private overlay phase 1.5.

## Control-plane replication
- Postgres primary in `eu-fra`; sync replica in `us-iad`, async in `apac-sg`.
- Read APIs route to in-region replicas via Drizzle's read-replica pattern.
- Writes always go to primary.
- Failover: manual at v1 (leader-elected primary promotion via CloudNativePG) — automatic phase 2.
- NATS JetStream: regional clusters with cross-region mirroring on `usage.>` and `audit.>` streams.

## Region-local data (does not cross regions)
- Customer logs, metrics, snapshots, container images (registries are regional).
- This both reduces costs (no cross-region storage egress) and supports data residency: a customer's data lives where their workload is pinned.

## Latency targets
- Edge proxy → in-region orchestrator API: < 5ms.
- Edge proxy → customer pod: < 5ms.
- Inter-region replication lag: < 1s for Postgres, < 5s for JetStream mirror.

## Network policies
- Cilium NetworkPolicy: default-deny per namespace; explicit allow for ingress from edge-proxy and egress to bound services + internet (with WAF).
- Cluster-egress: configurable allowlist per app; phase 2 supports per-app static egress IPs (via `kEgressIP` or similar).

## DR & failover model
- **Edge layer outage in region X**: GeoDNS withdraws; traffic moves to neighbor region; user pods are still pinned in X (could be unreachable until edge comes back).
- **Upstream/k3s outage in region X**: edge-proxy returns 503 with branded error; we don't auto-migrate workloads (data is in region X). Manual cross-region migration runbook exists for catastrophic loss.
- **Database primary outage**: replica promotion in another region; control plane continues read-write within ~1 minute.

## Region addition workflow
- New region added via admin: provision base hosts → install agents → bootstrap k3s → install Cilium/Longhorn/CNPG/SeaweedFS/Vector/cert-manager → register region in `regions` table → DNS GeoDNS rule update.
- Smoke test apps deployed in new region before opening for customers.

## API surface
- `GET /v1/regions` — list regions, capacity-light (status only).
- `GET /v1/regions/:code` — detail (lat/long, services available, pricing factors).
- Internal: `GET /admin/v1/regions/:code/capacity` — for capacity planning.

## Costs & efficiency
- Cross-region network costs minimized by region-local data.
- Aggressive use of regional caches for Stripe metering (avoid cross-region trips per event).
- Deduplicated control-plane reads via in-region replica.

## Tests
- Chaos drills quarterly: blackhole an entire region's edge; verify GeoDNS withdrawal + customer impact bounded.
- Latency canaries continuously measure cross-region paths; alert on degradation.
- Database failover drills: planned promotion test monthly in staging, annually in prod.

## Open items
- Multi-region active-active for write workloads — phase 2 (would need conflict-free designs or per-region partitioning).
- Edge POPs in additional small markets — phase 2 driven by demand.
