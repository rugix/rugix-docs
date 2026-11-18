---
title: Binary
order: 20
---

The `binary` orchestrator manages a single executable via a systemd service unit.

## Getting Started

### 1. Create a Systemd Unit Template

Write a `systemd.service` unit template. Use `${GENERATION_DIR}`, `${DATA_DIR}`, and optionally `${CONFIG_PATH}` as placeholders:

```ini title="systemd.service"
[Unit]
Description=My Server

[Service]
ExecStart=${GENERATION_DIR}/my-server
WorkingDirectory=${DATA_DIR}
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

The `[Install]` section is required for the unit to start automatically after a reboot. The `WantedBy=` directive determines which systemd target pulls the service in during boot. Systemd respects all ordering and dependency directives (`After=`, `Requires=`, etc.) declared in the `[Unit]` section.

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
4. Produces a [Rugix Bundle](../../../updates/update-bundles).

**Options:**

- `--service` specifies the systemd unit template.
- `--include` adds extra files or directories to the bundle.
- `--config-schema` and `--config-default` include the app's optional [JSON configuration contract](../../configuration).

### 3. Install on the Device

```shell
rugix-ctrl apps install --bundle-hash HASH my-app-v1.rugixb
```

This extracts the payloads, renders the unit template, installs the unit into systemd, and starts the service.

## Generation Directory

The generation directory must contain:

- `app.toml` with `orchestrator = "binary"`.
- `systemd.service` unit template.
- The executable binary itself (or any files the unit references).

## Template Placeholders

| Placeholder         | Replaced with                                                                         |
| ------------------- | ------------------------------------------------------------------------------------- |
| `${GENERATION_DIR}` | Absolute path to the generation directory.                                            |
| `${DATA_DIR}`       | Absolute path to the app's persistent data directory.                                 |
| `${CONFIG_PATH}`    | Absolute path to the effective JSON configuration, or an empty string if none exists. |

## Lifecycle Operations

| Operation  | Implementation                                                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| activate   | Renders the unit template, writes it to `.rugix/systemd/units/` in the generation directory and `/run/systemd/system/`, runs `daemon-reload`, then `systemctl enable --runtime` and `systemctl start`. |
| status     | Maps `systemctl is-active` output to running/stopped/failed/unknown.                                                                                                                                   |
| deactivate | Runs `systemctl stop` and `systemctl disable --runtime`, removes the runtime unit file, runs `daemon-reload`.                                                                                          |
| start      | Runs `systemctl start`.                                                                                                                                                                                |
| stop       | Runs `systemctl stop`.                                                                                                                                                                                 |
| logs       | Runs `journalctl --unit` for the service of the app (see Logs).                                                                                                                                        |

**Boot behavior after `stop`:** `systemctl stop` stops the service but does not disable it. The unit remains enabled via runtime symlinks, so systemd restarts the service on the next boot (once the unit has been restored and re-enabled by `restore-units`).

## Boot-Time Restoration

Since `/run/` is a tmpfs, systemd units installed there do not survive reboots. A oneshot service restores them on boot. See [Systemd Integration](../../internals#systemd-integration) for details.

## Logs

[`rugix-ctrl apps logs`](../../logs) reads the journal entries of the app's service, `rugix-app-APP.service`, with `journalctl`. Besides the output of the workload, they include systemd's messages about the service, for example, that the workload exited with a failure. The `source` of a record is the syslog identifier of the process that logged it, by default the name of the executable, or `systemd` for systemd's messages. The severity derives from the journal priority. Fields that the workload passes to the journal through its native interface become fields of the record.

When it renders the unit template, Rugix Ctrl appends a `[Service]` section with `LogExtraFields=RUGIX_APP_GENERATION=N`, so that every journal entry of the workload carries its generation. Units rendered by earlier versions of Rugix Ctrl lack this field, and their records name no generation.

The journal keeps entries across reboots only if it stores them persistently. See `Storage=` in [`journald.conf`](https://www.freedesktop.org/software/systemd/man/latest/journald.conf.html).
