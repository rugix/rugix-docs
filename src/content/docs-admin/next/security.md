---
title: Secure Deployment
description: Control access to Rugix Admin and deploy it safely.
order: 4
---

Rugix Admin is an administrative interface without built-in authentication or
TLS. Treat anyone who can reach it as a device operator: they can request every
action that Rugix Ctrl permits.

:::danger
Do not expose Rugix Admin directly to the public Internet or another untrusted
network.
:::

## Control Network Access

Rugix Admin listens on the loopback interface by default. If operators need to
connect from another machine, choose an exposure model that matches how the
device will be operated:

- On a trusted management network, bind Rugix Admin to that network's interface
  and restrict port `7492` with the device firewall.
- For access through another service on the device, bind Rugix Admin to
  loopback and place an authenticated TLS proxy in front of it.
- For development and field service, connect through a local or otherwise
  isolated network that is available only to the operator.

Configure the listen address as described in
[Configuration](../configuration#listen-address).

## Limit Available Actions

Rugix Admin presents the actions allowed by the Rugix Ctrl daemon. Enable only
the actions required for the device's operational workflow. Do not rely on a
hidden or disabled control in the browser as an access restriction.

Configure and review the policy using Rugix Ctrl's
[Privileged Operation Daemon](/docs/ctrl/reference/privileged-daemon)
documentation. It is the authoritative reference for available operations,
configuration, defaults, and local access to the daemon.

## Keep Update Verification Enforced

Rugix Admin displays a red security notice when Rugix Ctrl allows callers to
override update verification and compatibility safeguards. This mode is useful
for local development, but it must not be enabled on production devices.

If an update fails verification or compatibility checks, correct the bundle,
trust configuration, or compatibility metadata. Do not weaken the checks to
make the installation proceed. Rugix Ctrl documents the relevant setting and
its effect under
[Installation Security](/docs/ctrl/reference/privileged-daemon#installation-security).

## Protect Device Configuration

Prevent unprivileged users and services from modifying Rugix Admin's listen
configuration, the Rugix Ctrl daemon policy, or Rugix Ctrl's update trust
configuration. Review these protections whenever the device image, network
topology, or operator access model changes.
