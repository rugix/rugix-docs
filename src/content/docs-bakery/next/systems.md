---
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

You can built different types of artifacts for a given system.
Currently, Rugix Bakery can build full system images and Rugix Ctrl update bundles.
Generally, artifacts are build with a command of the form:

```shell
./run-bakery bake <type> <system>
```

Here, `<type>` is the type of the artifact and `<system>` is the name of the system.

For instance, to build an image for a given system, run:

```shell
./run-bakery bake image <system>
```

## Repository Build Rules

For a custom image pipeline, select a [repository build rule](/docs/bakery/next/build-rules) with
`build.uses`. Bakery builds the layer as usual, then passes its root filesystem
and other artifacts to that rule. The repository controls boot packaging, signing,
disk assembly, and update bundle creation. Use the rule's parameters and inputs
instead of the `target`, `image`, and `options` settings described below.

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
`bake bundle` adds an update bundle using the same partition artifacts.
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
