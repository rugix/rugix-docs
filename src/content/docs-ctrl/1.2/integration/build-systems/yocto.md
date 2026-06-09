---
title: Yocto
order: 20
---

The open-source [`meta-rugix`](https://github.com/silitics/meta-rugix) layers integrate Rugix Ctrl into a [Yocto](https://www.yoctoproject.org/)-based distribution.

## Supported Yocto Versions

`meta-rugix` officially supports Yocto LTS releases until their Yocto Project EOL. Non-LTS Yocto releases are not supported. Yocto LTS releases past EOL are not further maintained and won't receive any bug fixes. Each maintained Yocto LTS line has a matching `meta-rugix` branch.

The currently supported Yocto releases are:

| Yocto release | `meta-rugix` branch | Yocto EOL |
| --- | --- | --- |
| 6.0 _Wrynose_ | `wrynose` | April 2030 |
| 5.0 _Scarthgap_ | `scarthgap` | April 2028 |

## Core Layer

The `meta-rugix-core` core layer provides Rugix Ctrl, Rugix Bundler for native bundle generation, core configuration recipes, package groups, and the Rugix bundle image types.

Enable the core Rugix package group by adding `rugix` to `DISTRO_FEATURES`:

```bitbake title="conf/local.conf"
DISTRO_FEATURES:append = " rugix"
```

### Bundle Image Type

The `image-type-rugixb` class lets a Yocto image recipe produce a Rugix update bundle from the same image definition used to build the target disk image. This keeps the update artifact tied to the image's WIC partition layout and avoids maintaining a separate bundle recipe for the common case.

Add `rugixb` and `rugixb.hash` to `IMAGE_FSTYPES` in your image recipe or `local.conf`:

```bitbake
IMAGE_FSTYPES = "tar.bz2 wic wic.bmap rugixb rugixb.hash"
```

The build then deploys:

- `<image>.rugixb`: the update bundle.
- `<image>.rugixb.hash`: the bundle hash produced by `rugix-bundler hash`.

The `RUGIX_SLOTS` variable tells the `rugixb` image type which payloads to place in the bundle and which Rugix slot each payload updates. Payloads are taken from the WIC build output or from files in the deploy directory according to this mapping, so most  projects do not need a separate bundle recipe. The value is a space-separated list of `slot:source` entries. Supported source forms are:

- `slot:N`: copy WIC partition number `N` from the current image build.
- `slot:file:relative/path`: copy `DEPLOY_DIR_IMAGE/relative/path`.
- `slot:file:/absolute/path`: copy an absolute path.

Examples:

```bitbake
RUGIX_SLOTS:rpi ?= "boot:2 system:4"
RUGIX_SLOTS:qemuarm64 ?= "system:2"
RUGIX_SLOTS:imx-nxp-bsp ?= "boot:file:${IMGDEPLOYDIR}/${IMAGE_LINK_NAME}.boot.img system:file:${IMGDEPLOYDIR}/${IMAGE_LINK_NAME}.ext4.verity"
```

The bundle is not signed. Sign it after the build with Rugix Bundler when your devices enforce signed updates. Use the `.hash` file with [`rugix-ctrl update install --bundle-hash`](../../../updates/update-bundles#installing-a-bundle) when the hash is distributed through a trusted channel separate from the bundle.

### Bundle Class

Use the `rugix-bundle` class when the bundle is built by a separate recipe instead of directly by the image recipe. This is useful for assembling bundles explicitly.

```bitbake title="update-bundle-minimal.bb"
inherit rugix-bundle

RUGIX_BUNDLE_PAYLOADS = "boot system"

RUGIX_PAYLOAD_boot[image] = "core-image-minimal"
RUGIX_PAYLOAD_boot[partition] = "2"

RUGIX_PAYLOAD_system[image] = "core-image-minimal"
RUGIX_PAYLOAD_system[partition] = "4"
```

`RUGIX_BUNDLE_PAYLOADS` is a space-separated list of payload names. Configure each payload through `RUGIX_PAYLOAD_<name>` flags:

| Flag | Required | Description |
| --- | --- | --- |
| `image` | Required for partition payloads | Image recipe whose deployed WIC partition should be used. |
| `partition` | Required for partition payloads | WIC partition number to copy from the image. |
| `file` | Required for file payloads | File in `DEPLOY_DIR_IMAGE` to copy directly. |
| `slot` | No | Rugix update slot for the payload. Defaults to the payload name. |

The class deploys `<bundle-name>.rugixb` and `<bundle-name>.rugixb.hash` and creates stable symlinks based on `RUGIX_BUNDLE_LINK_NAME`. The bundle is not signed; sign it after the build with [Rugix Bundler](../../../updates/signed-updates#signing-bundles).

### Core Recipes

- `rugix-ctrl`: builds and installs `/usr/bin/rugix-ctrl` for the target image. Versioned recipes pin Rugix Ctrl releases; `_git` recipes are development-only and use `AUTOREV`.
- `rugix-bundler-native`: builds and installs the native `rugix-bundler` tool used by `rugixb`, `rugixb.hash`, and `rugix-bundle`.
- `rugix-bootstrapping-conf`: installs `/etc/rugix/bootstrapping.toml`. BSP layers usually override the file with a `.bbappend`. `RUGIX_SYSTEM_SIZE` and `RUGIX_BOOT_SIZE` can template the default file where supported.
- `rugix-system-conf`: installs `/etc/rugix/system.toml`. BSP layers override this with the slot and boot-flow configuration for a concrete target.
- `rugix-sudoers`: optionally installs `/etc/sudoers.d/rugix-ctrl` entries for users listed in `RUGIX_NOPASSWD_USERS`.
- `rugix-bootstrap-marker`: deploys an empty `rugix-bootstrap` marker file for boot flows that need a bootstrap marker in the boot partition.
- `packagegroup-rugix`: pulls `rugix-ctrl` into images when `DISTRO_FEATURES` contains `rugix`.
- `packagegroup-rugix-bsp`: pulls common BSP-side runtime tools and Rugix configuration packages, such as `rugix-bootstrapping-conf`, `rugix-system-conf`, `util-linux-sfdisk`, and `e2fsprogs-mke2fs`.
- `linux-yocto_%.bbappend`: adds Rugix kernel configuration, currently overlayfs support, when `DISTRO_FEATURES` contains `rugix`.

## BSP Layers

In addition to the core layer, `meta-rugix` also provides board specific “BSP” layers.

The BSP layers serve as templates for your own board integration. A Rugix BSP layer typically sets:

- `WKS_FILE` for the WIC partition layout.
- `WKS_FILE_DEPENDS` for boot images and other artifacts required by the WKS file.
- `RUGIX_SLOTS` to map Rugix update slots to WIC partitions or deploy files.
- `IMAGE_INSTALL` additions for `packagegroup-rugix-bsp` when `DISTRO_FEATURES` contains `rugix`.
- `system.toml` and `bootstrapping.toml` defaults through `.bbappend` files.

### QEMU (Reference)

The QEMU BSP layers are reference integrations for testing Rugix and for studying complete bootloader integrations without vendor hardware.

- `meta-rugix-qemu-arm64-uboot`: BSP layer for QEMU ARM64 with U-Boot-based A/B updates.
- `meta-rugix-qemu-x86_64-grub`: BSP layer for QEMU x86_64 with GRUB EFI-based A/B updates.

Supported Yocto releases: Wrynose and Scarthgap.

### Raspberry Pi

The Raspberry Pi BSP layers provide both the recommended `tryboot` integration and a U-Boot reference integration.

- `meta-rugix-rpi-tryboot`: BSP layer for Raspberry Pi with [`tryboot`](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#fail-safe-os-updates-tryboot)-based A/B updates (official A/B update mechanism of Raspberry Pi). This requires Raspberry Pi 4 (CM4, Raspberry Pi 400) or newer.
- `meta-rugix-rpi-uboot`: BSP layer for Raspberry Pi with U-Boot-based A/B updates. This is meant as a reference implementation. For actual field deployments, always use the `tryboot` integration.

Supported Yocto releases: Wrynose and Scarthgap.

### NXP i.MX

The NXP i.MX BSP layer targets Scarthgap and integrates with NXP's downstream BSP.

- `meta-rugix-nxp-imx-uboot`: BSP layer for NXP i.MX boards (i.MX 8/8M/9 families) with U-Boot-based A/B updates, against NXP's downstream BSP (`meta-imx`). Example target: NXP FRDM-IMX91.

Supported Yocto release: Scarthgap.
