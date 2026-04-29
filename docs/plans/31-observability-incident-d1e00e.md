# 31 — Observability, SLOs & Incident Response

How we know when the platform is healthy, how we react when it's not, and how we steadily improve.

## The four observability pillars
- **Logs** — `18-…`.
- **Metrics** — `19-…`.
- **Traces** — OpenTelemetry → Tempo, sampled at 1% (100% on errors).
- **Events / continuous profiling** — Sentry/GlitchTip for app errors; Pyroscope for continuous profiling on Rust services (phase 1.5).

## SLO catalog
| Service | SLO | Window | Budget |
|---|---|---|---|
| Control-plane API | 99.9% availability, p99 < 300ms | 30d rolling | ~43 min/mo |
| Edge proxy | 99.95% availability, added p99 < 50ms | 30d | ~22 min/mo |
| Build pipeline | 99% success on valid input, p95 deploy < 90s | 7d | 1% |
| Live log tail | p95 ingest→screen < 2s | 7d | — |
| Hourly billing meter | < 1% drift vs Stripe at month-end | monthly | 0.1% drift triggers alert |
| Database availability (per managed DB) | 99.95% with HA, 99.5% without | 30d | per-instance |
| Web SSH session establishment | p95 < 3s | 7d | — |

## Burn-rate alerts
- Multi-window multi-burn-rate alerts (per Google SRE workbook): 1h fast burn (≥14×) + 6h slow burn (≥6×).

## Dashboards
- **Customer-facing** (in dashboard UI): per-resource simple charts (CPU, mem, request rate, error rate, latency).
- **Internal Grafana** (admin only):
  - Platform overview (top SLOs, error rates, queue depths).
  - Per-region capacity heatmap.
  - Build pipeline funnel.
  - Saga inspector.
  - Billing reconciliation.

## Tracing
- All RPC, HTTP, NATS, DB calls instrumented.
- `traceparent` propagated end-to-end (browser → API → NATS → workers).
- Trace ID surfaced in customer error messages: "If you contact support, share this trace ID: …".
- 100% sampling for builds and deploys (low volume, high diagnostic value).

## On-call
- Primary on-call rotation (1-week shifts), backup secondary, manager escalation.
- Phase 1: founders + lead engineers. Phase 2: dedicated SRE rotation.
- Pages from PagerDuty (or alternative — OpsGenie, Squadcast).
- 5-min response SLO on Sev-1.

## Incident severity
- **Sev-1**: customer impact > 25% or data integrity at risk. War room, status page.
- **Sev-2**: significant degradation, region-localized. Status page acknowledged.
- **Sev-3**: minor or non-customer-facing. Tracked.
- **Sev-4**: hygiene / housekeeping.

## Incident process
1. **Detect**: alert or report.
2. **Acknowledge** (5 min Sev-1 / 15 min Sev-2).
3. **Assign IC** (incident commander, separate from hands-on responder).
4. **Mitigate**: revert, redirect, scale, isolate.
5. **Communicate**: status page update within 15 min for Sev-1.
6. **Resolve**: confirm metrics back to baseline.
7. **Post-mortem** within 5 business days, blameless, action items tracked to closure.

## Status page
- Public at `status.absolo.cloud`, separate Next.js app.
- Components per service per region.
- Subscribers (email, RSS, webhook).
- Powered by metrics + manual incident updates from admin dashboard.

## Runbooks
- Per critical alert, a runbook describes:
  - Symptoms.
  - Likely causes.
  - Diagnostic queries.
  - Mitigation steps.
  - Escalation contacts.
- Stored in `infra/runbooks/` markdown, indexed in admin dashboard.

## Continuous improvement
- Monthly SLO review: are we within budget? Did burn rates trigger appropriately?
- Quarterly chaos drill: planned region failure, agent failure, Stripe outage simulation.
- Action-item tracker enforced in retros.

## Customer-facing incident UX
- Banner in dashboard during active incidents that affect their resources.
- Email opt-in for Sev-1/2.
- Specific app pages show "This region is experiencing issues" links to status page.

## Internal tooling
- Single command (`absolo-ops incident start`) opens war room (Slack channel + PagerDuty + status-page incident in one shot).
- Auto-scribe bot logs the timeline.

## Logging hygiene
- No PII in logs by default.
- No secrets in logs (middleware redaction).
- Logs retained per `18-…`; older sampled & archived to cold S3.

## Production-data hygiene
- No prod DB shell access for engineers; break-glass only.
- No raw exports of customer data without legal review.
- All data exfil via approved tooling with audit.

## Open items
- Distributed continuous profiling for Rust agents — phase 2 (Pyroscope adoption).
- ML anomaly detection on metrics — phase 2 (defer until baseline data).
