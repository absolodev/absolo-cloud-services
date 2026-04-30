# @absolo/dashboard

The customer-facing SPA at `https://app.absolo.cloud`.

Vite 6 + React 19, **TanStack Router** for code-first routing, **TanStack
Query** for server state. Talks to the control plane via the typed
`@absolo/sdk` client; every form validates with the same Zod schema the
server uses.

## What works today

- **Sign-in** — `react-hook-form` form bound to `LoginRequestSchema`.
- **Projects list** — list/create projects (org id is hard-coded for phase 0
  pending the IAM module + org switcher).
- **Project detail** — overview, full **environment-variables editor**
  (add/remove with patch-style writes, secret/plain toggle, reveal switch).
- Auth-state, multi-org scoping, proper redirects from `/sign-in` are wired
  up but not enforced — that lands once `iam` is built.

## Running

Make sure `pnpm dev:infra` is up (Postgres) and the control plane is running
on `:4000` (`pnpm dev:api`). Then:

```bash
cp .env.example .env.local
pnpm --filter @absolo/dashboard dev
```

Open <http://localhost:5173>. Vite proxies `/v1/*`, `/healthz`, `/readyz` to
the control plane so cookies "just work" and CORS is a non-issue.

## Layout

| Path | Purpose |
|---|---|
| `src/main.tsx` | React root — query, router, toaster, strict mode. |
| `src/router.tsx` | Code-first TanStack Router: `/`, `/sign-in`, `/projects`, `/projects/$projectId`. |
| `src/lib/api.ts` | Singleton `AbsoloClient` from `@absolo/sdk`. |
| `src/lib/query-client.ts` | TanStack Query client — retry skips 4xx. |
| `src/components/app-shell.tsx` | Authed layout: sidebar + outlet. |
| `src/components/config-editor.tsx` | Env-vars editor (the flagship feature). |
| `src/pages/` | One file per top-level route. |

## Conventions

- **Contracts first.** Every form imports its Zod schema from
  `@absolo/contracts` so the dashboard can never POST something the server
  would reject.
- **No raw fetch.** Always go through `api.<resource>.<method>` from the SDK.
- **Server state → TanStack Query.** Mutations invalidate the relevant
  query key on success.
- **Toasts for ApiError envelopes.** Pull `requestId` into the toast for
  support traceability (TODO once IAM lands).
- **Tokens only.** `bg-bg`, `text-fg-muted`, `border-border/60` etc. Never
  raw hex or `slate-*`.

## Plan refs

- `docs/plans/03-design-system-d1e00e.md` (token usage)
- `docs/plans/29-api-contracts-d1e00e.md` (contracts-first discipline)
- `docs/plans/41-application-configuration-d1e00e.md` (env-vars feature)
