# 07 — Billing Service

Hourly metered billing on Stripe with predictable monthly invoicing, supporting compute, storage, bandwidth, managed DBs, and object storage as separately metered resources.

## Stripe model
- **Products**: one per resource family (compute-app, compute-site, postgres-db, mysql-db, redis-db, object-storage, bandwidth, persistent-volume).
- **Prices**: tiered/unit prices with `usage_type=metered`, billing meters API (the new 2024+ Stripe meter system; we **do not** use the legacy `usage_records` API which is sunset in 2025-03-31).
- **Customer**: 1:1 with our Organization.
- **Subscription**: one per org, with multiple subscription items, each linked to a Stripe Billing Meter for metered prices and to flat prices for plan anchors.
- **Tax**: Stripe Tax enabled at launch for US sales-tax + VAT/GST.

## Domain model
```
Plan { id, code, name, monthly_anchor_cents, included_units(json), display_order, archived_at }
Subscription { id, org_id, plan_id, stripe_subscription_id, status, current_period_start, current_period_end }
SubscriptionItem { id, subscription_id, kind, stripe_price_id, stripe_meter_id }
PaymentMethod { id, org_id, stripe_pm_id, brand, last4, exp_month, exp_year, is_default }
Invoice { id, org_id, stripe_invoice_id, number, status, total_cents, tax_cents, period_start, period_end, pdf_url }
UsageEvent { id, org_id, resource_id, kind, qty, unit, occurred_at, ingested_at }
UsageHourly { org_id, resource_id, kind, hour, qty }
MeterShipment { hour, kind, batch_id, sent_at, stripe_meter_event_count, status }
TaxProfile { org_id, country, vat_id, validated_at, exempt }
DunningState { org_id, level, last_attempt_at, next_attempt_at }
Credit { id, org_id, kind, amount_cents, expires_at, applied_to_invoice_id }
```

## Metering pipeline
```
[host-agent / proxy / storage] -- usage_event NATS --> metering-aggregator (Rust)
                                                          |
                                                          +--> Postgres usage_events (raw, append-only, partitioned by day)
                                                          |
                                                          +--> Postgres usage_hourly (rolled per (org, resource, kind, hour))

Hourly cron: billing.shipper                --> Stripe Billing Meters (batched, idempotent)
                                            --> MeterShipment row marked sent
```

### Event sources & cadence
- **Compute uptime**: host-agent emits a `compute.tick` per running pod every 60s with `(org, app, size)`. Aggregator converts ticks to fractional hours (capping at 60 ticks per hour).
- **Persistent volume**: storage operator emits `pv.size` snapshot every 5 minutes.
- **Object storage**: SeaweedFS volume reporter emits per-bucket bytes-stored every 5 minutes.
- **Bandwidth**: edge-proxy emits per-connection `bandwidth.bytes` on connection close, batched.
- **Managed DB**: dual events — `compute.tick` for the DB pod + `pv.size` for the data volume + `db.io.bytes` for IO (phase 2).

### Idempotency
- Every `usage_event` has `(org, resource, kind, occurred_at)` natural key.
- Aggregator uses `INSERT … ON CONFLICT DO NOTHING` plus a deterministic `event_id` derived from the natural key.
- Stripe meter shipment uses `identifier` field on each meter event = our `(hour, resource, kind, batch_id)` hash to dedupe even on retry.

## Plan & price model
- Each plan has an anchor monthly fee + included unit allowances per resource kind (e.g., 100GB egress).
- Overage charged via metered prices on the matching meter.
- "Pay-as-you-go" plan = $0 anchor, all metered.

## Invoice lifecycle
- Stripe creates draft invoice at period end → finalize → attempt charge.
- Webhook `invoice.paid` → mark paid, send receipt with PDF.
- Webhook `invoice.payment_failed` → enter dunning (level 1: retry +3d, level 2: +5d email, level 3: +7d suspend non-prod, level 4: +10d suspend all, level 5: +14d cancel + final notice).
- Reactivation on payment clears dunning, requeues suspended workloads.

## Refunds & credits
- Refund issued via admin (dual-control above $X) → Stripe refund + Credit row applied.
- Comp credits added by support automatically applied to next invoice via `invoice.upcoming` webhook adjustment.

## Tax
- Stripe Tax handles calculation; we collect VAT/GST IDs at signup for B2B.
- Migration path to Paddle (Merchant of Record) documented if EU/intl tax burden grows: Paddle replaces Stripe Customer/Subscription objects, our `MeterShipment` adapter swaps from Stripe Meters to Paddle Adjustment API; metering pipeline upstream unchanged.

## Webhooks
- Single `/v1/webhooks/stripe` endpoint with signature verification (Stripe-Signature header, ts tolerance 5min).
- Events processed via outbox: signature-verified events written to `stripe_webhook_events` table, async handler advances state. Replay-safe via `event.id` dedupe.

## Anti-fraud
- Card check: $1 auth + immediate void on signup; declined cards block paid resources.
- High-risk signal flags: free signup → many concurrent VMs → fraud queue.
- Crypto-mining detection sends signal; on confirmation, suspend account and reverse charges.

## Customer-facing UX
- Live "spend so far this period" widget (refreshed hourly from `usage_hourly`).
- Forecast line based on last-24h trajectory.
- Spend-cap setting: org owner can set a hard cap; on hit, suspend non-prod first, then send notice + 24h before suspending prod.
- Invoice download (PDF + JSON), payment method management, tax info form.

## Public API endpoints (excerpt)
```
GET  /v1/orgs/:orgId/billing/subscription
PUT  /v1/orgs/:orgId/billing/plan
GET  /v1/orgs/:orgId/billing/usage?from=&to=
GET  /v1/orgs/:orgId/billing/invoices
GET  /v1/orgs/:orgId/billing/invoices/:id/pdf
POST /v1/orgs/:orgId/billing/payment-methods
PUT  /v1/orgs/:orgId/billing/payment-methods/:id/default
PUT  /v1/orgs/:orgId/billing/tax
POST /v1/orgs/:orgId/billing/spend-cap
```

## Tests
- Aggregator: deterministic property tests on idempotency.
- Shipper: against Stripe in test mode + recorded fixtures.
- Dunning state machine: simulated webhook sequences end-to-end.
- Reconciliation: nightly job compares Stripe revenue vs our shipped meter totals; alerts on >0.1% drift.

## Open items
- Whether to expose hourly granularity in invoices (yes for power users, hidden by default).
- Multi-currency: USD only at launch; EUR/GBP phase 2 via Stripe multi-currency prices.
