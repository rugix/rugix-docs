---
title: Compatibility Checks
order: 35
---

Compatibility checks let Rugix Ctrl reject an update before installation when the update is known to be incompatible with the device, the installed operating system, or active applications.

The mechanism is based on **components**. A component describes one installed or candidate system component, app, runtime, hardware fact, or Rugix-provided fact. Components provide capabilities, claim exclusive resources, require capabilities, and may conflict with capabilities.

## Why It Matters

Version numbers alone are usually not enough to decide whether an update is safe for a device. Devices in a fleet may share a product name but differ in hardware revisions, CPU architecture, provisioned features, installed applications, or runtime services.

Compatibility metadata makes these constraints explicit. For example:

- A system image for an edge gateway revision 2 can require `hardware.edge-gateway` version `>=2,<3`.
- A base OS update can provide `system.edge-os` version `6.0.0`, while an active app requires `system.edge-os` version `>=5,<6`.
- An app bundle can require `rugix.ctrl` version `>=1.3` or a runtime capability such as `runtime.docker-compose`.
- A device can expose `host.arch = "aarch64"` so bundles can declare the architecture they support.

This does not replace testing. It encodes known constraints so obviously wrong updates fail early and the reason can be shown to an operator or fleet-management UI.

## Component Model

A component has:

- an `id`,
- an optional `version`,
- optional `provides`,
- optional `claims`,
- optional `requires`,
- optional `conflicts`.

A **capability** is a fact provided by a component. It has an `id` and may have either a `version` or a `value`.

A **claim** is an exclusive resource key owned by a component. It has only an `id`. Two active components must not claim the same ID. Claims are for resources where there can be only one owner, such as `network.tcp.8080`, `fs.path./var/lib/example`, or a systemd unit name.

A **requirement** is a selector that must match at least one provided capability.

A **conflict** is a selector that must not match any provided capability.

Each component also implicitly provides a capability with its own component ID and version. For example, a component with `id = "system.edge-os"` and `version = "5.2.0"` implicitly provides the capability `system.edge-os` at version `5.2.0`.

A component set is consistent when:

- no two components have the same component ID,
- no two components claim the same claim ID,
- every requirement selector matches at least one provided capability,
- no conflict selector matches any provided capability.

Claims do not satisfy requirements. If another component should be able to depend on the resource or discover a service, publish a separate capability in `provides`.

Selectors match by capability ID first. If a selector includes `version`, the matched capability must have a version satisfying that requirement. If a selector includes `value`, the matched capability must have exactly that value.

## Installed Component Sources

`rugix-ctrl components` loads component declarations from TOML or JSON files. Each file contains one component declaration. Directories are scanned recursively, and files are processed in path order.

Rugix Ctrl currently loads components from:

| Source kind | Path                                                  | Intended use                                                                     |
| ----------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| `System`    | `/usr/lib/rugix/components`                           | Metadata installed as part of the immutable system image.                        |
| `Local`     | `/etc/rugix/components`                               | Persistent local or admin-provided metadata, such as provisioned hardware facts. |
| `Runtime`   | `/run/rugix/components`                               | Metadata generated at boot or runtime.                                           |
| `App`       | `.rugix/components` inside each active app generation | Metadata owned by active Rugix Apps.                                             |
| `Synthetic` | `rugix:synthetic`                                     | Facts synthesized by Rugix Ctrl itself.                                          |

Missing component roots are ignored. If a root exists but is not a directory, cannot be read, or contains an invalid component file, Rugix Ctrl reports an error.

Only active app generations contribute app-owned components. Inactive app generations do not affect compatibility checks.

## Synthetic Facts

Rugix Ctrl currently adds one synthetic component:

```toml
id = "rugix.host"

[[provides]]
id = "host.arch"
value = "aarch64"

[[provides]]
id = "rugix.ctrl"
version = "1.3.0"
```

`host.arch` is the architecture Rugix Ctrl was built for, using Rust's target architecture name such as `x86_64` or `aarch64`.

`rugix.ctrl` uses Rugix's `RUGIX_GIT_VERSION`. If the value can be parsed as a Rugix component version, it is exposed as a versioned capability. If it cannot be parsed, for example when the local build reports `unknown`, it is exposed as a value capability instead.

