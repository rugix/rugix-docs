---
---

# Caching

Bakery's build engine caches successful node outputs, including layer builds and
command rules. Both use the same result cache and dependency tracking.

A cached result contains a node's named output artifacts. Bakery reuses it when
its implementation, parameters, runtime, and tracked inputs are unchanged.
Registered project dependencies are checked before reuse. New results become
available only after execution and output validation succeed. Failed builds
leave previous successful results intact.

To clean all caches, run:

```shell
./run-bakery cache clean
```

## Layer Caching

Layer nodes identify their inputs by content and metadata: recipe implementations,
effective recipe parameters, parent archives, declared artifact inputs, and the
Bakery runtime. Without an immutable runtime identity, layers execute without
cache reuse. Changes to layer
configuration determine the recipe schedule and artifact bindings used by that
identity. Recipe priority determines execution order; equal priorities use a
stable repository and recipe name order.

The effective source epoch also contributes to every layer identity and to
command identities unless a command declares `uses-source-date-epoch = false`.
Bakery uses `--source-date`, then `SOURCE_DATE_EPOCH`, then a fixed default of
`0`. Changing the effective value rebuilds consumers. See
[Reproducible Builds](/docs/bakery/next/advanced/reproducible-builds/#source-date)
for source-date selection and command opt-outs.

Recipes may also read project files that are selected during execution.
Register those paths so Bakery can check them before reusing a layer:

```bash
printf '%s\n' "<path>" >> "$RUGIX_REBUILD_IF_CHANGED"
```

where `<path>` is a path relative to the project directory. Register a file or
a directory; directories include their contents recursively. Bakery records
content and metadata hashes, so file changes, additions, and deletions trigger a
rebuild even if modification times are preserved. Missing paths are tracked too.

Each successful build replaces its registered dependency set. A path that a recipe
no longer registers stops triggering rebuilds. Paths cannot contain `..`, and
symlinks must resolve within the project directory. `LAYER_REBUILD_IF_CHANGED`
remains available as an alias for `RUGIX_REBUILD_IF_CHANGED`.

[Build rules](/docs/bakery/next/build-rules#use-project-files) use the same mechanism.

A common use case would be to load a `.env` file with secret environment variables from the project directory:

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
