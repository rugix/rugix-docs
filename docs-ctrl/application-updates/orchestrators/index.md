---
sidebar_position: 0
---

# Orchestrators

An **orchestrator** is a backend that knows how to manage the lifecycle of a particular kind of workload.
The orchestrator for an app is declared in its app manifest (`app.toml`).

Every orchestrator implements three lifecycle operations:

| Operation      | Purpose                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------- |
| **activate**   | Set up resources, start the workload, and register auto-start behaviour so the app starts on boot. |
| **status**     | Query the workload's status: running, stopped, failed, or unknown.                                 |
| **deactivate** | Stop the workload, disable auto-start, and tear down resources.                                    |

Rugix Apps ships with the following built-in orchestrators:

| Orchestrator                          | Description                                          |
| ------------------------------------- | ---------------------------------------------------- |
| [`docker-compose`](./docker-compose)  | Manages containers defined by a Docker Compose file. |
| [`binary`](./binary)                  | Manages a single executable via a service manager.   |
| [`generic`](./generic)                | Delegates to user-provided shell scripts.            |

## Service Manager

Some orchestrators need an external **service manager** (init system) to supervise processes. Others manage processes themselves and do not require one. The service manager is a system-level setting configured in `/etc/rugix/apps.toml`:

```toml title="/etc/rugix/apps.toml"
service-manager = "systemd"
```

If the file is absent or the field is omitted, Rugix Apps attempts auto-detection by probing the system (e.g., checking for `/run/systemd/system`). If no known service manager is detected, it defaults to `"none"`. Orchestrators that require a specific service manager report an error if it is unsupported.
