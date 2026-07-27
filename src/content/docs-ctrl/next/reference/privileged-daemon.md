---
title: Privileged Operation Daemon
order: 2
---

Rugix Ctrl can separate its command-line interface from operations that require
root privileges. A privileged `rugix-ctrl daemon` process listens on a Unix
socket, while an unprivileged `rugix-ctrl` process forwards supported typed
operations to it. When Rugix Ctrl itself runs as root, it executes the same
operations directly.

The socket protocol is an internal implementation detail. Integrations should
continue to invoke Rugix Ctrl's command-line interface rather than connect to
the socket directly.

## Configuration

The daemon reads `/etc/rugix/daemon.toml`:

```toml title="/etc/rugix/daemon.toml"
socket-path = "/run/rugix/ctrl.sock"
dangerously-insecure = false

[features]
factory-reset = true
system-commit = true
system-reboot = true
app-lifecycle = true
```

Status queries and system or application installation are available without
feature flags. Additional operation families are disabled by default:

- `factory-reset` permits `rugix-ctrl state reset`.
- `system-commit` permits `rugix-ctrl system commit`.
- `system-reboot` permits explicit reboot commands and explicit update modes
  that request a reboot. It does not prevent a bundle's default post-install
  reboot behavior when `--reboot` is omitted.
- `app-lifecycle` permits starting, stopping, activating, deactivating, rolling
  back, removing, and garbage collecting applications.

The daemon applies these checks before invoking the canonical local operation
implementation.

## Effective Policy

Clients can query the policy enforced by the running daemon through Rugix
Ctrl's public command-line interface:

```sh
rugix-ctrl daemon info --json
```

The output reports `dangerouslyInsecure` and the effective state of every
optional operation family. The command queries the running daemon over its Unix
socket, so clients do not need to read or interpret `daemon.toml` themselves.
The socket protocol remains an internal implementation detail.

## Installation Security

An unprivileged caller cannot select its own trust policy by default. The daemon
rejects explicit bundle hashes, explicit root certificates, verification
bypasses, missing-block-index overrides, and compatibility-check bypasses.
Configured certificate roots from `/etc/rugix/ctrl.toml` remain available
because the daemon loads them itself.

Development systems can opt into those overrides:

```toml title="/etc/rugix/daemon.toml"
dangerously-insecure = true
```

This setting only changes daemon admission. A privileged Rugix Ctrl invocation
continues to support the existing command-line overrides directly.

## Process Supervision

The daemon runs in the foreground and owns its socket, so it does not depend on
systemd or socket activation:

```sh
rugix-ctrl daemon
```

A supervisor may start it with root as its user and the intended client group
as its effective group. The daemon creates its socket with mode `0660`; socket
ownership therefore determines which local processes may request privileged
operations.
