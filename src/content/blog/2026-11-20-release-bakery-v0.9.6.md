---
slug: releases/bakery-0.9.6
title: Rugix Bakery 0.9.6
description: Rugix Bakery 0.9.6 introduces build rules for composing image pipelines from reusable operations and adds verified boot for EFI systems and Raspberry Pi.
authors: koehlma
tags: [rugix, release, bakery, verified boot, embedded linux]
---

We are excited to announce the release of Rugix Bakery 0.9.6. 🎉

Rugix Bakery 0.9.6 introduces _build rules_, a new build engine that lets projects define their own build operations and combine them into pipelines. Rules can compile an application, sign boot artifacts, assemble disks, or package update bundles, and you can share them across projects just like layers and recipes. Building on the new engine, the release adds verified boot for EFI systems and for Raspberry Pi 4, Compute Module 4, and Pi 5, together with two project templates to get you started.

<!-- truncate -->

## Why a New Build Engine?

Rugix Bakery is Rugix's build tool for embedded Linux systems. It produces release artifacts such as a disk image for provisioning new devices and an update bundle for Rugix Ctrl, the update tool running on the device. A project defines one or more _systems_, named build configurations that each combine a layer with an image pipeline. _Layers_ and _recipes_ prepare a root filesystem, for example, by bootstrapping Debian, installing packages, and configuring services. The _image pipeline_ then packages the finished layer into release artifacts.

Layers and recipes have always been in your hands: recipes consist of ordinary scripts, and repositories let you share them across projects. The image pipelines, however, were built into Rugix Bakery, with one fixed pipeline per supported boot flow. These pipelines cover standard setups well, but products often need operations beyond them, for example, signing boot artifacts with their own keys, packaging a device-specific boot image, or producing an additional artifact such as a filesystem archive. Until now, such operations had to run in scripts outside of Rugix Bakery.

Verified boot shows how quickly these operations come to depend on each other. The root hash of a verified root filesystem goes into the kernel command line, the command line goes into a signed boot image, and the boot image goes into both the disk image and the update bundle. Whenever the root filesystem changes, the whole chain must rebuild. An image pipeline is a dependency graph, and build rules let you define that graph yourself.

## Build Rules

A _rule_ is a reusable operation with named inputs, parameters, and outputs. Its implementation runs a command, builds a layer, or combines other rules into a _composition_. Commands run with the tools included in Rugix Bakery or in a [_tooling environment_](/docs/bakery/envs) that you define with a Dockerfile, for example, to provide a cross-compiler or a vendor's signing tool.

For example, the following composition uses two core rules to create an ext4 image and an archive of the same root filesystem:

```toml title="rules/root-artifacts/rule.toml"
[inputs.rootfs]
kind = "directory"

[execution]
type = "graph"

[execution.rules.filesystem]
uses = "core/image-ext4"
inputs.tree = { input = "rootfs" }

[execution.rules.archive]
uses = "core/archive-tree"
inputs.tree = { input = "rootfs" }

[execution.outputs]
image = { rule = { node = "filesystem", output = "image" } }
archive = { rule = { node = "archive", output = "archive" } }
```

A system can invoke this rule on its layer's root filesystem and publish both outputs, for example, as `system.img` and `rootfs.tar`. A single `./run-bakery bake system` command then builds the layer and both artifacts.

Layers and rules form a single dependency graph, which has several benefits:

- **Precise caching.** Rugix Bakery caches the outputs of each operation and tracks what they depend on. When you change a recipe, Rugix Bakery rebuilds the affected layers and only those artifacts that depend on them.
- **Artifacts in both directions.** Rules can consume layers, and recipes can consume rule outputs. For example, a rule can compile an application in a tooling environment, and a recipe can then install the result into a layer.
- **Selective builds.** `bake system --artifact system.img` builds only the image and its dependencies, skipping the update bundle and other independent artifacts.
- **Replaceable operations.** A composition can declare a _rule parameter_, an operation with a fixed interface and a default implementation that callers can replace with their own rule. For example, you can replace a signer that reads a private key from a file with one that [signs through an HSM or KMS](/docs/bakery/advanced/hsm-signing).
- **Sharing.** Repositories now distribute rules and tooling environments alongside layers and recipes, so an imported pipeline brings its own tooling.

The core repository provides rules for common filesystems, dm-verity, disk assembly, software inventories, and Rugix Ctrl update bundles, all with reproducible outputs. The [core rule reference](/docs/bakery/reference/core/rules/) lists them.