Rugix Ctrl intentionally does not synthesize hardware revision facts. Hardware model, board revision, provisioned peripherals, or customer-specific capabilities should come from `/etc/rugix/components` or `/run/rugix/components`.

## Bundle Components

A bundle may declare candidate components in a top-level `components/` directory next to `payloads/`:

```text
BUNDLE_DIR/
  rugix-bundle.toml
  payloads/
    system.ext4
  components/
    system.toml
```

When `rugix-bundler bundle` packs the bundle, it embeds those files into an optional `components` section in the bundle header. Only `.toml` and `.json` files are accepted. Paths must be relative, regular files, and must not be symlinks.

The `components` section is optional so bundles without compatibility metadata remain valid.

## System Update Checks

`rugix-ctrl update install` checks compatibility after bundle verification and before update hooks or payload installation, unless `--skip-compatibility-check` is passed.

For a full system update, Rugix Ctrl builds a candidate component set as:

- all currently installed components except source kind `System`,
- plus the components declared by the bundle.

This means the comparison uses the local, runtime, app, and synthetic facts from the device that is actually running the update. Rugix Ctrl does not maintain separate remembered state for previous system updates.

The installed system image should still contain the same system component files under `/usr/lib/rugix/components`. The bundle-declared files are used for the pre-install check; after the new system boots, future checks use what is actually installed in `/usr/lib/rugix/components`.

For an incremental update with component metadata, Rugix Ctrl replaces only installed components whose component IDs are declared by the bundle:

- all currently installed components except components with IDs declared by the bundle,
- plus the components declared by the bundle.

This lets an incremental bundle update a runtime, firmware component, or other named component without treating the bundle as a complete system replacement.

If an update bundle does not declare components, Rugix Ctrl logs a warning and skips the compatibility check.

## App Lifecycle Checks

`rugix-ctrl apps install` uses the same compatibility mechanism, unless `--skip-compatibility-check` is passed. Rugix Ctrl locks the apps touched by the bundle before checking compatibility and keeps those locks until installation is complete.

For an app bundle that declares components, Rugix Ctrl first determines which app the bundle updates. Component-bearing app bundles must currently contain payloads for exactly one app. Bundles that declare components but touch zero apps or multiple apps are rejected.

The candidate component set is:

- all currently installed components except app-owned components for the touched app,
- plus the components declared by the bundle.

On successful installation, Rugix Ctrl writes the bundle-declared component files into the new app generation's `.rugix/components` directory. App component files therefore belong in the bundle's top-level `components/` directory, not inside the app archive.

If an app bundle declares components, those files are still validated and persisted even when `--skip-compatibility-check` is used. The skip flag bypasses the consistency decision, not metadata installation.

If an app bundle does not declare components, Rugix Ctrl still checks the candidate set with the touched apps' currently active components removed. This catches updates from an app generation that provided capabilities to a new generation that provides none.

Other app lifecycle commands are checked as well:

- `rugix-ctrl apps activate APP [GENERATION]` checks the candidate set with the selected generation's `.rugix/components` replacing the app's currently active components.
- `rugix-ctrl apps rollback APP` checks the same replacement, using the generation that rollback would activate.
- `rugix-ctrl apps deactivate APP` checks the candidate set with the app's active components removed.
- `rugix-ctrl apps remove APP` also checks the candidate set with the app's active components removed before deleting the app.

`rugix-ctrl apps start`, `rugix-ctrl apps stop`, and `rugix-ctrl apps gc` do not change the active component set and therefore do not run compatibility checks.

## Examples

A device-specific hardware declaration can live in `/etc/rugix/components/hardware.toml`:

```toml title="/etc/rugix/components/hardware.toml"
id = "hardware.local"

[[provides]]
id = "hardware.edge-gateway"
version = "2.1.0"

[[provides]]
id = "hardware.revision"
value = "rev-b"
```

A system image can ship `/usr/lib/rugix/components/system.toml` and include the same file in the bundle's top-level `components/` directory:

