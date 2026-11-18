---
title: Application Logs
order: 6
---

When an app fails to start or crashes, its logs usually tell you why. Each orchestrator keeps the logs of its workloads in a different place: Docker keeps the output of containers, the journal keeps the output of systemd services, and a generic app may write to files. `rugix-ctrl apps logs` reads them from wherever they are and prints them in one format, so that you and management tools can inspect any app the same way.

## Reading Logs

To print the most recent log records of an app:

```shell
rugix-ctrl apps logs APP
```

For each record, the command prints the time, the generation as `#N`, the source, and the severity, as far as they are known, followed by the message and the fields of the record:

```text
2026-11-17T10:21:03.123456Z #3 web WARNING disk almost full free_mb=120
2026-11-17T10:21:04.002117Z #3 web 10.0.2.2 - - [17/Nov/2026:10:21:04 +0000] "GET / HTTP/1.1" 200 615
```

Rugix Ctrl merges the records of all sources of an app, for example, of all its containers, in chronological order. The records may stem from several generations, for example, from a failed update and the generation restored by its rollback. By default, it prints the 200 most recent records. You can select records with the following options:

| Option         | Effect                                                      |
| -------------- | ----------------------------------------------------------- |
| `--lines N`    | Print the `N` most recent records.                          |
| `--since TIME` | Only print records logged at or after `TIME`, in RFC 3339.  |
| `--until TIME` | Only print records logged at or before `TIME`, in RFC 3339. |
| `--json`       | Print records as JSON objects, one per line (see below).    |

Records without a time pass the time filters. Only the scripts of generic apps can print such records.

The command works in every lifecycle state of an app, including after a failed activation and in the `error` state. It uses the orchestrator of the current generation or, if there is none, of the newest complete generation. It reads the logs that exist and exits. To follow the logs of a workload live, use the tools of its orchestrator, such as `journalctl --follow`.

Logs may contain sensitive data. Reading them requires root privileges or, through the [privileged daemon](../../reference/privileged-daemon), the `app-lifecycle` feature.

## Log Records

With `--json`, Rugix Ctrl prints each record as a JSON object on its own line, described by a [JSON Schema](https://github.com/rugix/rugix/blob/main/schemas/rugix-ctrl-output-app-log-record.schema.json):

<!-- prettier-ignore -->
```jsonl
{"timestamp":"2026-11-17T10:21:03.123456Z","source":"web","severity":"warning","stream":"stdout","generation":3,"message":"disk almost full","fields":{"free_mb":120}}
```

| Field        | Description                                                                    |
| ------------ | ------------------------------------------------------------------------------ |
| `timestamp`  | Time at which the record was logged, in RFC 3339, if known.                    |
| `source`     | Producer of the record, such as a Compose service or a process name, if known. |
| `severity`   | One of `trace`, `debug`, `info`, `warning`, `error`, and `critical`, if known. |
| `stream`     | `stdout` or `stderr`, if known.                                                |
| `generation` | Generation whose workload produced the record, if known.                       |
| `message`    | Message of the record.                                                         |
| `fields`     | Structured fields of the record, if any.                                       |
| `truncated`  | `true` if Rugix Ctrl cut the record because it exceeded a length limit.        |

Every line that a workload writes to its standard output or standard error becomes one record. Output that spans several lines, such as a stack trace, therefore spans several records. Logging structured records with the stack trace in a field keeps it in one record. Rugix Ctrl cuts messages at 64 KiB and lines of log output at 1 MiB, so that a misbehaving workload cannot make it read unbounded amounts of data into memory. It skips journal entries larger than 1 MiB, because it cannot parse them once cut.

## Structured Logs

Many logging libraries can write each record as a JSON object on one line. An app can declare that its workload does so in its [app manifest](../internals#app-manifest):

```toml title="app.toml"
[logs]
format = "json"
```

`rugix-bundler apps pack` writes this declaration when you pass `--log-format json`. Rugix Ctrl then turns each line that is a JSON object into a structured record:

- The message comes from the `msg` or `message` key.
- The severity comes from the `level`, `severity`, or `lvl` key, if it holds a level name such as `debug`, `info`, `warn`, `error`, or `fatal`.
- All other keys become fields of the record.

For example, the line `{"level":"warn","msg":"disk almost full","free_mb":120}` becomes the record shown above. Lines that are not JSON objects stay plain text, so that output which bypasses the logging library, such as the message of a crashing runtime, still appears.

## Sources of Logs

Each orchestrator determines where the logs of its workloads are:

- The [`docker-compose`](../orchestrators/docker-compose#logs) orchestrator reads the output of the containers of the app with `docker logs`.
- The [`binary`](../orchestrators/binary#logs) orchestrator reads the journal entries of the app's systemd service with `journalctl`, including systemd's messages about the service, such as the exit status of a crashed workload.
- The [`generic`](../orchestrators/generic#logs) orchestrator runs the `logs` operation of the app's orchestrator script.

How long logs are kept depends on where they are. In particular, Docker deletes the logs of a container together with the container, and the journal does not survive a reboot unless it is stored persistently. See the page of each orchestrator for details.
