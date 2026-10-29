---
---

# Caching

Rugix Bakery caches layers and build rule outputs, reusing them while their tracked inputs remain unchanged. In addition to the builtin layer caching, Rugix Bakery uses a global cache available in recipes via the `RUGIX_CACHE_DIR` environment variable. This cache can be used to cache downloaded files or other data. Note that is a global cache shared among all recipes and layers.

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

An explicit `bake layer --source-date` or `bake image --source-date` value also
contributes to the layer identity. Changing it rebuilds affected layers. Without
an explicit date, a reused layer retains the source date from its original build.

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
