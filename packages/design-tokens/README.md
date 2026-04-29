# @absolo/design-tokens

CSS variables, theme JSON, and a Tailwind preset that encode the Absolo design system. Single source of truth — every frontend imports from here.

## Usage in a frontend

```css
/* app.css */
@import 'tailwindcss';
@import '@absolo/design-tokens/css';
```

```ts
// vite.config.ts or next.config.mjs - if you need programmatic access
import { tokens } from '@absolo/design-tokens';
console.log(tokens.colors.brand[500]);
```

## What's included

- `src/tokens.css` — `--absolo-*` CSS custom properties, light + dark themes (auto via `prefers-color-scheme`, manual via `[data-theme]`).
- `src/tokens.ts` — same values as TypeScript constants for build-time use.
- `src/tailwind.ts` — Tailwind v4 preset wiring tokens into the theme.

## Theming

Toggle theme by setting `data-theme="light"` or `data-theme="dark"` on `<html>`. If unset, `prefers-color-scheme` decides.

## Plan reference
[`../../docs/plans/04-design-system-d1e00e.md`](../../docs/plans/04-design-system-d1e00e.md).
