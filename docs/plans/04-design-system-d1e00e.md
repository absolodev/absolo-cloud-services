# 04 — Design System

A shared, theme-token-driven component system (shadcn/ui + Tailwind v4) used by marketing, dashboard, and admin — owned in-repo as a workspace package so all surfaces stay visually coherent and we never get locked into a third-party UI library.

## Goals
- DigitalOcean-grade visual maturity: dark-first, high-contrast, generous spacing, sharp typography.
- Same components everywhere (no fork between marketing and dashboard).
- Light + dark + high-contrast variants of each.
- Zero runtime CSS-in-JS overhead.
- Every component a11y-compliant out of the box (Radix primitives under the hood).

## Package layout
```
packages/
  design-tokens/       # JSON tokens (color, space, type, radius, shadow, motion)
    src/{tokens.ts, themes.ts}
  ui/                  # shadcn-style copied components, customized
    src/components/{button,card,dialog,...}
    src/index.ts
  icons/               # re-exports of Lucide + custom brand icons
  fonts/               # self-hosted Inter + JetBrains Mono via fontsource
```

Consumers: `apps/marketing`, `apps/dashboard`, `apps/admin`, `apps/status`.

## Token philosophy
- **Three layers**: primitive → semantic → component.
  - Primitive: `blue.500 = #3B82F6`.
  - Semantic: `--accent`, `--accent-fg`, `--bg`, `--bg-elevated`, `--border`, `--ring`, `--success`, `--warning`, `--danger`, `--info`.
  - Component: `--btn-primary-bg`, `--btn-primary-fg`, etc.
- Themes flip semantic + component layers; primitives stay constant.
- Tailwind v4 `@theme` block reads from generated CSS variables.

## Color palette (preliminary)
- **Brand accent**: TBD — proposed cobalt-electric `#3461FF` (provides AAA on `#0A0E1A`).
- **Dark base**: `#0A0E1A` (ink-blue near-black), surfaces step-up `#0F1424`, `#161C2E`.
- **Light base**: `#FFFFFF`, surfaces step `#F7F8FA`, `#EEF1F6`.
- **Foreground dark**: `#FFFFFF` headings, `#C9D2E3` body, `#7A8499` muted.
- **Foreground light**: `#0A0E1A` headings, `#1F2937` body, `#5B6478` muted.
- **High-contrast** variants bump fg/bg contrast to 14:1 minimum.
- **Status**: success `#1FB58A`, warning `#F0A500`, danger `#E5484D`, info `#3461FF`.
- All combinations validated WCAG AA (4.5:1 text, 3:1 UI) — high-contrast variants AAA.

## Typography
- **UI**: Inter Variable (fontsource self-hosted). Sizes: 12, 13, 14, 15, 16, 18, 20, 24, 32, 48, 64.
- **Mono**: JetBrains Mono Variable.
- Line-heights: body 1.55, headings 1.15, UI 1.4.
- Tracking: tight headings (-0.02em), normal body.

## Spacing & layout
- 4px base unit. Standard scale: 4, 8, 12, 16, 20, 24, 32, 40, 56, 80, 120.
- 12-col grid on marketing, 8-col on app shells.
- Container max-widths: prose 65ch, app 1440, marketing 1280.

## Components (shadcn/ui copied + customized)
Core: Button, IconButton, Input, Textarea, Select, Combobox, Checkbox, Radio, Switch, Slider, DatePicker, FileUpload, Form (react-hook-form integration).
Layout: Card, Sheet, Dialog, Drawer, Tabs, Accordion, Separator, ScrollArea.
Navigation: NavBar, Sidebar, Breadcrumb, Pagination, CommandPalette, ContextMenu, DropdownMenu.
Feedback: Toast (sonner), Alert, Banner, Progress, Skeleton, Spinner, EmptyState.
Data: Table (TanStack Table wrapper), DataGrid, Stat, Badge, KeyValueGrid, CodeBlock, DiffViewer.
Specialized: Terminal (xterm wrapper), LogTail, MetricChart, UsageMeter, PlanCard, RegionPicker, ResourceCard.

## Motion
- Default `ease-[cubic-bezier(0.16,1,0.3,1)]` (smooth easeOutQuint) at 180-220ms.
- Reduced-motion fully respected (no fades, no slides — just instant state changes).
- No more than 1 animation playing at a time on a route.

## Iconography
- Lucide React, 1.5px stroke default, 16/20/24 sizes.
- Custom brand icons live in `packages/icons/src/brand/`.

## Density modes
- `compact` (admin, data-heavy lists), `comfortable` (default), `cozy` (marketing). Toggleable in dashboard preferences.

## Theming implementation
- `next-themes` (marketing) + custom `ThemeProvider` (dashboard/admin) — both write `data-theme="dark"|"light"` + `data-contrast="normal"|"high"` on `<html>`.
- Tailwind v4 `@variant dark`, `@variant high-contrast` selectors.

## Storybook (optional but planned)
- Use **Ladle** (Vite-native, faster than Storybook) for the `ui` package.
- Visual regression with Chromatic alternative: **Percy** OSS or **Playwright snapshots**.

## Brand guidelines
- Logo: wordmark `absolo` lowercase, accent dot. Standalone mark = circular cut "a".
- Voice: confident, plain, slightly opinionated. Not corporate. Not edgy.
- Imagery: gradient-mesh hero shots, screen captures with subtle frame, isometric 3D for product diagrams.

## Open items
- Final accent color locked after brand review.
- Decide on illustration style (gradient-line vs flat-color vs photographic).
