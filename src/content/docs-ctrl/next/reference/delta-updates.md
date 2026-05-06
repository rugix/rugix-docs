---
title: Delta Updates Reference
order: 20
---

# Delta Updates Reference

Operational details for [delta updates](../delta-updates) — how to enable each variant, server requirements, the relevant CLI commands, and current limitations.

## Dynamic Delta Updates

Rugix Ctrl supports _dynamic delta updates_ via HTTP range queries.
If you are installing an update via HTTP, the server supports range queries, and the bundle and system contain the necessary _block indices_, then Rugix Ctrl will adaptively download only parts of the update that it does not already have, e.g., within the currently booted system partition.[^delta-read-only]

[^delta-read-only]: Currently, this requires the system partition to be read-only. We will lift that restriction in the future. However, note that a read-only system partition is recommended in any case and made easy with Rugix Ctrl's state management functionality. For now, if a partition has been modified after creating the index used by an update, the update will simply fail without rebooting.

### Server Requirements

Any HTTP server that supports byte-range requests works. This includes virtually every standard HTTP server, all S3-compatible object stores, and most CDNs. No special infrastructure is required.

### Slot Indices

While we will improve the workflow in the future, dynamic delta updates currently require the manual creation of system block indices, for instance with:[^future-delta]

[^future-delta]: In the future, Rugix Ctrl will create indices automatically based on the indices it finds in the bundle.

```shell
rugix-ctrl slots create-index boot-a casync-64 sha512-256
rugix-ctrl slots create-index system-a casync-64 sha512-256
```

The update bundles built with Rugix Bakery use the parameters `casync-64` and `sha512-256` by default.
If you want to use dynamic delta updates right now, just create the indices before installing the update bundle via HTTP.
If the currently active system is A, then create an index for `system-a` and `boot-a`.
If the currently active system is B, then create an index for `system-b` and `boot-b`.
You can use `rugix-ctrl system info` to query whether the currently booted system is A or B.

Here is an example script for installing an update:

```shell title="install-update.sh"
#!/usr/bin/env bash

set -euo pipefail

URL=$1

ACTIVE_SYSTEM=$(rugix-ctrl system info | jq -r ".boot.activeGroup")

if [ "$ACTIVE_SYSTEM" == "a" ]; then
    rugix-ctrl slots create-index boot-a casync-64 sha512-256
    rugix-ctrl slots create-index system-a casync-64 sha512-256
else
    rugix-ctrl slots create-index boot-b casync-64 sha512-256
    rugix-ctrl slots create-index system-b casync-64 sha512-256
fi

rugix-ctrl update install "$URL"
```

For background on what block indices are and how they work, see [Update Bundles reference: Block Encoding](./update-bundles#block-encoding).

## Static Delta Updates

Rugix's static delta updates require the pre-computation of explicit *patches* to go from the old version to the new version. This is done with Rugix Bundler's `delta` subcommand, which takes the old and the new update bundle and computes a patch bundle:

```shell
rugix-bundler delta <old> <new> <patch>
```

If you are using Rugix Bakery, you can use `./run-bakery bundler delta` instead.

By default, Rugix Bundler will compute a patch for the `system` and `boot` slots, respectively. As the boot partition is usually modified by Rugix, the delta for the `boot` slot is computed against the `system` slot of the old version. If you want to compute patches for other slots, use the `--slot` option to provide a list of slots. You can use the syntax `new:old` to compute a patch for the `new` slot of the new version against the `old` slot of the old version.

**Slots must be immutable** for static delta updates to work.

Rugix Bundler will include a hash of the old slot data in the patch bundle. This hash is used by Rugix Ctrl when installing the update to determine whether the required source for applying the patch is actually installed. In addition, it also includes a hash of the new slot data which is used to check the integrity of the new version after installing it.

:::note
Rugix Bundler as well as the installation of static delta updates with Rugix Ctrl require `xdelta3` to be installed on the system.
:::

### Targeting

You can either track versions yourself (outside Rugix) to target updates for specific versions, or you can query Rugix's slot database through `rugix-ctrl system info` to get information about what is installed to determine which update to use.

### Limitations

Static delta updates currently only work after the first update has been installed, as this is when the slot database is populated. There is currently no built-in way to initialize the slot database prior to the first update.

## Update Simulator

To estimate the impact of different delta update techniques on your specific update scenarios, use the simulator built into Rugix Bundler. For details about the different techniques, see our [blog post on Efficient Delta Updates](/blog/efficient-delta-updates):

```shell
rugix-bundler simulator
```
