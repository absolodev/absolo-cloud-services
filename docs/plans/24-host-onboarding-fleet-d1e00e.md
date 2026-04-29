# 24 — Absolo Fleet Provisioning & Lifecycle

How Absolo provisions, joins, drains, upgrades, and decommissions every host in our standard-tier fleet — fully automated end-to-end via OpenTofu + Packer + ArgoCD, with no manual SSH or one-off install scripts. (The Enterprise BYO flow, where customers attach their own hardware/clusters, is documented separately in `39-enterprise-byo-infra-d1e00e.md`.)

## Provider strategy
- **Hetzner Cloud** (primary at launch): cheap, fast API, EU + US locations, perfect for control-plane VMs and small/medium compute hosts.
- **Hetzner dedicated / auction**: bare-metal hosts for high-density compute (managed via Hetzner Robot API + OpenTofu).
- **Latitude.sh**: secondary bare-metal provider for global reach (US edge, Asia edge), and a hedge against single-provider lock-in.
- **Avoid**: Equinix Metal (sunsetting mid-2026).
- All provider differences are hidden behind reusable OpenTofu modules (`infra/tofu/modules/host-cluster/`).

## End-to-end provisioning flow (zero manual steps)
1. Admin opens **Fleet → Add capacity** in admin dashboard, picks region + count + size class + plan tier (Standard / Hardened / Dedicated) + labels / taints.
2. Admin reviews the rendered `tofu plan` output and approves with dual-control.
3. CI/CD runs `tofu apply` against the target region's stack (`infra/tofu/stacks/<region>/`).
4. OpenTofu provisions the VM(s) / bare-metal node(s) using a **pre-baked Packer image** that already contains:
   - Hardened Ubuntu 24.04 LTS (CIS-aligned baseline).
   - `absolo-agent` binary (signed, version pinned).
   - `chrony`, `wireguard`, `cilium-cni` static deps.
   - Pre-configured systemd unit for the agent, disabled until first boot.
5. Cloud-init applies per-host config (region, labels, taints, install token).
6. On first boot, `absolo-agent`:
   - Performs system checks.
   - Mints a permanent mTLS cert via the install token (one-time use, 24h TTL).
   - Bootstraps k3s and joins the regional cluster.
   - Reports `Joined` heartbeat to control plane.
7. ArgoCD reconciles the per-region `host-baseline` ApplicationSet onto the new node (Cilium, Longhorn agent, Vector, node-exporter, cAdvisor).
8. Admin dashboard shows the host transitioning `provisioning → joining → online → schedulable` automatically; total time typically **5-10 minutes from approval to schedulable**.

No human ever logs into the box. No bash one-liner is copied around.

## Why pre-baked images (not ad-hoc bootstrap scripts)
- **Speed**: a Packer image boots in seconds; an apt-update + install bash script can take 5+ minutes per host.
- **Reproducibility**: the image is content-addressable, signed, and identical across providers.
- **Security**: no secrets traverse cloud-init beyond the install token.
- **Rollback**: a regression in baseline tooling means rebuilding the image, not re-SSH-ing every host.

## Pre-flight (validated at provisioning, not on customer hardware)
- OS: Ubuntu 24.04 LTS only (Hetzner / Latitude both ship clean Ubuntu base).
- Kernel: ≥ 6.8 with cgroup v2 (default in Ubuntu 24.04).
- Storage: minimum size determined per node-class (compute = 200GB, storage = 1TB+ NVMe).
- Networking: outbound 443 to control plane + NTP; private network in-region for east-west.
- Time sync: chrony pre-installed and configured to our NTP pool.
- Disabled by image: swap (per k3s req); ufw replaced by Cilium host firewall.

## Host model
```
Host { id, region_id, hostname, fqdn, ip_public, ip_private, plan_tier, labels(json), taints(json),
       cpu_cores, mem_gb, disk_gb, allocatable_cpu, allocatable_mem, allocatable_pv_gb,
       agent_version, k3s_version, kernel_version, status:'pending'|'online'|'cordoned'|'draining'|'offline'|'decommissioned',
       last_heartbeat_at, joined_at, decommissioned_at }
HostMaintenance { host_id, kind:'kernel_patch'|'k3s_upgrade'|'agent_upgrade'|'manual', scheduled_at, completed_at, status }
```

## Capacity tracking
- Allocatable values updated continuously (heartbeat).
- Scheduler reads from Postgres `hosts` (mirrored from k8s) for capacity-aware placement decisions outside k8s default scheduler (e.g., for migration planning).
- Admin sees per-region heatmaps: CPU/Mem/PV utilization, replica counts, recent saga activity.

