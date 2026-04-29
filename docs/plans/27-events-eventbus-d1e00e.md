# 27 — Internal Event Bus & Outbox

The async glue holding the system together: NATS JetStream as the durable message bus, transactional outbox for reliable publishing, and saga orchestration for multi-step workflows.

## Why NATS JetStream
- **NATS** (CNCF, Apache 2.0): single binary, low ops overhead, multi-region clustering, JetStream provides durable, replicated streams with at-least-once delivery and message replay.
- Subjects natural fit for our hierarchical events (`org.<id>.app.<id>.deployed`).
- Significantly simpler ops than Kafka; sufficient throughput for our scale (we are nowhere near the cardinality where Kafka becomes necessary).

## Topology
- 3-node JetStream cluster per region.
- Mirror critical streams (`audit.>`, `usage.>`) cross-region (async).
- Optional: source consumer groups in primary region for streams that need global ordering (`billing.>`).

## Stream design
| Stream | Subjects | Retention | Replicas | Notes |
|---|---|---|---|---|
| `events` | `events.*.*.*` (domain events) | 7d limits | 3 | General-purpose domain events |
| `usage` | `usage.compute.>`, `usage.pv.>`, `usage.bw.>`, `usage.bucket.>` | 30d limits | 3 | Billing source-of-truth, mirrored cross-region |
| `audit` | `audit.>` | 1y file storage | 3 | Append-only, mirrored cross-region |
| `logs` | `logs.>` | 7d limits | 3 | Hot log path (cold goes to ClickHouse) |
| `builds.logs` | `build.logs.>` | 7d limits | 3 | Build log streaming |
| `commands` | `cmd.<service>.>` | work-queue | 3 | Service-to-service commands |

## Event schema
```json
{
  "id": "ulid",
  "kind": "projects.app.deployed",
  "version": 1,
  "ts": "2026-04-30T...",
  "source": "control-plane.projects",
  "tenant": { "org_id": "org_abc" },
  "actor": { "id": "user_..." | "service:..." },
  "subject": { "kind": "app", "id": "app_..." },
  "data": { ... },
  "trace_id": "...",
  "request_id": "...",
  "idempotency_key": "..."
}
```
- Schemas defined in a shared `packages/contracts` package: TS types + Zod validators auto-generated; Rust counterparts generated via `serde` JSON Schema parsing or a build-time codegen.
- Versioning: additive only within a major; breaking change = new `kind` + dual-publish window.

## Transactional outbox
- Every domain command that emits events writes them to the same Postgres tx in `outbox` table:
  ```sql
  outbox(id, aggregate_id, kind, payload, tenant, created_at, sent_at, attempts, last_error)
  ```
- A singleton **outbox-relay** worker (leader-elected) polls or LISTEN/NOTIFY-driven, publishes to JetStream, marks `sent_at`.
- Guarantees: a state change is durable before the event is published; on relay restart, unsent rows resume.
- Idempotency at consumer side: `Nats-Msg-Id = outbox.id` enables JetStream dedup.

## Consumers
- **NestJS modules** subscribe via `@nats/nestjs` integration, with declarative consumer config.
- **Rust services** use `async-nats` crate.
- Consumer policies: durable, manual ack, ack-wait 30s, max-deliver 10, with DLQ stream for poison messages.

## Sagas
- Saga state lives in Postgres (see `09-orchestrator-service-d1e00e.md`); JetStream is the carrier for inter-step commands.
- Long-running sagas don't block command handlers; commands enqueue NATS messages, handlers update saga state.
- Compensations are explicit reverse handlers per step.

## DLQ handling
- Failed messages after `max-deliver` go to `<stream>.dlq`.
- Admin dashboard surface: list, inspect, replay, drop.
- Pages on DLQ growth.

## At-least-once → effectively-once
- Consumers are written idempotent (use the `id` as a dedupe key in their domain).
- For payment-side effects (Stripe), we use Stripe's own idempotency keys.

## Cross-region mirroring
- `audit.>` and `usage.>` mirrored to all regions for DR.
- Local consumers prefer local stream; on failover, can read from mirror.

## Observability
- Per-stream metrics: pending, ack rate, redelivery rate, age of oldest unacked.
- Per-consumer lag dashboard.
- Alerts: lag > 30s on `usage.>`, > 5min on `audit.>`, DLQ size > 0 (warn) or > 100 (crit).

## Security
- mTLS to NATS, per-service certs.
- Subject-based ACLs: services can only publish/subscribe to their own scope.
- Encrypted-at-rest streams with key from Vault.

## API surface (none public)
- Internal only; NestJS modules use decorators (`@OnEvent('projects.app.deployed')`).
- Outbox is internal infrastructure.

## Tests
- Unit: outbox relay correctness (insert in-tx, never-publish-without-state).
- Integration: tx rollback ⇒ no event published; tx commit ⇒ exactly one publish.
- Chaos: kill relay mid-publish → resumes correctly without duplicates beyond at-least-once.

## Open items
- Whether to add **Redpanda** as a premium throughput path for log streams — phase 2.
- Schema registry: confluent-style? Decision: ship as TS/Rust generated types + JSON Schema docs in repo; no separate registry service for v1.
