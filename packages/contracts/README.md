# @absolo/contracts

**Single source of truth** for Absolo's public API.

## What's in here

- `src/common/` — primitive scalars: `Id`, `Slug`, `Timestamp`, `Cursor`, `PageMeta`.
- `src/auth/` — signup, login, session, password reset, MFA.
- `src/orgs/` — organisations + members.
- `src/projects/` — projects, apps, sites.
- `src/environments/` — production / staging / preview.
- `src/config/` — config entries (env vars), config versions, config files.
- `src/errors.ts` — RFC 7807-style error envelope.
- `src/openapi.ts` — assembles the OpenAPI 3.1 document from Zod schemas via `@asteasolutions/zod-to-openapi`.
- `scripts/gen-openapi.ts` — emits `openapi/openapi.gen.yaml`.

## Source of truth

Zod schemas are primary. The OpenAPI document is **generated** from them.

```ts
import { ProjectSchema, CreateProjectRequestSchema } from '@absolo/contracts/projects';
import { ApiErrorSchema } from '@absolo/contracts/errors';
```

## Generating the OpenAPI document

```bash
pnpm --filter @absolo/contracts gen:openapi
```

This writes `openapi/openapi.gen.yaml`, which is committed for diff visibility and consumed by:

- `services/control-plane/` (validates that emitted runtime schemas match).
- `crates/cli/` and other Rust consumers (codegen via `oapi-codegen`).
- External SDKs and partners (mirrored to `absolo/api-spec`).

## Visibility

`public` — see `docs/plans/40-monorepo-structure-d1e00e.md` §3.

This package may only depend on other `public` packages and third-party libs from npm.

## References

- `docs/plans/04-iam-rbac-d1e00e.md` — auth shapes.
- `docs/plans/08-projects-apps-service-d1e00e.md` — project/app/site shapes.
- `docs/plans/41-application-configuration-d1e00e.md` — config entries / versions.