```toml title="components/system.toml"
id = "system.edge-os"
version = "5.2.0"

[[requires]]
id = "hardware.edge-gateway"
version = ">=2,<3"

[[requires]]
id = "host.arch"
value = "aarch64"
```

An app bundle can declare its requirements in `components/app.toml`:

```toml title="components/app.toml"
id = "app.analytics"
version = "1.4.0"

[[claims]]
id = "network.tcp.8080"

[[requires]]
id = "system.edge-os"
version = ">=5"

[[requires]]
id = "runtime.docker-compose"
version = ">=2.20"
```

Runtime discovery can write files to `/run/rugix/components`. For example, a boot-time probe could publish a capability only when a TPM is present and provisioned:

```toml title="/run/rugix/components/tpm.toml"
id = "hardware.tpm"

[[provides]]
id = "hardware.tpm.provisioned"
value = "true"
```

## Versions

Component and capability versions use Rugix's component version grammar:

- one or more dot-separated numeric release components, such as `5`, `5.2.0`, `2026.05.12`, or `20260625071935`,
- an optional prerelease suffix introduced by `-`, such as `5.2.0-rc.1`,
- optional build metadata introduced by `+`, such as `5.2.0+build.7`.

Release components are compared numerically. Trailing zero components are ignored for comparison, so `5`, `5.0`, and `5.0.0` compare equal. Leading zeroes are accepted and preserved for display, so `2026.05.12` round-trips with the leading zeroes intact.

Prerelease versions sort before the corresponding final release. Build metadata is preserved for display but ignored for equality, ordering, and requirement matching.

Version requirements are comma-separated comparators. All comparators must match. Supported operators are `=`, `==`, `!=`, `>`, `>=`, `<`, and `<=`. A bare version is treated as an exact match, and `*` matches any version.

Examples:

```toml
version = ">=5,<6"
version = "!=5.2.0"
version = "2026.05.12"
version = "*"
```

## Inspecting Components

The `rugix-ctrl components` command group prints structured JSON.

List all loaded components and the roots that were scanned:

```shell
rugix-ctrl components list
```

Show components with a specific component ID:

```shell
rugix-ctrl components info system.edge-os
```

Check the loaded component set for consistency:

```shell
rugix-ctrl components check
```

`components check` always prints a JSON report when component metadata can be loaded. It uses the following exit codes:

| Exit code | Meaning                                                            |
| --------- | ------------------------------------------------------------------ |
| `0`       | The component set is consistent.                                   |
| `1`       | The component set was loaded, but consistency problems were found. |
| `2`       | Component metadata could not be loaded or the report failed.       |

The JSON report includes:

- the scanned `roots`,
- the loaded `components` with their source,
- a `consistent` boolean for `components check`,
- a `problems` array for duplicate component IDs, unsatisfied requirements, and conflicts.

Source objects include the source `kind`, source `path`, and, for app-owned metadata, the app name and active generation number.

## Skipping Checks

System installs and app lifecycle commands that change the active component set accept `--skip-compatibility-check`:

```shell
rugix-ctrl update install --skip-compatibility-check BUNDLE.rugixb
rugix-ctrl apps install --skip-compatibility-check APP.rugixb
rugix-ctrl apps activate --skip-compatibility-check APP GENERATION
rugix-ctrl apps deactivate --skip-compatibility-check APP
rugix-ctrl apps rollback --skip-compatibility-check APP
rugix-ctrl apps remove --skip-compatibility-check APP
```

Use this only as an explicit operational override. Bundle verification still applies unless separately disabled with `--insecure-skip-bundle-verification`.

## Practical Guidance

Use `/usr/lib/rugix/components` for metadata that belongs to the system image itself. Include the same metadata in the bundle's top-level `components/` directory so Rugix Ctrl can check the candidate system before installing it.

Use `/etc/rugix/components` for facts provisioned for a specific device and intended to persist across updates, such as hardware model, board revision, or customer-specific capabilities.

Use `/run/rugix/components` for facts detected dynamically and regenerated at boot or runtime.

Use bundle-declared components for apps. Rugix Ctrl persists them into the active app generation's `.rugix/components` directory during `rugix-ctrl apps install`.
