---
title: Rugix Bakery
order: 10
---

[Rugix Bakery](/docs/bakery/) is a container-based pipeline for building Debian-based Linux images, developed alongside Rugix Ctrl. It is the easiest way to produce a Rugix-Ctrl-ready image, whether you target Raspberry Pi, generic UEFI hardware, or a custom board.

When you build with Bakery for a generic or specific target, you get all of the following out of the box:

- The `rugix-ctrl` binary installed and configured as the early-init process.
- A working A/B partition layout with config and data partitions.
- A bootloader integration (U-Boot, GRUB, or `tryboot` depending on target).
- An automatic [system configuration](../../../updates/system-updates/system-configuration): no `system.toml` to author by hand.
- Update bundle generation with sensible defaults, including block indices for [delta updates](../../../updates/delta-updates).

For the full story (recipes, layers, target configuration, and the build CLI), head to the **[Rugix Bakery documentation](/docs/bakery/)**.

## When Not to Use Bakery

Pick a different path if you have an existing build investment:

- Already on Yocto? Use the [`meta-rugix`](../yocto) layers.
- On Buildroot, Debian-based images, or a custom pipeline? See [other build systems](../others).
