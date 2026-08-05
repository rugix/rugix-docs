---
title: Build Systems
order: 10
---

Rugix Ctrl is a runtime component; to use it, you need an image that ships the `rugix-ctrl` binary, an integrated bootloader, the right partition layout, and (typically) a [system configuration](../../updates/system-updates/system-configuration). The build system that produces that image is up to you.

There are three well-trodden paths:

- **[Rugix Bakery](./rugix-bakery)**, the easiest way. A container-based pipeline that builds Debian-based images with first-class Rugix Ctrl integration, A/B layouts, and bundle generation out of the box. Use this if you do not already have strong reasons to pick something else.
- **[Yocto](./yocto)**, full-distro control via the official [`meta-rugix`](https://github.com/silitics/meta-rugix) layers. Use this if you are already invested in Yocto, need a tightly-tailored embedded distribution, or have specific BSP requirements.
- **[Other build systems](./others)**: Buildroot, an existing Debian pipeline, custom in-house tooling. Rugix Ctrl is build-system agnostic; this page covers what you need to wire up by hand.
