# 06 — IAM, Auth & Authorization

The identity backbone: users, organizations, teams, roles, permissions, sessions, API keys, OAuth, MFA, password policies, account recovery, audit. Conservative, well-trodden patterns; no clever crypto.

## Domain model
```
User { id, email, email_verified_at, password_hash?, created_at, locked_at, mfa_required }
Identity { id, user_id, provider, subject, email }            # OAuth identities
Organization { id, slug, name, billing_email, plan_id, created_at }
Membership { user_id, org_id, role_id }                       # many-to-many
Role { id, org_id?, name, builtin }                           # builtin: owner, admin, dev, billing, viewer
Permission { id, key }                                        # e.g., "projects.deploy"
RolePermission { role_id, permission_id }
Session { id, user_id, refresh_token_hash, ua, ip, created_at, last_seen_at, revoked_at }
ApiKey { id, owner_kind:'user'|'org', owner_id, prefix, hash, scopes[], created_at, last_used_at, expires_at, ip_allowlist? }
MfaFactor { id, user_id, kind:'totp'|'webauthn'|'recovery', secret_or_credential, created_at, last_used_at, label }
PasswordReset { token_hash, user_id, expires_at, used_at }
EmailVerification { token_hash, user_id, expires_at }
LoginAttempt { user_id, ip, ua, ok, reason, created_at }      # for lockout + audit
```

## Authentication flows
### Email + password
- Argon2id (m=64MB, t=3, p=1) for password hashing.
- Password rules: min 12 chars, zxcvbn score ≥ 3, breach check via local k-anonymity HIBP mirror.
- Account lockout: 5 failed attempts in 15min → soft-lock 15min; 20 in 24h → hard-lock until reset.
- Login emits `iam.user.signed_in` event with IP/UA; alert on new device.

### OAuth
- Providers: Google, GitHub at launch; Microsoft, GitLab phase 2.
- PKCE (S256), state with CSRF binding, nonce checked.
- Email-collision policy: if email exists, require login + link (never auto-merge).

### MFA
- Mandatory for billing-touching actions and admin roles; optional but encouraged for users.
- TOTP (RFC 6238) — secret stored encrypted (AES-256-GCM with key from KMS).
- WebAuthn (platform + roaming authenticators) — primary recommendation.
- Recovery codes: 10 single-use codes generated on enrollment.

### Sessions
- After successful login: issue `access_token` (PASETO v4 local, 15-minute TTL) + `refresh_token` (random 256-bit, hashed in DB, 30-day rolling TTL).
- Cookies: `__Host-absolo_session` with `HttpOnly; Secure; SameSite=Lax`.
- Refresh rotation with reuse detection: if a previously-rotated token is presented, revoke entire session family + alert user.
- Idle timeout 24h, absolute 30d.

### API keys
- Format: `abso_<env>_<random32>` displayed once on creation; stored as Argon2id hash + 8-char prefix lookup.
- Scopes: fine-grained (`projects.read`, `projects.deploy`, `billing.read`, etc.).
- Optional IP allowlist (CIDR list).
- Last-used timestamp updated lazily (max 1/min).

## Authorization (RBAC + tenant scoping)
- **Tenants** are organizations. Every request resolves an `(actor, organization)` pair.
- **Built-in roles**: `owner` (full incl. delete org, billing), `admin` (everything except delete org / change plan), `developer` (deploy, scale, view), `billing` (billing only), `viewer` (read-only).
- **Custom roles**: phase 2 (`org_id`-scoped Roles with arbitrary permission sets).
- Permissions checked via `@RequirePermission('projects.deploy')` decorator → guard reads `actor.permissions[orgId]`.
- Resource-level checks: `projects.deploy` further constrained to projects within the org; cross-tenant access impossible by design (all queries auto-scope by `org_id`).
- **Admin roles** (separate role set: `admin.viewer`, `admin.support`, `admin.ops`, `admin.finance`, `admin.security`, `admin.superadmin`) gated by `AdminGuard` and SSO-only auth.

## Account recovery
- Email-based, 30-min token, single-use, rate-limited (3/hour/account, 10/hour/IP).
- If MFA enabled: password reset alone does NOT bypass MFA; requires recovery code or admin manual review (with KYC) for total lockout.
- **Account deletion**: 14-day soft-delete grace period before hard purge (GDPR right-to-be-forgotten honored on demand).

## Audit
- Every IAM action emits `audit.event` with actor, target, action, before/after, IP, UA, request_id.
- Audit entries are append-only and replicated to ClickHouse for long-term searchability.

## Security hardening
- HSTS (preload), CSP `default-src 'self'`, frame-ancestors none on dashboard/admin.
- Cookies: `__Host-` prefix mandates HTTPS + Domain unset + Path=/.
- Rate-limit login: 10/min/IP, 5/min/account.
- Email enumeration safe: identical messages and timing for `/forgot` regardless of account existence (constant-time comparison).
- Secret leak detection: monitor GitHub for leaked `abso_` keys (GitHub Secret Scanning Partner Program).
- All secrets at rest encrypted via Vault Transit (envelope encryption with per-tenant DEKs phase 2).

## Public API endpoints (excerpt)
```
POST /v1/auth/signup
POST /v1/auth/login
POST /v1/auth/logout
POST /v1/auth/refresh
POST /v1/auth/forgot
POST /v1/auth/reset
POST /v1/auth/verify-email
GET  /v1/auth/oauth/:provider/start
GET  /v1/auth/oauth/:provider/callback
POST /v1/me/mfa/enroll/{totp|webauthn}
POST /v1/me/mfa/verify
POST /v1/me/sessions/:id/revoke
GET  /v1/orgs/:orgId/members
POST /v1/orgs/:orgId/invitations
POST /v1/orgs/:orgId/api-keys
DELETE /v1/orgs/:orgId/api-keys/:id
```

## Tests
- Property-based tests for password rules and rate-limit logic.
- E2E for every auth flow (Playwright).
- Pen-test checklist before launch (OWASP ASVS L2 baseline).

## Open items
- SCIM provisioning for enterprise SSO — phase 2.
- Passkey-only login (passwordless) — phase 2.