The predefined pipelines for existing targets, such as `generic-grub-efi` and `rpi-tryboot`, now run on the same engine and use the same core rules. Systems can extend them with their own rules, for example, to convert the disk image into another format. See [Build Rules](/docs/bakery/build-rules) for the complete documentation.

## Verified Boot for EFI and Raspberry Pi

With verified boot, a device starts only boot software that is signed with your key, and that software checks the root filesystem as the device reads it. Rugix Bakery 0.9.6 includes verified-boot pipelines for Debian as core compositions:

- **EFI.** `core/image-debian-efi-verified` creates a SquashFS root filesystem with dm-verity and a Unified Kernel Image (UKI), a single file combining the kernel, its initial RAM disk, and a command line that carries the root hash. It signs the UKI and the systemd-boot bootloader for Secure Boot.
- **Raspberry Pi.** `core/image-debian-rpi-verified` builds the same verified root filesystem for Raspberry Pi 4, Compute Module 4, and Pi 5. It packages the kernel into a boot image, which it signs for the signed boot feature of the Raspberry Pi bootloader.

Both pipelines produce a disk image with two copies of the system, for safe A/B updates, and a signed update bundle. The signers are rule parameters, so you can keep the default signers, which read private keys from files, or bind your own. In either case, the pipelines check every signature against the configured certificate or public key, independently of the signer that produced it. A misconfigured signer therefore fails the build instead of producing images that devices would reject.

The fastest way to try verified boot is one of the two new project templates, [`debian-secure-efi`](https://github.com/rugix/rugix-bakery/tree/v0.9.6/container/templates/debian-secure-efi) and [`rpi-debian-secure`](https://github.com/rugix/rugix-bakery/tree/v0.9.6/container/templates/rpi-debian-secure). For example, in a new directory containing the `run-bakery` launcher:

```shell
./run-bakery init debian-secure-efi
./prepare.sh
./run-bakery bake system efi --release-version v1
```

The `prepare.sh` script generates development keys for boot signing, update signing, and SSH access. The build then produces a disk image and an update bundle in `build/efi/`. The template's configuration selects the verified-boot pipeline with a single rule invocation and binds the generated keys to its signers. The Raspberry Pi template works the same way with `bake system pi`.

Signing alone does not protect a device: its firmware must trust your key and enforce signature checks. The template READMEs explain how to provision the firmware, how boot verification works, and how to replace the development keys with production keys. Both templates leave the data partition unencrypted and unauthenticated, so configure those protections separately if your product needs them.

## Further Improvements

Rugix Bakery 0.9.6 also lets recipes declare ordering constraints relative to each other, and on Linux 6.7 or newer, it sets up QEMU emulation for foreign-architecture builds without changing the host's configuration. Layers now preserve hardlinks, ACLs, extended attributes, and other filesystem metadata, and Rugix Bakery builds ext4 filesystems reproducibly. System tests also received several reliability improvements.

## Upgrading to 0.9.6

Projects using the launcher's default `v0.9` channel get Rugix Bakery 0.9.6 on their next build. Projects using the predefined pipelines keep working without changes. Note the following:

- **`bake system` replaces `bake image` and `bake bundle`.** Both older commands remain available but are deprecated. `bake system` publishes all artifacts of a system, including the update bundle, in `build/<system>/`.
- **Bundle settings live in the system configuration.** Configure the bundle of a predefined pipeline in `[systems.<name>.bundle]`. Bundles are enabled by default for supported targets.

The [changelog](https://github.com/rugix/rugix-bakery/blob/v0.9.6/CHANGELOG.md) lists all changes.

## Get Started

Follow the [Rugix Bakery documentation](/docs/bakery) to set up a project, or start from one of the [project templates](/docs/bakery/projects#project-templates). The [GitHub release](https://github.com/rugix/rugix-bakery/releases/tag/v0.9.6) includes the complete release notes.

We welcome feedback and contributions on [GitHub](https://github.com/rugix/rugix-bakery). If you have questions or want to discuss your build pipeline, join our [Discord community](https://discord.gg/cZ8wP9jNsn).

---

At [Silitics](https://silitics.com), we help companies build robust and secure embedded Linux products. If you need help designing a verified boot chain or integrating Rugix into an existing platform, [we would love to hear from you](mailto:hello@silitics.com).
