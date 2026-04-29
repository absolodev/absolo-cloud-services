# 21 — Snapshots & Backups

The Sites-mode counterpart to App-mode versioning: point-in-time snapshots of persistent volumes (and bound managed DBs) for disaster recovery, accidental-delete protection, and pre-upgrade safety nets.

## What gets snapshotted
- **Sites**: the entire persistent volume (Longhorn snapshot) + bound managed DB (engine-specific snapshot).
- **Managed DBs (standalone)**: handled in `14-managed-databases-d1e00e.md`.
- **Apps mode**: typically stateless; backups are immutable releases (see `22-versioning-rollback-d1e00e.md`). Optional bound resources (DB, bucket) are backed up by their own services.

## Mechanism
- **Longhorn snapshots** are pointer-based, copy-on-write — fast and storage-cheap as long as data doesn't churn massively.
- **Restic** ships snapshots offsite (encrypted with `age`, key in Vault) to dedicated backup buckets cross-region.
- For DB snapshots: Postgres uses `pg_basebackup` + WAL; MySQL uses XtraBackup; coordinated with site-app pause so snapshots are consistent.

## Schedules
- Default per Sites template: daily snapshot, retain 7.
- Configurable: hourly/daily/weekly with retention counts (per plan caps).
- Retention enforced by garbage collector daily.

## Consistent snapshots
- For single-PV templates: pause writers (signal app to flush), Longhorn snapshot, resume — typical pause ~1s.
- For PV + DB: orchestrate "freeze → pg/mysql snapshot → PV snapshot → resume".
- Application-aware hooks (template-defined): WordPress runs `wp maintenance-mode activate` then `--deactivate` around snapshot.

## Restore
- Restore creates a NEW PV from the snapshot, swaps the StatefulSet PVC reference, restarts the pod.
- For DB-bound sites: restore DB to matching point first.
- "Preview restore" mode: spins up the snapshot in a sandbox with a temp URL so user can verify before swapping.

## Cross-region replication (phase 1.5)
- Opt-in per site or per backup policy.
- Daily replication via restic to remote bucket.
- Restore from remote possible within hours (data egress involved).

## On-demand snapshots
- "Take snapshot" button: instant, surfaced in UI; bypasses schedule retention rules.
- Pre-upgrade safety: every template upgrade auto-takes a snapshot first; restore button visible if upgrade fails.

## Disaster recovery
- Cold-disaster: full-region loss → restore from cross-region replicas; documented runbook in admin.
- Warm-disaster: host loss → Longhorn restores volume from replicas automatically (no snapshot needed).

## Domain model
```
Snapshot { id, site_id, kind:'auto'|'manual'|'pre_upgrade', longhorn_snap_id, db_snapshot_ref?,
           bytes, started_at, completed_at, status, retention_until, parent_snapshot_id }
SnapshotPolicy { site_id, schedule_cron, retain_count, cross_region:bool, max_size_gb }
RestoreJob { id, snapshot_id, target_kind:'overwrite'|'preview', new_pv_id?, status, started_at, completed_at }
```

## Storage billing
- Snapshot storage billed at $/GB-month (lower than primary storage tier).
- Cross-region replication adds an egress + storage fee.
- "How much will my snapshots cost?" estimator in dashboard.

## Garbage collection
- Daily GC keeps the latest N snapshots per policy and any explicitly pinned ones.
- Out-of-policy snapshots retained for `retention_until` then purged.
- Restic prune runs weekly to actually free space.

## API surface
```
POST /v1/sites/:id/snapshots
GET  /v1/sites/:id/snapshots
POST /v1/sites/:id/snapshots/:snapId/restore
POST /v1/sites/:id/snapshots/:snapId/preview-restore
DELETE /v1/sites/:id/snapshots/:snapId
PUT  /v1/sites/:id/snapshot-policy
```

## Tests
- Snapshot/restore round-trip drills weekly in a staging cluster.
- Time-to-restore SLO: < 5 minutes for sites < 10 GB.
- Restic encryption verified (random sampling).

## Operational notes
- Snapshot windows scheduled to avoid peak: 02:00-06:00 region-local.
- Concurrent snapshot cap per host to avoid I/O storms.
- Alert on backup failure or replication lag > 24h.

## Open items
- File-level restore (granular item recovery for WP files) — phase 2.
- Continuous protection (5-minute RPO) — phase 2 enterprise.
