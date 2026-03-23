---
sidebar_position: 30
---

# Safely Migrating

To facilitate **safe migrations of already deployed devices** from other OTA solutions, Rugix Ctrl provides [boot flows](../advanced/boot-flows.md) that are compatible with other OTA update solutions and that mimic the way those solutions interact with the bootloader to install updates.
This allows you to safely migrate in the field without reprovisioning your devices and without putting them at risk.
Note that this section focuses on the core bootloader integration and partition switching.
It does not cover any custom integrations that you may have implemented with an other OTA solution.

:::info

If you need help migrating from a specific OTA solution to Rugix Ctrl, [feel free to reach out for commercial support](mailto:hello@silitics.com?subject=Migrating%20to%20Rugix%20Ctrl).

:::