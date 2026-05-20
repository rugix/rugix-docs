---
title: Yocto
order: 20
---

The open-source [`meta-rugix`](https://github.com/silitics/meta-rugix) layers integrate Rugix Ctrl into a [Yocto](https://www.yoctoproject.org/)-based distribution.

## Layers and Recipes

The `meta-rugix-core` layer provides:

- The `rugix-ctrl` recipes for installing Rugix Ctrl.
- The `rugix-bootstrapping-conf` recipe for installing a custom [`bootstrapping.toml` configuration file](../../../state-management/bootstrapping); extend it to replace the default bootstrapping configuration.
- The [`rugixb` image type](#image-type-rugixb) for building [Rugix update bundles](../../../updates/update-bundles) directly from an image recipe.
- The [`rugix-bundle` class](#rugix-bundle-class) for building bundles from a separate recipe.

Board-specific layers (`meta-rugix-rpi-tryboot`, `meta-rugix-rpi-uboot`, `meta-rugix-qemu-arm64-uboot`, `meta-rugix-qemu-x86_64-grub`, `meta-rugix-nxp-imx-uboot`) wire up the WKS layout, slot mapping, and bootloader integration for specific boards. See the [`meta-rugix` README](https://github.com/silitics/meta-rugix#provided-layers) for the full list. The board layers double as examples to adapt or to write your own BSP layer against, including the [kas](https://github.com/siemens/kas) configurations under [`examples/`](https://github.com/silitics/meta-rugix/tree/main/examples).

## Image Type `rugixb`

`rugixb` is a Yocto image type that produces an update bundle alongside the WIC image, in the same image build. Payloads are taken straight from the WIC partitions, so no separate bundle recipe is needed. This is the path used by every example in `meta-rugix` and the recommended way to ship bundles from a Yocto build.

### Slot Mapping

A BSP layer declares its slot-to-source mapping in `RUGIX_SLOTS`, a space-separated list:

```bitbake title="meta-my-bsp/conf/layer.conf"
RUGIX_SLOTS:my-machine ?= "boot:2 system:4"
```

Each entry maps a slot name to the data that fills its payload:

- `name:N`, a WIC partition number (e.g., `system:4`).
- `name:file:relative/path`, a file in `DEPLOY_DIR_IMAGE` (e.g., `boot:file:fitImage`).
- `name:file:/absolute/path`, an absolute path on disk (useful when a file lives in `IMGDEPLOYDIR` at bundle-build time).

The slot names must match those declared in the device's [`system.toml`](../../../updates/system-updates/system-configuration).

### Enabling the Image Type

In the image recipe (or via `local.conf`), add `rugixb` to `IMAGE_FSTYPES`. Adding `rugixb.hash` alongside it produces a sidecar `<image>.rugixb.hash` for use with [`--bundle-hash`](../../../updates/update-bundles#installing-a-bundle):

```bitbake
IMAGE_FSTYPES = "tar.bz2 wic wic.bmap rugixb rugixb.hash"
```

After the build, `DEPLOY_DIR_IMAGE` contains `<image>.rugixb` (and `<image>.rugixb.hash` if requested), ready to install with `rugix-ctrl update install`.

The bundle is not signed. Sign it after the build with [Rugix Bundler](../../../updates/signed-updates#signing-bundles).

## `rugix-bundle` Class

For workflows where the bundle is built by a recipe separate from the image (for example, when assembling payloads from multiple image builds), the `rugix-bundle` class is available. The class assumes you build partitioned images with [WIC](https://docs.yoctoproject.org/5.0.8/dev-manual/wic.html) and lets a bundle recipe pick up individual partitions as payloads:

```bitbake title="update-bundle-minimal.bb"
inherit rugix-bundle

RUGIX_BUNDLE_PAYLOADS = "boot system"

RUGIX_PAYLOAD_boot[image] = "core-image-minimal"
RUGIX_PAYLOAD_boot[partition] = "2"

RUGIX_PAYLOAD_system[image] = "core-image-minimal"
RUGIX_PAYLOAD_system[partition] = "4"
```

`RUGIX_BUNDLE_PAYLOADS` is a space-separated list of payload names. Each name is then configured through a `RUGIX_PAYLOAD_<name>` variable with the following flags:

- `image` (required): Image to take the partition from.
- `partition` (required): Image partition to include as the payload.
- `slot` (optional): Update slot for the payload (defaults to the payload name).

:::note
In the future, we will extend the class to support additional payload types.
:::

This class also does not produce signed bundles; sign them after the build with [Rugix Bundler](../../../updates/signed-updates#signing-bundles).
