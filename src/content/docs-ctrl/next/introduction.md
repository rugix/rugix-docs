---
title: Introduction
order: 1
---

:::tip
**New to Rugix or to embedded Linux?** Check out the [Getting Started guide](/docs/getting-started). It walks you through building a Debian image with Rugix Bakery, flashing it to a Raspberry Pi or VM, and installing an OTA update end-to-end in under 30 minutes.
:::

_Rugix Ctrl_ is a tool for **robust and secure over-the-air (OTA) updates** on embedded Linux devices, with **optional application and state management**.

Building robust and secure embedded devices is harder than it should be, with each project assembling the same safeguards from scratch. Rugix Ctrl is designed to make it simpler, turning best practices for system updates, application workloads, and system state into capabilities you adopt off the shelf, without trading robustness for simplicity.

## The Challenges of Maintaining Devices in the Field

Embedded devices typically keep evolving once they ship: there are new features to deliver, security vulnerabilities to patch, performance to improve, and bugs to fix. Over-the-air updates are how you keep a deployed fleet current, secure, and improving without sending anyone into the field. But once devices are out there, **an update gone wrong is expensive**: a bricked unit can mean a truck roll or a trip back to the manufacturer, plus costly downtime. The update mechanism is also an attack surface: a manipulated update can hand an attacker a foothold on the device and the wider network it's attached to. Rugix Ctrl is built to guard against both, so you can update your software without putting your fleet at risk.

Keeping the base system updated is only part of the job. Applications often evolve with a different cadence than the base system, and different devices in a fleet often need different workloads on top of it. Deploying and updating them independently lets you keep a single base image across the fleet and vary only the workloads on top, instead of reshipping the whole system for every change. Devices also accumulate state, which cuts both ways: user data has to survive every update, while configuration drift and stray files must not be allowed to quietly break the running system or the updates that follow.

## What Rugix Ctrl Does

Rugix Ctrl addresses these challenges with `rugix-ctrl`, a single, self-contained binary on the device. It provides three capabilities, one primary and two optional:

- **[OTA Updates](/docs/ctrl/next/updates/)** (primary). Robust and secure over-the-air updates of the system. A full system update replaces the whole OS atomically and rolls back automatically on failure; an incremental update installs individual payloads. Both transfer only what changed via delta updates, and every update is signature-verified before installation.
- **[Application management](/docs/ctrl/next/application-management/)** (optional). Install, update, roll back, and remove individual app workloads such as Docker Compose stacks or systemd services, independently of the base system. Deployments are atomic and crash-safe, each app keeps its own version history and persistent data, and a failed update rolls back automatically.
- **[State management](/docs/ctrl/next/state-management/)** (optional). Keep the system in a known-good state: a read-only system partition layered with a writable overlay that resets on reboot, selective persistence for state that must survive updates, and off-the-shelf factory reset.

The two optional capabilities are independent of the primary update functionality and of each other. Leave them out and Rugix Ctrl is purely an update engine, with no extra partitions, services, or behavior to account for. Turn them on and you gain application lifecycle management and a controlled, known-good system state.

## What Rugix Ctrl Doesn't Do

Rugix Ctrl covers a broad slice of the OTA update problem, but it is deliberately not an all-in-one platform. A few things are intentionally left out of scope:

- **It is not a fleet manager.** Rugix Ctrl does not talk to a backend, schedule rollouts, or provide a dashboard. It exposes a uniform installation interface and leaves orchestration to a [fleet manager](/docs/ctrl/next/integration/fleet-management/), your own UI, or a bundle handed over on a thumb drive.
- **It is not a build system.** Rugix Ctrl does not build your OS image or application artifacts. It installs update bundles produced by a [build system](/docs/ctrl/next/integration/build-systems/rugix-bakery), whether that's Rugix Bakery, Yocto, Buildroot, Nix, or some other pipeline.
- **It is not a bootloader.** Rugix Ctrl drives the bootloader to switch between slots, but it does not replace it. You still need a supported bootloader such as U-Boot, GRUB, `systemd-boot`, or Raspberry Pi's `tryboot`, wired up through a [boot flow](/docs/ctrl/next/updates/system-updates/boot-flows).

This is what keeps Rugix Ctrl composable: it owns updates (and optionally applications and state) but stays decoupled from the rest of the OTA stack. In particular, it does not lock you into a particular fleet manager, so you are free to use whatever fits best.

## Why Rugix Ctrl?

Choosing an update solution is a long-term commitment: embedded devices stay in the field for years, and the mechanism you pick today is how you will ship software to them for their entire lifetime. Here is why Rugix Ctrl is a solid choice for that commitment:

- **A state-of-the-art update engine.** For most new embedded Linux projects, Rugix Ctrl is the strongest OTA update engine available today, with best-in-class delta updates, the only memory-safe implementation among the widely used engines, and secure-by-default verification. We have published a [detailed, head-to-head comparison of Mender, RAUC, SWUpdate, OSTree, and Rugix Ctrl](/blog/2026-02-28-ota-update-engines-compared) that lays out the full reasoning.
- **More than an update engine.** Operating a fleet involves more than shipping system updates: workloads evolve on their own cadence, and devices accumulate state. Rugix Ctrl handles both with ready-made, optional application and state management; with any other update engine, those are capabilities you build and maintain yourself.
- **Built for the long haul.** Rugix Ctrl is open source under permissive licenses, proven at scale, and actively developed. Where it does not yet cover a need, we are committed to closing the gap, so it stays a dependable foundation for the full lifetime of your devices.

## Where to Start

Start with the [OTA Updates](/docs/ctrl/next/updates/) section, the heart of Rugix Ctrl. Its [Update Bundles](/docs/ctrl/next/updates/update-bundles) page introduces the format that every part of Rugix Ctrl relies on, so it makes a good first read. From there, explore [Application Management](/docs/ctrl/next/application-management/) and [State Management](/docs/ctrl/next/state-management/), or jump straight to the [Getting Started guide](/docs/getting-started) to learn by doing.
