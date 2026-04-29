# 17 — Custom Domains & SSL

The flow for users to bring their own domain (e.g., `mystore.com`, `www.mystore.com`) and get auto-renewed SSL with zero manual cert management — using cert-manager on the data plane and a small SSL controller in the control plane.

## User flow
1. User adds domain in dashboard: `mystore.com` and/or `www.mystore.com`.
2. We display verification instructions:
   - **For apex (`mystore.com`)**: A/AAAA records to our anycast IPs, OR (recommended) ALIAS/CNAME flattening if their DNS supports it (Cloudflare, Route53, DNSimple). Or use our DNS as authoritative (phase 2).
   - **For `www`/subdomains**: CNAME to `<region>.ingress.absolo.app` (default region matches app) or to the assigned subdomain.
3. Background validator polls DNS until records resolve to our IPs (max 72h, retry every 60s with exponential backoff up to 30min).
4. On verify: cert-manager issues Let's Encrypt cert (HTTP-01 default; DNS-01 if user delegates NS or uses our DNS).
5. Edge-proxy hot-loads the new cert, route added to routing table.
6. Domain shows ✅ Active with cert details and expiry.

## Verification methods
- **HTTP-01 (default)**: cert-manager challenge served via edge-proxy at `/.well-known/acme-challenge/*` on port 80. Works for any DNS provider that points to us.
- **DNS-01 (wildcard or no-HTTP)**: user adds a TXT record OR delegates `_acme-challenge.<domain>` NS to us; we control the TXT.
- **TLS-ALPN-01**: not exposed v1.

## Renewal
- cert-manager renews 30 days before expiry, automatic.
- ZeroSSL fallback if Let's Encrypt rate-limit hits (rare).
- Failed renewal alerts user 7d before expiry; auto-retry hourly.

## Custom certificate upload (Business+ plans)
- Upload cert + key + chain.
- We validate the chain, store in Vault, deploy to edge-proxy.
- Renewal handled by user; reminder emails 30/7/1 days before expiry.

## Apex domain handling
- Many DNS providers don't support CNAME at apex; we offer:
  - **Anycast A/AAAA targets** (recommended): static IPs we own; user adds A records.
  - **CNAME flattening** instructions for compatible providers.
  - **Use our DNS** (delegation): user changes nameservers to ours; we manage everything (phase 1.5).

## HSTS & security headers
- Auto add `Strict-Transport-Security` (preload opt-in toggle), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Per-app override in advanced settings.

## CAA enforcement
- We surface CAA suggestions: `mystore.com. CAA 0 issue "letsencrypt.org"` etc., to prevent rogue cert issuance.
- We never issue if their CAA disallows our issuers; we explain clearly.

## Wildcard custom domains
- Supported on Business+ plans; requires DNS-01.
- Useful for SaaS users who need `*.theirapp.com`.

## Domain transfers / removal
- Removing a domain: requires explicit confirmation (typed match).
- 24h grace: traffic still routes (helpful if user mis-clicks); cert remains in place; after 24h fully purged.

## Multi-domain (SAN) handling
- We bundle related hostnames (apex + `www` + a couple more) into one cert if user adds them together — to stay under Let's Encrypt rate limits.
- Cert renewal cascades.

## Internationalized domain names (IDN)
- Punycode-aware: input handled, displayed in both unicode and ASCII forms.

## Domain model
```
Domain { id, app_or_site_id, hostname, hostname_ascii, status:'pending'|'verifying'|'active'|'failed'|'removed',
         verification_method, primary_for_app:bool, hsts:bool, hsts_preload:bool,
         cert_secret_ref, cert_issuer, cert_expires_at, last_checked_at }
DomainEvent { id, domain_id, event_kind, payload, at }
```

## Edge integration
- On `Active` → write/update row in `routing.routes`; edge-proxy picks up via NOTIFY.
- On `Removed` → delete routing row; edge-proxy stops accepting that SNI.

## Anti-abuse
- Disallow `localhost`, internal TLDs, our own domains as customer domains.
- Track concurrent custom-domain rate per org; limit free plan to 0 custom domains, paid to plan max.
- Phishing scans on hostname patterns.

## API surface
```
POST   /v1/apps/:id/domains  { hostname }
GET    /v1/apps/:id/domains
DELETE /v1/apps/:id/domains/:dom
POST   /v1/apps/:id/domains/:dom/verify     # manual re-check
PUT    /v1/apps/:id/domains/:dom/primary
PUT    /v1/apps/:id/domains/:dom/hsts
POST   /v1/apps/:id/domains/:dom/cert/upload
```

## Tests
- Pebble (Let's Encrypt staging) for cert flow.
- Mocked DNS resolver for verification logic.
- Integration: full add → verify → cert → live → renew → revoke loop.
- Chaos: cert renewal failure with fallback issuer.

## Open items
- DCV via DNS hosted by us (phase 1.5 — own DNS service).
- Email validation challenge (phase 2 — for non-DNS-savvy users with branded emails).
