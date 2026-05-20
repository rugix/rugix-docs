---
title: OTA Updates
order: 1
---

Installing over-the-air updates is Rugix Ctrl's primary capability. An update is shipped as an [update bundle](./update-bundles): a single file that Rugix Ctrl installs on a device.

Updates come in two kinds:

- **[System Updates](./system-updates/)** replace the whole operating system at once: the root filesystem and everything needed to boot it. They are atomic, validated on the device, and roll back automatically if anything goes wrong. This is the path for A/B layouts, recovery-partition setups, and other redundant schemes.
- **[Incremental Updates](./incremental-updates)** install individual payloads without involving the bootloader, leaving you in full control of how the update is applied. Use them to deliver things like child device firmware, configurations, or individual files, or to drive a custom installation step.

Both kinds run on the same engine. Every bundle is [signature-verified](./signed-updates) before installation, can be transferred as a bandwidth-saving [delta update](./delta-updates), is streamed straight to its target instead of being staged whole on disk, and can trigger [hooks](../reference/hooks) at each step. System and incremental updates are not an either-or choice: a device can use both, and either way gets the same secure, efficient delivery.
