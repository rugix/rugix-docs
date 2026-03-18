---
sidebar_position: 2
---

# Binary

The `binary` orchestrator manages a single executable via a systemd service unit.

## Getting Started

### 1. Create a Systemd Unit Template

Write a `systemd.service` unit template. Use `${GENERATION_DIR}` and `${DATA_DIR}` as placeholders:

```ini title="systemd.service"
[Unit]
Description=My Server

[Service]
ExecStart=${GENERATION_DIR}/my-server
WorkingDirectory=${DATA_DIR}
Restart=on-failure
```

### 2. Pack the Bundle

Use `rugix-bundler` to package the binary and service unit into an app bundle:

```shell
rugix-bundler apps pack binary \
    --app my-app \
    --service systemd.service \
    my-server \
    my-app-v1.rugixb
```

This command:

1. Generates the `app.toml` manifest with `orchestrator = "binary"`.
2. Packages the service unit template and any included files as an `app-archive` payload.
3. Packages the binary as a separate `app-file` payload for optimal delta updates.
4. Produces a [Rugix Bundle](../../advanced/update-bundles.mdx).

**Options:**

- `--service` specifies the systemd unit template.
- `--include` adds extra files or directories to the bundle.

### 4. Install on the Device

```shell
rugix-ctrl apps install --bundle-hash <hash> my-app-v1.rugixb
```

This extracts the payloads, renders the unit template, installs the unit into systemd, and starts the service.

## Generation Directory

The generation directory must contain:

- `app.toml` with `orchestrator = "binary"`.
- `systemd.service` unit template.
- The executable binary itself (or any files the unit references).

## Template Placeholders

| Placeholder         | Replaced with                                         |
| ------------------- | ----------------------------------------------------- |
| `${GENERATION_DIR}` | Absolute path to the generation directory.            |
| `${DATA_DIR}`       | Absolute path to the app's persistent data directory. |

## Lifecycle Operations

| Operation  | Implementation                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| activate   | Renders the unit template, writes it to the app's `systemd/units` directory and `/run/systemd/system/`, runs `daemon-reload`, then `systemctl enable --now`. |
| status     | Maps `systemctl is-active` output to running/stopped/failed/unknown.                                                                                         |
| deactivate | Runs `systemctl disable --now`, removes the rendered unit files, runs `daemon-reload`.                                                                       |

## Boot-Time Restoration

Since `/run/` is a tmpfs, systemd units installed there do not survive reboots. A oneshot service restores them on boot. See [Systemd Integration](../reference#systemd-integration) for details.
