# 16 — DNS & Free Subdomains

The service that gives every project a free subdomain on `*.absolo.app`, propagates routing rows to the edge proxy, and exposes a CNAME-friendly target for custom domains.

## Free subdomain policy
- Pattern: `<resource-slug>-<rand4>.absolo.app` (e.g., `my-shop-7fk2.absolo.app`).
- Lowercase, RFC1035-safe, never user-chosen at v1 (avoids squatting / abuse).
- Never reused: deletion → 90-day quarantine → recycle.
- Wildcard cert `*.absolo.app` covers all (single Let's Encrypt DNS-01 wildcard renewed every 60 days).
- Phase 2: optional vanity subdomain (`<chosen-name>.absolo.app`) for paid plans, with abuse review.

## DNS authority
- Authoritative provider: **Cloudflare DNS** for `absolo.app` and `absolo.cloud` (free tier suffices for our zone count).
- Backup provider: Route53 secondary on critical records.
- DNSSEC enabled on `absolo.app`.
- CAA records pinning `letsencrypt.org` and `sectigo.com` (ZeroSSL fallback).

## How records are created
- We do **not** create one DNS A/CNAME per subdomain (would be 1M+ records). Instead:
  - One **wildcard A/AAAA record** `*.absolo.app` → anycast IP set of edge proxies.
  - One **wildcard cert** `*.absolo.app`.
  - Routing decisions happen at the edge proxy by **SNI/Host header**, not DNS.
- Per-region routing: `*.eu.absolo.app`, `*.us.absolo.app`, `*.apac.absolo.app` for region-pinned URLs (phase 2 nicety).
- The "main" `*.absolo.app` resolves to GeoDNS-routed anycast.

## DNS module responsibilities
- Allocate slug-rand pairs for new resources, persist in `dns.subdomains`.
- Verify uniqueness, recycle expired.
- Emit routing rows to `routing.routes` (consumed by edge-proxy).
- Validate custom-domain CNAME ownership before issuing certs (see `17-custom-domains-ssl-d1e00e.md`).
- Provide reverse lookup (which app owns this subdomain) for support.

## Domain model
```
Subdomain { id, full_host, app_or_site_id, owner_org_id, region, allocated_at, released_at }
DomainReservation { full_host, reserved_until, reason } # quarantine, premium reservations
DnsRecord { id, zone, name, type, value, ttl, source:'platform'|'customer', last_synced_at }
```
- `DnsRecord` table is mostly used for our own zone management (External-DNS sync) and for any future "managed DNS" customer offering.

## External-DNS integration
- We deploy External-DNS controller in each k3s cluster reading from a CRD we maintain (or a custom annotation on Services), authoritative for our internal record sync.

## Anti-abuse
- New free subdomains rate-limited per org (10/hour, 100/day).
- Phishing detection: scan generated slug against banned terms (paypal, apple, google, etc.) — block + alert.
- Reverse-DNS reputation monitored; if our subdomain space gets flagged by Google Safe Browsing, automated quarantine of offending app.

## Customer-visible UX
- Dashboard shows the assigned subdomain prominently with copy + open buttons.
- Custom domain wizard sits next to it.
- Subdomain change: not allowed at v1 (we may allow it phase 2 with abuse-review for paid plans).

## API surface
```
GET  /v1/apps/:id/domains
POST /v1/apps/:id/domains            # custom (delegates to module 17)
DELETE /v1/apps/:id/domains/:dom     # custom only
```

## Operational concerns
- Cloudflare API token in Vault, scoped to `absolo.app` zone only.
- Audit log every record change.
- Dual-control on production zone changes.

## Tests
- Unit: slug allocator, recycle policy, reservation guard.
- Integration: against Cloudflare sandbox.
- Chaos: pretend Cloudflare down — wildcard records still serve from cached anycast announcement.

## Open items
- Whether to offer paid second-level domains under absolo.app (e.g., `myshop.shops.absolo.app`) — phase 2.
- Whether to integrate domain registration (sell domains via partner like Namecheap API) — phase 2 paid feature.
