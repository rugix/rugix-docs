---
order: 30
---

# Systems

A project can contain build definitions for multiple types of _systems_.
If you are developing an embedded device, it is very likely that you eventually need to support different versions or variants of the device simultaneously.
Furthermore, you may want to build images and other artifacts specifically for testing purposes with development tooling and testing keys or certificates.
You can do all that within a single Rugix Bakery project, allowing you to share build configurations between the different systems.

Systems are defined in the `systems` section of the project configuration.
Here is an example taken from the [Debian template](https://github.com/rugix/rugix-bakery/tree/main/container/templates/debian-grub-efi):

```toml
[systems.customized-arm64]
layer = "customized"
architecture = "arm64"
target = "generic-grub-efi"
```

Each system has a _name_ (`customized-arm64` in the example), is based on a layer providing the root filesystem and Linux kernel for that system (`customized` in the example), and has a concrete CPU architecture (`arm64` in the example).
The `target` setting is optional and used to select defaults for supported devices (see below).

Build all published artifacts with:

```shell
./run-bakery bake system <system>
```

Select artifacts by published file name with repeatable `--artifact` flags.
For example, `--artifact system.img` skips bundle and SBOM work that the image
does not depend on. `--output DIR` replaces that directory with exactly the
selected artifacts and `build-context.json`. The default is `build/<system>/`.

`bake image` and `bake bundle` remain available as deprecated commands.

## System Mixins

A mixin adds recipes and configuration after a system's selected layer. This is
useful for variations such as enabling debugging tools without creating a
separate layer configuration. For example, define a mixin that enables SSH:

```toml title="mixins/development.toml"
recipes = ["core/ssh"]
```

Select it for a development system:

```toml title="rugix-bakery.toml"
[systems.development]
layer = "customized"
architecture = "arm64"
target = "generic-grub-efi"
mixins = ["development"]
```

Rugix Bakery builds the selected layer, applies the mixin, then assembles the
resulting system. Mixins can declare dependencies on other mixins and use the
same recipe parameters and artifact input bindings as layers. See the
[mixin schema](/docs/bakery/next/reference/schemas#mixins) for all settings.

## Repository Build Rules

A system's `rules` table declares named [build rules](/docs/bakery/next/build-rules).
Its `outputs` table maps published file names to artifacts from those rules.
Rugix Bakery builds the layer and prepares release metadata, then supplies its
root filesystem and other artifacts to those rules. The rules can
compose filesystem creation, boot packaging, signing, disk assembly, and update
bundle creation.

For example, this project builds a Debian root filesystem into an ext4 image
and a tar archive. First, define a layer that sets the hostname:

```toml title="layers/demo.toml"
parent = "core/debian-bookworm"
recipes = ["core/set-hostname"]

[parameters."core/set-hostname"]
hostname = "demo"
```

Define a reusable pipeline with a `rootfs` input and two output artifacts:

```toml title="rules/filesystem-release/rule.toml"
[inputs.rootfs]
kind = "directory"

[parameters.label]
default = "system"

[execution]
type = "graph"

[execution.rules.filesystem]
uses = "core/image-ext4"
inputs.tree = { input = "rootfs" }
parameters.label = { parameter = "label" }

[execution.rules.archive]
uses = "core/archive-tree"
inputs.tree = { input = "rootfs" }

[execution.outputs]
image = { rule = { node = "filesystem", output = "image" } }
"rootfs.tar" = { rule = { node = "archive", output = "archive" } }
```

Select that pipeline for a system:

```toml title="rugix-bakery.toml"
[systems.demo]
layer = "demo"
architecture = "amd64"

[systems.demo.rules.release]
uses = "filesystem-release"
parameters.label = "demo-root"

[systems.demo.outputs]
"system.img" = { rule = { node = "release", output = "image" } }
"rootfs.tar" = { rule = { node = "release", output = "rootfs.tar" } }
```

Here, `uses` names the rule directory. Rugix Bakery supplies the layer's `rootfs`
artifact to the rule's input of the same name. The composition connects it to
both core rules. The `label` parameter sets the ext4 volume label; the image
sizes itself from the filesystem tree.

Build the artifacts with:

```shell
./run-bakery bake system demo
```

The pipeline's `image` output becomes `build/demo/system.img`, and its
`rootfs.tar` output becomes `build/demo/rootfs.tar`. This example produces a
filesystem image without a partition table, kernel, or bootloader. A bootable
pipeline must also prepare those artifacts. Systems can publish any artifacts;
`system.img` is required by `run` and `test`. These commands publish all system
artifacts except `system.rugixb` and `system.rugixb-hash`, preserving inventories
and other outputs alongside the image.

The rule can also live in a dependency repository. After adding that repository
to the project, select it with a qualified name such as
`uses = "vendor/filesystem-release"`. The project still supplies the layer;
the repository supplies the reusable pipeline.

See [Assemble a System](/docs/bakery/next/build-rules#assemble-a-system) for all supplied
artifacts and output conventions. Configure a repository pipeline through its
inputs and parameters. Every declared rule must be referenced transitively by an
output. Published names must be flat file names. `build-context.json` is reserved.

When `target` or `image` is set, the predefined pipeline runs as the reserved
node `target`. Systems that set only `image` use the `unknown` target. The
pipeline's outputs are published by default. Rules can use its outputs, and
`outputs` can publish additional files. Their names must not collide with the
pipeline's files. `options` and `bundle` require this pipeline.

### Add an Inventory to a Verified System

The secure EFI template declares its verified boot pipeline as
`systems.efi.rules.release`. An independent rule can use the same prepared
root filesystem to create an SBOM. For example, add this rule:

```toml
[systems.efi.rules.sbom]
uses = "core/sbom"
inputs.tree = { input = "rootfs" }
```

Add this line to the existing `[systems.efi.outputs]` table:

```toml
"sbom.spdx.json" = { rule = { node = "sbom", output = "spdx" } }
```

The `context` input binds implicitly by name. Building `efi` publishes both
the verified artifacts and the inventory. Selecting only `system.img` skips
this independent SBOM rule and the update bundle.

### Bundle Encoding

For `generic-grub-efi`, `rpi-tryboot`, `rpi-uboot`, and `bsp`, the predefined
pipeline publishes `system.rugixb` and `system.rugixb-hash` by default.
Systems without a target or with `target = "unknown"` default to no bundle;
explicitly enabling one is rejected.

Bundle payload compression defaults to true. The chunker uses the same syntax
as the bundle CLI, such as `casync-64` or `fixed-64`, and defaults to `casync-64`.
For example:

```toml
[systems.device.bundle]
compression = false
chunker = "casync-64"
```

Set `enabled = false` to disable the bundle. BSP targets must declare
`[[bundle.payloads]]` in `rugix-bsp.toml` or disable bundles.

## Targets

When declaring a system within the project configuration, you can specify a _target_ that is appropriate for the respective device.
The primary purpose of targets is to build system images that can be directly booted on supported devices.
Targets typically support a whole family of devices and are categorized into _generic_, _specific_, and _unknown_ targets.

- **Generic targets** are based on some standardized booting mechanism, such as [UEFI](https://en.wikipedia.org/wiki/UEFI) or [EBBR](https://github.com/ARM-software/ebbr).
  Images built for generic targets are suitable for any device that supports the respective booting mechanism.
- **Specific targets**, on the other hand, are limited to a certain family of devices.
  Images built for specific targets come with all necessary device-specific configurations resulting in a bootable image that works out-of-the-box.
- **Unknown targets** are for devices that do not conform to a standardized booting mechanism and are not specifically supported by Rugix Bakery. Using unknown targets allows building images for unsupported devices; however, these images may require additional device-specific modifications to become bootable.

The target for a system is set by the `target` property in the system declaration.

For supported devices and the required targets, checkout the documentation on [Supported Devices](/docs/bakery/next/devices/).

Currently, Rugix Bakery supports the following targets:

- `generic-grub-efi`: A generic target that uses Grub as the bootloader and produces an image bootable on any EFI-compatible system.
  This is the right target for commodity AMD64 and ARM64 hardware and VMs.
- `rpi-tryboot`: Raspberry Pi-specific target that uses [the `tryboot` feature of Raspberry Pi's firmware](https://www.raspberrypi.com/documentation/computers/config_txt.html#example-update-flow-for-ab-booting).
  This is the right target for the Raspberry Pi 4 and 5 family of devices.
  Note that for Raspberry Pi 4 a recent firmware is required.
- `rpi-uboot`: Raspberry Pi-specific target that uses [U-Boot](https://docs.u-boot.org/en/latest/).
  This is the right target for older Raspberry Pi models.

Note that specific and generic targets result in images with a bootloader, however, to actually boot the operating system additional configurations may be required.
To this end, the following recipes can be used:

- `core/debian-grub-setup`: For Debian with `generic-grub-efi`.
- `core/alpine-grub-setup`: For Alpine with `generic-grub-efi`.
- `core/rpi-debian-setup`: For Debian with `rpi-tryboot`.
- `core/rpi-alpine-setup`: For Alpine with `rpi-tryboot`.
- `core/rpi-raspios-setup`: For Raspberry Pi OS with `rpi-tryboot` or `rpi-uboot`.

## Image Layouts

:::warning
**This is an experimental feature. We may introduce breaking changes to the configuration format in minor versions.**
:::

Usually, you do not need to worry about image layouts as Rugix Bakery automatically selects a suitable layout based on the system target.
For advanced use cases or devices that are not officially supported, Rugix Bakery also gives you the flexibility to configure how exactly the image should be built.
Currently, this is limited to creating partitions with optional filesystems.

#### Image Creation Process

The predefined pipeline creates an image through build rules:

1. Build the layer and prepare its release metadata.
2. Initialize the target's bootloader and firmware files.
3. Resolve the layout into a disk image containing partition tables and raw firmware.
4. Patch the boot configuration with the resolved partition identifiers.
5. Create filesystem images from the prepared trees.
6. Populate the disk with those filesystem images.

Filesystem archives and software inventories are separate rule outputs.
The pipeline includes an update bundle using the same partition artifacts.
See [repository build rules](/docs/bakery/next/build-rules#standard-system-pipeline) for how the
pipeline connects to the build graph.

Supported partition tables:

- `gpt`: [GUID Partition Table](https://en.wikipedia.org/wiki/GUID_Partition_Table) (modern partition table, part of the UEFI standard)
- `mbr`: [MBR Partition Table](https://en.wikipedia.org/wiki/Master_boot_record) (legacy partition table, supported by almost any system)

Supported filesystems:

- `ext4`: [Ext4 Filesystem](https://en.wikipedia.org/wiki/Ext4)
- `fat32`: [FAT Filesystem](https://en.wikipedia.org/wiki/File_Allocation_Table). For fixed capacities, the formatter selects FAT12, FAT16, or FAT32 to suit the image size.
- `squashfs`: Compressed, read-only SquashFS filesystem.

The image layout is specified in the `image.layout` section. For details, we refer to the [project configuration reference](/docs/bakery/next/projects#project-configuration).
