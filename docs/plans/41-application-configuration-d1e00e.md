# 41 — Application Configuration & Environment Variables

How customers configure their apps and sites: environment variables (plain and secret), file-based config, bound-resource auto-injection, versioning, and the dashboard UX. This is a first-class feature — every Project / App / Site / Environment has a configuration record, and every Deploy is pinned to a specific configuration version.

## Goals
- Make environment configuration **as good as Vercel + Render combined**: clean dashboard UI, `.env` import/export, bulk paste, secret masking, versioned history, easy rollback.
- Support **the modern way** (env vars injected by the platform) and **the legacy way** (mount a `.env` file into the container) so WordPress/Laravel users who paste a `.env` file just work.
- Keep secrets safe: encrypted at rest, never logged, redacted in dashboard, never shipped via the orchestrator's API responses unless the caller has the right scope.
- Make config **versioned and rollback-aware** — same Deploy artifact + new ConfigVersion is a new revision; rolling back a Deploy also rolls back its config.

## Concepts

### `ConfigEntry`
A single key/value pair scoped to a `(project_id, environment_id)` (or to the project root for "shared across environments").

```
ConfigEntry { id, project_id, environment_id?, key, value_ciphertext, value_preview,
              kind: 'plain' | 'secret', source: 'user' | 'binding' | 'template' | 'system',
              binding_id?, created_at, updated_at, created_by_user_id }
```

- **`kind = plain`**: stored encrypted at rest but readable in dashboard (e.g., `LOG_LEVEL=info`).
- **`kind = secret`**: stored encrypted; dashboard shows `••••••` plus an optional 4-char preview suffix; only revealable by users with `config.secret.read` permission.
- **`source = user`**: the customer added it.
- **`source = binding`**: auto-injected by a bound resource (DB, bucket); read-only, deleted when binding is removed.
- **`source = template`**: pre-populated by the template the project was created from (overridable by user).
- **`source = system`**: platform-injected (e.g., `PORT`, `ABSOLO_REGION`); read-only.

### `ConfigVersion`
Snapshot of all `ConfigEntry`s for an environment at a moment in time. Created automatically on every change.

```
ConfigVersion { id, project_id, environment_id, version_number, created_at,
                created_by_user_id, change_summary, entry_count, content_hash }
```

- Deploys reference a `config_version_id`. Rolling back a deploy rolls back the config snapshot it shipped with.
- Dashboard shows a diff between any two versions (added / changed / removed keys, with secret values masked).

### `ConfigFile` (optional, file-based config)
For customers who want to drop a config file (`.env`, `config.json`, `application.yml`, ...) into their container instead of using env vars.

```
ConfigFile { id, project_id, environment_id?, path, content_ciphertext, kind: 'env' | 'json' | 'yaml' | 'raw',
             permissions: '0400' | '0600' | '0644', source: 'user' | 'binding' | 'template' | 'system' }
```

- Mounted into the container as a tmpfs file at the declared `path` (e.g., `/var/www/html/.env`).
- Encrypted at rest like secrets.
- Versioned together with `ConfigEntry`s in `ConfigVersion`.

### `ConfigSchema` (declared by templates)
Templates declare which keys they expect:

```yaml
# templates/wordpress/template.yaml
config_schema:
  required:
    - WORDPRESS_DB_HOST
    - WORDPRESS_DB_USER
    - WORDPRESS_DB_PASSWORD: { kind: secret, generate_default: true }
    - WORDPRESS_DB_NAME
  optional:
    - WORDPRESS_DEBUG: { default: 'false', enum: ['true', 'false'] }
    - WP_HOME: { description: 'Public URL', validate: 'url' }
  files:
    - path: /var/www/html/.env.local
      kind: env
      generated_from: ['WORDPRESS_*']     # auto-generate this file from matching env vars
```

The control plane uses the schema to:
- Pre-populate keys on project creation (with safe defaults / generated secrets).
- Lint the user's config (warn on missing required keys, type-check enums, validate URLs).
- Auto-generate a file from a key prefix if the customer prefers file-based.

