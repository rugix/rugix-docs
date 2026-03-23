---
sidebar_position: 8
---

# Application Updates

:::warning
Rugix Apps is an **experimental feature**. Its interface may change in future releases without notice.
:::

Rugix Apps is a mechanism for deploying and managing application workloads on embedded devices.
While Rugix Ctrl's core OTA update mechanism typically operates at the _system_ level, replacing entire root filesystem partitions, Rugix Apps operates at the _application_ level, allowing individual applications to be installed, updated, rolled back, and removed independently of system updates.

## Apps

An **app** is a named, self-contained application workload managed by Rugix Ctrl (e.g., `my-service`, `monitoring-agent`).
Multiple independent apps can coexist on the same device, each with its own lifecycle, and different devices in a fleet can run different combinations of apps on top of a shared base system.

Each app has:

- A series of **versions** (called generations internally), immutable snapshots of the app's files. When a new version is installed, the previous version remains on disk, enabling instant rollback without re-downloading anything.
- A **data directory** for persistent state that survives across updates. This is the right place for databases, caches, or any runtime state.

## Orchestrators

Each app declares an **orchestrator** that knows how to start, stop, and check the workload. Rugix Apps ships with built-in orchestrators for common workload types:

| Orchestrator                                       | Use case                                   |
| -------------------------------------------------- | ------------------------------------------ |
| [`docker-compose`](./orchestrators/docker-compose) | Docker Compose stacks.                     |
| [`binary`](./orchestrators/binary)                 | Single executables managed via systemd.    |
| [`generic`](./orchestrators/generic)               | Anything, via user-provided shell scripts. |

See the [Orchestrators](./orchestrators/) section for details on each.

## Installing an App

Apps are packaged into bundles and installed with a single command:

```shell
rugix-ctrl apps install my-app.rugixb
```

This extracts the app's files into a new version, marks it as ready, and activates it (starts the workload). App bundles use the same [Rugix Bundle format](../advanced/update-bundles.mdx) as system updates, which means they benefit from delta updates, cryptographic verification, streaming installation, and compression.

Rugix Ctrl requires every bundle to be verified before installation. If your bundles are [signed](../signed-updates), verification happens automatically. Otherwise, pass the bundle hash produced by `rugix-bundler` to verify integrity:

```shell
rugix-ctrl apps install --bundle-hash <hash> my-app.rugixb
```

For Docker Compose apps, `rugix-bundler` provides a dedicated packing command. See the [Docker Compose orchestrator](./orchestrators/docker-compose) page for details.

## Updating an App

To update an app, install a new bundle:

```shell
rugix-ctrl apps install my-app-v2.rugixb
```

The current version is deactivated and the new version is activated. The previous version remains on disk for rollback.

## Rollback

To roll back to the previous version:

```shell
rugix-ctrl apps rollback <app>
```

This deactivates the current version and re-activates the most recent previously active version. Since the old version's files are still on disk, rollback is instant.

If activation of a new version fails, rollback to the previous version is attempted automatically.

## Starting and Stopping

An active app's workload can be stopped and started without changing the active generation:

```shell
# Stop the workload:
rugix-ctrl apps stop <app>

# Start the workload again:
rugix-ctrl apps start <app>
```

Unlike `deactivate`, which tears down all resources and removes auto-start registration, `stop` simply stops the running workload processes. The app remains active and `start` can bring it back without re-running activation logic (image loading, unit rendering, etc.).

:::warning
Whether a stopped workload resumes after a reboot depends on the orchestrator. For example, the `binary` orchestrator keeps the systemd unit enabled, so the service restarts on boot. The `docker-compose` orchestrator's behavior depends on the restart policy in the compose file. See each orchestrator's documentation for details.
:::

## Reliability

Rugix Apps is designed to handle crashes and power loss gracefully:

- A new version is only marked as ready once all of its files have been fully extracted. An interrupted installation never leaves a half-installed version.
- If the device loses power during a version switch, the interrupted operation is automatically replayed on the next boot.
- If activation fails and a previous version exists, rollback is attempted automatically.

:::tip
Automatic crash recovery and systemd unit restoration require two systemd services to be installed and enabled on the device:

- [`rugix-apps-restore-units.service`](https://github.com/rugix/rugix/blob/main/crates/apps/rugix-ctrl/assets/rugix-apps-restore-units.service) — restores systemd units for the `binary` orchestrator after a reboot.
- [`rugix-apps-recover.service`](https://github.com/rugix/rugix/blob/main/crates/apps/rugix-ctrl/assets/rugix-apps-recover.service) — recovers interrupted transitions for all orchestrator types after the system is fully up.

Without these services, apps using the `binary` orchestrator will not start after a reboot, and interrupted transitions (for any orchestrator) will not be recovered automatically.
:::

See the [Reference](./reference) for details on the crash recovery mechanism, storage layout, bundle format, and the full CLI reference.

## Inspecting Apps

All inspection commands produce structured JSON output:

```shell
# List all apps with their status:
rugix-ctrl apps list

# Show details for a specific app:
rugix-ctrl apps info <app>
```

## Garbage Collection

Over time, old versions accumulate on disk. To clean them up:

```shell
rugix-ctrl apps gc [app] [--keep N]
```

By default, this keeps the currently active version and the last previously active one (for rollback). The `--keep` flag controls how many previous versions to retain.

## Removing an App

To remove an app entirely, including all versions and persistent data:

```shell
rugix-ctrl apps remove <app>
```
