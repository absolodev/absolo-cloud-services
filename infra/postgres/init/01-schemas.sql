-- Auto-loaded by the official postgres image at first boot.
-- Creates the per-module schemas the control plane expects and grants the
-- application user usage on each.
--
-- Production runs CloudNativePG with manual schema migrations; this script is
-- only for local development convenience.
--
-- NOTE: schemas owned by Drizzle migrations (currently `iam` and `projects`)
-- are intentionally NOT created here — `drizzle-kit generate` emits plain
-- `CREATE SCHEMA "..."` statements that would collide with `IF NOT EXISTS`
-- pre-creates. As more modules come online (billing, versioning, …) and adopt
-- Drizzle, drop them from this list too.

CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS versioning;
CREATE SCHEMA IF NOT EXISTS orchestrator;
CREATE SCHEMA IF NOT EXISTS dns;
CREATE SCHEMA IF NOT EXISTS ssl;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS outbox;

GRANT USAGE, CREATE ON SCHEMA billing, versioning, orchestrator, dns, ssl, audit, outbox TO PUBLIC;
