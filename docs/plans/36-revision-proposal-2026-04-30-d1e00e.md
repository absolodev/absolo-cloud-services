# 36 — Revision Proposal (2026-04-30)

A focused proposal that incorporates four corrections from the user — Absolo-owned infrastructure as default, enterprise BYO as an opt-in, customer staging environments as a paid feature, and explicit infra/automation tooling — and reorganizes plans into the in-repo `docs/plans/` directory ready for git.

## Decisions locked from your replies
- **Plans directory in repo**: `docs/plans/` at the root of `absolo-cloud-services`.
- **Infra provider for v1**: Hetzner Cloud (control plane VMs + dev/staging) + Hetzner dedicated/auction servers OR Latitude.sh bare metal for compute hosts as we scale. (Note: Equinix Metal is being sunset by mid-2026 — removed from the option set.)
- **Customer staging envs**: 1 staging env included on Pro+; additional staging envs billed at standard usage rates **plus** a $3/mo per-env management fee.
- **Plan files canonical location**: kept in sync between `.windsurf/plans/` and the in-repo `docs/plans/` going forward (revision will populate both).

## Corrections incorporated
1. **No customer-supplied servers for standard customers.** All standard-tier customers run on Absolo-owned infrastructure (cloud VMs / bare metal we provision). The previous "host-onboarding" plan must be rewritten with this in mind.
2. **Enterprise BYO is a separate, opt-in product.** Enterprise customers can attach their own clusters/hardware via a hybrid management plane. Distinct lifecycle, distinct security model.
3. **Self-deployment automation**: how Absolo's own services (control plane, edge proxy, host agent, builder, etc.) get built, shipped, deployed, and updated needs an explicit plan — without bespoke ad-hoc scripts.
4. **Customer staging envs**: pricing + scoping clarified.
5. **Project repo structure**: deliverable directory layout for the monorepo so we can start implementing.

## Plans being updated
| ID | File | Key changes |
|---|---|---|
| 00 | `00-master-plan` | Replace "customer-supplied servers" framing with "Absolo provisions all standard-tier infra"; add infra stack (OpenTofu/Packer/ArgoCD/Helm); add staging-env note; add new plans 36-39 to index |
| 08 | `08-projects-apps-service` | Make customer staging environment first-class; promotion rules clarified; staging billing reference |
| 24 | `24-host-onboarding-fleet` | Rewrite as "Absolo Fleet Provisioning": OpenTofu provisions servers, Packer-baked images self-register, k3s join is automated end-to-end. BYO content moves to plan 38 |
| 30 | `30-testing-ci-cd` | Add IaC + GitOps stages: OpenTofu plan/apply, Helm chart publish, ArgoCD reconciliation, blue/green for our own services |
| 33 | `33-pricing-packaging` | Add staging env pricing; Pro+ includes 1 free staging env; additional at usage rates + $3/mo |
| 35 | `35-roadmap-phases` | Add infra-as-code + GitOps work to Phase 0/1; add enterprise BYO as Phase 6+ item |

## Plans being added
| ID | File | Purpose |
|---|---|---|
| 37 | `37-infrastructure-as-code` | OpenTofu + Packer + ArgoCD + Helm setup; how we provision servers, networks, DNS, k3s clusters; per-region stacks (dev / staging / prod-eu / prod-us / prod-apac); GitOps repo structure |
| 38 | `38-platform-self-deployment` | How Absolo's own services update with zero downtime: control-plane rolling deploys behind PDBs, edge-proxy connection-draining swaps, host-agent self-update channels, builder/log-shipper rollout via DaemonSets, blue/green for breaking changes, automated rollback on SLO breach |
| 39 | `39-enterprise-byo-infra` | Enterprise-only product: customers register their own k8s cluster or VMs; Absolo control plane manages it via outbound-only mTLS agent (same agent design); legal/billing/SLA differences; sales-led onboarding |
| 40 | `40-monorepo-structure` | Concrete directory layout for `absolo-cloud-services` ready to scaffold |

