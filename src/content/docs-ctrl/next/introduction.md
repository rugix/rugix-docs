---
title: Introduction
order: 1
---

# Rugix Ctrl

_Rugix Ctrl_ is a powerful tool for robust over-the-air updates and system state management.
It mitigates the risks associated with remote software updates in the field, **enabling you to ship the latest updates to your users with confidence**.

To set the stage, let's first focus on the things that could go wrong and the ideal features and properties of an update solution.

1. **Interrupted Updates:** If something interrupts the update process, such as an unplanned power outage, a partially installed update may leave the system in an inoperable state.
   Therefore, a robust update solution must be _atomic_, ensuring that updates are either installed completely or not at all, always leaving the system in an operational state, no matter what happens.

2. **Uncertain Production Environment:** While extensive testing should be done prior to deploying any updates, replicating the exact production environment and conditions can be difficult.
   An update that turns out to be incompatible with the particularities of the production environment under difficult to replicate conditions may leave the system in an inoperable state.
   Therefore, a robust update solution must have the possibility for _on-device validation and rollback_ of updates.
   If any problems are detected with an update on a particular device, a rollback to the previous, known-good version should be automatically triggered.

3. **Data Loss and Accidental State:** Whenever an update is installed, the existing state of a system must be handled carefully to ensure that no data is lost.
   For instance, user settings and data stored on the device must be preserved.
   At the same time, a system must be safeguarded against corruption by _accidental state_ that should not be kept, such as configuration files incompatible with the new version.
   Therefore, a robust update solution must provide reliable _state management_ mechanisms.

4. **Cyber Attacks:** A malicious actor may try to compromise a device by installing a manipulated update.
   If they succeed and gain access, they can use the device to further infiltrate the network it is attached to, gaining wide-spread access that can quickly lead to huge damages extending far beyond the functionality of the original device.
   Therefore, an update solution must provide mechanisms to prevent manipulated updates from being installed.

Rugix Ctrl addresses these challenges by ensuring atomic updates, on-device validation with rollback capabilities, reliable state management, and protection against malicious updates.
By utilizing Rugix Ctrl, you can rest assured that your devices remain reliable, secure, and up-to-date, **allowing you to focus on delivering value to your users**.

## How It's Built

Rugix Ctrl ships as two binaries:

- `rugix-ctrl` runs on the device. It installs updates, manages system state, and (optionally) takes over as the early-init process to set up a writable overlay before your real init system starts.
- `rugix-bundler` runs on your build machine. It packages payloads into update bundles and signs them.

Pre-built binaries are available [on the Releases page](https://github.com/rugix/rugix/releases/).

Rugix Ctrl is **build-system agnostic** — it integrates with [Rugix Bakery](./build-systems/rugix-bakery), [Yocto](./build-systems/yocto), or [your own pipeline](./build-systems/others). And it is **fleet-manager agnostic** — it doesn't talk to a backend itself, leaving update delivery to whichever [fleet management](./fleet-management) solution fits your product.

## Core Concepts

A handful of concepts run through everything Rugix Ctrl does. Skim these before diving into a specific section.

**[Update Bundles](./update-bundles)** are the format Rugix Ctrl uses to ship updates. The same bundle format carries [system updates](./system-updates/), [application updates](./application-updates/), boot data, custom payloads — anything you'd want to push to a device. Bundles are streaming-friendly, content-addressable, and verifiable per-block.

**[Delta Updates](./delta-updates)** ride on top of bundles. Rugix is the only open-source OTA tool with first-class support for both _dynamic_ deltas (server doesn't have to know anything; the device fetches only the missing blocks) and _static_ deltas (pre-computed patches between specific versions, for the bandwidth-constrained case).

**[Signed Updates](./signed-updates)** make bundle verification mandatory. Either an embedded CMS signature against a configured root certificate, or a known bundle hash. Nothing untrusted ever lands on disk.

**[Hooks](./hooks)** let you inject custom behavior at any lifecycle stage — before installing an update, before committing it, on first boot, on factory reset. Hooks are how you wire Rugix Ctrl into application-specific health checks, migrations, and custom workflows.

## Use Cases

**[System Updates](./system-updates/)** are Rugix Ctrl's headline feature: atomic A/B replacement of the root filesystem with rollback. The device boots into the inactive partition, you validate, you commit. Failed updates fall back automatically.

**[Application Updates](./application-updates/)** (Rugix Apps, currently experimental) extends the same machinery to lifecycle-managed application workloads — Docker Compose stacks, systemd-managed binaries, anything orchestrated by a script. Versioned generations, automatic rollback on failed activation, persistent per-app state.

**[State Management](./state-management/)** turns your root filesystem into a read-only base with a writable overlay. Bind mounts persist exactly the directories you declare; everything else is discarded on reboot. Factory reset is a single command. [Bootstrapping](./state-management/bootstrapping) runs first-boot setup — partition growth, data partition init, device-specific provisioning.

## Comparison to Other Solutions

If you are evaluating Rugix Ctrl against other open-source OTA update engines for embedded Linux, we have published a [comprehensive comparison of Mender, RAUC, SWUpdate, OSTree, and Rugix Ctrl](/blog/2026-02-28-ota-update-engines-compared) covering update strategies, bootloader support, delta updates, security, and backend integration.

If you're already running Mender or RAUC in the field, Rugix Ctrl can take over via [bootloader-compatible boot flows](./migrating/) — no reflashing required.
