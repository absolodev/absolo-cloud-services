# 29 — API Design, Contracts & SDKs

How every public, admin, and internal API is structured: REST conventions, real-time channels, OpenAPI auto-gen, idempotency, versioning, and SDK generation.

## API surfaces
- **Public REST**: `https://api.absolo.cloud/v1/*` — for customers and SDKs.
- **Admin REST**: `https://api.absolo.cloud/admin/v1/*` — for our staff dashboard.
- **Internal RPC** (mTLS gRPC): `host-agent-control` and inter-service calls when not via NATS.
- **Real-time**:
  - WebSocket at `wss://api.absolo.cloud/ws/v1/*` (logs, metrics streams, deploy progress).
  - SSE for unidirectional streams where simpler.
- **S3 endpoint**: `https://s3.<region>.absolo.app` — separate, S3 v4 sig.

## REST conventions
- **Resource-oriented**, nouns plural, kebab-case in paths.
- HTTP semantics: `GET` (idempotent read), `POST` (create / non-idempotent action), `PUT` (full replace, idempotent), `PATCH` (partial), `DELETE`.
- **Status codes**: 200, 201 with `Location`, 202 for async, 204 for empty success, 400 (validation), 401, 403, 404, 409 (conflict), 410 (gone), 422 (semantic), 429, 5xx.
- **Errors** envelope:
  ```json
  { "error": { "code": "billing.payment_method_declined", "message": "Card was declined.", "details": {...}, "request_id": "..." } }
  ```
  Codes are stable strings, hierarchical, machine-readable.
- **Pagination**: cursor-based by default. Query params: `?cursor=...&limit=...`. Response: `{ data, next_cursor }`.
- **Filtering**: explicit query params (`?status=active`); no opaque DSL.
- **Sorting**: `?sort=-created_at` (Stripe-like).
- **Field selection**: `?fields=id,name,status` (sparse fieldsets for bandwidth-sensitive callers).
- **Timestamps**: RFC 3339 UTC, microsecond precision.
- **IDs**: prefixed (`org_`, `prj_`, `app_`, `site_`, `dep_`, `ver_`, `db_`, `bk_`, `host_`, `key_`, etc.).
- **Idempotency**: `Idempotency-Key` header on POSTs; server stores response for 24h; replay returns cached.
- **Rate limit**: response headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- **Tracing**: accept `traceparent`, inject `X-Request-ID`.
- **Auth**: `Authorization: Bearer abso_…` for API keys; `Cookie` for dashboard sessions.

## Versioning
- URL prefix `/v1/` indicates the major.
- **Breaking changes** introduce `/v2/`. Old version supported 12 months minimum with `Sunset` headers.
- **Additive changes** safe within a major; consumers must ignore unknown fields.

## OpenAPI generation
- NestJS controllers + `nestjs-zod` schemas → OpenAPI 3.1 doc auto-generated on app start, served at `/openapi.json`.
- Doc embedded at `/docs` (Scalar or Stoplight UI).
- CI publishes the doc to a versioned URL (`/openapi/2026-04-30.json`).

## SDKs
- **TypeScript SDK** (`@absolo/sdk`) generated from OpenAPI via `openapi-typescript` + light hand-crafted ergonomic wrapper.
- **Go SDK** (`github.com/absolo/sdk-go`) generated via `oapi-codegen` — phase 1.5.
- **Python SDK** (`absolo`) generated via `openapi-python-client` — phase 1.5.
- All SDKs:
  - Auto-retry idempotent ops with exponential backoff + jitter.
  - Idempotency key auto-generated per call.
  - Pagination iterators.
  - Typed error classes mapping to error `code`.
  - Telemetry: opt-in OTel headers.

## CLI (`absolo`)
- See `34-developer-experience-cli-d1e00e.md`.

## Real-time channels
### WebSocket
- Auth via short-lived token (`?token=...` issued by REST endpoint).
- Frame format: JSON with `type` discriminator.
- Heartbeat: server pings every 30s; client must pong; drop after 60s no pong.
- Per-channel auth scope (`apps.<id>.logs`, `apps.<id>.deployments.<id>`).
- Backpressure: server sends `{type:'lag', dropped:N}` rather than silently losing data.

### SSE
- Used where unidirectional fits (status streams, deploy progress).
- `Last-Event-ID` for resume.

## Pacts & contract testing
- For inter-service contracts (NestJS module → Rust services), use **Pact** with consumer-driven tests.
- For NATS event schemas, JSON Schema validation in CI on both producer and consumer sides.

## Idempotency implementation
```sql
idempotency.keys(
  actor_id, key, request_hash, response_status, response_body, created_at, expires_at,
  primary key(actor_id, key)
)
```
- Hash request body; if same key with different hash → 409 `idempotency.key_mismatch`.
- TTL 24h.

## Webhooks (outgoing to customers, phase 1.5)
- Customers can subscribe to events (`projects.app.deployed`, `billing.invoice.paid`, etc.).
- HMAC-SHA256 signature header, timestamp, ts tolerance.
- Retries: 8 attempts over 24h with exponential backoff; failed deliveries inspectable in dashboard.

## Internal RPC
- gRPC over mTLS for host-agent (defined in `10-host-agent-rust-d1e00e.md`).
- Internal NestJS module-to-module calls are typed in-process (no RPC needed in monolith).
- When/if a module is extracted to a service, expose only the necessary commands/queries via gRPC (also generated from `proto` files in `packages/contracts/proto`).

## Documentation
- API reference auto-generated.
- Tutorials and guides hand-written in MDX in marketing repo.
- Examples in every SDK.
- "Try it" widget for safe GETs (uses live test account in docs).

## Tests
- Contract tests against the OpenAPI spec.
- Backwards-compat tests: snapshots of public schema, fail CI on backwards-incompatible changes without explicit override commit message.
- Fuzz tests on input validation (Zod parser).

## Open items
- GraphQL endpoint (`/graphql`) — only if customers ask; REST first.
- gRPC public API for high-volume customers — phase 2.