## Recommended infra/ops tooling (minimum overhead, production-grade)
- **OpenTofu** (open Terraform fork) — provisioning servers, networks, DNS, load balancers across Hetzner Cloud and Latitude.sh.
- **Packer** — golden Ubuntu 24.04 images with `absolo-agent` baked in; reduces host bootstrap from minutes to seconds.
- **k3s** — lightweight Kubernetes per region (already chosen).
- **ArgoCD** — GitOps app delivery (chosen over FluxCD for native UI we can embed in admin dashboard, image automation via Argo Image Updater, multi-cluster management for our 3 regions, and AppProjects for region scoping).
- **Helm** — chart packaging for all Absolo services (control plane, edge proxy as DaemonSet, builder, log shipper, web-ssh-gateway, etc.).
- **Renovate** — automated dep bumps (already chosen).
- **Cosign** — image signing in CI; ArgoCD verifies signatures before deploy.
- **Cloudflare DNS** — managed externally via OpenTofu provider.

We deliberately **skip**: Ansible (Packer images replace it), service-mesh sidecars (Cilium covers east-west policy + mTLS), and custom-built control loops where ArgoCD + a small operator suffices.

## Repo layout to scaffold (preview — full version in plan 40)
```
absolo-cloud-services/
  apps/                       # Customer-facing & internal frontends (Next.js / Vite)
    marketing/
    dashboard/
    admin/
    status/
  services/                   # NestJS control plane (modular monolith)
    control-plane/
  crates/                     # Rust workspace (hot-path services + CLI)
    host-agent/
    edge-proxy/
    builder-worker/
    metering-aggregator/
    web-ssh-gateway/
    log-shipper/
    cli/                      # absolo CLI
    shared/
  packages/                   # TS workspace (shared libs, SDK, design)
    contracts/                # OpenAPI, Zod, JSON Schema, protobuf
    sdk-ts/
    design-tokens/
    ui/
    icons/
    fonts/
    eslint-config/
    tsconfig/
  templates/                  # Customer template Dockerfiles + manifests
    wordpress/
    woocommerce/
    laravel/
    nextjs/
    ghost/
    static-site/
    nodejs-express/
    python-fastapi/
  infra/                      # IaC + GitOps + Helm
    tofu/
      modules/
      stacks/{dev,staging,prod-eu,prod-us,prod-apac}/
    packer/
    helm/
      charts/
        control-plane/
        edge-proxy/
        host-agent/
        builder-worker/
        web-ssh-gateway/
        log-shipper/
        templates-registry/
    argocd/
      apps/
      projects/
    runbooks/
  docs/
    plans/                    # ALL 40 plan files live here
    architecture/
    runbooks/
  tools/
    scripts/
  .github/workflows/
  package.json
  pnpm-workspace.yaml
  turbo.json
  Cargo.toml
  rust-toolchain.toml
  README.md
  CONTRIBUTING.md
  CODEOWNERS
  LICENSE
```

## Execution plan after your approval
On `exitplanmode`:
1. Copy all 35 existing plans (with the 6 updates applied) from `.windsurf/plans/` to `<repo>/docs/plans/`.
2. Add the 4 new plans (37, 38, 39, 40) in both locations.
3. Scaffold the directory tree above with `README.md` placeholders in each leaf, root `pnpm-workspace.yaml`, root `Cargo.toml` workspace, root `package.json`, `turbo.json`, `.gitignore`, `LICENSE` (TBD — Apache-2.0 placeholder), `CODEOWNERS`, `CONTRIBUTING.md`, top-level `README.md`.
4. **Stop there.** No source code yet. Implementation begins per the Phase 0 checklist in plan 35.

## What I'm explicitly **not** doing in this revision
- Not writing any source code or Helm chart contents — only directory + README scaffolding.
- Not provisioning anything in cloud providers.
- Not picking final license (Apache-2.0 placeholder).
- Not touching the 30 unchanged plans except to copy them to the new location.

## Open questions still pending (non-blocking)
- License choice (Apache-2.0 vs Business Source License for the platform code; SDKs and CLI definitely Apache-2.0 / MIT).
- Source-code repo strategy: single private repo at first (recommended) vs split into private (control plane) + public (CLI/SDK/templates) at launch.
- Whether to publish a public-facing changelog for the platform itself from day 0.

## How to respond
- If the proposal looks right, reply "approve" or similar and I'll execute.
- If you want changes, name the plan numbers and what to adjust.
- If you have additional corrections beyond these four, list them and I'll fold them in before execution.
