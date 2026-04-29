# 37 — Infrastructure as Code & GitOps

The full IaC + GitOps stack — OpenTofu for provisioning, Packer for golden images, ArgoCD for app delivery, Helm for chart packaging, and cosign for signing — laid out so any engineer can stand up a new region, add capacity, or roll back a service from a single Git PR.

## Goals
- Every server, network, DNS record, load balancer, and Kubernetes app is declared in Git.
- A change to production requires a Git PR, CI green, dual-control approval, and an automated apply — never an SSH session.
- Standing up a new region (or rebuilding from disaster) takes hours, not days.
- Drift is detected within a day; unauthorized changes are reverted automatically.

## Stack summary
| Layer | Tool | Why |
|---|---|---|
| Cloud provisioning | **OpenTofu 1.9+** | Open Terraform fork, MPL-2.0, fully compatible with Terraform providers |
| Golden images | **Packer 1.11** | Standard tool for cross-cloud images |
| Image registry (OCI + Helm) | **Zot** | Lightweight Rust OCI registry, supports cosign |
| Image signing | **Cosign** | Sigstore (Fulcio + Rekor); ArgoCD verifies before deploy |
| App delivery | **ArgoCD 2.13+** | UI + multi-cluster + AppProjects + ApplicationSets |
| Progressive delivery | **Argo Rollouts** | Canary, blue/green, automated rollback on metrics |
| Chart packaging | **Helm 3.16** | Industry standard; OCI-native chart distribution |
| Image promotion | **Argo Image Updater** | Auto-bumps image tags in GitOps repo with cosign verification |
| Drift detection | ArgoCD self-heal + nightly `tofu plan` | Catches OOB changes |
| Secrets in Git | **Sealed Secrets** (bootstrap only) + **Vault/OpenBao** (runtime) | Avoid plaintext secrets in repo |
| Dependency hygiene | **Renovate** | Auto-bumps providers, modules, charts, image tags |

## Repo layout (within the monorepo)
```
infra/
  tofu/
    modules/
      host-cluster/             # provisions a k3s cluster + LB + DNS for one region
      hetzner-vm/               # one Hetzner Cloud VM with our Packer image
      hetzner-dedicated/        # bare-metal via Hetzner Robot
      latitude-bare-metal/      # Latitude.sh bare-metal
      cloudflare-zone/          # DNS records for absolo.cloud / absolo.app
      vault-cluster/            # 3-node OpenBao cluster
      postgres-cnpg/            # CloudNativePG primary + replicas
      argocd-bootstrap/         # in-cluster ArgoCD installation
    stacks/
      dev/                      # dev environment (1 region, small)
      staging/                  # staging mirror of prod (1 region, small)
      prod-eu/                  # eu-fra production
      prod-us/                  # us-iad production
      prod-apac/                # apac-sg production
    backend.tf                  # remote state config (S3 backend on our SeaweedFS)
  packer/
    absolo-host-base/           # Ubuntu 24.04 + agent + chrony + cilium-cni
      packer.pkr.hcl
      provisioners/
      tests/                    # `packer build` + boot test in CI
  helm/
    charts/
      control-plane/
      edge-proxy/
      host-agent/               # DaemonSet for hosts (also baked in image, but DS for live updates)
      builder-worker/
      log-shipper/
      web-ssh-gateway/
      metering-aggregator/
      templates-registry/
      monitoring/               # umbrella: VictoriaMetrics + Loki + ClickHouse + Tempo
      ingress/                  # cert-manager + edge-proxy DaemonSet config
  argocd/
    bootstrap/                  # bootstrap Application that loads everything else
    projects/                   # AppProjects: dev, staging, prod-eu, prod-us, prod-apac
    apps/                       # one Application or ApplicationSet per service per project
    image-updater/              # config for Argo Image Updater
  runbooks/                     # markdown runbooks indexed by alert
```

## OpenTofu conventions
- **Remote state** stored in our own SeaweedFS (S3-compat) per stack, with workspace locking via DynamoDB-compatible table (or Postgres-backed lock for v1).
- **No `null_resource` / `local-exec`** — keep everything declarative; provisioning happens via cloud-init from Packer image.
- **Module versioning**: modules tagged in monorepo (`modules/host-cluster/v1.2.3`), referenced by tag from stacks.
- **Variable conventions**: snake_case, with type + description + sensible defaults + validation blocks.
- **Outputs**: every module exposes a stable `outputs.tf` consumed by downstream stacks (control-plane reads region outputs to populate its config).

