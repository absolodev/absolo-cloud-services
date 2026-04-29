# @absolo/eslint-config

Shared flat ESLint configs for the Absolo monorepo. Built on `typescript-eslint` v8 + ESLint v9.

## Usage

```js
// eslint.config.js (in any package or app)
import absolo from '@absolo/eslint-config/react';

export default [
  ...absolo,
  {
    // package-specific overrides go here
  },
];
```

## Presets

| Import | Use for |
|---|---|
| `@absolo/eslint-config/base` | Plain TS libraries, scripts. |
| `@absolo/eslint-config/react` | React + JSX (extends base). |
| `@absolo/eslint-config/next` | Next.js apps (extends react). |
| `@absolo/eslint-config/node` | Node services / CLIs (extends base, adds Node globals). |

Plan reference: [`../../docs/plans/30-testing-ci-cd-d1e00e.md`](../../docs/plans/30-testing-ci-cd-d1e00e.md).
