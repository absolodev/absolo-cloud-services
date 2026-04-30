# @absolo/admin

Internal admin console for **Absolo staff only**. Lives on a separate
internal-only subdomain (e.g. `admin.absolo.internal`) gated by Tailscale +
SSO + MFA at the edge.

## Why a separate app?

- Different audience (staff, not customers) → different conventions
  (monospace, terse, dense).
- Different blast radius (one wrong click can suspend an org) → separate
  audit trail and bigger warnings in the UI.
- Different deploy pipeline (no public route, paranoid CSP).

## Status

Phase-0 placeholder. Routes scaffolded so the IA is right; real data wires up
as the corresponding control-plane modules ship.

| Path | Purpose | Backend |
|---|---|---|
| `/` | Platform overview — readiness, KPIs. | `readyz` (live) + later. |
| `/fleet` | Regions, hosts, capacity. | Plan 22, not yet built. |
| `/orgs` | Search/suspend/impersonate. | Plan 04 (iam), not yet built. |
| `/audit` | Immutable audit log. | Plan 35, not yet built. |

## Running

```bash
cp .env.example .env.local
pnpm --filter @absolo/admin dev
```

Open <http://localhost:5174>. Vite proxies `/v1`, `/admin`, `/healthz`,
`/readyz` to the local control plane on `:4000`.

## Conventions

- **Monospace UI.** All headings + nav are `font-mono`. The admin console
  is a tool, not a product.
- **Warning-tinted brand.** AbsoloMark renders in `text-warning-500` and the
  shell shows an "internal / staff" tag so nobody confuses this with the
  customer dashboard.
- **Audit everything.** Every mutation goes through `/admin/*` endpoints
  that write to `audit.events` (plan 35) before responding.
- Same SDK + tokens + UI primitives as the customer dashboard — no
  divergent component variants.

## Plan refs

- `docs/plans/04-iam-rbac-d1e00e.md` (impersonation, staff roles)
- `docs/plans/35-audit-trail-d1e00e.md` (audit log surface)
- `docs/plans/40-monorepo-structure-d1e00e.md` §3 (visibility — stays in
  monorepo permanently)
