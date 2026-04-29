# Security Policy

> If you believe you have found a security vulnerability in Absolo Cloud, **do not file a public GitHub issue**.

## Reporting

Email `security@absolo.cloud` (placeholder until launch). Include:

1. A description of the issue and its impact.
2. Steps to reproduce.
3. Affected versions / components.
4. Any proof-of-concept code or screenshots.

We will acknowledge receipt within **24 hours** (business days; best-effort on weekends) and provide an initial assessment within **3 business days**.

## Disclosure

We follow coordinated disclosure. We will:

1. Confirm and triage the report.
2. Develop and test a fix.
3. Roll the fix to all affected environments.
4. Notify affected customers if their data was at risk.
5. Publicly disclose the vulnerability after a reasonable embargo (typically 30-90 days), crediting the reporter unless they prefer anonymity.

## Bug bounty

A formal bug bounty program will launch with the public product (see [`docs/plans/35-roadmap-phases-d1e00e.md`](docs/plans/35-roadmap-phases-d1e00e.md), Phase 5). Until then, we offer manual recognition and ad-hoc rewards for high-impact reports.

## Out of scope

- Reports from automated scanners without manual validation.
- Issues only affecting unsupported / dev environments not exposed to customers.
- Social engineering of Absolo staff.
- Findings on third-party services (Stripe, Cloudflare, etc.) — please report directly to those vendors.

## Cryptography & key handling

See [`docs/plans/25-security-hardening-d1e00e.md`](docs/plans/25-security-hardening-d1e00e.md) and [`docs/plans/26-secrets-management-d1e00e.md`](docs/plans/26-secrets-management-d1e00e.md).
