---
title: Hooks Reference
order: 40
---

# Hooks Reference

The full operation × stage matrix, plus environment details for hooks running before the init system. For an introduction, start with [Hooks](../hooks).

## System Update Hooks

For the installation of updates, the stages of `update-install` hooks are:

- `pre-update`: Runs directly before installing an update.
- `progress`: Runs periodically while installing an update.
- `post-update`: Runs directly after installing an update (before rebooting).

When running the `update-install/progress` hook, the progress of the update as a percentage is provided in the environment variable `RUGIX_UPDATE_PROGRESS`, including fractional digits.
Any outputs of such hooks are discarded and any errors will merely result in a warning, i.e., will not abort the update process.
Such hooks are only intended to report update progress to users and are thus not considered mission critical.
**There is neither a guarantee on the frequency with which such hooks run nor that they run at all.**
In particular, such hooks will **not** run when streaming an update from an arbitrary source.

For committing to an update or rollback, the stages of `system-commit` hooks are:

- `pre-commit`: Runs directly before a commit.
- `post-commit`: Runs directly after a commit.

You can use these hooks, e.g., to prepare and trigger state migrations, if you are not using Rugix Ctrl's [State Management](../state-management/) feature.

## State Management Hooks

For factory resets, the stages of `state-reset` hooks are:

- `prepare`: Runs before initiating the reset and rebooting the system.
- `pre-reset`: Runs directly before a factory reset during boot (reset can still be aborted).
- `post-reset`: Runs directly after a factory reset during boot.

As explained in the section on [State Management](../state-management/), the state management functionality runs very early during the boot process, before even the init system.
For the stages running during boot, you can assume the following environment:

- `/` is mounted read-only to the respective root filesystem.
- `/sys`, `/proc`, and `/dev` are mounted.
- `/run` is mounted to a temporary, in-memory filesystem and will be passed through to the final system.
  If you need to communicate anything to processes after the bootstrapping process, place it in `/run`.

In addition, the config partition is mounted read-only (usually at `/run/rugix/mounts/config`).

## Bootstrapping Hooks

For [bootstrapping](../state-management/bootstrapping), the stages of `bootstrap` hooks are:

- `prepare`: Runs after mounting the config partition and determining that the system should be bootstrapped.
- `pre-layout`: Runs directly before applying the system partition layout.
- `post-layout`: Runs directly after applying the system partition layout.

All stages run during the boot process and the same environment considerations as for [State Management Hooks](#state-management-hooks) apply.

## Boot Hooks

During the boot process, the following `boot` hooks are invoked:

- `pre-init`: Runs early before the system is initialized.
- `post-init`: Runs after the system has been initialized.

When `post-init` runs, everything has been set up and Rugix Ctrl is going to hand over control to the actual init system, e.g., Systemd.
