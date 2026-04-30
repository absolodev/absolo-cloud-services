# @absolo/marketing

Public marketing site for Absolo Cloud — `https://absolo.cloud`.

Next.js 15 App Router, React 19, Tailwind 3 + `@absolo/design-tokens`,
icons from `@absolo/icons`. No client JS unless a page actively needs it.

## Routes

| Path | Purpose |
|---|---|
| `/` | Hero + feature grid + CTA. |
| `/pricing` | Free / Hobby / Pro / Business tiers. |
| `/docs` | Documentation landing — placeholder until MDX content lands. |

## Running

```bash
pnpm install
pnpm --filter @absolo/design-tokens build   # one-time, then watched by turbo
pnpm --filter @absolo/marketing dev
```

Open <http://localhost:3000>.

## Conventions

- **Server components by default.** Add `'use client'` only when you need
  state, effects, or browser APIs.
- **Token-only colours.** Use `bg-bg`, `text-fg-muted`, `border-border` etc.
  Never raw hex / `slate-500` etc.
- **Icons**: `import { ... } from '@absolo/icons'` — never directly from
  `lucide-react`. Brand marks live at `@absolo/icons/brand`.
- **Links**: `next/link` for internal navigation, `<a>` for external.
- **Metadata**: every route exports a `metadata: Metadata` constant.

## Plan refs

- `docs/plans/03-design-system-d1e00e.md` (token usage)
- `docs/plans/40-monorepo-structure-d1e00e.md` §3 (visibility)
