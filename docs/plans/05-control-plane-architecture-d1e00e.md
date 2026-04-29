# 05 — Control-Plane Architecture (NestJS Modular Monolith)

The single deployable Node.js process that hosts every non-hot-path control-plane module: auth, billing, projects, orchestrator, DNS, SSL, templates, databases, object-storage, versioning, snapshots, fleet, support, admin. Built as a strict modular monolith with hexagonal boundaries so any module can graduate to a standalone service later without rewrites.

## Process model
- One binary: `absolo-control-plane` (NestJS 11 + Fastify).
- Multiple replicas behind an internal load balancer; stateless except for in-memory caches.
- Long-running jobs (sagas, schedulers) run on a separate replica set with a leader-election lock (Redis Redlock or Postgres advisory lock) to ensure singleton schedulers.

## Module map
```
src/
  modules/
    iam/                # auth, users, orgs, RBAC, MFA, sessions, API keys
    billing/            # plans, subs, invoices, usage, tax, dunning
    projects/           # projects, environments, apps, sites
    orchestrator/       # k8s commander, schedulers, sagas
    builder/            # build job dispatcher (real worker is Rust service)
    dns/                # subdomains, custom domains
    ssl/                # cert-manager driver
    templates/          # template catalog & lifecycle
    databases/          # managed DB offerings
    object-storage/     # SeaweedFS bucket service
    versioning/         # immutable build releases & rollback
    snapshots/          # Sites mode snapshots
    fleet/              # host onboarding, drain, decommission
    support/            # tickets, audit-log viewer
    admin/              # internal admin APIs (separate auth guard)
    audit/              # cross-cutting audit logger
    notifications/      # email, in-app, webhooks
    feature-flags/      # OpenFeature provider wrapper
  shared/
    domain/             # base classes: AggregateRoot, DomainEvent, ValueObject
    cqrs/               # NestJS CQRS bus integration
    outbox/             # transactional outbox relay
    db/                 # Drizzle config, migrations
    nats/               # NATS JetStream client + decorators
    redis/              # cache, locks
    http/               # error filters, interceptors, idempotency middleware
    auth/               # guards, decorators (used by every module)
  main.ts
```

## Patterns
- **Hexagonal per module**: `domain/` (entities, value-objects, domain events), `application/` (commands, queries, handlers), `infrastructure/` (Drizzle repos, external clients), `interface/` (controllers, gateways, NATS subscribers).
- **CQRS bus** via `@nestjs/cqrs` in modules where it earns its keep (`billing`, `orchestrator`, `versioning`). Plain controllers + service classes elsewhere.
- **Transactional outbox**: every command handler that emits domain events writes them to `outbox` table inside the same Drizzle transaction. A relay (singleton via leader election) reads `outbox` and publishes to NATS, marks as sent.
- **Sagas** (orchestration-style): implemented as state machines stored in Postgres (`saga_runs` table) with explicit step rows; the orchestrator service polls + advances steps; idempotent step handlers.
- **Idempotency**: middleware checks `Idempotency-Key` header against `idempotency_keys` table per actor; replays cached response on duplicate.

## Inter-module communication
- **In-process** for synchronous reads (e.g., `projects` calls `iam` to verify membership) — through interface classes, not concrete classes (DI).
- **Event bus (NATS)** for async fan-out (e.g., `billing.subscription.activated` → `projects` updates plan limits, `notifications` sends email).
- **Never reach into another module's DB tables**; only through its public application service.

## Database
- **Single Postgres database** (CloudNativePG, HA primary + 2 replicas).
- **Schema-per-module**: `iam.*`, `billing.*`, `projects.*`, etc. — enforces boundaries. Cross-schema FKs only by ID, never JOIN across schemas in app code.
- **Migrations**: Drizzle Kit, one folder per module (`infra/db/migrations/<module>/`). Apply order: `init.sql` then numbered up-only migrations.
- **Read replicas** read-side queries route via Drizzle's `withReplicas` for heavy reports.

## API surface
- `/v1/*` public REST API (OpenAPI auto-generated from nestjs-zod).
- `/admin/v1/*` admin REST API (separate guard, separate OpenAPI doc).
- `/internal/v1/*` service-to-service (mTLS, never exposed publicly).
- WebSocket gateways at `/ws/*` for real-time (logs, metrics, deploy progress).

## Cross-cutting concerns
- **Auth guard** runs first: validates session/API key, hydrates `req.actor`.
- **Tenant guard**: enforces actor has access to the URL's `:orgSlug`.
- **Audit interceptor**: writes audit log entries for every state-changing endpoint.
- **Error filter**: maps domain errors → HTTP responses with stable `code` strings.
- **Rate-limit guard**: per-actor + per-route, Redis-backed token bucket.
- **OpenTelemetry interceptor**: starts spans, propagates traceparent.

## Deployment
- Container image: `chainguard/node:22` base, distroless.
- Health: `/healthz` (liveness), `/readyz` (DB + NATS + Redis reachable).
- Graceful shutdown: stop accepting new requests, finish in-flight, release leader locks.
- Config: env vars only; secrets via Vault/OpenBao agent sidecar mounting files.

## Scaling guidance
- Stateless replicas scale horizontally on CPU.
- Singleton workloads (saga advancer, outbox relay, billing aggregator) gated behind leader election.
- Tactic: when any module's CPU/RAM dominates, split it out as a separate service. Order of likely extraction: `orchestrator` first (heavy CPU on big fleets), `audit` second (heavy writes), `notifications` third.

## Testing
- Unit tests per module (Vitest), no DB.
- Integration tests per module (Jest + Testcontainers Postgres + NATS).
- Contract tests with each Rust service (Pact).
- Architectural tests (`ts-arch`): no module imports another module's `infrastructure/` or `domain/` — only its `application/` interfaces.

## Open items
- Whether to use **Effect** (TypeScript effect system) for command handlers — defer; keep idiomatic NestJS for v1.
- Multi-tenant DB strategy: single DB + `tenant_id` (chosen) vs schema-per-tenant (rejected, doesn't scale operationally).
