# 33 — Pricing & Packaging

The end-to-end pricing strategy: how we charge for compute, storage, bandwidth, managed DBs, and buckets in a way that's predictable for users, profitable for us, and competitive with DO/Render/Railway.

## Principles
1. **Hourly metering, monthly invoice.** Nothing surprises the user.
2. **Plans = compute + bundled allowances.** Add-ons are clearly priced.
3. **Free tier limited but real.** A working WP/Next.js site to try the product, even if low traffic.
4. **No bandwidth gotchas.** Every plan includes a generous bundle; clear $/100 GB overage; spend-cap and alerts available.
5. **No "ops" fees** beyond a tiny per-bucket monthly minimum to disincentivize bucket sprawl.
6. **Hourly cap** for compute: charged by the hour but capped at the monthly equivalent so a 24/7 user never pays more than the size's monthly price.

## Resource units & illustrative prices (USD; finalized later)
### Compute (per app/site/DB pod, hourly with monthly cap)
| Size | vCPU | RAM | $/hr | $/mo cap |
|---|---|---|---|---|
| XS | 0.25 | 256 MB | $0.0083 | $5 |
| S | 0.5 | 512 MB | $0.0167 | $10 |
| M | 1 | 1 GB | $0.0250 | $18 |
| L | 2 | 2 GB | $0.0500 | $36 |
| XL | 4 | 4 GB | $0.1000 | $72 |
| 2XL | 8 | 8 GB | $0.2000 | $144 |
| 4XL | 16 | 16 GB | $0.4000 | $288 |

HA add-on (replica): adds 1× compute price.

### Persistent volume
- $0.10/GB-month, prorated hourly.

### Object storage
- $0.020/GB-month standard.
- 1 cent/1000 PUT, 0.1 cent/1000 GET (or — proposed simpler — bundle into bucket minimum).
- Per-bucket monthly minimum: $1 (covers ops bookkeeping; waived on Business+).

### Bandwidth
- Egress: $0.01/GB after the plan's bundle.
- In-platform egress (to apps and buckets in same region): free.

### Managed DBs
- Same compute matrix as apps + storage at $0.10/GB-month.
- HA: doubles compute (primary + sync replica + async replica counted as 1×).

### Staging environments (paid feature)
- A customer staging env is the same compute/storage matrix as production — priced exactly the same per usage. The only premium is a **$3/mo flat per-environment management fee** that covers the additional CI/CD pipeline, snapshot policies, and dashboard slots.
- The flat fee is **waived** on the included staging envs in Pro (1) and Business (3).
- Suspended staging envs only pay PV/storage; compute compute is paused (replicas scaled to 0).

## Plans (illustrative)
| Plan | $/mo | Compute included | PV included | Egress included | Staging envs | Notes |
|---|---|---|---|---|---|---|
| **Free** | $0 | 1 × XS app w/ sleep (sleeps after 30m idle) | 1 GB | 5 GB | not available | 1 site only, free subdomain only, no managed DB |
| **Hobby** | $5 | 1 × XS @ always-on | 1 GB | 100 GB | $3/mo each (paid) | 1 custom domain |
| **Starter** | $12 | 1 × S | 5 GB | 250 GB | $3/mo each (paid) | 3 custom domains |
| **Pro** | $25 | 1 × M | 25 GB | 500 GB | **1 free** + extras at $3/mo | unlimited custom domains, 1 managed DB allowance |
| **Business** | $60 | 2 × M (or 1 × L) | 100 GB | 1 TB | **3 free** + extras at $3/mo | HA option, dedicated isolation tier (Hardened/Kata) available |
| **Custom / PAYG** | usage | a la carte | a la carte | a la carte | unlimited at usage rates | Enterprise discounts |
| **Enterprise BYO** | sales-led | n/a | n/a | n/a | unlimited at usage rates | Customer brings their own infrastructure (`39-enterprise-byo-infra-d1e00e.md`); we charge a per-host management fee instead of compute |

- Plans are plumbing — actual usage above bundles is metered separately; the plan `$/mo` is simply a prepaid allowance + features (custom domains, support tier, etc.).

## Plan dimensions beyond bundles
- Support SLA: Free = community + best-effort, Hobby = email 48h, Starter 24h, Pro 8h, Business 4h with phone, Custom = dedicated.
- Isolation tier eligibility (Hardened on Pro+, Dedicated on Business+).
- Concurrency caps (e.g., simultaneous builds, DB connections) scale with plan.
- Custom domains count, log retention days, snapshot retention days.

## "Honest pricing" UX
- Pricing page calculator: pick app size + DB size + storage + traffic → live monthly estimate.
- Dashboard shows period-to-date spend with forecast line.
- Spend-cap setting per org; soft warnings at 50/80/100%, hard cap stops non-prod first.

## Discounts
- Annual prepay: 15% off plan anchors and committed compute hours.
- Open-source projects (verified): 50% off Pro for 12 months.
- Education / non-profit: 30% off Pro for 12 months on application.
- Volume discounts at $1k/$5k/$25k/$100k/mo MRR tiers.

## Refunds
- Free tier: never charges, no refunds.
- Hourly: pro-rata refund on plan downgrade for unused prepaid bundles.
- Annual: pro-rata cash refund (less than a 30-day-of-use credit) on cancellation, by request.

## Free trial
- $25 credit valid 30 days for new orgs that add a payment method and pass card check.
- Burns down at usage rates; no commitment.

## Anti-fraud levers
- New free signups limited to 1 small free app + 1 GB PV.
- Card auth $1 + void at signup for paid tiers.
- KYC checkpoint at $X concurrent compute usage from new accounts.

## Margins & cost-of-goods
- We provision all standard-tier infrastructure ourselves (Hetzner Cloud + Hetzner dedicated / Latitude.sh bare metal).
- Compute price-per-hour is set so that fully-loaded host utilization yields **55-65% gross margin at launch** rising to **70-75% by month 18** as we negotiate dedicated/colocation rates and improve bin-packing.
- Persistent volume and object storage carry similar margins after Longhorn replication overhead (3×) and SeaweedFS (typically 2× with replication).
- **Enterprise BYO** changes the model: customer pays infra costs themselves; we charge a flat per-host or per-cluster management fee + standard managed-service costs (DBs, etc.). Margin on management fees is high (90%+) because there's no infra COGS, only people.

## Currency
- USD only at launch; EUR + GBP via Stripe multi-currency phase 2.

## Tax
- Stripe Tax handles US/EU/GB/AU/CA.
- VAT/GST IDs collected and validated.

## Open items
- Concrete numbers vs DO/Render/Railway after market scan; final calibration before launch.
- Sponsored open-source plan (with sponsor logos in invoices) — phase 2.
- Reseller/partner program — phase 2.
