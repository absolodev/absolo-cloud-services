# @absolo/ui

Shared component library for every Absolo frontend (`apps/marketing`,
`apps/dashboard`, `apps/admin`).

## Stack

- **React 19** as the only required runtime peer.
- **Radix UI** primitives for every component that needs accessibility-correct
  behaviour (Dialog, Tabs, Tooltip, Switch, Label).
- **`class-variance-authority`** + **`tailwind-merge`** + **`clsx`** for variant
  composition.
- **`sonner`** for toasts.
- Tokens come from `@absolo/design-tokens`; icons from `@absolo/icons`.

## Setup in a consuming app

```ts
// In your app entrypoint (e.g. main.tsx):
import '@absolo/ui/styles';
import { Toaster } from '@absolo/ui';

// Then near the root:
<>
  <App />
  <Toaster richColors closeButton />
</>
```

Tailwind config (in the consuming app):

```js
import absoloPreset from '@absolo/design-tokens/tailwind';
export default {
  presets: [absoloPreset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};
```

## Components

| Category | Components |
|---|---|
| Inputs | `Button`, `Input`, `Label`, `Textarea`, `Switch` |
| Layout / surface | `Card`, `Badge`, `Skeleton` |
| Disclosure / overlays | `Dialog`, `Tabs`, `Tooltip` |
| Data | `Table` family |
| Feedback | `Toaster`, `toast` (sonner) |

All components forward refs and accept `className`. Variants are typed via
`VariantProps<typeof xVariants>` so callers can compose without losing
type-safety.

## Adding new components

1. Prefer copying the upstream shadcn pattern, then swap colour utilities for
   tokens (e.g. `bg-primary`, `text-muted-foreground`) so dark mode + theming
   keeps working.
2. Compose with `cn(…)` from `@absolo/ui/utils`.
3. Re-export from `src/index.ts`.
4. If the component opens a portal (Dialog, Popover, Toast), document where
   the consumer should mount the portal root.

## Visibility

`private` (per `docs/plans/40-monorepo-structure-d1e00e.md` §3). Will be
extracted to `@absolo/ui` on npm once the API stabilises.
