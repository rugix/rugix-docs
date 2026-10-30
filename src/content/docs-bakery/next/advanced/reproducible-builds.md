---
---

# Reproducible Builds

At Rugix, we are huge proponents of [_reproducible builds_](https://reproducible-builds.org/).

> “A build is _reproducible_ if given the same source code, build environment and build instructions, any party can recreate bit-by-bit identical copies of all specified artifacts.” – https://reproducible-builds.org/docs/definition/

We aim to enable reproducible builds of Rugix itself as well as of system images built with Rugix.

**Note that this is a work-in-progress effort and we are not fully there yet.**

## Source Date

The source date is a fixed timestamp that build tools use when creating artifacts.
Bakery resolves it once per build, in this order:

1. `--source-date`, as an RFC 3339 timestamp.
2. The `SOURCE_DATE_EPOCH` environment variable, as nonnegative Unix seconds.
3. `0`, the Unix epoch.

All `bake` commands accept `--source-date`. For example:

```shell
./run-bakery bake image device --source-date 2024-01-01T00:00:00Z
SOURCE_DATE_EPOCH=1704067200 ./run-bakery bake rule filesystem.toml build/filesystem
```

Bakery carries this value through nested graphs and layer builds. Recipes and
command rules receive it as
[`SOURCE_DATE_EPOCH`](https://reproducible-builds.org/docs/source-date-epoch/).
The core filesystem and archive rules use it to fix creation timestamps and
clamp modification times. Release metadata and software inventories use the same
date. This also makes the default release version deterministic; specify release
information when building a named release.

A fixed date alone does not make arbitrary commands reproducible. Rules must use
tools and options that honor it. Pin distribution inputs and tool versions too.

## Build Rules

The core artifact rules produce reproducible outputs with the same input bytes
and filesystem metadata, parameters, effective source epoch, and Bakery container image.
Pin the image by digest to keep the tool versions fixed. A cache hit alone does
not demonstrate reproducibility: the same rule must also produce identical
bytes when executed again with a fresh cache.

Command rules consume the source epoch by default. Its value participates in
their cache identity, so changing it rebuilds affected commands. Graphs inherit
the epoch automatically and need no forwarding parameters.

A rule whose outputs are independent of the epoch can opt out. For example,
this execution fragment opts out for a compilation rule:

```toml
[execution]
type = "run"
command = ["/run/rugix/bakery/work/rule/compile.sh"]
uses-source-date-epoch = false
```

Bakery removes `SOURCE_DATE_EPOCH` from that command's environment, including any
Dockerfile default, and excludes the value from its cache identity. Changes to
other inputs still invalidate the cached result. Layer builds always consume the
source epoch because recipes and layer archives use it.

| Building Block       | Reproducibility Controls                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| ext4                 | Derived UUID and directory hash seed; fixed creation, access, and change times; clamped modification times. |
| FAT                  | Derived volume ID, invariant format metadata, sorted insertion, and fixed UTC entry timestamps.             |
| SquashFS             | Fixed creation time, clamped file timestamps, and reproducible compression.                                 |
| Disk layouts         | MBR disk IDs and GPT GUIDs derived from the layout and resolved geometry.                                   |
| Software inventories | Source-date creation times and content-derived document identifiers.                                        |
| Rugix bundle         | Fixed manifest and payload bytes.                                                                           |

Extra `mkfs-options` can override reproducible defaults. Pin distribution
repositories when building the input root filesystem. See the
[core rule reference](/docs/bakery/next/reference/core/rules/) for each rule's
behavior.

## Reproducibility of Rugix

> Given a commit hash of Rugix, everyone should be able to reproduce all Rugix-related binaries that may end up in images as well as the Docker image for Rugix Bakery. This includes binaries of third-party software, e.g., Grub and U-Boot.

Reproducible builds require a known build environment.
To this end, we use [Debian's official snapshots](https://snapshot.debian.org/) as a basis.
Note that most [Debian packages are also fully reproducible](https://tests.reproducible-builds.org/debian/reproducible.html), so one could in principle trace everything back to its source code.
Building upon Debian snapshots also has the advantage that it reduces the surface area that must be checked for Rugix, provided that one trusts Debian.

To obtain a reproducible build environment, we follow a two stage process:

- Stage 0: We build a Debian Docker image containing [`mmdebstrap`](https://manpages.debian.org/bookworm/mmdebstrap/mmdebstrap.1.en.html).
  This image will not be reproducible as it is based on the latest version of Debian Bookworm.
  We are only using it to bootstrap Stage 1.
- Stage 1: Using the previously built Docker image, we bootstrap a Debian Docker image based on an official snapshot.
  This image will be fully reproducible and everything we install will be pinned to the respective snapshot.
  Thereby, all images that we derive from it, e.g., to build Rugix, Grub, or U-Boot, are also fully reproducible.

Everything else we built will be based on the reproducible Stage 1 image.

The infrastructure for reproducible builds is implemented as part of Rugix's [`xtask`](https://github.com/rugix/rugix-bakery/tree/main/xtask).

## Reproducibility of Images

**🚧 This is work-in-progress. 🚧**

Reproducibility of Rugix is a prerequisite for reproducible system images.

### Filesystem Images

Bakery represents a finished layer as a directory tree after all recipes have
run. It constructs ext4 filesystems directly from this tree and passes the
configured source date to `mkfs.ext4`. The core rule derives a stable UUID and
directory hash seed unless explicit options override them. Given the same input
tree, partition size, source date, formatter options, and Bakery image, it
produces a byte-for-byte identical ext4 filesystem image.

Bakery stores intermediate layer trees as PAX tar archives. These archives
preserve deployment-relevant filesystem metadata, including ownership,
permission and special mode bits, hardlinks, symbolic links, sparse files, device
nodes, FIFOs, POSIX ACLs, and extended attributes such as file capabilities and
SELinux labels. Bakery fails the build if it cannot restore this metadata. When
importing ext filesystems, Bakery rejects sockets, project quota IDs, and inode
flags such as immutable or append-only that the layer format cannot represent
instead of silently dropping them.

Modification times are clamped to the configured source date. Other timestamps,
source inode numbers, block placement, journal contents, and free-space history
are not layer semantics; they are normalized when constructing the output
filesystem.

Filesystem reproducibility does not by itself make the complete disk image
reproducible. Partition-table identifiers, FAT filesystems, and bootloader
artifacts must also be deterministic. This guarantee applies to each ext4
partition image, not the assembled disk image, unless the selected target
documents a stronger guarantee.

Furthermore, reproducibility of images requires support by the underlying Linux distribution.
In particular, it requires that a distribution provides immutable snapshots of their repositories (rebuilding packages is outside the scope of Rugix).

Among the distributions supported by Rugix, only Debian [officially provides immutable snapshots](https://snapshot.debian.org/) of their repositories.
Furthermore, Debian also participates in the Reproducible Builds project's [continuous reproducibility testing of their packages](https://tests.reproducible-builds.org/debian/reproducible.html).
We aim to eventually support building fully reproducible Debian images based on the official snapshots.

For other distributions and base layers built with third-party tools (e.g., Yocto Project and Buildroot), we aim to make images reproducible under the assumption that the external inputs (repositories, base layer, …) do not change.
