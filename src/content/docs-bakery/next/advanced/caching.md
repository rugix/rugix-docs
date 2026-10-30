---
---

# Caching

Rugix Bakery caches completed layers and the outputs of command rules to avoid
repeating unchanged work. Both use the same result cache: a cached result contains
the files and directories exported by one build operation.

A result can be reused when the operation's implementation, parameters, tools,
and tracked inputs are unchanged. Rugix Bakery checks registered project
dependencies before reuse and publishes new results only after execution and
output validation succeed. A failed build leaves previous successful results
intact.

To clean all caches, run:

```shell
./run-bakery cache clean
```

## Layer Caching

A cached layer represents the result of applying its recipes to its parent.
Changes to the parent, recipe implementations, effective parameters, or declared
artifact inputs rebuild the layer. Layer configuration determines which recipes
run and which artifacts they receive, so these choices also affect reuse.
Recipes run in priority order; ties use a stable repository and recipe name order.

The Rugix Bakery image identifies the tools used by the recipes. The standard
`run-bakery` launcher supplies its immutable image ID. Without an immutable
runtime identity, layers execute without cache reuse.

The effective source epoch also contributes to every layer identity and to
command identities unless a command declares `uses-source-date-epoch = false`.
Rugix Bakery uses `--source-date`, then `SOURCE_DATE_EPOCH`, then a fixed default of
`0`. Changing the effective value rebuilds consumers. See
[Reproducible Builds](/docs/bakery/next/advanced/reproducible-builds/#source-date)
for source-date selection and command opt-outs.

Recipes may also read project files that are selected during execution.
Register those paths so Rugix Bakery can check them before reusing a layer:

```bash
printf '%s\n' "<path>" >> "$RUGIX_REBUILD_IF_CHANGED"
```

where `<path>` is a path relative to the project directory. Register a file or
a directory; directories include their contents recursively. Rugix Bakery records
content and metadata hashes, so file changes, additions, and deletions trigger a
rebuild even if modification times are preserved. Missing paths are tracked too.

Each successful build replaces its registered dependency set. A path that a recipe
no longer registers stops triggering rebuilds. Paths cannot contain `..`, and
symlinks must resolve within the project directory. `LAYER_REBUILD_IF_CHANGED`
remains available as an alias for `RUGIX_REBUILD_IF_CHANGED`.

[Build rules](/docs/bakery/next/build-rules#use-project-files) use the same mechanism.

For example, a recipe can load optional project settings from a `.env` file
and register it as a dependency:

```shell
# Rebuild the layer if the environment changes.
printf '%s\n' ".env" >> "$RUGIX_REBUILD_IF_CHANGED"
# Include the environment, if it exists.
if [ -f "$RUGIX_PROJECT_DIR/.env" ]; then
    . "$RUGIX_PROJECT_DIR/.env"
fi
```

## Shared Download Cache

Recipes can use `RUGIX_CACHE_DIR` to retain downloads and other reusable data.
This directory is shared among recipes and layers. Its contents are separate
from the build engine's result cache and do not automatically participate in
cache invalidation.
