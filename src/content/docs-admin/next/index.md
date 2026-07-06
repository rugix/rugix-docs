---
title: Introduction
order: 1
---

:::tip
**New to Rugix?** Start with the [Getting Started guide](/docs/getting-started). It walks through building a Rugix-powered system and deploying an update end to end.
:::

_Rugix Admin_ is a browser-based management interface for systems running [Rugix Ctrl](/docs/ctrl/). It gives operators and developers a local web UI for inspecting a device, installing updates, managing app workloads, reviewing component compatibility, and following long-running jobs.

![Rugix Admin system management screen](/img/screenshots/rugix-admin-system.png)

![Rugix Admin application management screen](/img/screenshots/rugix-admin-apps.png)

Rugix Admin is intentionally small: it is a single service that serves a React frontend and talks to `rugix-ctrl` on the same device. It does not replace Rugix Ctrl, Rugix Bakery, or a fleet-management backend. Instead, it makes the on-device Rugix capabilities easier to operate when you are working locally, doing field service, building demos, or debugging a device.

## What Rugix Admin Does

Rugix Admin focuses on the operations that are useful on one device:

- **System status.** Inspect the active and default boot groups and the raw system information returned by Rugix Ctrl.
- **System updates.** Install Rugix system update bundles from uploaded files or from URLs, with the same verification options that Rugix Ctrl exposes.
- **System actions.** Trigger common operations such as committing the active system, rebooting, rebooting into the spare system, or resetting state.
- **Application management.** List apps, inspect generations, install app bundles, start and stop workloads, roll back, garbage collect old generations, and remove apps.
- **Component compatibility.** Review scanned roots, loaded components, capabilities, claims, and consistency problems.
- **Job tracking.** Follow queued and running operations with progress, status, and command output.

Because Rugix Admin shells out to `rugix-ctrl`, the command-line tool remains the source of truth. The web UI reflects the same state and calls the same operations you can run manually over SSH.

## What Rugix Admin Does Not Do

Rugix Admin is deliberately not a fleet manager. It does not connect devices to a cloud backend, schedule staged rollouts, manage credentials for remote fleets, or store long-term fleet history. Use a fleet-management solution for those responsibilities.

## Where to Start

Install and run Rugix Admin on the device next to `rugix-ctrl`, then open the configured service address in a browser. See [HTTP API](./http-api) for the current status of the internal HTTP API.
