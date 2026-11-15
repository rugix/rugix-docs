---
title: System Runtime Specification
order: 5
---

The _System Runtime Specification_ is an open specification for describing **what a system is composed of** and **how healthy it is while it runs**. The system image, apps, and other parts of a device each describe themselves in small JSON files, and the specification defines how tools combine these descriptions into a picture of the whole system.

Embedded devices rarely run a single piece of software. A system image provides runtimes such as Docker or Python, apps deployed with [Rugix Apps](../../application-management/) run on top of it, and devices in a fleet may differ in their hardware revisions and peripherals. These parts are often built by different teams and updated on different schedules. Whether a device still works after an update therefore depends on more than the update itself: the new system image must still provide what the installed apps need, and the apps must actually come up and do their job. Answering these questions has traditionally been left to the integrator, with ad-hoc scripts and hooks that every tool reinvents. The System Runtime Specification standardizes how the parts of a system describe their compatibility requirements and health, so that update controllers, diagnostic tools, and fleet-management agents can all build on the same descriptions. Building on these descriptions, tools can also tell operators why an update was rejected or why a device is unhealthy, so that operators do not have to dig through logs and configuration files to find out.

## How It Works

As an example, consider an industrial gateway. Its system image ships Docker and Python, and a telemetry app deployed with Rugix Apps runs on it as a Docker Compose stack. The app reads machine data from a PLC, stores it in a PostgreSQL database, and uploads it to the cloud. Each of these parts publishes _records_ that describe only itself. The system image declares the runtimes it ships and the revisions of the gateway's board it supports:

```json
{
  "id": "system.gateway-os",
  "version": "5.2.0",
  "provides": [
    { "id": "docker.engine", "version": "26.1.5" },
    { "id": "docker.compose", "version": "2.27.0" },
    { "id": "python", "version": "3.11.2" }
  ],
  "requires": [{ "id": "hardware.gateway", "version": ">=2,<3" }]
}
```

The telemetry app declares in its own record that it requires Docker Compose 2.20.3 or later:

```json
{
  "id": "app.telemetry",
  "version": "2.1.0",
  "requires": [{ "id": "docker.compose", "version": ">=2.20.3,<3" }]
}
```

A third record describes the hardware. At boot, a service of the system image reads the board revision, for example, from the SoC's one-time programmable (OTP) memory or an EEPROM on the board, and publishes it:

```json
{
  "id": "hardware.gateway-board",
  "provides": [{ "id": "hardware.gateway", "version": "2" }]
}
```

Compatibility checking combines the three records and finds that every requirement is met. Now suppose that version 6 of the system image replaces Docker with Podman. Nothing in the version numbers reveals that the telemetry app no longer runs on it. Run on the records that the gateway would have after installing version 6, however, the same check reports that the app's requirement is no longer satisfied, before anything is installed.

:::note
_Component compatibility_ means that the declarations of a system's components are consistent: what each component requires is provided by some component, and no two components conflict. Because it is determined from records alone, a tool can check the composition that a system will have after an update before installing anything, provided that it has the records of the new version, for example, from the update bundle. [Candidate Compositions](./components#candidate-compositions) describes how such a composition is built.
:::

A compatible system can still fail at runtime, for example, if PostgreSQL does not accept connections after an update. Health captures such failures with checks that run on the system itself. While the system runs, a service of the telemetry app checks every few seconds whether PostgreSQL accepts connections and publishes the result as a _status record_:

```json
{
  "id": "app.telemetry.postgres",
  "state": "healthy",
  "bootId": "e09a482c-4a41-4f95-891e-042af3d3c4a4",
  "observedAtMs": 42000,
  "maxAgeMs": 15000
}
```

Besides the result in `state`, the record states when the check ran and how long its result remains valid. `bootId` identifies the current boot of the system, `observedAtMs` is the time of the check in milliseconds since that boot, and `maxAgeMs` is how long the result remains valid. Once that time has passed, the record expires, so a check that stops running cannot keep reporting an old result.

The `state` is one of four _health states_. They apply to individual checks, such as the database check, and to larger functions that depend on several checks, such as the telemetry app as a whole. The states are defined in terms of two kinds of criteria: _minimum criteria_, under which a check or function is still usable, and _desired criteria_, under which it is fully healthy.

- `healthy`: The desired criteria are met.
- `degraded`: The minimum criteria are met, but the desired ones are not confirmed.
- `unhealthy`: The minimum criteria are not met.
- `unknown`: The available results do not tell whether the minimum criteria are met.

For a single check, the service that runs it decides which state applies. A check without a current status record, for example, because its record has expired, is `unknown`.

The status record only reports the result of one check. How the results of the checks combine into the health of larger functions is declared separately, in a _health graph_ to which each part contributes nodes. Each check has a node that takes its state from the current status record with the same ID. For example, the telemetry app declares the node for its database check:

```json
{
  "id": "app.telemetry.postgres",
  "label": "PostgreSQL"
}
```

On top of the nodes for its checks, the telemetry app declares a node `app.telemetry` for the health of the app as a whole. This node has a _rule_ that derives its state from other nodes, here from the checks of the database, the PLC connection, and the upload:

```json
{
  "id": "app.telemetry",
  "rule": {
    "type": "aggregate",
    "inputs": [
      { "node": "app.telemetry.postgres" },
      { "node": "app.telemetry.plc" },
      { "node": "app.telemetry.upload", "optional": true }
    ]
  }
}
```

