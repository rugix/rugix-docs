---
title: Security Model
order: 2
---

Rugix Admin is an administrative interface for a single device. Treat access to
its web service as access to manage that device: the HTTP API does not
authenticate clients, and every reachable client can request the operations
that the device permits.

Rugix Admin limits the effect of those requests through process separation and
the Rugix Ctrl daemon's policy. This protects privileged device operations from
an unprivileged service, but it does not replace network access control.

## Trust Boundaries

A request crosses three boundaries:

1. A browser calls Rugix Admin's HTTP API. The API has no built-in
   authentication or transport encryption.
2. Rugix Admin invokes `rugix-ctrl` as an unprivileged user. The installed
   service receives access to the daemon socket through the `rugix-daemon`
   system group.
3. The privileged Rugix Ctrl daemon validates the request against its effective
   policy before running the operation as root.

The daemon is the authorization boundary. Hiding a control in the web interface
is useful operator feedback, not a security control: a client can call the HTTP
API directly, and the daemon must still reject operations that are not enabled.
Rugix Admin queries the running daemon's effective policy instead of relying on
a local copy of its configuration.

Root users and processes that can access the daemon socket are outside this
boundary. They can invoke Rugix Ctrl directly or request every operation allowed
by the daemon.

## Privileged Operation Policy

The daemon reads `/etc/rugix/daemon.toml`. Status queries and signed system or
application installations are always available. Additional operation families
are disabled by default and can be enabled independently:

| Setting         | Operations                                                                              |
| --------------- | --------------------------------------------------------------------------------------- |
| `factory-reset` | Reset persistent state.                                                                 |
| `system-commit` | Commit the active system.                                                               |
| `system-reboot` | Request explicit reboots and explicit update modes that reboot.                         |
| `app-lifecycle` | Start, stop, activate, deactivate, roll back, remove, and garbage collect applications. |

Enable only the operation families required by the deployment. See the
[Privileged Operation Daemon](/docs/ctrl/reference/privileged-daemon) reference
for the complete configuration and the exact behavior of each setting.

## Bundle Verification

In its default mode, the daemon controls the bundle trust policy. An
unprivileged caller cannot provide its own root certificate, pin an explicit
bundle hash, bypass signature verification, allow a missing block index, or
skip compatibility checks. The daemon loads the configured certificate roots
itself.

Setting `dangerously-insecure = true` in `/etc/rugix/daemon.toml` admits those
caller-controlled overrides. Rugix Admin then exposes the corresponding options
and displays a red notice on every page. This mode is intended only for local
development; it weakens the checks that separate an uploaded bundle from
trusted, compatible software.

Do not use `dangerously-insecure` to solve certificate or compatibility errors
in production. Correct the bundle, trust configuration, or compatibility
metadata instead.

## Network Exposure

Rugix Admin does not decide who may be an operator. It assumes that network
reachability has already established that trust. The default installation
listens on all interfaces and does not add firewall rules, so a client that can
reach port `7492` can request every capability available to the service.

For a production deployment:

- Bind Rugix Admin to a trusted management interface or to loopback when only a
  local proxy needs access.
- Restrict port `7492` with the device firewall or an isolated management
  network.
- Put authenticated, encrypted access in front of Rugix Admin when operators
  connect across an untrusted network.
- Restrict membership of the `rugix-daemon` group to the intended service
  accounts.
- Keep `dangerously-insecure` disabled and enable only the required daemon
  operation families.
- Protect `/etc/rugix/admin.toml`, `/etc/rugix/daemon.toml`, and Rugix Ctrl's
  trust configuration from unprivileged modification.

The red insecure-mode notice should be treated as a deployment blocker outside
development systems.
