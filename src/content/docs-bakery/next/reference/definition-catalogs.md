---
order: 30
title: Definition Catalogs
description: Inspect repository building blocks and generate reference documentation.
---

Rules, recipes, and layers expose different parts of a build. Rules transform
artifacts, recipes customize root filesystems, and layers select a base and a set
of recipes. Each definition can carry descriptions for users and tools.

Bakery can export these definitions as JSON without building a layer, executing
a rule, or creating an environment. Documentation generators use that export
to keep interface facts, such as parameter defaults, aligned with the definitions.

## Inspect Definitions

List the definitions visible from a project, including its direct repositories
and the built-in `core` repository:

```shell
./run-bakery rules list
./run-bakery recipes list
./run-bakery layers list
```

Inspect one definition using its project-local or repository-qualified name:

```shell
./run-bakery rules inspect core/image-ext4
./run-bakery recipes inspect core/ssh
./run-bakery layers inspect core/debian-trixie
```

Add `--json` to any inspection command for structured output, including its
`kind`, name, typed definition, and optional Markdown documentation. A layer inspection
includes its default configuration and every architecture override. An override
is a complete alternative, and the default is the fallback for other architectures.

## Document a Building Block

Use `description` for a concise statement of purpose and an optional `category`
to group related definitions in a reference. Parameter descriptions explain units,
accepted values, and the meaning of special values.

For example, a rule can describe its complete artifact interface:

```toml title="rules/package/rule.toml"
description = "Package an application directory as a SquashFS image."
category = "Application Images"

[inputs.tree]
kind = "directory"
description = "Application files to package."

[parameters.compression]
description = "Compression algorithm accepted by mksquashfs."
default = "zstd"

[execution]
type = "run"
command = ["python3", "/run/rugix/bakery/work/rule/run.py"]

[execution.outputs.image]
kind = "file"
path = "application.squashfs"
description = "Compressed application filesystem."
```

Recipes use the same parameter and artifact-input definitions. Each input is an
object with a required `kind` and an optional `description`. Descriptions do not
change input requirements or parameter values.

Keep longer explanations and examples beside the definition:

| Definition | Configuration                                               | Markdown Documentation     |
| ---------- | ----------------------------------------------------------- | -------------------------- |
| Rule       | `rules/<name>/rule.toml`                                    | `rules/<name>/README.md`   |
| Recipe     | `recipes/<name>/recipe.toml`                                | `recipes/<name>/README.md` |
| Layer      | `layers/<name>.toml` or `layers/<name>.<architecture>.toml` | `layers/<name>.md`         |

Use the Markdown document to explain behavior, prerequisites, and composition
choices. The generator supplies interface tables from configuration; those facts
do not need to be repeated in prose. Layer documentation applies to all variants
of the named layer. Markdown is appended after the generated interface sections.
Omit frontmatter and the page title; start with second-level sections such as
`## Behavior` and `## Example`.

## Export a Repository Catalog

For example, export the building blocks supplied by `core`:

```shell
./run-bakery rules list --repository core --json > core-rules.json
./run-bakery recipes list --repository core --json > core-recipes.json
./run-bakery layers list --repository core --json > core-layers.json
```

Use a configured repository alias instead of `core`, or `.` for definitions
in the project itself. Without `--repository`, the catalog contains all visible
definitions. Names are sorted. Text listings read filenames; JSON exports load
the selected definitions and their adjacent documentation.

Each catalog has a `kind` (`rule`, `recipe`, or `layer`) and a `definitions`
array. Each entry contains a `name`, a typed `definition`, and optional Markdown
`documentation`. For example:

```json
{
  "kind": "recipe",
  "definitions": [
    {
      "name": "vendor/set-name",
      "definition": {
        "description": "Set the system hostname.",
        "parameters": {
          "hostname": {
            "description": "Hostname written to /etc/hostname."
          }
        }
      }
    }
  ]
}
```

A parameter with no `default` is required. Defaults preserve their JSON types,
including `false`, `0`, and empty strings. Artifact inputs contain their required
`kind` and any optional `description`. Rule execution definitions remain
available, including graph output bindings.

Exports describe the selected definitions. They do not expand inherited recipes,
resolve a build graph, download imported layer images, or validate that a referenced
environment can be built.

## Generate Reference Pages

The Rugix documentation repository includes `scripts/generate-reference.mjs`.
It produces an index and one Markdown page per definition, combining configuration
facts with adjacent Markdown.

For example, from a checkout of `rugix-docs` with dependencies installed:

```shell
node scripts/generate-reference.mjs core-rules.json core-recipes.json core-layers.json
```

This updates the [core reference](/docs/bakery/next/reference/core/). Supply one or
more catalog kinds. To generate another repository's reference, choose its alias
and an output directory:

```shell
node scripts/generate-reference.mjs --repository vendor --output generated/vendor vendor-recipes.json
```

Add `--check` to check that generated pages are current without modifying them.
Edit the source definitions and adjacent Markdown, then export and regenerate;
generated pages carry a comment identifying their source.
