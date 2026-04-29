# 26 — Secrets Management

Where every secret lives, how it's created, how apps consume it, and how we prevent leaks — built on Vault/OpenBao with automation everywhere.

## Why OpenBao
- **OpenBao** (Linux Foundation, MPL-2.0): community fork of HashiCorp Vault before BSL relicense.
- 100% Vault API compatible; future-proofs against further Vault license changes.
- Same operator and dev workflow.
- Alternative considered: Vault OSS (still MPL-2.0 for OSS edition; we're prepared to switch back if license picture clears, but OpenBao is the safer default).

## What lives in Vault/OpenBao
- Platform secrets: Stripe API keys, Cloudflare token, OAuth client secrets, Sentry DSN, internal mTLS CA private key.
- Per-tenant DB credentials (issued by `database/` engine with TTL).
- Per-app bound DB credentials (rotated 7d).
- API key hashes (no, actually those are in Postgres — only one-way hashed; secrets stored in Vault are values we may need to retrieve).
- Customer environment variables marked as "secret".
- mTLS certs for host-agents.
- Encryption-at-rest data keys (DEKs) under tenant KEKs.

## Architecture
- **3-node Vault cluster** per region for HA; Raft storage backend.
- **Auto-unseal** with cloud KMS or transit unseal (key sealed by another OpenBao cluster in primary region).
- **Replication**: enterprise-only feature in Vault; OpenBao roadmap; for v1, we keep regional clusters with manual rekey rituals if cross-region required.

## Secret engines we use
- `kv-v2/` for arbitrary platform secrets.
- `database/` (dynamic creds for Postgres, MySQL, Redis).
- `pki/` for our internal CA (host-agent certs, internal mTLS).
- `transit/` for application-level encryption (envelope encryption — apps send plaintext, get ciphertext, never see the key).
- `aws/` if we ever offer AWS integrations (phase 2).

## Authentication methods
- **Kubernetes auth** for in-cluster services (NestJS pods, Rust services authenticate via service account JWT).
- **AppRole** for non-k8s services and CI.
- **JWT/OIDC** for human admins (sso → Vault → policies).
- **TLS auth** for host-agents (cert-based).

## Policies
- Least-privilege per service: e.g., `billing-service` policy only allows read on `kv/data/stripe` and `kv/data/tax`; orchestrator only on `kv/data/k8s/*`.
- Per-tenant data scoped via templated paths and policies (Vault Sentinel or custom path templating).
- Audit log on every read/write.

## Customer-facing secrets
- "Secret env vars" stored encrypted with `transit/` per region; ciphertext kept in Postgres (`projects.env_vars` column `value_encrypted`).
- On pod start, an init container fetches and decrypts via `transit/decrypt`, writes to tmpfs file, sets env from file.
- Display masked (`••••`) in UI; show toggle requires re-auth.

## Bound DB credentials lifecycle
- App created with binding → orchestrator calls `database/creds/<role>`; gets short-lived user (e.g., 7d).
- Vault tracks lease; auto-renewal cron 6 days in (rolling rotation).
- On unbind/delete: revoke lease.

## Sealed secrets in git
- For k8s manifests stored in our infra repo (`infra/k8s/`), we use **Sealed Secrets** (Bitnami) — encrypts with a controller-only key, safe to commit.
- Use limited to bootstrap (Vault credentials themselves, monitoring tokens).

## Backup & recovery
- Vault Raft backups daily, encrypted with age, stored in cross-region bucket.
- Documented restore runbook with quarterly drills.

## Anti-leak controls
- CI secret scanners: gitleaks, trufflehog blocked on PR.
- Production logs: structured logger drops keys matching `password|secret|token|api_key|authorization` (allowlisted exceptions).
- Webhooks/HTTP responses: redaction at the response middleware layer.
- We register our `abso_` API key prefix with **GitHub Secret Scanning Partner Program** so leaked keys notify us within minutes.

## Operator UX
- Admin UI for secrets is **read-list-only** with metadata (path, last rotated, who created); values never displayed in UI (only via `vault read` + audit-logged session).
- Rotation buttons trigger Vault operations and audit-log them.

## API surface (control plane → Vault)
- Direct via `node-vault` (TS) and `vaultrs` (Rust).
- Wrapped by a `secrets` service module that enforces tenant scoping and adds caching for hot reads.

## Disaster scenarios
- Vault master key compromise: rotate sealing key, re-seal all DEKs (controlled procedure, downtime expected — runbook).
- Single Vault node loss: Raft auto-recovers.
- Region Vault loss: customers in that region experience secret-fetch errors; failover to read-only (using cached secrets) until restored. RTO < 1h.

## Tests
- Vault auth and policy tests using Testcontainers Vault.
- Secret rotation E2E: bind app, observe DB cred rotation, verify app continuous availability.

## Open items
- BYOK (customer-managed encryption keys) for enterprise — phase 2.
- Hardware HSM (Yubikey or Nitrokey) for ops-team root tokens — phase 1.5.
