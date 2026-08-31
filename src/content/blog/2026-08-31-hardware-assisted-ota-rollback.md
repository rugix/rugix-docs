---
slug: hardware-assisted-ota-rollback
title: "Hardware-Assisted Rollback for Embedded Linux OTA Updates"
description: "Our Automation World article with Sfera Labs on A/B updates and hardware-assisted rollback for Strato Pi Max."
authors: koehlma
date: 2026-08-31
tags: [rugix, ota, embedded linux, a/b updates, rollback, strato pi max]
---

Together with Giampiero Baggiani of Sfera Labs, we have published [Industrial IoT Security: Designing OTA Updates That Recover From Failure](https://www.automationworld.com/cybersecurity/article/55399785/industrial-iot-security-designing-ota-updates-that-recover-from-failure) in Automation World. The article explains how A/B updates, independent storage, and hardware watchdogs help industrial Linux devices recover automatically from a failed update. It also covers signed update packages, reproducible builds, and other production considerations. [Strato Pi Max](https://sferalabs.cc/strato-pi-max/) and Rugix provide the practical example.

<!-- truncate -->

Strato Pi Max is particularly interesting for robust updates because it can hold two complete systems on independent SD cards. An onboard microcontroller controls which card is connected to the Raspberry Pi Compute Module. If the updated system stops sending its health signal to the hardware watchdog, the microcontroller can restart the device and eventually reconnect the previous card. Recovery does not depend on the updated Linux system or a network connection.

The main Rugix takeaway is how little platform-specific work this required. We described the two cards in the Rugix configuration and added a small controller script that connects Rugix Ctrl to the board's existing controls. Rugix Ctrl, including its update package format, verification logic, and installation process, remained unchanged. This shows how hardware-specific boot and recovery mechanisms can be integrated without building a board-specific update engine.

The complete implementation is available in the open-source [`rugix-example-stratopi`](https://github.com/rugix/rugix-example-stratopi) repository. It includes the dual-SD system configuration, controller script, watchdog setup, and demonstration system used in the article.

---

At [Silitics](https://silitics.com), we help companies design robust OTA update architectures and integrate Rugix with custom embedded Linux hardware. If you need help adapting Rugix to your platform, [we'd love to hear from you](mailto:hello@silitics.com).
