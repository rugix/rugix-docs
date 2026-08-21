---
title: Installation
description: Add Rugix Admin to a system image with Rugix Bakery or Yocto.
order: 2
---

Install Rugix Admin as part of the system image whenever possible. This keeps
the interface and its service definition versioned with the rest of the device
software. Rugix provides integrations for Rugix Bakery and Yocto; a standalone
installer is also available for evaluating Rugix Admin on an existing system.

## Install with Rugix Bakery

### Prerequisites

You need a [Rugix Bakery project](/docs/bakery/projects) whose system uses
systemd. If you are starting a new project, follow the
[Rugix Bakery getting-started guide](/docs/bakery) first.

### Add Rugix Admin to a System Image

Add the `rugix-extra` repository to `rugix-bakery.toml`:

```toml title="rugix-bakery.toml"
[repositories]
rugix-extra = { git = "https://github.com/rugix/rugix-extra.git", branch = "v0.9" }
```

For production builds, pin the repository to a known revision with `rev`. See
[Repositories](/docs/bakery/repositories) for the available version selectors.

Apply the Rugix Admin and privileged Rugix Ctrl daemon recipes in the layer used
by your system:

```toml title="layers/customized.toml"
recipes = [
    "core/rugix-ctrl-daemon",
    "rugix-extra/rugix-admin",
]
```

The daemon recipe installs the privileged service required by Rugix Admin. See
[Configuration](../configuration) to select the available operations.

Build the system image as usual:

```sh
./run-bakery bake image <system>
```

Install the resulting image through your normal provisioning workflow.

## Install with Yocto

For a Yocto image that already integrates Rugix Ctrl, use the official
[`meta-rugix`](https://github.com/rugix/meta-rugix) layer and add Rugix Admin
to the image:

```bitbake title="conf/local.conf"
IMAGE_INSTALL:append = " rugix-admin"
```

The recipe builds Rugix Admin and its embedded browser interface from a pinned
source revision. It also pulls in the privileged Rugix Ctrl daemon. Both
systemd services are enabled automatically.

Rugix Admin listens on the loopback interface by default. The daemon also uses
safe policy defaults: installation and status queries are available, while
optional operation families remain disabled until explicitly enabled. Follow
the [Yocto integration guide](/docs/ctrl/integration/build-systems/yocto) to
integrate Rugix Ctrl and see [Configuration](../configuration) before exposing
the interface or enabling additional operations.

## Open the Interface

Rugix Admin listens on the device's loopback interface by default. From the
device, open:

```text
http://127.0.0.1:7492/
```

To connect from another machine, first choose a trusted listen address as
described in [Configuration](../configuration#listen-address).

Check the service and follow its logs with:

```sh
systemctl status rugix-admin.service
journalctl -u rugix-admin.service -f
```

:::caution
Rugix Admin does not provide authentication or TLS. Do not expose port `7492`
to an untrusted network. Read the [secure deployment guidance](../security)
before deploying the service in production.
:::

## Install on an Existing System

For evaluation on an existing system, the Rugix Admin repository also provides
a standalone installer. It supports Debian-based systems with `apt-get` and
systemd on x86-64, 64-bit Arm, and 32-bit Arm devices.

Before using it, make sure that:

- the device uses systemd and has `apt-get` available;
- the device can download release assets from GitHub; and
- you have root access to install binaries and system services.

Download the installer from the Rugix Admin repository and inspect it before
running it as root:

```sh
curl -fL https://raw.githubusercontent.com/rugix/rugix-admin/main/installer/install-rugix-admin.sh \
  -o install-rugix-admin.sh
less install-rugix-admin.sh
sudo bash install-rugix-admin.sh
```

The installer downloads the latest stable release by default. Pass an exact
release tag as the first argument to install a specific version:

```sh
sudo bash install-rugix-admin.sh v0.5.0-rc.1
```

Set `RUGIX_CTRL_VERSION` to an exact tag or a stable major-version selector
when the installer also needs to install Rugix Ctrl. It defaults to `v1`:

```sh
sudo env RUGIX_CTRL_VERSION=v1.3.0 \
  bash install-rugix-admin.sh v0.5.0-rc.1
```

The installer then:

1. installs the latest stable Rugix Ctrl 1.x Debian package when `rugix-ctrl`
   is not already installed;
2. installs the `rugix-admin` binary at `/usr/bin/rugix-admin`;
3. creates the `rugix-daemon` system group when needed;
4. creates `/etc/rugix/daemon.toml` with the Rugix Admin operation families
   enabled when that file does not already exist;
5. installs and enables `rugix-ctrl-daemon.service` and
   `rugix-admin.service`; and
6. starts both services.

An existing `rugix-ctrl` installation and `/etc/rugix/daemon.toml` are
preserved. The existing binary must provide the `rugix-ctrl daemon` command.
The controls visible in Rugix Admin reflect the policy that was already
configured on the device.
