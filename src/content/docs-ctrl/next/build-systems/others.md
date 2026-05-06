---
title: Other Build Systems
order: 40
---

# Other Build Systems

Rugix Ctrl is a self-contained binary that does not assume any particular build system. If [Rugix Bakery](./rugix-bakery) and [Yocto](./yocto) don't fit — Buildroot, Debian-based pipelines, plain `debootstrap`, custom in-house tooling — you can integrate Rugix Ctrl into the image yourself.

This page is a checklist of what your image needs to ship and what you have to author. Each item links into the section that explains it in depth.

## What the Image Needs to Ship

1. **The `rugix-ctrl` binary.** Drop the [release binary](https://github.com/rugix/rugix/releases/) into `/usr/bin/rugix-ctrl` (or wherever your distribution places binaries).

2. **A working partition layout.** A typical A/B setup has a config partition, two boot partitions, two system partitions, and a data partition. See [System Updates: Typical Partition Layout](../system-updates/#typical-partition-layout) for the conventional six-partition layout, and [Bootstrapping](../state-management/bootstrapping) if you want Rugix Ctrl to grow / create partitions on first boot rather than baking the final layout into the image.

3. **A bootloader integration.** Pick a [boot flow](../system-updates/boot-flows) that matches your bootloader (`uboot`, `grub`, `systemd-boot`, RAUC- or Mender-compatible variants, or a `custom` script). The boot flow defines how the bootloader switches between A and B and how Rugix Ctrl talks to it.

4. **An init configuration that runs Rugix Ctrl as the init system** if you want [state management](../state-management/) (the writable overlay, factory reset, etc.). Add `init=/usr/bin/rugix-ctrl` to the kernel command line. Rugix Ctrl will set up the overlay and bind mounts and then hand off to your real init system (e.g., systemd).

## What You Need to Author

1. **`/etc/rugix/system.toml`** — declares slots, boot groups, and the boot flow. This is the central runtime configuration. See the [System Configuration](../system-updates/system-configuration) page for the full schema with examples.

2. **`/etc/rugix/state/*.toml`** (optional) — declares which directories and files should persist across updates if you're using state management. See [State Management: Selective Persistent State](../state-management/#selective-persistent-state).

3. **`/etc/rugix/bootstrapping.toml`** (optional) — only if you want Rugix Ctrl to grow partitions or create the data partition on first boot. See [Bootstrapping](../state-management/bootstrapping).

4. **`/etc/rugix/ctrl.toml`** (optional) — for [signed updates](../signed-updates), points at your trusted root certificate(s).

## Building Bundles

Update bundles are produced separately from your image build. Use [`rugix-bundler`](../reference/update-bundles#building-a-bundle) on your build server or in CI, fed with the partition images your build system produces. The bundler doesn't care which build system made those images.

## When You Need More Hand-Holding

If your platform has a working bootloader integration but the rest of the puzzle is non-obvious, [reach out for commercial support](mailto:hello@silitics.com?subject=Rugix%20Ctrl%20Integration). For one-off questions, our [Discord](https://discord.gg/cZ8wP9jNsn) and [Discourse](https://community.silitics.com/) are good places to start.
