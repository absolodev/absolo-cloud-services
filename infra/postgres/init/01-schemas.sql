-- Auto-loaded by the official postgres image at first boot.
-- Creates the per-module schemas the control plane expects and grants the
-- application user usage on each.
--
-- Production runs CloudNativePG with manual schema migrations; this script is
-- only for local development convenience.

CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS projects;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS versioning;
CREATE SCHEMA IF NOT EXISTS orchestrator;
CREATE SCHEMA IF NOT EXISTS dns;
CREATE SCHEMA IF NOT EXISTS ssl;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS outbox;

GRANT USAGE, CREATE ON SCHEMA iam, projects, billing, versioning, orchestrator, dns, ssl, audit, outbox TO PUBLIC;
