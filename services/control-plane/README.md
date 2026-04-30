# @absolo/control-plane

The customer-facing public REST API. NestJS 11 over Fastify 5, Postgres via
Drizzle, every contract validated with Zod schemas from `@absolo/contracts`.

This is a modular monolith — the long-term home for `iam`, `billing`,
`projects`, `orchestrator`, etc. as those modules come online.

## Status

Phase 0 scaffold. End-to-end working surface so far:

- `GET /healthz` — liveness.
- `GET /readyz` — readiness (pings Postgres).
- `GET    /v1/orgs/:orgId/projects` — list projects in an org.
- `POST   /v1/orgs/:orgId/projects` — create a project.
- `GET    /v1/projects/:projectId` — get one.
- `PATCH  /v1/projects/:projectId` — partial update.
- `DELETE /v1/projects/:projectId` — soft-delete.

Auth is stubbed (no guard yet) — every request is treated as authorised.
Wiring up the IAM module + Casbin guard is the next ticket.

## Running locally

Prerequisites:
- A Postgres running and reachable via `DATABASE_URL` (the repo `docker-compose.yml`
  ships one).
- `pnpm install` at the repo root.

```bash
cp .env.example .env
pnpm --filter @absolo/control-plane db:generate   # generate SQL from schema.ts
pnpm --filter @absolo/control-plane db:migrate    # apply migrations
pnpm --filter @absolo/control-plane dev           # tsx watch
```

You should see:

```
control-plane listening on http://0.0.0.0:4000
```

Smoke test:

```bash
curl -i http://localhost:4000/healthz
curl -i http://localhost:4000/readyz
```

## Layout

| Path | Purpose |
|---|---|
| `src/main.ts` | Fastify bootstrap, request-id, CORS, helmet, cookie. |
| `src/app.module.ts` | Wires every module + global error filter. |
| `src/config/` | Zod-validated `AppConfig` + DI module. |
| `src/db/` | Drizzle schema (split per Postgres schema), DB DI module, migrate script. |
| `src/common/` | Cross-cutting: `ZodPipe`, `ApiErrorFilter`, `ids`. |
| `src/modules/health/` | Liveness + readiness. |
| `src/modules/projects/` | First full domain module (controller + service). |

## Conventions

- **Contracts first**: every request/response uses a schema from `@absolo/contracts`.
  Controllers attach `new ZodPipe(SomeRequestSchema)` to `@Body(...)` / `@Query(...)`.
- **Errors**: never throw raw strings. Always `NotFoundException`, `ConflictException`, etc.
  The global `ApiErrorFilter` converts these to the `ApiError` envelope and adds
  the `x-request-id` header.
- **IDs**: generated server-side via `newId('prj')`, never accepted from clients.
- **DB access**: only inside `*.service.ts`. Controllers stay HTTP-shaped.

## Plan refs

- `docs/plans/04-iam-rbac-d1e00e.md`
- `docs/plans/08-projects-apps-service-d1e00e.md`
- `docs/plans/28-data-model-postgres-d1e00e.md`
- `docs/plans/29-api-contracts-d1e00e.md`
- `docs/plans/41-application-configuration-d1e00e.md`