## Cordon & drain
- **Cordon**: mark host unschedulable; existing workloads keep running.
- **Drain**: move workloads off; block until done or timeout.
  - Stateless apps: scale up new pods on other hosts → flip traffic → terminate old pods.
  - Stateful (Sites with Longhorn PV): trigger Longhorn replica handover to other nodes → wait healthy → reschedule pod.
- All drain operations are sagas (recoverable across orchestrator restarts).

## Upgrades
- **Agent upgrades**: phased per-region rollouts, 5% → 25% → 100%, halt on error-rate spike. Auto-rollback on health regression.
- **k3s upgrades**: scheduled per host; kubectl drain → upgrade → uncordon; one host at a time per region.
- **Kernel patches**: requires reboot; live-migration of workloads then reboot; orchestrated.
- All upgrade windows respected per-host (default Sun 04:00 UTC, configurable).

## Decommission (also fully automated)
1. Admin marks host for decommission in the dashboard with a target date.
2. System drains workloads (saga; handles Longhorn replica handover, app pod migration).
3. Confirms zero workloads present and zero Longhorn replicas remaining.
4. Issues `Decommission` RPC to host-agent; agent unjoins k3s and wipes its state.
5. CI/CD runs `tofu apply` with the host removed from the stack → OpenTofu destroys the cloud resource.
6. Host record retained 12 months for audit, then purged.

For bare-metal: step 5 instead returns the server to the provider's pool (Hetzner Robot cancellation, Latitude.sh release) via API.

## Host failure handling
- Heartbeat lost > 60s → mark `unreachable`, alert ops.
- > 5 min → declare `offline`, k8s reschedules pods to healthy nodes; Longhorn fails over PV replicas.
- Auto-isolation: if host shows correlated failures (e.g., disk errors), auto-cordon pending review.

## Hardware vetting
- Each provider/tier has a baseline benchmark suite that runs **once at provisioning** (CPU SPECint-like microbench, fio random/sequential, iperf3 to peer hosts).
- Results stored in `fleet.host_benchmarks`; admin sees per-host scores and per-provider/tier rolling averages.
- Hosts scoring below provider-tier threshold are auto-cordoned and flagged for replacement.
- Periodic re-bench monthly to detect noisy-neighbor degradation on cloud VMs.

## Fleet metrics dashboard (admin)
- Total capacity vs reservation per region.
- Forecast 7d/30d capacity trajectory.
- Top 10 hosts by load, top 10 by error rate.
- Staging fleet vs production fleet separation (own region tier `lab`).

## Network plumbing
- Each region has a private overlay network (Cilium + WireGuard) for east-west traffic.
- Hosts must be able to reach each other privately for k3s control plane and Longhorn replication.
- Public IPs only need to be reachable from the internet for ingress hosts (where edge-proxy runs); compute-only nodes can be private-IP only with NAT egress.

## API surface (admin only)
```
POST /admin/v1/fleet/capacity-plans              # create a tofu plan: { region, count, node_class, tier, labels, taints }
GET  /admin/v1/fleet/capacity-plans/:id          # view rendered plan + cost estimate
POST /admin/v1/fleet/capacity-plans/:id/approve  # dual-control approve → triggers tofu apply
GET  /admin/v1/fleet/capacity-plans/:id/status   # apply progress
GET  /admin/v1/hosts                             # filters: region, tier, status
GET  /admin/v1/hosts/:id
POST /admin/v1/hosts/:id/cordon
POST /admin/v1/hosts/:id/drain
POST /admin/v1/hosts/:id/decommission            # initiates drain + tofu destroy saga
POST /admin/v1/hosts/:id/upgrade-agent
POST /admin/v1/hosts/:id/upgrade-k3s
POST /admin/v1/hosts/:id/rebench
PUT  /admin/v1/hosts/:id/labels
PUT  /admin/v1/hosts/:id/taints
```

The install-token endpoint that previously generated a manual one-liner is removed; install tokens are now minted internally by the capacity-plan saga and consumed by the new host's cloud-init.

## Tests
- E2E (in `dev` Hetzner Cloud account): full provisioning flow — capacity plan → tofu apply → first-boot → join → schedulable in <15 min.
- Chaos: kill agent on a busy host; verify k8s + Longhorn recovery within SLO.
- Performance: simulate 1000-host fleet inventory in Postgres; verify scheduler queries stay <50ms.
- IaC drift: weekly `tofu plan` against prod stacks; alert on unexpected drift.

## Open items
- Auto-scaling capacity policy: when forecast utilization > X%, auto-open a capacity plan PR for review (phase 1.5).
- Spot-pricing / preemptible host class (Hetzner CAX ARM nodes for free tier?) — phase 2.
- Cross-cloud disaster failover: if Hetzner-EU has provider-wide outage, can we surge to Latitude.sh-EU rapidly? — phase 2 capacity reserve.
