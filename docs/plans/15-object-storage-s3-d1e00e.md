# 15 — Object Storage (S3-Compatible)

Hourly-billed S3-compatible bucket service backed by SeaweedFS, exposed through a per-org credential model with lifecycle rules, presigned URLs, and built-in CDN-friendly headers.

## Choice: SeaweedFS
- **SeaweedFS** (Apache 2.0) — Go, lightweight, S3 API gateway, supports erasure coding, fast small-object performance, replication across volumes/datacenters.
- Alternatives considered:
  - **MinIO** — license tightened in 2024 (AGPLv3 enforcement) and product became more enterprise-paywalled; we want zero license/legal risk.
  - **Garage** — Rust, very small, easy ops, weaker tooling. Strong contender; we keep it as a fallback if SeaweedFS becomes problematic.
  - **Ceph RGW** — heavy ops, overkill for v1.

## Architecture per region
```
                       ┌────────────────────────┐
                       │    Edge proxy (TLS)    │
                       └─────────┬──────────────┘
                                 │
                  s3.<region>.absolo.app
                                 │
              ┌──────────────────▼──────────────────┐
              │   SeaweedFS S3 API gateway pods     │
              │   (auth, signing, bucket metadata)  │
              └──────────────────┬──────────────────┘
                                 │
            ┌────────────────────┴────────────────────┐
            │            SeaweedFS Master(s)          │
            └────────────────────┬────────────────────┘
                                 │
            ┌────────────────────┴────────────────────┐
            │        Volume servers (data)            │
            │  (replicated 010, 002, or EC encoded)    │
            └─────────────────────────────────────────┘
```

- Master(s): 3 replicas with raft.
- Volume servers: scale horizontally; placed across nodes with anti-affinity.
- S3 gateway: stateless, scales by replica count.

## Bucket model
- Naming: `<org-slug>-<bucket-slug>` globally per region (no cross-org name collision risk because of slug prefix).
- ACLs: private by default; per-bucket public-read toggle; per-key ACL not exposed in v1 (KISS).
- Versioning: optional, off by default.
- Lifecycle: TTL rules (e.g., delete after 30d), transition to "cold" tier (phase 2).

## Credentials model
- Per-org "root" access key shown once on bucket creation.
- Per-app IAM-style key created automatically when an app binds a bucket; scoped to that bucket only.
- Keys are pairs `(access_key, secret_key)`; secret stored hashed in our DB and once-shown to user.
- Key rotation supported.

## API compatibility
- Targets AWS S3 API v4 signature compatibility — most SDKs (aws-sdk, boto3, minio-go) work unchanged.
- Endpoint: `https://s3.<region>.absolo.app`.
- Path-style + virtual-hosted-style both supported.
- Presigned URLs supported (default 7-day max).

## Domain model
```
Bucket { id, org_id, project_id, region, name, slug, public_read, versioning, created_at }
BucketLifecycleRule { id, bucket_id, prefix, expire_days, transition_days, transition_class }
AccessKey { id, owner_kind:'org'|'app', owner_id, scope:'org'|'bucket', bucket_id?, access_key, secret_hash, created_at, last_used_at }
ObjectStats { bucket_id, hour, bytes_stored_avg, bytes_egress, requests }
```

## Pricing
- **Storage**: $/GB-month prorated hourly (sampled every 5 min).
- **Egress**: $/GB; bundled allowance per plan; in-region intra-platform egress to apps free.
- **Operations**: $/1000 PUT/GET/etc. — kept ultra-low (most user-facing PaaS hide this; DigitalOcean Spaces baked it into a flat fee). Decision: **bundle** ops into a flat per-bucket monthly minimum (e.g., $5/mo includes 250GB + reasonable ops).

## Lifecycle of objects
- Standard tier only at v1.
- Phase 2: cold tier (lower cost, higher retrieval), erasure-coded long-term.

## Public web hosting from bucket (phase 1.5)
- Toggle "Static website" on a bucket → renders index.html on root, supports custom domain via our DNS/SSL flow.
- Effectively a "Spaces"-like static site host.

## Security
- Encryption at rest: SeaweedFS volume-level encryption with key from Vault (per-org KEK + per-bucket DEK is phase 2; v1 = region-wide DEK rotated quarterly).
- Encryption in transit: HTTPS only.
- Server-side encryption with customer-supplied keys (SSE-C) — phase 2.
- Bucket policy: simple toggles in v1, full IAM-style policies — phase 2.
- Audit log for `PutBucketPolicy`, `DeleteBucket`, `PutObject` (last sampled).

## Backup & DR
- Cross-region replication: opt-in per bucket (phase 1.5); replication lag visible.
- Volume-level snapshot to age-encrypted offsite via restic (weekly) — admin-only.

## Quotas
- Per-plan total bucket storage cap (overage allowed but priced).
- Max buckets per org.
- Max object size 5TB (matches S3).

## Observability
- Per-bucket metrics: bytes stored, requests, errors, bandwidth.
- Live in dashboard.

## API surface (excerpt — control plane)
```
POST /v1/projects/:projectId/buckets
GET  /v1/buckets/:id
PUT  /v1/buckets/:id/lifecycle
POST /v1/buckets/:id/access-keys
DELETE /v1/buckets/:id/access-keys/:keyId
GET  /v1/buckets/:id/objects?prefix=...
```
(Object operations themselves go through the S3 gateway, not control plane.)

## Tests
- S3 conformance suite (e.g., `s3-tests` from Ceph project) — must pass core suite.
- Failure injection: volume node loss with replication enabled.
- Performance: small-object throughput, large-file multipart upload.

## Open items
- CDN integration: do we offer a managed CDN over buckets (phase 2 — self-hosted Pelican/Bunny).
- Storage class for image transformation on the fly (phase 2).
