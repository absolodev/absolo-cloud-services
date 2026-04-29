# 39 — Enterprise BYO Infrastructure

A separate, opt-in product for enterprise customers who must run on their own hardware (compliance, data residency, cost optimization at scale, existing colocation contracts) — Absolo's control plane manages the customer's k8s cluster via the same outbound-only mTLS agent, with distinct legal, billing, and SLA contours from the standard tier.

## Audience
- Enterprises with strict data-residency requirements (regulated industries: gov, fintech, health-tech).
- Companies with existing investments in private datacenters or unused capacity.
- Customers at scale where their own hardware is cheaper than our managed compute.
- Customers operating in regions we don't yet serve.

Standard customers stay on our managed infrastructure (`24-…`). BYO is **never** the default and is **never** offered self-serve.

## What customers bring vs. what Absolo runs
| Layer | Customer | Absolo |
|---|---|---|
| Hardware | ✅ | — |
| Linux OS install | ✅ (we provide a hardened Ubuntu image they can use) | — |
| Networking, IP space, edge routers | ✅ | — |
| Power / colocation / racks | ✅ | — |
| `absolo-agent` install | ✅ (one-line command after sales-led setup) | (agent itself) |
| k3s + CNI + storage | — | ✅ (agent installs and manages) |
| Control plane (multi-tenant SaaS) | — | ✅ (their cluster talks to it) |
| Customer-portal UX | — | ✅ |
| Updates / patches / security | — | ✅ (agent self-updates; k3s upgrades coordinated) |
| Backups | — | ✅ (Longhorn + restic to a target the customer chooses) |
| Monitoring | — | ✅ (Vector + VictoriaMetrics agents on their hosts) |

## Architecture
- The customer's hosts run our **same `absolo-agent`** as our standard fleet (no fork).
- The agent dials out to our **regional control plane** over the same mTLS channel — no inbound from us.
- The customer cluster gets its own **AppProject** in our ArgoCD with strictly scoped RBAC: ArgoCD can deploy our platform components but cannot read customer data.
- Customer workloads run **only on customer hosts** (taint + nodeSelector enforced by our orchestrator).
- Our control-plane data **never** leaves our regions; the customer cluster is just a data plane that happens to be on their infra.

## Onboarding (sales-led, 1-3 weeks)
1. **Sales call + scoping**: capacity, regions, compliance needs, SLA target, integration with their IdP.
2. **Pre-flight assessment**: customer's network, latency to our nearest control-plane region, compatibility check.
3. **MSA + DPA + custom SLA** signed.
4. **Cluster bootstrap kit** delivered: hardened Ubuntu image (or instructions), network requirements, install token issuance.
5. **First host**: customer ops runs our install command on first node; we monitor remotely.
6. **Cluster validation**: synthetic workload deployed end-to-end; networking, storage, monitoring all green.
7. **Customer acceptance**: customer admin gets dashboard access; customer dev teams onboarded.
8. **Production cutover**: their workloads migrated (with our team's help if part of the contract).

## Pricing
- **Per-host management fee** (~$50-200/host/month depending on size class) replaces our compute pricing.
- **Managed services** (DBs, buckets, edge proxy) charged at their own rates against compute on their hosts.
- **Support tier** (typically Enterprise SLA: 24/7, 1-hour response on Sev-1).
- **Setup fee** for onboarding.
- Annual prepay default; discounts at significant volume.
- All standard plans (Free/Hobby/Starter/Pro/Business) are *not* available in BYO mode — too operationally complex for low-margin tiers.

## SLA differences
- We provide SLA on the **management plane** (our control plane reachability, dashboard, deploys).
- Hardware availability SLA is the customer's own (we don't own the hardware).
- We help structure their hardware redundancy plan as part of onboarding.

## Security model
- Customer data plane: customer's responsibility (their network, their physical security).
- Control plane data flow: same as standard (mTLS, signed agent, audit log on every action).
- **No remote root**: we never have shell access into their hosts. All ops via the agent's gRPC RPCs.
- **Audit log copy**: every action we take on their cluster is exported to their SIEM / log destination (configurable).
- Customer can run a "tripwire" agent that asserts our agent's signature daily.

## Multi-tenancy isolation (within a BYO cluster)
- Generally a BYO cluster is **single-tenant** (the customer's own org).
- A BYO customer with multiple internal teams uses our standard team/RBAC features.
- We do not host other customers' workloads on a BYO cluster.

## Updates & maintenance windows
- Customer picks a maintenance window per cluster (e.g., Sunday 02:00-06:00 their TZ).
- All k3s/agent/component updates respect that window.
- Critical CVE patches may break the window with prior agreement.

## Disconnect handling
- If the agent loses control-plane connectivity:
  - Existing customer workloads keep running (k3s is local).
  - Dashboard shows the cluster as "disconnected"; new deploys queue.
  - On reconnect, queued deploys catch up; metrics/logs backfill from local buffers.
- We design for "operate disconnected for 24h" capability.

## Termination
- Customer can terminate at end of contract; we provide an export of their data + manifests.
- Agent can be uninstalled; their cluster reverts to a plain k3s without our control.

## Differences from the standard product (operationally)
- No multi-tenant scheduling (their hardware = their workloads).
- No Longhorn cross-region replication unless customer has multiple sites we can use.
- Backups go to a destination they specify (their S3 / their NAS).
- Custom domains and DNS still served by our edge if they want; or fully self-hosted with our edge bypassed.
- Edge proxy: typically deployed on customer hardware too (their public IPs); we coordinate cert-manager + cosign.

## Sales motion
- Inbound qualification → discovery → POC (typically 30-day) → contract → onboarding.
- Reference architectures published for: gov-cloud, on-prem datacenter, hybrid (their colo + our edge).
- Customer success engineer assigned post-sale.

## Domain model additions (in our control plane)
```
EnterpriseCluster { id, org_id, name, location, plan_kind:'byo', region_proxy:string, total_hosts, compliance_tags[], onboarding_status, contract_start, contract_end }
ClusterHost { id, cluster_id, fqdn, role, status, agent_version, ... }   # parallel to fleet.hosts
ClusterContract { id, cluster_id, msa_url, dpa_url, sla_target, sla_credits_terms }
```

## Phasing
- **Phase 6 (post-launch)**: first BYO customer (lighthouse), heavily white-glove.
- **Phase 7+**: productize onboarding (self-service post-contract), build BYO-specific dashboard sections.

## Tests
- Sandbox BYO cluster maintained internally to test every release path before pushing to real BYO customers.
- Disconnect drills: cut the customer cluster's link to control plane for 1h, verify graceful behavior.
- Compliance docs (SOC2 boundaries, data flows) reviewed annually.

## Open items
- Whether to allow BYO customers to host our **edge proxy + control plane mirror** for "fully air-gapped" deployments — phase 8 if demanded; significant complexity.
- Pricing tiers per region/compliance regime.
- Reference architectures for AWS/GCP/Azure-hosted BYO (their cloud, their k8s) — phase 7.