This node defines the app's minimum and desired criteria. While the upload fails, the app keeps collecting data and buffers it in the database, so the upload is an _optional_ input: it only matters for whether the app is fully healthy. The app is therefore usable as long as the database and the PLC connection are, and healthy only if all three checks are healthy.

The system image declares nodes of its own, for example, for a check of whether the data partition is mounted and writable. Health can also be derived from measurements. A service of the system image publishes the free space on the data partition as a [metric](./health#metrics) `data.free-space`, and a node with a _threshold_ rule compares it with declared ranges:

```json
{
  "id": "system.data-space",
  "label": "Free space on data partition",
  "rule": {
    "type": "threshold",
    "metric": "data.free-space",
    "healthy": { "lower": { "value": 1073741824, "inclusive": true } },
    "usable": { "lower": { "value": 104857600, "inclusive": true } }
  }
}
```

The data partition is healthy with at least 1 GiB of free space and usable with at least 100 MiB. Further nodes can combine the health of several parts, for example, into whether the system is ready to commit an update. Together, the nodes form a graph:

```
system.commit
├── system.data-partition
├── system.data-space
└── app.telemetry
    ├── app.telemetry.postgres
    ├── app.telemetry.plc
    └── app.telemetry.upload
```

For example, if the upload fails because the gateway has lost its internet connection, `app.telemetry` is still usable but not fully healthy, so it becomes `degraded`. `system.commit` requires all of its inputs to be healthy, so it becomes `degraded` as well. If PostgreSQL does not accept connections, `app.telemetry` becomes `unhealthy`. If the status record of the database check expires instead, the available results do not tell whether the app is usable, and `app.telemetry` becomes `unknown`.

## Explaining Problems

The records do more than decide whether an update is compatible or a system is healthy. They also explain why, in terms of the system's parts. For the gateway from the example, a tool could tell an operator:

- "Version 6.0.0 of `system.gateway-os` is incompatible: `app.telemetry` 2.1.0 requires `docker.compose` `>=2.20.3,<3`, which no component provides."
- "Telemetry is degraded: the upload is unhealthy (Cannot reach upload server)."
- "The system is not ready to commit: the free space on the data partition is 500 MB, but healthy only from 1 GiB."

Each of these messages is assembled from the records and the results of evaluating them. A compatibility report names the component whose requirement is not satisfied and the requirement itself. The result of an aggregate node lists its inputs and their states, labels give nodes readable names, status records carry the message of their check, and threshold nodes declare the ranges that a measurement is compared with. An operator therefore sees which part of the system causes a problem and why. How a tool phrases and presents such explanations is up to the tool.

## Two Independent Parts

The specification consists of two parts, which can be used independently of each other:

- **[Components](./components)** defines how components declare what they provide and require, and how compatibility checking evaluates these declarations.
- **[Health](./health)** defines how parts declare their checks, how services publish the results, and how both combine into the health of a system's functions. It also defines _metrics_, numeric measurements such as the CPU temperature, from which health can be derived.

## Records in the Filesystem

On Linux, records are JSON files in standard directories, one record per file. The system image ships its records in `/usr/lib/system-runtime`, records specific to a device go into `/etc/system-runtime`, and services write status records and metric samples into `/run/system-runtime`, which is empty after every boot. An app ships its records inside its installation directory, and a directory configuration tells tools where to find them. Tools read the records whenever they need them, so no daemon has to run for a part to publish its records. [Discovery and Transport](./discovery) describes the directories in detail, how to write records safely, and how to send health information to another system.

## Using the Results

The specification defines the records and how to evaluate them. When to evaluate them and how to act on the results is up to the tools. Typical uses are:

- An update controller checks the compatibility of the components that an update would produce and rejects the update before installing it if they are incompatible.
- After booting into an update, an update controller evaluates health and commits the update only once a particular function is healthy. How long it waits and when it rolls back remain its own decisions.
- A diagnostic tool or a fleet-management agent shows the health of a device's functions, which check failed, and when each check last ran.

## Owners

Records come from different contributors, such as the system image or an app, and are replaced or removed together with their contributor. Each record can name the contributor that owns it in its `owner` field. To determine the records a system would have after replacing a contributor, for example, with a new version of the system image, a tool removes all records owned by the contributor and adds the records of the replacement, as shown in [Candidate Compositions](./components#candidate-compositions).

Owners are opaque strings compared exactly. Readers never derive an owner from the location of a file, so each record states its owner itself. With Rugix, use `rugix.system` for the system image and `rugix.apps.<name>` for an app with the name `<name>`. Records without an owner are valid, but cannot be replaced by owner.

## Language Packages

Packages for Rust, Python, and TypeScript implement the specification. They provide models for all records, compatibility checking, and health evaluation. The Rust and Python packages also read records from the standard directories.

| Language   | Package                                                                            | Import As             |
| ---------- | ---------------------------------------------------------------------------------- | --------------------- |
| Rust       | [`system-runtime-spec`](https://crates.io/crates/system-runtime-spec) on crates.io | `system_runtime_spec` |
| Python     | [`system-runtime-spec`](https://pypi.org/project/system-runtime-spec/) on PyPI     | `system_runtime_spec` |
| TypeScript | [`system-runtime-spec`](https://www.npmjs.com/package/system-runtime-spec) on npm  | `system-runtime-spec` |

The [specification repository](https://github.com/rugix/system-runtime-spec) contains the Sidex schemas, JSON Schemas for every record, and shared test fixtures for implementations in other languages.
