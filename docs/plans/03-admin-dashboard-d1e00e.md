# 03 — Admin Dashboard (Internal Management Console)

The internal-only console used by Absolo staff to manage the fleet, customers, abuse, finance, support, and incident response — a separate React-TS app with stricter auth (SSO + MFA-mandatory + IP allowlist) and separate RBAC.

## Stack
Same as `02` (React 19 + Vite + TanStack + shadcn) for consistency, but:
- Auth is **OIDC SSO only** (Google Workspace or self-hosted Authentik) — no password login.
- **MFA mandatory**, WebAuthn preferred.
- **IP allowlist** at edge-proxy + at app layer.
- Admin SPA served from a separate subdomain (`admin.absolo.internal` behind VPN or `admin.absolo.cloud` with edge IP allowlist).
- All admin actions are **dual-control** for high-risk operations (refund > $X, force-delete tenant, force-migrate fleet).

## Information architecture
```
/                       → ops dashboard (live SLO, incidents, recent deploys)
/customers
  /                     → search/list orgs and users
  /:orgId               → org detail
    /resources          → all their projects/apps/sites/DBs/buckets
    /billing            → invoices, refund, comp credits
    /audit              → audit log filtered by org
    /support            → tickets
    /actions            → suspend / reactivate / hard-delete (dual-control)
/fleet
  /                     → all hosts across regions, capacity heatmap
  /regions              → region topology, k3s cluster health
  /hosts/:hostId        → CPU/mem/disk, agent version, draining controls
  /onboarding           → install command generator, pending hosts
  /upgrades             → rolling agent/k3s upgrades
/orchestration
  /                     → live deploy queue, pending migrations
  /sagas/:sagaId        → step-by-step trace, retry/abort
  /scheduler            → bin-packing visualizer, headroom forecast
/billing-ops
  /metering             → usage event lag, reconciliation drift
  /stripe               → Stripe webhook health, dispute queue
  /invoices             → recent, failed, dunning state
  /refunds              → pending approvals (dual-control)
/abuse
  /signals              → cryptominer detector hits, traffic anomalies
  /reports              → user-submitted abuse reports
  /actions              → quarantine workload, freeze account
/support
  /tickets              → queue, assignments, SLA timers
  /macros               → reusable replies
/security
  /audit-log            → global audit log search
  /access-reviews       → quarterly access review workflow
  /secrets              → secret rotation queue (no values shown)
  /threats              → security events feed
/finance
  /revenue              → MRR, ARR, churn, cohorts
  /reports              → exportable financial reports
  /tax                  → Stripe Tax health
/templates-admin
  /catalog              → publish/retire templates, version mgmt
  /metrics              → usage by template
/feature-flags          → Unleash UI embed or native
/changelog              → publish entries to public site
```

## Distinct features vs customer dashboard
- **Capacity heatmap**: shows each host's CPU/mem/PV used vs available; drives migration planning.
- **Saga inspector**: visual graph of multi-step orchestrations with replay/abort.
- **Tenant impersonation** (read-only, audited): support staff can view a customer's dashboard *as them* without writing.
- **Dual-control queue**: dangerous actions go to a shared queue requiring a second admin's approval before execute.
- **Global audit log search** with full-text + structured filters.

## Auth & RBAC
- Roles: `admin.viewer`, `admin.support`, `admin.ops`, `admin.finance`, `admin.security`, `admin.superadmin`.
- Permission matrix defined in `06-iam-auth-service-d1e00e.md`.
- Each admin session: 8h max, refresh requires re-auth, idle timeout 15min.
- Every page write logs `actor_id`, `action`, `target`, `before`, `after`, `ip`, `ua`.

## Backend
- Talks to `absolo-control-plane`'s `admin` module via separate `/admin/v1/*` API surface.
- Admin module enforces all dual-control workflows server-side; UI is a thin client.

## Data scale considerations
- Customers/orgs list virtualized (we'll have 10k-100k+ orgs at scale).
- Audit log uses cursor-based pagination + ClickHouse for full-text.

## Folder layout
```
apps/admin/  (mirrors apps/dashboard/ structure)
```

## Tests
- Smoke E2E for every dual-control workflow (Playwright).
- Strict CSP, no third-party scripts at all.

## Open items
- Whether to embed Grafana for low-level ops or build native (lean: native for top-line, Grafana iframe for deep).
- Export formats for finance reports (CSV + Parquet?).
