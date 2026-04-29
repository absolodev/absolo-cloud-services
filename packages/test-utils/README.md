# @absolo/test-utils

Shared testing helpers used by every package and app:

- `factories/` — domain-object factories (User, Org, Project, Environment, ConfigEntry).
- `vitest.preset.ts` — base Vitest config with sane defaults (coverage thresholds, glob includes).

```ts
import { makeProject, makeOrg } from '@absolo/test-utils';
import { vitestPreset } from '@absolo/test-utils/vitest';
```

Plan reference: [`../../docs/plans/30-testing-ci-cd-d1e00e.md`](../../docs/plans/30-testing-ci-cd-d1e00e.md).
