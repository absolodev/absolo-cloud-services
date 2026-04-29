# @absolo/sdk

Typed fetch client for the Absolo Cloud REST API.

## Quick start

```ts
import { AbsoloClient } from '@absolo/sdk';

const client = new AbsoloClient({
  baseUrl: 'https://api.absolo.cloud',
  token: process.env.ABSOLO_TOKEN,
});

const me = await client.auth.me();
const orgs = await client.orgs.list();
const project = await client.projects.create(orgs.data[0].id, {
  slug: 'my-blog',
  name: 'My Blog',
  kind: 'site',
  templateSlug: 'wordpress',
});
```

## Error handling

```ts
import { AbsoloApiError, AbsoloNetworkError } from '@absolo/sdk';

try {
  await client.projects.get('prj_doesnotexist');
} catch (e) {
  if (e instanceof AbsoloApiError && e.isNotFound()) {
    // …
  }
}
```

## Surface

| Resource | Client |
|---|---|
| Auth (signup, login, session, password reset) | `client.auth` |
| Organisations + members | `client.orgs` |
| Projects | `client.projects` |
| Environments | `client.environments` |
| Config entries (env vars) + versions + import/export | `client.config` |

## Types

All request and response shapes are re-exported from `@absolo/contracts`. You
typically don't need to import that package directly:

```ts
import type { Project, Environment, ConfigEntry } from '@absolo/sdk';
```

## Visibility

`public` (per `docs/plans/40-monorepo-structure-d1e00e.md` §3). May only depend
on other `public` packages. Designed to be extracted as `@absolo/sdk` on npm
without code changes.

## Future

- Streaming endpoints (logs, build output) via `EventSource` / WebSocket.
- Idempotency-Key support for write methods.
- Retry policy for 429 / 5xx with jitter.
