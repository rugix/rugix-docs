---
title: Filesystem Hierarchy
order: 20
---

The directory layout Rugix Ctrl sets up during early init:

- `/`: Root filesystem (read-write via an overlay).
- `/run/rugix/mounts/config`: Config partition (usually read-only).
- `/run/rugix/mounts/system`: System partition (read-only).
- `/run/rugix/mounts/data`: Data partition (read-write).
- `/run/rugix/state`: System state (bind-mounted onto `…/mounts/data/state/default`).

## Data Partition

The data partition at `/run/rugix/mounts/data` has the following hierarchy:

- `overlay/work`: Overlay work directory.
- `overlay/root`: Overlay root directory.
- `state/default`: State directory (bind-mounted as `/run/rugix/state`).

## State Directory

The state directory `/run/rugix/state` has the following hierarchy:

- `overlay/<group name>`: System overlay for the respective boot group.
- `persist`: Files and directories persisted with Rugix Ctrl.
- `ssh`: Persistent SSH host keys.
- `machine-id`: Persistent `/etc/machine-id`.
- `apps`: Apps installed with [Rugix Apps](../../application-management/).
- `store`: Content-addressed [store](../../reference/store) for large files, such as container images of apps.
- `.rugix`: Internal state of Rugix Ctrl.
- `app`: Persistent data of your own applications, unrelated to Rugix Apps and not managed by Rugix Ctrl.

Rugix Ctrl manages this directory and may add entries in future versions. `app` is reserved for your own data. To keep other files, [declare them as persistent](../#selective-persistent-state), which places them under `persist`.
