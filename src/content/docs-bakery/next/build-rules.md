---
order: 60
title: Build Rules
---

Build rules turn files and directories into release artifacts. A rule can create a
filesystem image, sign a kernel, assemble a disk, or produce an update bundle.
Repositories supply these operations and any additional tooling environments they
need, so projects can reuse a platform's image pipeline and replace individual
operations.

Use the predefined pipelines for [supported targets](/docs/bakery/next/systems#targets)
when they meet your device's requirements. Define rules when you need additional
operations, such as compiling an application or preparing a device-specific boot
image. Recipes can install their outputs through
[artifact inputs](/docs/bakery/next/recipes#artifact-inputs), and a system can select
a rule as its [image pipeline](/docs/bakery/next/systems#repository-build-rules).

## Invoke a Rule

A rule definition describes a reusable operation. A rule invocation selects that
definition with `uses` and supplies its inputs and parameters. For example, to
create an ext4 image from an existing `prepared-root` directory in your project,
save the following invocation as `make-root.toml` in the project directory,
alongside `rugix-bakery.toml`:

```toml title="make-root.toml"
uses = "core/image-ext4"
inputs.tree = { path = "prepared-root" }
parameters.label = "system"
```

Run it from the project directory:

```shell
./run-bakery bake rule make-root.toml build/root
```

The `core/image-ext4` rule takes a directory input named `tree` and exports a file
named `image`. The result appears at `build/root/image`, sized automatically from
the directory's contents. The `label` parameter sets its filesystem label.
This produces a filesystem image; it does not add a partition table or bootloader.

The [core rule reference](/docs/bakery/next/reference/core/rules/) lists available
rules and their interfaces. The following sections explain how to define your
own operations and combine rules into reusable pipelines.

## Define a Command Rule

A rule lives in `rules/<name>/rule.toml`. Its interface declares named file or
directory inputs, parameters, secrets, and outputs. Its implementation runs
a command, builds a layer, or composes other rules into a graph. Commands use Rugix Bakery's tools by
default. An optional `env` selects a [tooling environment](/docs/bakery/next/envs) for commands
that need additional or different tools.

Each input definition is an object with a required `kind` (`file` or `directory`)
and an optional `description`.

For example, this rule compresses a file with gzip:

```toml title="rules/compress-file/rule.toml"
[inputs.source]
kind = "file"

[execution]
type = "run"
command = ["/bin/sh", "/run/rugix/bakery/work/rule/run.sh"]

[execution.outputs.compressed]
kind = "file"
path = "file.gz"
```

Place its implementation beside the definition:

```shell title="rules/compress-file/run.sh"
#!/bin/sh
set -eu
gzip -n -c /run/rugix/bakery/work/inputs/source > /run/rugix/bakery/work/outputs/file.gz
```

The script reads the declared input and writes the declared output. The `-n`
option omits the source filename and timestamp from the gzip header, so identical
input bytes produce identical output with the same gzip version.

For example, invoke the rule on an existing kernel file:

```toml title="compress-kernel.toml"
uses = "compress-file"
inputs.source = { path = "artifacts/kernel" }
```

```shell
./run-bakery bake rule compress-kernel.toml build/kernel
```

The compressed kernel appears at `build/kernel/compressed`. Output names are
part of a rule's interface; the implementation's filename, `file.gz` here,
does not determine the exported name.

### Command Workspace

Rugix Bakery reserves `/run/rugix/bakery/work` for one execution's workspace.
Commands receive the following mounts within that directory, whether they run
directly in Rugix Bakery or in a tooling environment:

| Relative Path     | Contents                                                | Access     |
| ----------------- | ------------------------------------------------------- | ---------- |
| `rule/`           | Rule definition directory, including supporting scripts | Read-only  |
| `inputs/<name>`   | Each declared input                                     | Read-only  |
| `parameters.json` | Parameter values as a JSON object                       | Read-only  |
| `secrets/<name>`  | Each explicitly bound secret                            | Read-only  |
| `outputs/`        | Fresh output directory                                  | Read-write |
| `project/`        | Consuming project directory                             | Read-only  |

Output paths in a command rule are relative to
`/run/rugix/bakery/work/outputs`. Rugix Bakery checks that every declared output exists,
has the declared kind, and resolves within that directory. Parameter values are
available as a JSON object in `parameters.json`.

Commands are literal argument lists. Use an explicit shell when shell syntax is
needed. Each command receives a fresh output directory; use artifact bindings
to carry data between commands.

Without `env`, a command runs directly in the Rugix Bakery container with private
artifact mounts, a fresh `/tmp`, and `/run/rugix/bakery/work/outputs` as its working directory. It uses
Rugix Bakery's installed tools without building an additional environment. Changes
outside the artifact mounts and `/tmp` affect the shared Rugix Bakery container, so
commands must not modify its tooling. All core rules use this execution mode.

With `env`, each command runs in a fresh container built from that environment's
Dockerfile. It inherits the image's environment variables and working directory;
changes to its own filesystem are discarded.

## Compose Rules

A composition is a rule whose implementation invokes other rules and connects
their artifacts. It exposes its own inputs and outputs, so callers can use a
whole pipeline through the same interface as a single command. For example,
this composition exports an ext4 image and a metadata-preserving archive of
the same filesystem tree:

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

The composition's `rootfs` input supplies both operations. The names
`filesystem` and `archive` identify invocations within this composition; they
are independent of the rule names selected by `uses`. Each output binding
selects a named invocation and one of its outputs.

An invocation becomes a node in the dependency graph described in
[Build Model](/docs/bakery/next/build-model#rules-and-artifacts). Rugix Bakery validates
the connections and executes producers before their consumers. A shared
producer runs once, and only nodes needed by exported outputs execute.

Rule and environment references resolve from the repository that defines them.
For example, an imported rule can use its own `tools/signing` dependency without
requiring the consuming project to declare that alias. Unprefixed names refer to
the defining repository; `core/` refers to Rugix Bakery's built-in repository.

## Bind Inputs and Secrets

An invocation selects a rule with `uses` and supplies its bindings. Inputs have
the following source forms:

```toml
inputs.rootfs = { input = "rootfs" }
inputs.layout = { path = "layouts/device.toml" }
inputs.kernel = { rule = { node = "kernel", output = "kernel" } }
```

`input` refers to the enclosing composition's input. `path` resolves a path
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

The path must be relative and cannot contain `..`. Rugix Bakery checks its declared
kind. The selected path, after resolving symlinks, must remain inside the source
directory. Selections can also use a rule output as their source. A consuming command's input identity
tracks the selected artifact, so unrelated files do not invalidate that command.

A `tree` binding defines a directory inline by mapping destination paths to
artifact sources. Rugix Bakery assembles a new directory without modifying the sources.
For example, this invocation fragment places boot artifacts and a repository
configuration file into a directory:

```toml
[execution.rules.boot-filesystem]
uses = "core/image-fat"

[execution.rules.boot-filesystem.inputs.tree.tree]
"boot.img" = { rule = { node = "boot-image", output = "image" } }
"boot.sig" = { rule = { node = "signature", output = "signature" } }
"config/device.txt" = { path = "config/device.txt" }
```

Each destination accepts a file or directory source. Destinations must be
nonempty relative paths, cannot contain `..`, and cannot overlap. For example,
placing a directory at `config` together with another artifact at
`config/device.txt` is rejected. Use `{ tree = {} }` for an empty directory.
Trees and selections can appear in composition outputs as well as input bindings.

Tree assembly preserves source ownership, permissions, timestamps, and extended
attributes. It also preserves links within each imported directory. Generated
parent directories have mode `0755` and an epoch modification time. Rugix Bakery caches assembled trees by their destinations and source
contents and metadata.

### Bind Secrets

Secrets carry inputs such as private signing keys. They must be explicitly
bound, and their contents are excluded from inspection and cache metadata.
For example, this rule signs a file using the
[signing environment](/docs/bakery/next/envs#define-an-environment):

```toml title="rules/sign-file/rule.toml"
secrets = ["key"]

[execution]
type = "run"
env = "signing"
command = ["openssl", "dgst", "-sha256", "-sign", "/run/rugix/bakery/work/secrets/key",
           "-out", "/run/rugix/bakery/work/outputs/signature", "/run/rugix/bakery/work/inputs/image"]

[inputs.image]
kind = "file"

[execution.outputs.signature]
kind = "file"
path = "signature"
```

With an existing image and private key, invoke it as follows:

```toml title="sign-image.toml"
uses = "sign-file"
inputs.image = { path = "artifacts/boot.img" }
secrets.key = { path = "keys/signing.pem" }
```

```shell
./run-bakery bake rule sign-image.toml build/signature
```

The signature appears at `build/signature/signature`. Both paths resolve from
the repository containing the invocation. Keep the private key out of the
environment's Docker build context.

Secrets require explicit bindings at every composition boundary. For example,
a composition declaring `secrets = ["key"]` forwards that secret to a signing
node with the following invocation fragment:

```toml
[execution.rules.signature]
uses = "sign-file"
inputs.image = { input = "image" }
secrets.key = { input = "key" }
```

Within a secret binding, `input` refers to an enclosing secret. A secret binding may
select a path from a secret directory; assembling a `tree` in a secret binding is
rejected because assembled trees are cached.

Secrets affect cache validity just like ordinary inputs. Rugix Bakery fingerprints
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

Rugix Bakery resolves `device` from the rule's repository and builds its parents and
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
[inputs.application]
kind = "file"

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
Rugix Bakery checks the paths recorded by the previous execution before reusing its
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

A system's `target` setting selects a predefined build pipeline. For
example:

```toml
[systems.device]
layer = "device"
architecture = "amd64"
target = "generic-grub-efi"
```

Rugix Bakery builds the layer and its mixins, then prepares a private filesystem tree
with release metadata. It installs the target's boot files before resolving the
image layout into a disk artifact. A subsequent rule patches the boot
configuration against that disk's partition IDs. Filesystem rules create each
populated partition. A disk assembly rule
places those filesystem artifacts into the disk. Separate rules produce
filesystem archives and software inventories. `bake bundle` adds a bundle rule
that consumes the same partition artifacts.

The `image` and `options` settings configure its layout, boot flow, and
root filesystem policy. Standard system images use
journal-free ext4 root partitions. Disabling the journal keeps read-only mounts
from modifying the lower filesystem used by Rugix's overlay and static deltas.
Ext4 UUIDs and directory hash seeds default to values derived from the input tree.
Filesystem capacity comes from each resolved partition; the standalone
filesystem rules still default to automatic sizing.

Layer recipes can supply device-specific layouts through the layer's `bsp`
directory. Rugix Bakery resolves these layouts after building the layer, so assembly
can use generated board configuration.

Changing a layout, source date, release identity, or rule input rebuilds the
affected artifacts. Rugix Bakery resolves one source date for layers, assembly rules,
and release metadata. It uses `--source-date`, then `SOURCE_DATE_EPOCH`, then
`0`. Use an explicit source date and release information when reproducing a named
release. Disk and partition IDs are derived from the layout and resolved
geometry. Software inventories use the source date and content-derived document
IDs.

## Assemble a System

A system selects its assembly rule through `build.uses`. The
[Systems guide](/docs/bakery/next/systems#repository-build-rules) provides a complete
example. For example, if a configured `platforms` repository supplies a `release`
rule accepting a `disk-size` parameter, select it as follows:

```toml
[systems.device]
layer = "device"
architecture = "amd64"

[systems.device.build]
uses = "platforms/release"
parameters.disk-size = 3221225472
```

Rugix Bakery schedules the selected layer and release preparation before the assembly
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
`system.rugixb`; other exports retain their names. Rugix Bakery also publishes
`build-context.json`. These destination names must not collide.
The existing `bake image` and `bake bundle` commands use these artifacts.

A repository pipeline owns its disk layout, boot artifacts, filesystems, and
bundle manifest. Configure those through its parameters and inputs.
Combining `build` with the predefined pipeline's `target`, `image`, or `options` assembly
settings is rejected.

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
implementations. See [definition catalogs](/docs/bakery/next/reference/definition-catalogs/)
for the metadata format and JSON export used to generate reference pages.

## Source Epoch

Commands receive `SOURCE_DATE_EPOCH` by default. Rugix Bakery resolves one value for
the build and carries it through nested graphs, so compositions need no
source-date parameters. The value participates in command cache identities.

Set `execution.uses-source-date-epoch = false` only when a command's outputs are
independent of the epoch. Rugix Bakery then removes the variable from its environment
and excludes it from that command's cache identity. Layers always consume it.
See [Reproducible Builds](/docs/bakery/next/advanced/reproducible-builds/#source-date)
for defaults and examples.

## Caching and Execution

The build engine caches successful command and layer outputs through one result
cache. Command identities include their execution runtime, rule implementation
directory, parameters, input contents and metadata, and registered project
dependencies. Layer identities include the source epoch, resolved recipe schedule, recipe
implementations and parameters, parent artifacts, and recipe input artifacts.
See [Caching](/docs/bakery/next/advanced/caching) for layer source dates and
project dependency registration.
For commands without `env`, the runtime identity includes Rugix Bakery's image ID and
executable. The standard `run-bakery` launcher supplies the resolved image ID;
without an immutable image ID, these commands run without output caching.
For commands with `env`, Rugix Bakery builds the environment through Buildah, which
manages Dockerfile layer caching, and uses its resolved image ID. Changes to any
of these invalidate that command and affected downstream commands. Input modification times, ownership, permissions, extended attributes, ACLs,
symlinks, and device nodes contribute to the cache key. Access and change times are excluded.

Use `cache = false` in a run implementation for commands that must always execute.
Sensitive inputs participate through cache-local keyed fingerprints. A failed command or missing output
does not publish a successful cache entry. Commands execute serially, and a
project lock protects the result cache.

Commands must finish their work before exiting. Rugix Bakery terminates surviving
background processes before publishing command outputs.

Rules must bind their input artifacts or register the project files they depend on. Network responses, wall-clock time,
ambient environment variables, and other external state are not tracked. Pin
runtime dependencies and use declared inputs for repeatable builds. Both
execution modes are intended for trusted tooling. Tooling containers share
Rugix Bakery's surrounding namespaces.

For a recipe installing a Debian package built from a Cargo application, see the
[layer input example](https://github.com/rugix/rugix-bakery/tree/main/examples/layer-inputs).

## Configuration Reference

See the [rule definition schema](/docs/bakery/next/reference/schemas#rule-definitions) for
`rule.toml` fields and the [rule invocation schema](/docs/bakery/next/reference/schemas#rule-invocations)
for `uses`, input, parameter, and secret bindings.
