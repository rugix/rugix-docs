---
order: 70
title: Tooling Environments
---

A _tooling environment_ defines the tools, libraries, and configuration available
to a build operation. It keeps those dependencies separate from the Linux system
being built. For example, an environment can supply tools for signing boot
artifacts without installing those tools into the resulting system.

Each environment is defined by a Dockerfile and its build context. Rugix Bakery builds
this definition into a cached container image. Commands execute in fresh working
containers created from that image, so operations can share a tooling definition.
Changes to a container's own filesystem are discarded after execution.

Environments run on Rugix Bakery's architecture, independently of a system's target
architecture. For example, an amd64 tooling environment can process firmware for
an arm64 device.

## Define an Environment

Create `envs/<name>/Dockerfile` in your project. For example, this environment
installs OpenSSL:

```dockerfile title="envs/signing/Dockerfile"
FROM docker.io/library/alpine:3.23
RUN apk add --no-cache openssl
```

The `envs/signing` directory is the implicit Docker build context. Put supporting
files there and use `COPY` to include them in the image. A `.dockerignore` file
in that directory excludes files from the context. Environment discovery skips
hidden directories and directories without a `Dockerfile`.

## Work with Environments Directly

The `envs` commands let you work with an environment independently of a system
build. Run them from a project containing `rugix-bakery.toml`.

:::note
Repository [build rules](/docs/bakery/next/build-rules) select environments for artifact operations.
Recipe steps continue to run in Rugix Bakery or the target root filesystem.
:::

### Inspect and Build

```shell
./run-bakery envs list
./run-bakery envs inspect signing
./run-bakery envs inspect signing --json
./run-bakery envs build signing
```

Inspection reports the environment name, Dockerfile path, and build context
without building an image. JSON inspection uses the fields `name`, `dockerfile`,
and `context`. Paths refer to locations inside Rugix Bakery's container.

Building prints the resolved image ID to standard output and build progress to
standard error. Rugix Bakery uses Buildah to build the Dockerfile and retain intermediate
layers. Changes to the Dockerfile or included context files invalidate the
affected layers. The image lives in Rugix Bakery's project cache, separately from the
host Docker or Podman image store.

To execute Dockerfile instructions again without using cached layers:

```shell
./run-bakery envs build signing --no-cache
```

Base images are pulled when missing and otherwise reused. `--no-cache` reruns
Dockerfile instructions while retaining a locally cached base image. Pin base
image digests and package versions when you need repeatable environment contents.

### Run Commands

Start a shell, building the environment first if needed:

```shell
./run-bakery envs shell signing
```

Each invocation starts a fresh working container and removes it on exit. Packages
installed or files written into the environment disappear afterward.

The project directory is mounted read-write at `/project`. Changes there persist
in your project. The environment retains its Dockerfile's `ENV`, `USER`, and
`WORKDIR` settings. Mounting the project does not change the working directory;
run `cd /project` inside the shell to work on project files. The default shell is
`/bin/sh`, which must exist in the image.

Supply a different shell or a command after `--`, for example:

```shell
./run-bakery envs shell signing -- openssl version
./run-bakery envs shell signing -- /bin/sh -c 'ls /project'
```

The command's exit status becomes Rugix Bakery's exit status after the working
container has been removed.

## Share Environments

[Repositories](/docs/bakery/next/repositories) can supply environments using the same directory
convention. Reference one with its repository prefix, for example:

```shell
./run-bakery envs inspect vendor/signing
./run-bakery envs build vendor/signing
./run-bakery envs shell vendor/signing
```

Here, `vendor` is a key in the project's `repositories` configuration.
`envs list` includes local environments and environments from direct repository
dependencies. The built-in repository uses the prefix `core/`.

## Choose Storage

By default, Rugix Bakery tests whether native OverlayFS works on the cache filesystem
and uses it when available. Otherwise it uses VFS directory copies. Native overlay
avoids copying an entire image for each working container; VFS supports hosts
where overlay mounts are unavailable, with higher copying and disk-space costs.

Select a backend explicitly when diagnosing storage issues:

```shell
./run-bakery envs build signing --storage native
./run-bakery envs shell signing --storage vfs
```

FUSE overlay is also available with `--storage fuse`. It requires
`fuse-overlayfs` inside Rugix Bakery and access to `/dev/fuse`. For example, with
rootless Podman:

```shell
DOCKER=podman DOCKER_FLAGS="--device /dev/fuse" ./run-bakery envs shell signing --storage fuse
```

Each backend has a separate image store. All three use Rugix Bakery's namespace setup
and run commands with chroot isolation, which shares surrounding namespaces.
Use environments for trusted tooling; they do not provide an isolation boundary
for hostile commands. Building and running environments requires neither a host
container socket mounted into Rugix Bakery nor a nested Docker daemon.

`./run-bakery cache clean` removes the project's cached environment images along
with its other build caches.
