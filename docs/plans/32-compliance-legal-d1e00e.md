# 32 — Compliance, Legal & Abuse

The legal and policy framework that makes the platform safe to operate at scale: GDPR, ToS/AUP/DPA, data residency, abuse handling, takedowns, and breach response.

## Regulatory posture (launch)
- **GDPR-ready** (we operate in EU regions; will likely have EU customers from day 1).
- **CCPA-aware** (California users).
- **Stripe handles PCI**; we are SAQ-A merchant.
- **HIPAA / BAA**: out of scope at launch; prevent storing PHI per AUP.
- **SOC2 Type 1** target 12 months post-launch; Type 2 by month 18.
- **ISO 27001** target post-SOC2.

## Documents
- **Terms of Service** (ToS).
- **Acceptable Use Policy** (AUP) — explicit list of disallowed content/use.
- **Privacy Policy** — what we collect, why, how long, who we share with (Stripe, OAuth providers, log/metric providers if any).
- **Data Processing Addendum (DPA)** — for B2B customers per GDPR Art. 28; standard SCCs for transfers.
- **Subprocessor List** — Stripe, Cloudflare, anyone else; updated with 30d notice.
- **Cookie Policy** — minimal cookies (auth + theme + analytics if Plausible self-hosted); cookie banner only where strictly required by EU law (Plausible doesn't trip ePrivacy unlike Google Analytics).
- **Refund Policy** — clear hourly billing logic, what's refundable.
- **SLA** — 99.9% control plane, 99.95% edge; service credits per missed SLO.

## Data residency
- Each region's customer data stored in-region (logs, metrics, snapshots, images).
- Backups: cross-region by default for DR; user can opt-out (with warning) for strict residency.
- Data export available on request.
- "Right to be forgotten" honored: 30-day soft-delete grace, then irreversible purge across primary, replicas, backups (within next backup rotation cycle).

## Abuse policy (AUP highlights)
- **Disallowed**: phishing, malware distribution, illegal content (CSAM mandatory report, terrorism, sanctioned-country IP), copyright violation (DMCA), unauthorized scraping, spam, mass email outside legitimate use, cryptocurrency mining (free tier, and on most paid tiers without explicit approval), DoS attacks from our infrastructure.
- **Allowed but rate-limited**: high-throughput APIs, large public file hosting (subject to fair-use bandwidth caps).

## Abuse detection & response
- **Automated**:
  - CPU steady-state anomaly (cryptominer signal).
  - Outbound port-scan / connect-storm (eBPF detection at host).
  - Unusual outbound bandwidth spikes.
  - DNS lookups to known malware C2.
  - Phishing link signal via Google Safe Browsing API on hosted URLs (sampled).
- **Manual**: support tickets, partner reports, takedown notices.

## Action ladder
1. **Notice**: notify owner via email + dashboard banner; 24h to respond.
2. **Quarantine**: workload isolated (network deny, no public access) but data preserved.
3. **Suspension**: workload stopped; org cannot create new resources.
4. **Termination**: account closed; data purged after 30 days.
5. **Imminent harm exception**: skip steps for CSAM, active phishing infrastructure, ongoing DoS — immediate quarantine + report.

## Takedown handling
- DMCA: dedicated email + form; counter-notice flow; safe harbor compliance.
- Court orders: legal review; respond per jurisdiction.
- LEA requests: documented intake, only with valid legal process; transparency report.

## Breach response
- 72-hour notification target for personal data breaches per GDPR Art. 33.
- Customer notification within 72h of confirmed breach affecting their data, with what we know + mitigation.
- Public disclosure via blog and email when warranted.
- Annual tabletop exercise.

## Customer obligations (AUP)
- Don't resell our service without our written consent.
- Don't bypass plan limits via fragmentation.
- Don't stress-test our infra without notification.
- Maintain accurate contact info; we contact you for security issues.

## Subprocessors at launch
- Stripe (payments, tax).
- Cloudflare (DNS, optional WAF cdn).
- GitHub (auth via OAuth, source for builds opt-in).
- Sentry/GlitchTip (errors — self-hosted).
- Plausible (analytics — self-hosted).
- Email provider (SES, Postmark, or Resend).

## Cookies & analytics
- Strictly necessary (auth, CSRF, theme): no consent required.
- Analytics: Plausible (privacy-friendly, no PII, no cookies in default config) — claim "no cookies banner needed" only if our analytics actually doesn't use cookies (Plausible meets that bar).

## Insurance
- Cyber liability + tech E&O policy in place before launch.
- D&O when we incorporate properly.

## Internal compliance hygiene
- Quarterly access reviews of admin roles.
- Annual security awareness training for all staff.
- Vendor risk reviews on subprocessors.

## Audit log retention
- 1 year hot, 5 years cold (financial integrity needs).
- Tamper-evident chain (`audit.event_chain`) for high-risk actions.

## Tax & invoicing
- Stripe Tax handles US sales tax + EU VAT + GST.
- VAT IDs validated via VIES.
- Invoices comply with EU invoicing rules (sequential numbers, supplier ID, tax breakdown, etc.).

## Open items
- Hire fractional GC / privacy lawyer pre-launch.
- Choose insurer.
- HIPAA roadmap (likely never; explicitly ban PHI in AUP).
- Sanctions screening tooling for new signups (phase 2).
