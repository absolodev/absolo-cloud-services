# 10 — Host Agent (Rust)

A small, hardened Rust binary installed on every customer-supplied server that joins it to the platform: bootstraps k3s, reports telemetry, brokers Web SSH exec sessions, and acts as the only privileged surface the control plane reaches.

## Why a custom agent
- We need a single, signed, audited binary per host: easier to reason about than installing k3s + custom-script glue.
- We need outbound-only connectivity (no inbound from internet) for security: agent dials home over mTLS gRPC.
- We can ship a single static binary (musl) that runs anywhere modern Linux + systemd.

## Responsibilities
1. **Bootstrap**: install/upgrade k3s, configure CNI (Cilium), join the regional cluster, label/taint the node.
2. **Health & telemetry**: emit CPU, memory, disk, network, kernel info, k3s readiness.
3. **Lifecycle**: drain, cordon, decommission gracefully on command.
4. **Web SSH proxy**: receive WebSocket-tunneled exec requests from `web-ssh-gateway` over the existing mTLS gRPC stream and proxy to the right pod via local kubelet.
5. **Log shipping**: tail container stdout/stderr (via Vector compiled-in or external process) and ship to regional log aggregator.
6. **Patch management**: apply approved kernel/userspace patches on a maintenance window.
7. **Self-update**: download new agent versions over signed channel, swap in via systemd, verify, roll back on failure.

## Process model
- Single static `absolo-agent` binary, run by systemd as `absolo` user (NOT root) with explicit Linux capabilities (`CAP_NET_ADMIN`, `CAP_SYS_ADMIN` only when bootstrapping k3s; dropped after).
- Subprocesses for k3s and Vector are managed as children with health checks.
- IPC with k3s via local kubelet socket where allowed.

## Communication
- **Long-lived bidi gRPC stream** to `host-agent-control` endpoint in control plane.
- mTLS with **per-host certificate** issued at install time (90-day rotation, automated).
- Auth: cert pinning + signed JWT challenge per command.
- **No inbound ports** required from the public internet (only outbound 443).

## Install flow
- Operator runs in admin: "Generate install command for region X".
- Output is a one-liner:
  ```
  curl -sSL https://install.absolo.cloud/agent.sh | INSTALL_TOKEN=eyJ... sh
  ```
- Script:
  1. Verifies CPU arch + OS version + minimum kernel.
  2. Downloads agent binary, verifies cosign signature against bundled public key.
  3. Creates `absolo` user, drops binary in `/usr/local/bin/absolo-agent`.
  4. Installs systemd unit, drop-in for resource limits.
  5. Writes initial config to `/etc/absolo/agent.toml` with the install token.
  6. Starts agent → agent exchanges install token for permanent mTLS cert + joins cluster.
  7. Reports back; admin sees host as `online`.

## On-host layout
```
/etc/absolo/
  agent.toml                # config (control plane URL, region, labels)
  certs/
    client.crt, client.key  # rotated automatically
    ca.crt
/var/lib/absolo/
  cache/, state/, logs/
/var/log/absolo/agent.log
/usr/local/bin/absolo-agent
/etc/systemd/system/absolo-agent.service
```

## gRPC surface (control plane → agent)
```protobuf
service HostAgent {
  rpc Heartbeat(stream HeartbeatRequest) returns (stream HeartbeatResponse);
  rpc Drain(DrainRequest) returns (DrainResponse);
  rpc Decommission(DecommissionRequest) returns (DecommissionResponse);
  rpc OpenExec(stream ExecFrame) returns (stream ExecFrame);   // bidi for Web SSH
  rpc UpgradeAgent(UpgradeRequest) returns (UpgradeResponse);
  rpc UpgradeK3s(K3sUpgradeRequest) returns (K3sUpgradeResponse);
  rpc Diagnostics(DiagRequest) returns (DiagResponse);
}
```

All RPCs are wrapped in **Heartbeat tunnel**: agent dials in once, server multiplexes commands over the same stream — works through NATs/firewalls without inbound ports.

## Security
- mTLS with cert pinning; refuse any cert not issued by our internal CA.
- Per-command HMAC over `(host_id, command_id, payload)` using session key derived from cert exchange.
- All commands logged locally (append-only journald) and shipped to control-plane audit.
- Capability drop: agent only retains capabilities it needs at any moment; uses `prctl(PR_SET_NO_NEW_PRIVS)`.
- AppArmor / SELinux profiles bundled.
- Tamper detection: agent verifies its own binary hash on each start; refuses to run if mismatched.
- Self-destruct: on `Decommission` command, agent removes platform pods, leaves k3s, wipes `/var/lib/absolo/state`, optionally uninstalls k3s, sends final heartbeat, exits.

## Observability
- Agent exposes Prometheus-format metrics on `127.0.0.1:9090` (loopback only).
- log-shipper reads `/var/log/absolo/agent.log` and ships.

## Versioning & upgrades
- Agent version is part of every heartbeat; admin sees fleet version distribution.
- Phased rollouts: pick % of hosts, watch error rate, advance.
- Rollback: keep previous binary; on health check failure, switch back automatically.

## Testing
- Unit tests in Rust (`cargo test`).
- Integration tests in a Vagrant or LXC test fleet.
- Chaos tests: kill k3s while agent runs; pull network; full reboot mid-saga.

## Open items
- Whether to support BSD or only Linux at launch — Linux only.
- ARM64 + AMD64 from day 1 (yes, both built).
