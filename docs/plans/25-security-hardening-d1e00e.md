# 25 — Security Hardening & Threat Model

The platform's defense-in-depth posture: explicit threat model, isolation tiers, hardened container runtimes (gVisor / Kata), supply-chain security, secrets, and incident response. Built on the principle that the *platform* should be more trustworthy than the apps it runs.

## Trust boundaries
1. **Internet ↔ Edge proxy** — public attack surface; assume hostile.
2. **Edge ↔ Customer pods** — semi-trusted; rate-limit, WAF.
3. **Customer pod ↔ Host kernel** — must be hardened (gVisor/Kata).
4. **Host ↔ Control plane** — mTLS, host-agent only.
5. **Control plane ↔ Postgres / NATS / Vault** — private network, mTLS, scoped creds.
6. **Operator ↔ Admin UI** — SSO, MFA, IP allowlist, dual-control.

## Threat model (top 12)
| # | Threat | Likelihood | Impact | Primary mitigations |
|---|---|---|---|---|
| 1 | Container escape (kernel exploit) | Med | High | gVisor default, Kata for Hardened tier, seccomp profile, drop caps, no privileged, minimal kernel modules on hosts |
| 2 | Cross-tenant network access | Low-Med | High | Cilium default-deny, namespace isolation, eBPF egress filters, mTLS east-west |
| 3 | Stolen API key / token | Med | Med-High | Short-lived sessions, key rotation UX, optional IP allowlist, leak detection (GitHub partner program) |
| 4 | Stripe webhook spoofing | Low | High | Signature verification, ts tolerance, replay/idempotency table |
| 5 | Build poisoning (malicious dep) | Med | High | Builds in fresh Kata microVM, restricted egress, SBOM, Trivy scan, signed artifacts |
| 6 | Cryptominer abuse on free tier | High | Low (cost) | CPU steady-state anomaly detection, plan caps, KYC for high-resource free trials |
| 7 | DDoS on customer or platform | High | Med | Anycast scrubbing layer (in-house at edge + Cloudflare WAF for absolo.app), per-tenant rate-limits, autoscale edge |
| 8 | DNS hijack of `absolo.app` | Low | High | DNSSEC, registrar lock, TOTP on registrar, CAA pinning |
| 9 | Cert mis-issuance | Low | High | CAA records, Cert Transparency monitoring, alert on unexpected issuances |
| 10 | Insider misuse | Low-Med | High | RBAC + dual-control on dangerous actions, full audit, no shell access to prod DB |
| 11 | Supply chain (compromised dep) | Med | High | Pinned deps, `cargo audit`/`pnpm audit`/osv-scanner in CI, SLSA L2, signed images, base from Chainguard/distroless |
| 12 | Backup tampering | Low | Critical | age encryption, immutable bucket policies (object lock), cross-region copies |

## Isolation tiers (recap from master plan)
- **Standard**: shared k3s nodes, **gVisor**, Cilium NetworkPolicy, restricted PSS.
- **Hardened**: shared nodes, **Kata Containers** microVMs, encrypted PVs (LUKS).
- **Dedicated**: tainted nodes, runc allowed (still hardened), per-tenant overlay.

## Pod security baseline
- **Pod Security Standards** at `restricted` level by default.
- `runAsNonRoot: true`, `readOnlyRootFilesystem: true` where the workload allows (toggle for templates).
- Drop ALL caps, add only those required (templates declare).
- No `hostPath`, `hostNetwork`, `hostPID`, `hostIPC`.
- Default seccomp profile = `RuntimeDefault`; custom profiles for templates with extra restrictions.
- AppArmor profiles bundled.
- `automountServiceAccountToken: false` for app workloads (apps that need k8s API are out of v1 scope).

## Network policy baseline
- Default-deny ingress + egress per namespace.
- Allow ingress from `edge-proxy` namespace.
- Allow egress to bound DB/bucket service IPs + DNS + NTP + outbound HTTPS to internet (configurable allowlist).
- Block egress to private RFC1918 except platform-allocated subnets.

## Secrets
- Runtime secrets (DB creds, API keys) provisioned via **Vault/OpenBao** Agent injector → mounted as files in pods.
- Build-time secrets (registry tokens) ephemeral per build.
- No secrets in env vars (we still need to inject but mark them sensitive in UI; "secret" env vars are written to a tmpfs file and re-exposed by an init container — phase 1.5 hardening).
- Secret rotation: 90 days for platform secrets, 7 days for app-bound DB creds.
- Customer-uploaded secrets encrypted at rest with per-org KEK (phase 2 — tenant-isolation crypto).

## Supply chain
- **Base images**: Chainguard or distroless only.
- **CI**: every PR runs lint, audit, tests, security scans, SBOM generation; merge gated.
- **Artifacts**: cosign-signed (keyless via Sigstore phase 2; KMS-keyed phase 1).
- **SLSA**: target L2 at launch, L3 phase 2 (hermetic builds, two-party review for prod images).
- **Dependency updates**: Renovate, weekly batched PRs; security patches auto-merged after green CI.

## Incident response
- 24/7 on-call rotation (admin staff + lead engineers).
- Pager runbooks per critical alert.
- Sev-1 declared by anyone, paged promptly, IC assigned, post-mortem within 5 days (blameless).
- Customer comms via status page + email + dashboard banner.
- Security incidents have a separate process (`32-compliance-legal-d1e00e.md`).

## Vulnerability management
- Trivy scans run nightly on all platform and template images; criticals fail the pipeline.
- 72h SLA for critical CVE patch in customer-facing surfaces.
- Customer notification when their template image has a critical CVE; opt-in auto-rebase.

## Penetration testing
- External pentest before public launch and annually.
- Bug bounty program at launch (HackerOne or Intigriti).

## Audit logging
- Every state-changing API call → `audit.events` (append-only Postgres table + ClickHouse mirror).
- Format: `{actor, action, target, before, after, ip, ua, request_id, trace_id, ts}`.
- Tamper-evident chain (hash-linked entries) for high-risk actions; phase 2 anchor to public ledger.

## Compliance posture
- GDPR, CCPA: data residency, deletion, export.
- SOC2 architecture-aligned; formal audit phase 2.
- ISO 27001 phase 2.
- HIPAA/BAA: out of scope at launch.

## Cryptography choices
- TLS 1.2 minimum (1.3 preferred). HSTS preload opt-in for custom domains.
- Argon2id for passwords (m=64MB, t=3, p=1).
- AES-256-GCM via libsodium/ring for at-rest secrets.
- Ed25519 for signatures.
- PASETO v4.local for internal session tokens; v4.public for external.

## Operational hygiene
- All ops actions via admin dashboard (no SSH-as-root to prod).
- Production DB shell access restricted to a break-glass workflow (paged + dual-control + 1h time-bound).
- Just-in-time access elevation via Vault for sensitive paths.

## Open items
- Confidential computing (TDX/SEV-SNP) for premium tier — phase 2.
- Hardware HSMs for KEKs — phase 2.
- FIDO2 platform-wide MFA mandate for all admin actions — start day 1.