## Inheritance & overrides
Effective config for a deploy is the merge of (in increasing precedence):
1. Project-shared entries (no environment scope).
2. Environment-specific entries.
3. System-injected entries (always last; not overridable).

Bound-resource entries are computed at deploy time and inserted with `source = binding` at environment scope.

## Templating / variable references
Customers can reference other entries:

```
DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}
PUBLIC_URL=https://${ABSOLO_PRIMARY_DOMAIN}
```

- Resolution happens at deploy time (not runtime). Cycles rejected. Missing references rejected with a clear error pointing at the line.
- `${VAR}` is the only syntax (no Bash-style `$VAR`, to avoid surprises).

## Dashboard UX (key flows)
1. **Tabbed view** per environment: "Production / Staging / Preview" tabs with copy-from-other-env helper.
2. **Bulk add**: paste a `.env` blob → diff preview → confirm → create one ConfigVersion containing all changes.
3. **Import file**: upload `.env` / `.env.example` → same flow.
4. **Export**: download a `.env` (secrets included only if the user has `secret.read` permission, with a "you are exporting N secrets" confirmation dialog).
5. **Inline secrets**: values are masked by default; click eye-icon to reveal one-by-one (logged in audit).
6. **History**: list of ConfigVersions with diffs; "Restore this version" creates a new version (forward-only).
7. **Per-key audit**: hover any key → see who last changed it and when.
8. **Validation chips**: keys that conflict with template's `config_schema` show warnings ("required key missing", "invalid URL", etc.).

## CLI parity
`absolo` CLI mirrors every UI action:

```
absolo env list                                   # current env's effective config
absolo env list --env staging
absolo env set FOO=bar BAZ=qux                    # bulk set
absolo env set --secret API_KEY=...               # mark as secret
absolo env unset FOO
absolo env import .env                            # import a file
absolo env export > .env.production               # export
absolo env diff prod staging                      # diff two environments
absolo env history                                # list versions
absolo env restore <version-id>
```

## Binding-injected env vars
When a managed DB or bucket is bound to an app, the binding contributes a set of `source = binding` entries:

```
# Postgres binding (prefix configurable; default DATABASE_)
DATABASE_URL=postgres://...
DATABASE_HOST=...
DATABASE_PORT=5432
DATABASE_NAME=...
DATABASE_USER=...
DATABASE_PASSWORD=...      # secret kind
DATABASE_SSL_MODE=require

# S3 bucket binding (prefix S3_)
S3_ENDPOINT=...
S3_REGION=...
S3_BUCKET=...
S3_ACCESS_KEY_ID=...        # secret kind
S3_SECRET_ACCESS_KEY=...    # secret kind
```

The customer can rename the prefix (e.g., `MYDB_` instead of `DATABASE_`) at binding time.

## Container-side delivery (how envs reach the process)
Three coexisting mechanisms:

1. **Process env** (default for Apps mode): orchestrator emits a Kubernetes Pod spec with `env` entries (plain) and `envFrom` referencing a `Secret` (secrets). Kubernetes injects them at process start.
2. **Env file mount** (default for Sites mode templates that expect a `.env`): orchestrator generates a tmpfs Secret mounted at the configured `path` (e.g., `/var/www/html/.env`).
3. **Both** (configurable per app): some apps expect both — the dashboard exposes a per-app toggle.

System-injected variables (always present, non-overridable):
- `PORT` — the port the app must listen on.
- `ABSOLO_PROJECT_ID`, `ABSOLO_APP_ID`, `ABSOLO_ENVIRONMENT`, `ABSOLO_REGION`, `ABSOLO_VERSION_ID`.
- `ABSOLO_PRIMARY_DOMAIN`, `ABSOLO_DOMAINS` (comma-separated).
- `ABSOLO_HEALTHCHECK_PATH` (configurable).

