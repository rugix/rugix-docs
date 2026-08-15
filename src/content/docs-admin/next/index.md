---
title: Introduction
order: 1
---

:::tip
**New to Rugix?** Start with the [Getting Started guide](/docs/getting-started). It walks through building a Rugix-powered system and deploying an update end to end.
:::

_Rugix Admin_ is a browser-based management interface for systems running [Rugix Ctrl](/docs/ctrl/). It gives operators and developers a local web UI for inspecting a device, installing updates, managing app workloads, reviewing component compatibility, and following long-running jobs.

The System view keeps device status and expandable slot information visible.
System updates and privileged actions open focused dialogs only when needed.
Reboot controls sit directly on the boot groups they target, while factory reset
is part of the state-management card. The current system must be committed
before another update can be installed; while it is uncommitted, Commit replaces
Install update as the primary action. The update dialog defaults to rebooting
immediately when daemon policy permits it.

The Apps view keeps start and stop controls in each application row. Expand a row
to inspect its generations. Removal, secondary lifecycle actions, and maintenance
operations are available from the row's action menu.

The Components view presents loaded components as an expandable inventory.
Compatibility problems appear above the inventory when detected, while scanned
roots are available from the page header.

Each main view has a hash route, such as `#/system` or `#/apps`. These routes
make views directly addressable and let navigation links use standard browser
behaviors such as opening a view in another tab.

The global job summary follows the newest operation across every view. On page
load, Rugix Admin restores that job's buffered output and resumes its live event
stream automatically. Selecting an older job changes only the detailed log shown
on the Jobs page. Subprocess output is normalized to plain text before display,
removing terminal escape sequences and unsafe control characters.

The frontend caches device information and refetches it at intervals suited to
each resource. When a job succeeds or fails, the service sends a global
invalidation event over server-sent events (SSE). Every connected browser tab
then refetches its active data immediately. Interval polling and focus-based
refetching cover interrupted or missed event streams.

Rugix Admin is intentionally small: it is a single service that serves a React frontend and talks to `rugix-ctrl` on the same device. It does not replace Rugix Ctrl, Rugix Bakery, or a fleet-management backend. Instead, it makes the on-device Rugix capabilities easier to operate when you are working locally, doing field service, building demos, or debugging a device.

## What Rugix Admin Does

Rugix Admin focuses on the operations that are useful on one device:

- **System status.** Inspect boot groups, slots, stored hashes, and persistent-state status, including ephemeral fallback errors.
- **System updates.** Install uploaded or remote system bundles with Rugix Ctrl's boot-group, overlay, reboot, verification, compatibility, range-request, and HTTP retry controls.
- **System actions.** Commit the active system, reboot, reboot into the spare system, or reset state with an optional state-profile backup.
- **Application management.** Inspect live workload health, persisted lifecycle state, generations, and metadata; install uploaded or remote bundles; and activate, deactivate, start, stop, roll back, garbage collect one or all apps, or remove apps.
- **Component compatibility.** Review scanned roots, loaded components,
  capabilities, claims, requirements, conflicts, and consistency problems.
- **Job tracking.** Follow queued and running operations with progress, status, and command output.

Because Rugix Admin shells out to `rugix-ctrl`, the command-line tool remains the source of truth. The installed HTTP service runs as an unprivileged user; Rugix Ctrl forwards its supported commands to the [privileged operation daemon](/docs/ctrl/reference/privileged-daemon) over a group-restricted Unix socket. Rugix Admin queries the daemon's effective policy and displays only the optional operation families it enables.

The daemon accepts signed system and application installations without an additional feature flag. Enabling `dangerously-insecure` in the daemon permits callers to bypass Rugix Ctrl's verification and compatibility checks; Rugix Admin displays a red development-only warning when that policy is active.

See the [Security Model](./security) for the trust boundaries, daemon
authorization policy, and production deployment guidance.

Rugix Admin exposes every operation supported by the privileged daemon. Rugix Ctrl commands that only operate locally, such as low-level slot maintenance, boot marking, application recovery, and index creation, are outside the daemon protocol and remain command-line workflows.

## What Rugix Admin Does Not Do

Rugix Admin is deliberately not a fleet manager. It does not connect devices to a cloud backend, schedule staged rollouts, manage credentials for remote fleets, or store long-term fleet history. Use a fleet-management solution for those responsibilities.

## Where to Start

Install and run Rugix Admin on the device next to `rugix-ctrl`, then open `http://<device-address>:7492/` in a browser. See [HTTP API](./http-api) for the current status of the internal HTTP API.