## Per-region stack composition
A region stack typically includes:
1. Network (private subnet + firewall + WireGuard mesh).
2. Control-plane VMs (3× Hetzner CCX with our Packer image).
3. Compute hosts (N× Hetzner CCX or dedicated, autoscale-friendly).
4. Storage hosts for Longhorn (NVMe-heavy).
5. Object storage hosts for SeaweedFS.
6. Cloudflare DNS records (`*.<region>.absolo.app` → load balancer IP).
7. ArgoCD Application that points to `argocd/projects/<region>/`.

## ArgoCD topology
- **Single ArgoCD** instance per region (avoids one ArgoCD being a single point of failure for the whole platform).
- Each ArgoCD has AppProjects for dev / staging / prod / per-customer (BYO; phase 6).
- App-of-apps pattern: `bootstrap/Application.yaml` references `projects/<env>/applications.yaml` which lists all services.
- ApplicationSets used for per-region replication of common apps (e.g., `edge-proxy` deployed identically in 3 regions).

## Image promotion pipeline
1. CI builds image, signs with cosign, pushes to internal Zot registry.
2. CI publishes Helm chart to OCI registry.
3. CI (or Argo Image Updater) opens a PR against `argocd/apps/<env>/<service>.yaml` updating `image: ...:<new tag>`.
4. PR auto-merges on green checks (for `staging`); manual approval required (for `prod-*`).
5. ArgoCD detects the change, validates cosign signature, applies, and uses Argo Rollouts for canary if configured.

## Bootstrap order (cold start of a region)
1. Run `tofu apply` on the region stack → infrastructure exists.
2. SSH-less first-boot: Packer image + cloud-init join hosts to k3s control plane.
3. Install ArgoCD via tofu's `kubectl_manifest` + bootstrap Application.
4. ArgoCD reconciles core platform: cert-manager, Cilium config, Longhorn, CNPG, SeaweedFS, monitoring, edge-proxy, host-agent DaemonSet, log-shipper.
5. Smoke tests run in dashboard-as-a-customer mode against a synthetic app.
6. Open the region for customer traffic.

## Drift handling
- **ArgoCD**: auto-sync + self-heal mode for non-critical apps; manual-sync for critical (control plane, edge proxy in prod).
- **OpenTofu**: nightly CI job runs `tofu plan` against every stack; opens an issue if non-zero diff. Allowlist for known-OK churn (e.g., autoscaler counts).

## Disaster recovery
- **Region rebuild from zero**: documented as a runbook, tested quarterly.
  - `tofu apply` rebuilds infra.
  - Postgres restored from cross-region replica or PITR.
  - Vault unsealed via auto-unseal or manual key shares.
  - ArgoCD reconciles all apps.
  - Customer data restored from Longhorn cross-region replicas + SeaweedFS replicas.
  - Target RTO: 4 hours for full region rebuild; 1 hour to bring up a degraded region.
- **State loss**: tofu state is replicated nightly to a separate cold S3 bucket; rebuild runbook documented.

## Secrets in Git
- Application runtime secrets: never in Git; Vault Agent injects at pod start.
- Bootstrap secrets (e.g., Vault root token, Cloudflare API token to seed Vault): Sealed Secrets, encrypted with controller key, safe to commit.
- OpenTofu secrets (provider tokens): sourced from Vault via OIDC at apply time; never in `terraform.tfvars`.

## Cost & FinOps
- Tofu plan output rendered in admin dashboard with **Infracost** integration showing $/month delta of any change.
- Per-region monthly cost dashboard (vendor invoice + Tofu state correlation).
- Budget alerts: > 20% MoM growth in a region triggers ops review.

## Tests
- `tofu validate` + `tofu plan` against every stack on every PR.
- `tflint` + `tfsec` + `checkov` security scans.
- Packer image boot test on every change (boots in QEMU/cloud, checks agent reaches "Joined" state).
- Helm chart `helm lint` + `helm template` snapshot tests.
- ArgoCD ApplicationSet templating tests (rendered manifest snapshot).
- Region rebuild test quarterly.

## Open items
- Whether to use **Crossplane** for some control-plane composition (e.g., managed DBs as XRDs) — defer; OpenTofu is enough at our scale.
- Whether to host our own ArgoCD UI under admin dashboard via iframe vs build a native admin view of ArgoCD APIs — start with iframe + role-scoped SSO; native UI phase 2.
- Vault auto-unseal mechanism choice: Hetzner doesn't have a KMS — use transit unseal from a separate "seal Vault" cluster, or migrate to a provider with KMS for the unseal key.
