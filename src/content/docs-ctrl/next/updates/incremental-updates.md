---
title: Incremental Updates
order: 30
---

A [system update](./system-updates/) hands the whole device over to Rugix Ctrl: it installs a new operating system, drives the bootloader, and manages the atomic switch and rollback. An **incremental update** does the opposite. Rugix Ctrl installs the payloads of the bundle wherever they are configured to go and stays out of the boot process entirely. The bootloader is not touched, and no reboot or commit is implied.

This makes incremental updates the flexible, lower-level path. You decide what an incremental update contains and what installing it means: write a single file, update one partition, or run a custom handler over a payload. Rugix Ctrl delivers and verifies the payloads; everything around that is up to you.

## When to Use Incremental Updates

Reach for an incremental update when a full [system update](./system-updates/) is more than you need:

- Updating a child device firmware or a single file without replacing the whole system.
- Shipping data or assets that are not part of the root filesystem.
- Driving a custom installation step through an `execute` payload handler.

For updating the base operating system with rollback safety, use a [system update](./system-updates/). For deploying and managing application workloads, use [application management](../application-management/).

## Installing an Incremental Update

An incremental update is an ordinary [update bundle](./update-bundles) whose manifest declares its update type as `incremental`. It is installed with the same command as a system update:

```shell
rugix-ctrl update install BUNDLE_OR_URL
```

Because no boot group is required, you do not have to specify one. Bundle verification, [delta updates](./delta-updates), and streaming installation work exactly as they do for system updates.

For the manifest format, the `update-type` field, and the available payload delivery handlers, see the [Update Bundles reference](./update-bundles).
