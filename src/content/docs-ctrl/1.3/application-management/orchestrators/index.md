---
title: Orchestrators
order: 10
---

An **orchestrator** is a backend that knows how to manage the lifecycle of a particular kind of workload.
The orchestrator for an app is declared in its app manifest (`app.toml`).

Every orchestrator implements five lifecycle operations:

| Operation      | Purpose                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------- |
| **activate**   | Set up resources, start the workload, and register auto-start behaviour so the app starts on boot. |
| **status**     | Query the workload's status: running, stopped, failed, or unknown.                                 |
| **deactivate** | Stop the workload, disable auto-start, and tear down resources.                                    |
| **start**      | Start the workload of an already-active generation.                                                |
| **stop**       | Stop the workload without tearing down resources or disabling auto-start.                          |

Rugix Apps ships with three built-in orchestrators. Use `docker-compose` for container stacks, `binary` for a single supervised executable, and `generic` for anything else:

| Orchestrator                          | Use case                                              |
| ------------------------------------- | ----------------------------------------------------- |
| [`docker-compose`](./docker-compose)  | Docker Compose stacks.                                |
| [`binary`](./binary)                  | A single executable supervised by a service manager.  |
| [`generic`](./generic)                | Any workload, via a user-provided shell script.       |

## Service Manager

Some orchestrators need an external **service manager** (init system) to supervise processes. Others manage processes themselves and do not require one. The service manager is a system-level setting configured in `/etc/rugix/apps.toml`:

```toml title="/etc/rugix/apps.toml"
service-manager = "systemd"
```

If the file is absent or the field is omitted, Rugix Apps attempts auto-detection by probing the system (e.g., checking for `/run/systemd/system`). If no known service manager is detected, it defaults to `"none"`. Orchestrators that require a specific service manager report an error if it is unsupported.