## Secret encryption at rest
- KMS-style envelope encryption: per-org Data Encryption Key (DEK) wrapped by a per-region Key Encryption Key (KEK) held in Vault/OpenBao.
- Postgres stores ciphertext + a `kek_version` per row to enable key rotation.
- Decryption only happens inside the orchestrator's deploy path (and the dashboard's reveal path with explicit permission).
- See `26-secrets-management-d1e00e.md` for the cryptographic details.

## Audit trail
Every read of a secret value (via UI or API) and every write of any entry creates an audit event with:
- Actor (user / system).
- Action (`config.entry.created` | `updated` | `deleted` | `secret.read` | `version.restored`).
- Target (project, environment, key — secret values are never logged).
- IP, user-agent, scope.

## Quotas & limits
- Max 200 entries per environment (Free) → 1000 (Business) → unlimited (Custom).
- Max value size: 256 KB per entry.
- Max ConfigFile size: 1 MB.
- Max ConfigVersion retention: 50 (Free), 200 (Pro), unlimited (Business).

## API surface (control plane)
```
GET    /v1/projects/:project/environments/:env/config              # list (secrets masked unless ?reveal=1 + perm)
PUT    /v1/projects/:project/environments/:env/config              # bulk replace
PATCH  /v1/projects/:project/environments/:env/config              # partial update (added, changed, removed)
POST   /v1/projects/:project/environments/:env/config/import       # body: .env content
GET    /v1/projects/:project/environments/:env/config/export       # response: .env content (perm-gated)
GET    /v1/projects/:project/environments/:env/config/versions     # list
GET    /v1/projects/:project/environments/:env/config/versions/:v  # one version
POST   /v1/projects/:project/environments/:env/config/versions/:v/restore
GET    /v1/projects/:project/environments/:env/config/diff?from=:a&to=:b
GET    /v1/projects/:project/environments/:env/config/files
PUT    /v1/projects/:project/environments/:env/config/files
```

## Validation rules
- Key: `^[A-Z_][A-Z0-9_]{0,127}$` (POSIX-compatible). UI rejects with a clear error message; CLI same.
- Reserved prefixes: `ABSOLO_*` is system-only.
- Bound-resource keys (with `source = binding`) cannot be edited or deleted by the user (they manage the binding itself instead).
- Importing a `.env` with reserved keys produces warnings; the user can confirm "ignore reserved keys".

## Phasing
- **Phase 0/1**: data model, REST endpoints, CLI parity, dashboard UI for plain + secret entries, .env import/export, basic version history.
- **Phase 2**: file-based mounts (`ConfigFile`), template-driven `config_schema` enforcement, bound-resource prefix renaming.
- **Phase 3**: variable templating (`${VAR}`), per-key audit hover, diff viewer.
- **Phase 4**: bring-your-own-KMS (e.g., AWS KMS / Hashicorp Vault Transit) for enterprise customers.

## Tests
- Unit: encryption round-trip, schema validation, templating resolver (with cycle detection), key validation regex.
- Integration: bulk import + version creation + restore + diff.
- E2E: dashboard flows for paste-`.env`, secret reveal, version restore, deploy uses correct ConfigVersion.
- Security: ensure secrets never appear in any log line, error message, or non-perm-gated API response.

## Open items
- Cross-environment inheritance shorthand (e.g., "use prod's `STRIPE_KEY` here") — phase 3.
- Per-key TTL / rotation reminders (e.g., "this API key was set 180d ago") — phase 3.
- Pull config from upstream secret manager (AWS Secrets Manager, GCP Secret Manager) for enterprise — phase 4.

## Progress
- [ ] Data model (`config_entries`, `config_versions`, `config_files`) drafted in `28-data-model-postgres-d1e00e.md` extension.
- [ ] Control-plane `env-vars` module skeleton.
- [ ] Dashboard `EnvVarsEditor` component.
- [ ] CLI commands.
- [ ] Encryption envelope (depends on `26-secrets-management-d1e00e.md` Vault decision).
- [ ] Templating resolver.
- [ ] File-based mount (Phase 2).
