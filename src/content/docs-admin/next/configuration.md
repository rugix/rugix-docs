---
title: Configuration
description: Configure Rugix Admin's listen address, allowed hosts, and available operations.
order: 3
---

Rugix Admin's configuration controls how the web service listens for
connections. Rugix Ctrl's daemon policy controls which device operations are
available through the interface.

## Listen Address

Rugix Admin reads `/etc/rugix/admin.toml` at startup. It listens on
`127.0.0.1:7492` when this file is absent. To accept connections from another
machine, bind it to the address of a trusted management interface:

```toml title="/etc/rugix/admin.toml"
address = "192.0.2.10:7492"
```

Replace the example address with one assigned to the device. Binding to
`0.0.0.0:7492` exposes Rugix Admin through every network interface and should
only be used when those paths are appropriately restricted.

For a system built with Rugix Bakery, include this file through a
[project-specific recipe](/docs/bakery/recipes). For Yocto, install it from a
distribution-specific recipe or `.bbappend`. Otherwise, update it on the device
and restart the service:

```sh
sudo systemctl restart rugix-admin.service
```

Unknown fields and invalid values prevent the service from starting instead of
being ignored.

The `--address` command-line option takes precedence over `admin.toml`. When
using the standalone installer, set `RUGIX_ADMIN_ADDRESS` to add this override
to the installed systemd unit:

```sh
sudo env RUGIX_ADMIN_ADDRESS=127.0.0.1:7492 \
  bash install-rugix-admin.sh
```

## Allowed Hosts

The upcoming Rugix Admin release accepts requests addressed to IPv4 and IPv6 literals or
`localhost` by default. To open it at `http://device.local:7492/`, add the
host name without its port to `/etc/rugix/admin.toml` and restart
`rugix-admin.service`:

```toml title="/etc/rugix/admin.toml"
allowed-hosts = ["device.local"]
```

Keep your existing `address` setting. The name must resolve to a device or
proxy that can reach Rugix Admin. Requests addressed to unlisted host names
return HTTP `421`. On NixOS, set `services.rugix-admin.allowedHosts` to the
list of names instead. Rugix Admin 0.6.0 and earlier reject the
`allowed-hosts` setting at startup.

## Available Operations

Enable only the operations required for the device's workflow. The controls
available in Rugix Admin follow the policy enforced by the Rugix Ctrl daemon.

Use Rugix Ctrl's
[Privileged Operation Daemon](/docs/ctrl/reference/privileged-daemon)
documentation as the authoritative reference for configuration, defaults, and
the effect of each policy setting.
