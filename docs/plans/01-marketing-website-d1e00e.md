# 01 — Marketing Website (Next.js)

The public-facing absolo.cloud marketing site: a fast, dark-first, SEO-strong Next.js site that sells the platform with the visual maturity of DigitalOcean's 2024-25 redesign.

## Scope
- Public homepage, product pages (Sites, Apps, Managed Databases, Object Storage), pricing, templates gallery, docs portal shell, blog, changelog, customer stories, contact, legal.
- **Not** the dashboard (that's a separate app, `02`).

## Stack
- **Next.js 15** (App Router, RSC, Partial Prerender on stable).
- **TypeScript** strict, **Tailwind CSS v4** (CSS-first config), **shadcn/ui** subset (Button, Card, Tabs, Accordion, Dialog).
- **MDX** via `@next/mdx` for blog/docs/changelog (content-collections for type-safe frontmatter).
- **next-themes** for dark/light/system.
- **Lucide** icons, **Framer Motion** for hero only.
- **Vercel OG** for dynamic OpenGraph images.
- **next-sitemap**, JSON-LD structured data, RSS feed.
- **Plausible** (self-hosted) for analytics (privacy-first).

## Design direction
- **Default theme**: high-contrast dark — deep ink-blue (`#0A0E1A`) base, electric accent (`#3B82F6` or brand-tuned), white headings, gray-200 body.
- **Light theme**: pure white background, ink-blue text, same accent.
- Typography: Inter Variable for UI, JetBrains Mono for code samples.
- Hero: animated gradient mesh + product screenshot iso-isometric collage (DO/Vercel pattern).
- Heavy use of **before/after** comparisons (cPanel-style ugly form vs Absolo's wizard).
- Pricing page: live calculator (hourly → monthly).
- Docs: shadcn-style nav, 3-pane layout (sidebar / content / TOC), full-text search via Pagefind (static, no Algolia cost).

## Pages
| Path | Type | Purpose |
|---|---|---|
| `/` | RSC | Hero, value props, template carousel, social proof, CTA |
| `/products/sites` | RSC | Sites mode pitch (templates) |
| `/products/apps` | RSC | Apps mode pitch (developers) |
| `/products/databases` | RSC | Managed DB pitch |
| `/products/storage` | RSC | Object storage pitch |
| `/templates` | RSC | Template catalog with filters |
| `/templates/[slug]` | RSC | Template detail (deploy CTA) |
| `/pricing` | RSC + client | Plans + interactive calculator |
| `/docs/[...slug]` | MDX | Documentation |
| `/blog`, `/blog/[slug]` | MDX | Blog |
| `/changelog` | MDX | Changelog |
| `/customers/[slug]` | MDX | Case studies |
| `/legal/{terms,privacy,dpa,aup}` | MDX | Legal |
| `/contact` | RSC | Sales contact form |
| `/status` | redirects to status.absolo.cloud | external |

## SEO & performance
- Lighthouse target: 100/100/100/100 on every public page.
- All hero images: AVIF + responsive `srcset`, `priority` only on LCP image.
- LCP < 1.5s on 4G, INP < 100ms, CLS = 0.
- ISR for blog/docs (revalidate 60s).
- Sitemap, robots.txt, structured data (Organization, Product, FAQ, Article).

## Integrations
- Sales contact form → HubSpot or self-hosted (Formspree alternative). Default: send to `sales-inbox` Postgres + Slack webhook.
- Newsletter → Listmonk (self-hosted).
- Live "Deploy this template" CTA: deep-links to dashboard signup with `?template=woocommerce` preserved through OAuth flow.

## Folder layout (within monorepo)
```
apps/marketing/
  app/
    (marketing)/page.tsx
    products/{sites,apps,databases,storage}/page.tsx
    templates/page.tsx, [slug]/page.tsx
    pricing/page.tsx
    docs/[...slug]/page.tsx
    blog/page.tsx, [slug]/page.tsx
    legal/[doc]/page.tsx
  content/
    blog/, docs/, changelog/, customers/, legal/
  components/{Hero,Pricing,TemplateCard,...}.tsx
  lib/{mdx, og, schema}.ts
  styles/globals.css
```

## Performance budget
- JS shipped per page < 80 KB (gzipped) on marketing pages.
- Use RSC where possible; client components only for interactive widgets (theme switch, calculator).

## Accessibility
- WCAG 2.2 AA, axe-core in CI on every page, keyboard nav fully tested, prefers-reduced-motion respected.

## Open items
- Final brand palette/logo locked in `04-design-system-d1e00e.md`.
- Decide on docs platform: in-Next (chosen) vs external (Mintlify) — chosen in-Next for sovereignty.
