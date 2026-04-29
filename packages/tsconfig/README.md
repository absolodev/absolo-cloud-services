# @absolo/tsconfig

Shared TypeScript config presets for every package and app in the Absolo monorepo.

## Usage

```jsonc
// e.g. apps/dashboard/tsconfig.json
{
  "extends": "@absolo/tsconfig/vite-react.json",
  "include": ["src", "vite.config.ts"]
}
```

## Presets

| File | Use for |
|---|---|
| `base.json` | Root preset (strict mode, ES2023, modern module resolution). Other presets extend this. |
| `library.json` | TS libraries that emit `dist/` declarations (composite, declaration, declarationMap). |
| `next.json` | Next.js apps (`apps/marketing`, future `apps/status`). |
| `vite-react.json` | Vite + React apps (`apps/dashboard`, `apps/admin`). |
| `node.json` | Node services (`services/control-plane`) — enables decorator metadata for NestJS. |

Plan reference: [`../../docs/plans/30-testing-ci-cd-d1e00e.md`](../../docs/plans/30-testing-ci-cd-d1e00e.md).
