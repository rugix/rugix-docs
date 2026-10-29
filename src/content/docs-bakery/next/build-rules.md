---
title: Repository Build Rules
---

Build rules turn files and directories into release artifacts. A rule can create a
filesystem image, sign a kernel, assemble a disk, or produce an update bundle.
Repositories supply these operations and any additional tooling environments they
need, so projects can reuse a platform's image pipeline and replace individual
operations.

Layers and recipes build the root filesystem as nodes in the same graph.
Recipes can consume rule-built artifacts through their
[layer input bindings](/docs/bakery/next/layers#recipe-artifact-inputs). A system's optional
`build` setting selects a rule that assembles its filesystem into an image.
Systems without this setting use a predefined pipeline composed of the same core
rules. Both workflows build layers, filesystem images, disks, and bundles through
one executor.

## Rules and Compositions

A rule lives in `rules/<name>/rule.toml`. Its interface declares named file or
directory inputs, parameters, secrets, and outputs. Its implementation runs
a command, builds a layer, or composes other rules into a graph. Commands use Bakery's tools by
default. An optional `env` selects a [tooling environment](/docs/bakery/next/envs) for commands
that need additional or different tools.

For example, this rule copies a root filesystem into an ext4 image:

```toml title="rules/root-image/rule.toml"
[inputs]
rootfs = "directory"

[parameters.size]
default = 1073741824

[execution]
type = "run"
command = ["python3", "/run/rugix/bakery/work/rule/run.py"]

[execution.outputs.image]
kind = "file"
path = "root.img"
```

Bakery reserves `/run/rugix/bakery/work` for one execution's workspace.
Both execution modes receive the following mounts within that directory:

| Relative Path     | Contents                                                | Access     |
| ----------------- | ------------------------------------------------------- | ---------- |
| `rule/`           | Rule definition directory, including supporting scripts | Read-only  |
| `inputs/<name>`   | Each declared input                                     | Read-only  |
| `parameters.json` | Parameter values as a JSON object                       | Read-only  |
| `secrets/<name>`  | Each explicitly bound secret                            | Read-only  |
| `outputs/`        | Fresh output directory                                  | Read-write |
| `project/`        | Consuming project directory                             | Read-only  |

For example, `run.py` can read `size` from `/run/rugix/bakery/work/parameters.json`, create
`/run/rugix/bakery/work/outputs/root.img`, and run `mkfs.ext4 -d /run/rugix/bakery/work/inputs/rootfs` on it. Output paths
are relative to `/run/rugix/bakery/work/outputs`. Bakery checks that every declared output exists,
has the declared kind, and resolves within that directory.

Commands are literal argument lists. Use an explicit shell when shell syntax is
needed. Both execution modes receive the same artifact mounts and a fresh output
directory. Declared artifacts carry data between rules.

Without `env`, a command runs directly in the Bakery container with private
artifact mounts, a fresh `/tmp`, and `/run/rugix/bakery/work/outputs` as its working directory. It uses
Bakery's installed tools without building an additional environment. Changes
outside the artifact mounts and `/tmp` affect the shared Bakery container, so
commands must not modify its tooling. All core rules use this execution mode.

With `env`, each command runs in a fresh container built from that environment's
Dockerfile. It inherits the image's environment variables and working directory;
changes to its own filesystem are discarded.

A composition connects artifacts between reusable operations. For example,
this composition exports an ext4 image and a metadata-preserving archive of
the same filesystem tree:

```toml title="rules/root-artifacts/rule.toml"
[inputs]
rootfs = "directory"

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

Bakery expands a composition, validates its interfaces and dependencies, then
executes commands in dependency order. A shared predecessor runs once. Only
nodes needed by exported outputs execute.

Rule and environment references resolve from the repository that defines them.
For example, an imported rule can use its own `tools/signing` dependency without
requiring the consuming project to declare that alias. Unprefixed names refer to
the defining repository; `core/` refers to Bakery's built-in repository.

## Bind Inputs and Secrets

An invocation selects a rule with `uses` and supplies its bindings. Inputs have
the following source forms:

```toml
inputs.rootfs = { input = "rootfs" }
inputs.layout = { file = "layouts/device.toml" }
inputs.kernel = { rule = { node = "kernel", output = "kernel" } }
```

`input` refers to the enclosing composition's input. `file` resolves a path
relative to the repository containing the invocation and accepts a file or
directory. `rule` references a named node's output. An omitted input binding
forwards an enclosing input of the same name.

Parameters accept scalar values or `{ parameter = "name" }` references to an
enclosing parameter. Missing parameters use the rule's declared default, if any.
Unknown bindings and incompatible input kinds fail during planning.

### Select Paths and Assemble Trees

A `select` binding takes a file or directory from another directory artifact:

```toml
inputs.os-release = { select = { source = { input = "rootfs" }, path = "etc/os-release", kind = "file" } }
```

The path must be relative and cannot contain `..`. Bakery checks its declared
kind. The selected path, after resolving symlinks, must remain inside the source
directory. Selections can also use a rule output as their source. A consuming command's input identity
tracks the selected artifact, so unrelated files do not invalidate that command.

A `tree` binding assembles artifacts at explicitly named paths. For example,
this binding places boot artifacts and a repository configuration file into a
directory:

```toml
[execution.rules.boot-filesystem]
uses = "core/image-fat"

[execution.rules.boot-filesystem.inputs.tree.tree]
"boot.img" = { rule = { node = "boot-image", output = "image" } }
"boot.sig" = { rule = { node = "signature", output = "signature" } }
"config/device.txt" = { file = "config/device.txt" }
```

Each destination accepts a file or directory source. Destinations must be
nonempty relative paths, cannot contain `..`, and cannot overlap. For example,
placing a directory at `config` together with another artifact at
`config/device.txt` is rejected. Use `{ tree = {} }` for an empty directory.
Trees and selections can appear in composition outputs as well as input bindings.

Tree assembly preserves source ownership, permissions, timestamps, and extended
attributes. It also preserves links within each imported directory. Generated
parent directories have mode `0755` and an epoch modification time. Bakery caches assembled trees by their destinations and source
contents and metadata.

### Bind Secrets

Declare signing keys separately:

```toml
secrets = ["key"]

[execution]
type = "run"
env = "signing"
command = ["openssl", "dgst", "-sha256", "-sign", "/run/rugix/bakery/work/secrets/key",
           "-out", "/run/rugix/bakery/work/outputs/signature", "/run/rugix/bakery/work/inputs/image"]

[inputs]
image = "file"

[execution.outputs.signature]
kind = "file"
path = "signature"
```

Secrets require explicit bindings at every composition boundary. Within a secret
binding, `{ input = "key" }` forwards an enclosing secret. A secret binding may
select a path from a secret directory; assembling a `tree` in a secret binding is
rejected because assembled trees are cached.

Secrets affect cache validity just like ordinary inputs. Bakery fingerprints
their contents and filesystem metadata using a private key stored in the local
rule cache with mode `0600`. It never stores secret contents or unkeyed secret
fingerprints in cache metadata. Changing a secret or replacing the local
fingerprint key invalidates the consuming command. Secret values are excluded
from definition inspection.

A rule's outputs may be public, such as a signature produced with a private
key. Tooling is trusted code and must keep secret contents out of outputs and
logs. The fingerprint key is private cache state; do not distribute it with
exported artifacts.

## Layer Rules

A layer rule exposes an existing layer to a composition. For example:

```toml title="rules/device-rootfs/rule.toml"
[execution]
type = "layer"
layer = "device"
architecture = "amd64"
```

Bakery resolves `device` from the rule's repository and builds its parents and
prerequisite rules in the same graph. The rule exports `rootfs`, `boot`,
`config`, `artifacts`, and `bsp` directories, plus an `archive` file containing
the complete layer. A layer rule's interface does not declare output paths.

A composition can bind these outputs to other rules, such as
`core/image-ext4`. Shared default layers build once per graph. Layer execution
uses the existing recipe ordering, parameter files, architecture-specific
definitions, and project dependency registrations.

A layer rule can declare artifact inputs and parameters in its interface.
These become available to that layer's recipe bindings and prerequisite rules.
For example, this wrapper requires a compiled application artifact:

```toml title="rules/device-rootfs/rule.toml"
[inputs]
application = "file"

[execution]
type = "layer"
layer = "device"
architecture = "amd64"
```

If `device` runs an installation recipe declaring an `application` file input,
`[inputs.install-app]` in that layer can bind it explicitly with
`application = { input = "application" }`. An omitted binding forwards the
same-named wrapper input automatically. A composition supplies the wrapper's
`inputs.application` from its compilation node as with any other rule input.

Parent artifact names and the target `architecture` parameter are reserved.
Secrets cannot be bound to a layer rule. Use signing rules after filesystem
construction for operations requiring secrets.

`bake layer` and ordinary system builds plan these same layer nodes internally.
Existing projects do not need layer rule wrappers or input declarations unless
they use additional artifact dependencies.

## Use Project Files

A reusable rule can read files supplied by its consuming project through
`RUGIX_PROJECT_DIR`. This always refers to the project directory, including when
a dependency repository supplies the rule. Files packaged with the rule remain
available under `/run/rugix/bakery/work/rule`.

A command can discover which project files it needs while running. Register
each file or directory by appending its project-relative path to
`RUGIX_REBUILD_IF_CHANGED`, one path per line. For example, this shell script
reads a project configuration that selects another input file.
Here, `config/selected-file` contains `config/device-a.conf`, a path relative
to the project directory:

```shell title="rules/device-config/run.sh"
set -eu
printf '%s\n' 'config/selected-file' >> "$RUGIX_REBUILD_IF_CHANGED"
selected=$(cat "$RUGIX_PROJECT_DIR/config/selected-file")
printf '%s\n' "$selected" >> "$RUGIX_REBUILD_IF_CHANGED"
cp "$RUGIX_PROJECT_DIR/$selected" /run/rugix/bakery/work/outputs/device.conf
```

Both the selector and the selected file affect this command's cache entry.
Bakery checks the paths recorded by the previous execution before reusing its
outputs. A successful execution replaces that set with its new registrations.
Reading a file does not automatically register it.

Registered directories include their contents recursively. Content and metadata
changes, additions, and deletions invalidate the cache. A registered path may
be absent: creating it later also invalidates the cache. Paths must be relative
and cannot contain `..`. Symlinks must resolve within the project directory;
their targets are tracked too. Empty lines and duplicate registrations are
ignored. Register source paths rather than build outputs or cache directories.

Use declared artifact bindings for outputs of other rules. Those bindings give
the executor the dependencies it needs to schedule commands. Runtime
registrations track project files and do not add graph nodes. Keep the project
inputs unchanged during a build.

Layer recipes support the same registration mechanism.
`LAYER_REBUILD_IF_CHANGED` remains an alias for
`RUGIX_REBUILD_IF_CHANGED` in recipes.

## Standard System Pipeline

The familiar system configuration selects a predefined build pipeline. For
example:

```toml
[systems.device]
layer = "device"
architecture = "amd64"
target = "generic-grub-efi"
```

Bakery builds the layer and its mixins, then prepares a private filesystem tree
with release metadata. It installs the target's boot files before resolving the
image layout into a disk artifact. A subsequent rule patches the boot
configuration against that disk's partition IDs. Filesystem rules create each
populated partition. A disk assembly rule
places those filesystem artifacts into the disk. Separate rules produce
filesystem archives and software inventories. `bake bundle` adds a bundle rule
that consumes the same partition artifacts.

The existing `image` and `options` settings configure this pipeline. They retain
the target layouts, boot flows, and root filesystem policies, including
journal-free ext4 root partitions. Filesystem capacity comes from each resolved
partition; the standalone filesystem rules still default to automatic sizing.

BSP layouts can be supplied by layer recipes. Bakery expands the dependent
portion of the graph once those artifacts exist. Its rules then execute through
the same cache and environment handling as other graph nodes.

Changing a layout, source date, release identity, or rule input rebuilds the
affected artifacts. Without `--source-date`, the completed layer archive's
modification time supplies the source date and default release version. Reusing
that layer retains its release date. Use `--source-date` and explicit release
information to reproduce metadata across independent layer builds. Disk and partition IDs are derived
from the layout and resolved geometry. Software inventories use the source date
and content-derived document IDs.

## Assemble a System

Select a repository rule in `rugix-bakery.toml`:

```toml
[systems.device]
layer = "device"
architecture = "amd64"

[systems.device.build]
uses = "platforms/release"
parameters.disk-size = 3221225472
```

Bakery schedules the selected layer and release preparation before the assembly
invocation in one graph. The invocation receives these artifacts:

| Input       | Kind      | Contents                                                             |
| ----------- | --------- | -------------------------------------------------------------------- |
| `rootfs`    | Directory | Target root filesystem with release metadata                         |
| `boot`      | Directory | Layer's boot files                                                   |
| `config`    | Directory | Layer's configuration files                                          |
| `artifacts` | Directory | Recipe-produced artifacts                                            |
| `bsp`       | Directory | Layer's BSP files                                                    |
| `layer`     | Directory | Complete release-prepared layer, including additional roots          |
| `context`   | File      | System name, architecture, source date, and release identity as JSON |

The context uses the fields `system`, `architecture`, `source-date-epoch`,
`release-id`, and `release-version`. The root filesystem contains matching
metadata at `/etc/rugix/system-build-info.json`.

The selected rule must export an `image` file, published as
`build/<system>/system.img`. An optional `bundle` export becomes
`system.rugixb`; other exports retain their names. Bakery also publishes
`build-context.json`. These destination names must not collide.
The existing `bake image` and `bake bundle` commands use these artifacts.

A repository pipeline owns its disk layout, boot artifacts, filesystems, and
bundle manifest. Configure those through its parameters and inputs.
Combining `build` with the predefined pipeline's `target`, `image`, or `options` assembly
settings is rejected.

## Build Independently

An invocation file can also run without building a layer. For example:

```toml title="make-root.toml"
uses = "core/image-ext4"
inputs.tree = { file = "prepared-root" }
```

```shell
./run-bakery bake rule make-root.toml build/root
```

Exported files and directories appear under their port names, here
`build/root/image`. Output publication happens after the complete build
succeeds. For example, a project can build filesystem images from an existing
root filesystem without running its layer recipes.

## Reuse Core Rules

The [core rule reference](/docs/bakery/next/reference/core/rules/) lists the
available artifact transformations, their inputs and outputs, parameter defaults,
and examples. Core rules package arbitrary filesystem trees, assemble disks,
prepare existing boot flows, and produce update bundles. A consuming composition
chooses partition roles and A/B slots.

For example, inspect the ext4 filesystem interface without building an image:

```shell
./run-bakery rules inspect core/image-ext4
```

Rules can carry input, output, and parameter descriptions alongside their
implementations. See [definition catalogs](/docs/bakery/next/definition-catalogs/)
for the metadata format and JSON export used to generate reference pages.

## Caching and Execution

Bakery caches successful rule outputs by their execution runtime, rule
implementation directory, parameter values, input contents and metadata, and
registered project dependencies.
For commands without `env`, the runtime identity includes Bakery's image ID and
executable. The standard `run-bakery` launcher supplies the resolved image ID;
without an immutable image ID, these commands run without output caching.
For commands with `env`, Bakery builds the environment through Buildah, which
manages Dockerfile layer caching, and uses its resolved image ID. Changes to any
of these invalidate that command and affected downstream commands. Input modification times, ownership, permissions, extended attributes, ACLs,
symlinks, and device nodes contribute to the cache key. Access and change times are excluded.

Use `cache = false` in a run implementation for commands that must always execute.
Sensitive inputs participate through cache-local keyed fingerprints. A failed command or missing output
does not publish a successful cache entry. Commands execute serially, and a
project lock protects the rule cache.

Rules must bind their input artifacts or register the project files they depend on. Network responses, wall-clock time,
ambient environment variables, and other external state are not tracked. Pin
runtime dependencies and use declared inputs for repeatable builds. Both
execution modes are intended for trusted tooling. Tooling containers share
Bakery's surrounding namespaces.

For a recipe consuming an environment-built application, see the
[layer input example](https://github.com/rugix/rugix-bakery/tree/main/examples/layer-inputs).
