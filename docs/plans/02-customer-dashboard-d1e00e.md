# 02 — Customer Dashboard (React + TypeScript)

The signed-in product surface where customers create projects, deploy apps and sites, manage databases and buckets, view billing, tail logs, and open Web SSH — built as a Vite + React 19 + shadcn/ui SPA, kept separate from the marketing site for hard separation of concerns.

## Stack
- **Vite 6** + **React 19** + **TypeScript 5.7** strict.
- **TanStack Router** (file-based, type-safe) — chosen over Next.js because the dashboard is a private SPA without SEO needs and benefits from instant client-side routing.
- **TanStack Query** for server state, **Zustand** for thin global UI state.
- **shadcn/ui** + **Tailwind v4**.
- **react-hook-form** + **Zod** for forms.
- **xterm.js** for Web SSH (in `20-web-ssh-shell-d1e00e.md`).
- **Recharts** + **visx** for usage/metrics charts.
- **dayjs** for time formatting.
- **i18next** for i18n (English-only at launch, scaffolding in place).
- **Sentry** for error reporting (self-hosted GlitchTip option).
- **OpenAPI codegen** (orval) — generates typed clients from `absolo-control-plane`'s OpenAPI spec.

## Information architecture
```
/                       → Org switcher → /orgs/:orgSlug
/orgs/:orgSlug
  /                     → org overview (active resources, spend MTD)
  /projects             → list / search / create
  /projects/:projectId
    /                   → project overview
    /apps               → list (Apps mode)
    /apps/:appId
      /overview         → status, URL, version
      /deployments      → version history, rollback
      /logs             → live tail + search
      /metrics          → CPU/mem/req
      /shell            → Web SSH
      /env              → env vars + secrets
      /domains          → custom domains, SSL
      /scaling          → size, replicas
      /settings
    /sites              → list (Sites mode, templates)
    /sites/:siteId      → like apps + /snapshots, /files (sftp-style browser)
    /databases          → managed DB list
    /databases/:dbId    → connection, metrics, backups, users, params
    /buckets            → S3 buckets
    /buckets/:bucketId  → object browser, credentials, lifecycle
  /billing
    /                   → plan, invoices, payment methods
    /usage              → live usage by resource
    /tax-info           → VAT/EIN
  /team                 → members, invites, roles
  /api-keys             → personal + org-scoped
  /audit-log            → org-scoped audit trail
  /settings             → org name, billing email, SSO
/account
  /                     → personal profile, MFA
  /sessions             → active sessions, revoke
/onboarding             → post-signup wizard
```

## Real-time surfaces
- **Live logs** — WebSocket from `web-ssh-gateway` (or dedicated `log-stream-gateway`).
- **Live metrics** — server-sent events, 5s tick.
- **Deployment progress** — SSE streaming saga state from `orchestrator`.
- **Usage counter** — refresh every 60s (matches metering tick).

## State patterns
- **Server state** = TanStack Query (cache, revalidation, optimistic updates with rollback).
- **UI state** = Zustand (theme, sidebar, modals).
- **Form state** = react-hook-form (controlled, validated with Zod).
- No Redux. No Context-as-state.

## Auth
- Cookie-based session (HttpOnly, Secure, `__Host-` prefix, SameSite=Lax).
- Refresh handled silently by an auth middleware in TanStack Query.
- Org context = path param (`/orgs/:orgSlug`); switching org = navigate, not state.

## Theming
- Default = dark, system-preference detected on first load, persisted in localStorage.
- High-contrast variants for both themes.
- Theme tokens consumed from `04-design-system-d1e00e.md` package (`@absolo/design-tokens`).

## Folder layout
```
apps/dashboard/
  src/
    routes/             # TanStack Router file-based
    features/           # feature modules: apps, sites, billing, etc.
      <feature>/
        api.ts          # query keys + hooks
        components/
        forms/
        types.ts
    components/         # shared UI
    lib/{api,auth,format,ws}.ts
    stores/             # zustand
    main.tsx
  index.html, vite.config.ts
```

## Performance
- Route-level code splitting (TanStack Router does it natively).
- Large lists virtualized with TanStack Virtual.
- Charts lazy-loaded.
- Bundle budget: < 250 KB gz initial, < 60 KB gz per route chunk.

## Accessibility & UX details
- Cmd+K command palette (cmdk by pacocoursey).
- Skeleton states everywhere; never spinners on initial loads > 200ms.
- Empty states with concrete next-action CTAs.
- Toast (`sonner`) for async feedback.
- All destructive actions require typed confirmation (e.g., type project name).

## Testing
- Vitest + Testing Library for components.
- Playwright for critical-path E2E (signup → deploy → see live).
- Storybook (or Ladle) for design-system components.

## Open items
- Onboarding wizard flow detail goes in `02a-onboarding-flow-d1e00e.md` if it grows.
- File browser for Sites mode storage — design TBD; reference TablePlus / Cyberduck UX.
