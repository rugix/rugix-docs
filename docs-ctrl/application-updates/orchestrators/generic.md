---
sidebar_position: 3
---

# Generic

The `generic` orchestrator delegates all lifecycle operations to a user-provided `orchestrator` script.
This is the most flexible orchestrator and can manage any kind of workload.

## Getting Started

### 1. Write the Orchestrator Script

Create an `orchestrator` script that handles `activate`, `status`, and `deactivate`:

```bash title="orchestrator"
#!/bin/sh
set -eu

PID_FILE="$RUGIX_APP_DATA_DIR/daemon.pid"

case "$1" in
  activate)
    nohup "$RUGIX_APP_GENERATION_DIR/my-daemon" \
        --data-dir "$RUGIX_APP_DATA_DIR" \
        --pid-file "$PID_FILE" \
        > "$RUGIX_APP_DATA_DIR/daemon.log" 2>&1 &
    ;;
  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo '{"status": "running"}'
    else
        echo '{"status": "stopped"}'
    fi
    ;;
  deactivate)
    if [ -f "$PID_FILE" ]; then
        kill "$(cat "$PID_FILE")" 2>/dev/null
        rm -f "$PID_FILE"
    fi
    ;;
esac
```

### 2. Pack the Bundle

Use `rugix-bundler` to package the orchestrator script into an app bundle:

```shell
rugix-bundler apps pack generic \
    --app my-app \
    orchestrator \
    my-app-v1.rugixb
```

This command:

1. Generates the `app.toml` manifest with `orchestrator = "generic"`.
2. Packages the orchestrator script and any included files as an `app-archive` payload.
3. Produces a [Rugix Bundle](../../advanced/update-bundles.mdx).

**Options:**

- `--include` adds extra files or directories to the bundle (e.g., binaries, configuration, data files that the orchestrator script needs).

### 3. Install on the Device

```shell
rugix-ctrl apps install --bundle-hash <hash> my-app-v1.rugixb
```

## Generation Directory

The generation directory must contain:

- `app.toml` with `orchestrator = "generic"`.
- An executable `orchestrator` script.

## Environment Variables

The following environment variables are set when the orchestrator script is invoked:

| Variable                   | Description                                                           |
| -------------------------- | --------------------------------------------------------------------- |
| `RUGIX_APP_NAME`           | The app name.                                                         |
| `RUGIX_APP_DIR`            | Absolute path to the app directory.                                   |
| `RUGIX_APP_GENERATION_DIR` | Absolute path to the generation directory.                            |
| `RUGIX_APP_DATA_DIR`       | Absolute path to the app's persistent data directory.                 |
| `RUGIX_APP_RECOVERY`       | `"true"` if replaying an interrupted transition, `"false"` otherwise. |

The working directory is set to the generation directory.

## Operations

For `activate` and `deactivate`, a zero exit code means success and non-zero means failure (stderr is included in the error message).

The `status` operation must print a JSON object to stdout:

```json
{"status": "running"}
{"status": "stopped"}
{"status": "failed", "message": "health check failing"}
{"status": "unknown"}
```

If the script exits with a non-zero status or produces invalid JSON, the status is reported as unknown.

## Idempotency and Recovery

Scripts should be written to be **idempotent** and handle being called again after a partial execution without side effects. When an operation is re-run during [crash recovery](../reference#crash-recovery), the `RUGIX_APP_RECOVERY` environment variable is set to `"true"`. This allows scripts to take a different code path if needed (e.g., cleaning up partial state before retrying).
