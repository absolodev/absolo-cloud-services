# 13 — Templates Catalog

The curated set of one-click deployable application templates (WordPress, WooCommerce, Laravel skeleton, Next.js, Ghost, static sites, etc.) — the heart of the "Sites mode" for non-technical users.

## Goals
- 90-second from "I want a WooCommerce store" to "store online with HTTPS".
- Templates are versioned, signed, and updatable.
- Sane defaults for everything (size, plugins, theme, security).
- One config wizard per template, never more questions than necessary.

## Template anatomy
A template is a versioned package of:
```
template.yaml                 # manifest (this spec)
images/                       # OCI images we publish (or external pinned digests)
config-schema.json            # Zod-compatible JSON schema for user inputs
forms/                        # UI wizard schema (json-schema-form compatible)
hooks/                        # post-provision and upgrade scripts
docs/                         # markdown shown in dashboard
preview.png, hero.png, icon.svg
```

### `template.yaml` (excerpt)
```yaml
id: woocommerce
version: 8.6.1-absolo.3
name: WooCommerce
category: ecommerce
description: A complete online store on WordPress + WooCommerce
license: GPLv2
maintainer: absolo
runtime:
  pod:
    image: ghcr.io/absolo/templates/woocommerce:8.6.1-absolo.3
    ports: [8080]
    env_required:
      - WORDPRESS_DB_HOST
      - WORDPRESS_DB_NAME
      - WORDPRESS_DB_USER
      - WORDPRESS_DB_PASSWORD
    persistent_volume:
      mount: /var/www/html
      default_size_gb: 5
      min_size_gb: 1
  managed_services:
    - kind: postgres   # or mysql for true Woo
      name: wp-db
      size_default: S
      bind_env_prefix: WORDPRESS_DB
sizes_allowed: [XS, S, M, L]
default_size: S
hooks:
  on_provision: hooks/install.sh
  on_upgrade: hooks/upgrade.sh
inputs:
  - key: site_title
    type: string
    required: true
  - key: admin_email
    type: email
    required: true
  - key: admin_username
    type: string
    default: admin
  - key: locale
    type: select
    options: [en_US, en_GB, es_ES, ...]
    default: en_US
upgrade_policy: snapshot_then_upgrade
backups: { interval: 24h, retain: 7 }
healthcheck: { http: { path: /wp-admin/install.php } }
```

## Launch templates (v1)
| ID | Name | Category | Storage? | Managed DB? |
|---|---|---|---|---|
| `wordpress` | WordPress | CMS | yes | MySQL |
| `woocommerce` | WooCommerce | E-commerce | yes | MySQL |
| `laravel` | Laravel skeleton | Framework | yes | Postgres or MySQL |
| `nextjs` | Next.js skeleton | Framework | optional | none default |
| `ghost` | Ghost blog | CMS | yes | MySQL |
| `static-site` | Static (HTML/CSS/JS) | Static | optional | none |
| `nodejs-express` | Node + Express | Framework | optional | optional |
| `python-fastapi` | Python + FastAPI | Framework | optional | optional |

## Phase 2 templates
Strapi, Directus, Mautic, NocoDB, Outline, Plausible, Umami, Mastodon (small), Matomo, n8n, Supabase clone (Postgres + PostgREST), Mediawiki.

## Image build pipeline
- Templates have their own monorepo path `services/templates/<id>/` with Dockerfiles.
- Built nightly, security-scanned (Trivy), tagged `vX.Y.Z-absolo.N` with provenance.
- Published to internal registry; mirrored per region.
- Critical-CVE policy: rebuild + roll all instances within 72h, with user opt-out for breaking changes.

## Wizard UX
- Picker → category filter → template detail → inputs form (schema-driven) → region/size pick → review → deploy.
- "Connect a custom domain" toggled in wizard, defers domain step but keeps it discoverable.
- "Import from existing" (phase 2): import an existing WP site by URL+credentials → migrate content.

## In-product upgrades
- Dashboard shows "Upgrade available 8.6.1 → 8.6.2 (security)".
- Click → snapshot → run on_upgrade hook → swap image → run healthcheck → done.
- Failure path: revert to snapshot.

## Customization
- WP/Woo: plugin & theme management UI (phase 1.5): list plugins, install from public WP repo (mirrored to avoid abuse), enable/disable, update. We're a hosting provider — we don't review plugin code; we sandbox the container.
- Laravel/Next.js: env management, scheduled jobs (cron CRDs), worker processes (extra pod with same image).

## Security posture
- Each template runs under gVisor by default.
- Network policies allow only DB/bucket bindings + outbound HTTPS to allowlist (configurable).
- File system: rootfs read-only where possible; `/var/www/html` writeable only.
- WAF on by default in `monitor` mode, opt-in to `block`.

## Internationalization
- Templates expose `locale` input that maps to WP/Ghost/etc. locale settings.
- Default templates pre-load common locale packs.

## Marketplace (phase 2)
- Third-party publishers via partner program; sandbox + review pipeline.
- Revenue share for paid templates.

## Open items
- Whether to ship a "Move from existing host" white-glove migration tool (phase 2 paid feature).
- Whether to provide template forks (user clones a template as their own image) — yes, phase 2.
