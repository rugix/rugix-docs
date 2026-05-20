---
title: Hooks
order: 2
---

_Hooks_ provide a powerful mechanism to inject custom behavior at various stages of Rugix Ctrl's operation.

A hook is just an executable script. Rugix Ctrl runs it at a well-defined point (before installing an update, after committing one, before bootstrapping the device, before resetting state) and reacts to its exit code. You use hooks to enforce custom checks, kick off migrations, drive external systems, or generally extend the lifecycle without forking Rugix Ctrl.

Hooks are cross-cutting: they fire during update installation and commits, during [bootstrapping](../state-management/bootstrapping) and [state resets](../state-management/), and on every boot.

## How Hooks Are Organized

Hooks live under `/etc/rugix/hooks`, organized by **operation** and **stage**:

```
/etc/rugix/hooks/
├── bootstrap/
│   ├── prepare/
│   ├── pre-layout/
│   └── post-layout/
├── system-commit/
│   ├── pre-commit/
│   └── post-commit/
└── ...
```

Each operation gets its own directory. Each stage of that operation gets a sub-directory. Files inside a stage directory are the hook scripts. Filenames follow the pattern `<rank>-<name>`, for example `10-check_system_health.sh`. **Lower ranks run earlier**, so use rank to control the order when you have multiple hooks for the same stage.

Hooks receive the operation name as `$1` and the stage as `$2`. You can either branch on those (handy if you symlink the same script into several stages) or ignore them and rely on the path. **A hook should do nothing for unknown arguments**; operations and stages may be added in future versions.

## Example: Pre-Commit Health Check

A common use case: refuse to commit an update unless the SSH server is up.

```bash title="/etc/rugix/hooks/system-commit/pre-commit/10-check_system_health.sh"
#!/bin/bash

if systemctl is-active --quiet sshd; then
  echo "Service sshd is running."
else
  echo "Error: Service sshd is not running."
  exit 1
fi
```

The non-zero exit code from this script aborts the commit. The previous version stays the default; the next reboot rolls back.

:::tip
Some checks make sense outside Rugix Ctrl too, but a hook is the only way to make them **always** run, no matter how the operation was triggered.
:::

## Failure Semantics

When a hook exits non-zero, the operation is typically aborted right there. A failing `system-commit/pre-commit` hook prevents the commit. A hook that runs _after_ the commit cannot un-commit it; the operation already happened.

The `update-install/progress` hook is best-effort: errors only log a warning, and it isn't guaranteed to run (it doesn't run at all when streaming an update from an arbitrary source). The `boot` hooks are best-effort too.

## Which Hooks Are Available

The hooks you can install depend on the operation, and each set is documented with the capability it belongs to: update and commit hooks with [System Updates](../updates/system-updates/), state-reset hooks with [State Management](../state-management/), and bootstrap and boot hooks with [Bootstrapping](../state-management/bootstrapping).
