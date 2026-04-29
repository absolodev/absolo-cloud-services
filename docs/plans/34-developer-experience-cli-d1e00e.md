# 34 — Developer Experience: CLI, SDKs, Docs

Tools and surfaces that make Absolo lovable to developers: a single binary CLI, typed SDKs, excellent docs, and integrations with the tools they already use.

## CLI: `absolo`
- Single static Rust binary (musl); installed via Homebrew, Scoop, apt, dnf, `curl | sh`.
- Logs in via OAuth device flow → stores token in OS keychain.
- Subcommand structure mirrors REST resources.

### Top-level commands
```
absolo login
absolo logout
absolo whoami

absolo orgs list
absolo orgs use <slug>

absolo projects {list,create,delete}
absolo apps {list,create,deploy,scale,rollback,delete,logs,shell,env,domains}
absolo sites {list,create,snapshots,restore}
absolo databases {list,create,connect,backup,restore}
absolo buckets {list,create,keys}
absolo logs follow <app|site>
absolo metrics <app|site>
absolo run --app foo -- bash -c "..."     # one-off via web-ssh-gateway
absolo open <app|site>                    # opens dashboard in browser
absolo deploy [--strategy rolling|blue-green|canary]
absolo doctor                             # checks env, login, network
absolo status                             # public status page summary
```

### Power features
- `--json` output everywhere for scripts.
- `absolo apps logs --since 30m --grep error`.
- `absolo run` opens a shell into a pod (uses Web SSH bridge).
- `absolo env pull` writes local `.env` from app env.
- `absolo deploy --watch` streams build + deploy progress with live spinner.
- `absolo migrate <provider> <id>` (phase 2): import from Heroku/Render/Vercel.

### Implementation
- Rust + `clap` for parsing, `reqwest` for HTTP, `tokio` for async, `dialoguer` for prompts, `console` for color.
- Auto-update via signed channels (Sigstore).
- Telemetry opt-in (anonymous CLI command counts).

## SDKs
- **TypeScript**: `@absolo/sdk` — first-class, generated from OpenAPI + ergonomic wrappers.
- **Go**: `github.com/absolo/sdk-go` — phase 1.5.
- **Python**: `absolo` — phase 1.5.
- **PHP**: `absolo/sdk` — phase 2 (matters for WP/Laravel templates' management UIs).

## GitHub Action
- `absolo/deploy-action@v1` — wraps the CLI for CI workflows.
- Outputs deployment URL, version ID for downstream steps.

## Docker integration
- `absolo` CLI honors `--dockerfile` if Buildpacks auto-detect picks the wrong path.
- Local build + push command: `absolo image push --image my-image:tag` for users that build outside our pipeline.

## Editor/IDE
- VS Code extension (phase 2): inline status, deploy from sidebar, view logs.

## Documentation
- Hosted at `absolo.cloud/docs` (in the marketing site).
- Sections: Getting Started, Concepts, Apps, Sites, Templates, Managed DBs, Buckets, Domains/SSL, Billing, CLI, API, SDKs, Migration guides, Tutorials, Reference.
- Search: Pagefind (static, no infra).
- "Try it" widget on safe API endpoints (read-only against a docs sandbox account).
- Code examples in TS/Go/Python/curl side-by-side via tabbed code blocks.
- Versioned: `/docs/v1/...`; older versions accessible.

## Tutorials
- "Deploy WordPress in 90 seconds."
- "Deploy a Next.js app from GitHub."
- "Connect a custom domain."
- "Add a managed Postgres and bind it to your app."
- "Migrate from Heroku to Absolo" (phase 1.5).
- "Scale up safely with blue/green."

## Templates docs
- Each template has its own docs page: prereqs, customization options, troubleshooting, security notes, version history.

## Status page integration
- All docs pages show a small "All systems operational" badge that goes red during incidents.

## API explorer
- Built into the dashboard at `/api-explorer` (uses logged-in session): pick endpoint, fill params, run; copy as curl/SDK code.

## Webhooks UX
- Webhook subscription UI shows event history, payload preview, retry button, signature verification helper.

## Migration tools
- **Heroku → Absolo** importer (phase 1.5): CLI command reads Heroku app config, suggests Absolo plan, can import Postgres dump.
- **Render → Absolo** (phase 2).
- **Vercel → Absolo** (phase 2).

## Community
- Public Discord/Discourse for community (managed lightly).
- GitHub issue templates for bug reports and feature requests.

## Open items
- Mobile app: not in v1; phase 2 if demand.
- AI assistant in dashboard (e.g., "deploy a WP site with Stripe pre-installed") — phase 2.
