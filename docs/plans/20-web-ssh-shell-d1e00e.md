# 20 — Web SSH (Browser Terminal into Containers)

A secure browser-based shell into any of the user's containers — without ever exposing direct SSH access to hosts. Wraps `kubectl exec` semantics in a WebSocket bridge with policy checks and full session recording.

## Architecture
```
Browser (xterm.js)  ──TLS WebSocket──▶  web-ssh-gateway (Rust)
                                              │
                                              │  authn: short-lived session token
                                              │  authz: actor has shell:exec on app
                                              ▼
                                       Pick replica & host
                                              │
                                              │  outbound only: gRPC bidi over existing
                                              ▼  host-agent stream
                                       host-agent (Rust)
                                              │
                                              ▼
                                       kubelet exec → container PTY
```

## Why this design
- Users get a real shell; we never expose SSHd on hosts.
- Mirrors how Kubernetes native exec works but adds: per-tenant scoping, session recording, idle timeout, and policy.
- Fits the "outbound-only host-agent" model already in place.

## Components
- **web-ssh-gateway** (Rust + Axum + Tokio + tungstenite): WebSocket server, validates session token, looks up target replica, opens stream to host-agent, multiplexes input/output frames.
- **xterm.js** widget in dashboard: terminal emulator with paste guard (warn on multi-line paste), font picker, transcript download.
- **host-agent**: existing component (`10-…`); adds `OpenExec` RPC.

## Session lifecycle
1. User clicks "Open shell" on an app/replica.
2. Frontend requests `/v1/apps/:id/replicas/:rid/shell-token` from control plane.
3. Control plane checks `shell:exec` permission, plan tier (Hobby+ allowed; explicit per-replica policy possible), audits, returns a 5-minute session token.
4. Frontend opens `wss://shell.<region>.absolo.app/v1/shell?token=...` with xterm.js.
5. Gateway validates token (signed PASETO), starts session (record start in DB).
6. Gateway calls host-agent `OpenExec(replica_id, command, tty=true, env=...)` over the existing mTLS gRPC stream.
7. Host-agent uses local kubelet exec to spawn a process in the container.
8. Bidi byte streams: terminal input ↔ container PTY.

## Defaults
- Default command: `bash` if available; `sh` else; user can request a specific command.
- TTY size: synced to xterm dimensions on resize.
- Env: minimal (PATH, TERM, no platform secrets unless user-configured).

## Limits & policies
- Idle timeout: 15 min, surfaced as a warning at 13 min, auto-close at 15.
- Max session duration: 4h (extendable by re-establishing).
- Concurrent sessions per user: 5.
- Disabled by default for templates that have admin web UIs (WP, Ghost) — opt-in to reduce footguns.
- File write protection mode: read-only PV mount option for some commands (phase 2).

## Session recording
- Every shell session is recorded (asciinema-compatible cast format) and stored in ClickHouse + cold S3 bucket for 90 days.
- Recordings accessible to the user (download from dashboard) and admin (audit).
- Surface a clear notice on session start: "This session is recorded for security purposes."

## Security
- Tokens are session-bound, single-use to open one stream, expire 5 min after issue.
- Session token includes claims: `actor`, `org`, `app`, `replica`, `expires`.
- All network traffic mTLS.
- No tunneling allowed — gateway scans early bytes for known SSH/Telnet handshake patterns and rejects.
- Rate limit: 10 session opens per minute per user.
- Container egress unchanged (the user only sees what their app already has access to).

## Failure modes
- Replica gone mid-session: gateway closes WS with reason code; UI offers "open shell on another replica".
- Host-agent disconnect: gateway reconnects with linear backoff; if not reachable in 5s, close.
- WebSocket pause for >30s: server pings; on no pong, close.

## File transfer (phase 1.5)
- Drop-in `absolo-cp` command (or browser file picker) using xterm escape sequences for OSC52 clipboard + a small upload endpoint.
- For Sites mode: dedicated SFTP-like file browser UI (separate from shell) — `02-customer-dashboard-d1e00e.md`.

## API surface
```
POST /v1/apps/:id/replicas/:rid/shell-token
WS   /v1/shell?token=...
GET  /v1/apps/:id/shell-sessions
GET  /v1/shell-sessions/:id/recording.cast
```

## Domain model
```
ShellSession { id, actor_id, app_id, replica_id, host_id, started_at, ended_at, ip, ua, recording_url, byte_count }
```

## Tests
- E2E: open shell, run `whoami`, `ls`, `exit`; verify recording.
- Security: token reuse rejected, expired token rejected, cross-tenant token rejected.
- Chaos: kill host-agent mid-session; recover or fail cleanly.

## Open items
- "Run command" non-interactive mode (`absolo-cli run --app ... -- bash -c "..."`) — same plumbing.
- Multi-tab persistent terminal — phase 2 (tmux-like via gateway).
