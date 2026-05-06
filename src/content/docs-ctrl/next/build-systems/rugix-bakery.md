---
title: Rugix Bakery
order: 10
---

# Rugix Bakery

[Rugix Bakery](/docs/bakery/) is a modern image-build pipeline developed alongside Rugix Ctrl. It's the easiest way to produce a Rugix-Ctrl-ready image — for Raspberry Pi, generic UEFI hardware, or your own custom target.

When you build with Bakery for a generic or specific target, you get all of the following out of the box:

- The `rugix-ctrl` binary installed and configured as the early-init process.
- A working A/B partition layout with config and data partitions.
- A bootloader integration (U-Boot, GRUB, or `tryboot` depending on target).
- An automatic [system configuration](../system-updates/system-configuration) — no `system.toml` to author by hand.
- Update bundle generation with sensible defaults, including block indices for [delta updates](../delta-updates).

For the full story — recipes, layers, target configuration, and the build CLI — head to the **[Rugix Bakery documentation](/docs/bakery/)**.

## When Not to Use Bakery

Pick a different path if you have an existing build investment:

- Already on Yocto? Use the [`meta-rugix`](./yocto) layers.
- On Buildroot, Debian-based images, or a custom pipeline? See [other build systems](./others).
