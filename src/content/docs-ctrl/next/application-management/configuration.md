---
title: Application Configuration
order: 5
---

Rugix Apps supports device-specific configuration as an arbitrary JSON document. Configuration is independent from an app generation: an application update does not overwrite the device's settings, and changing settings does not create a new generation.

An app bundle may include:

- A [JSON Schema Draft 7](https://json-schema.org/draft-07) document used by Rugix for validation and by management interfaces to render a form.
- A default JSON document used until the device receives its own configuration.

Both are optional. Without a schema, Rugix accepts any valid JSON value. Without a default or device-specific document, the app has no effective configuration.

## Adding Configuration to a Bundle

The Docker Compose, binary, and generic app packers accept the same configuration options:

```shell
rugix-bundler apps pack generic \
    --app my-app \
    --config-schema config.schema.json \
    --config-default config.default.json \
    orchestrator \
    my-app.rugixb
```

`--config-schema` includes the schema as `config.schema.json`. `--config-default` includes the default as `config.default.json`. Rugix validates the effective document when the app is activated, so an invalid bundled default cannot become active.

## Inspecting and Setting Configuration

Use the configuration subcommands on the device:

```shell
# Print the effective document, or null if the app has none.
rugix-ctrl apps config get APP

# Print the app's schema, or null if it has none.
rugix-ctrl apps config schema APP

# Validate, store, and apply a device-specific document.
rugix-ctrl apps config set APP config.json

# Standard input is supported and is the default source.
printf '%s\n' '{"serverUrl":"https://example.com"}' \
    | rugix-ctrl apps config set APP
```

## Choosing Configuration for a Generation

Each generation declares its own configuration contract, so an app update can change the schema. Rugix therefore decides which configuration revision a generation is activated with, and validates the result against that generation before any workload is touched:

| Operation                       | Revision used                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `apps install`, `apps activate` | the document passed with `--config`, otherwise the desired revision, the one most recently set or activated |
| `apps rollback`                 | the revision the restored generation last activated with                                                    |
| `apps config set`               | a revision holding the supplied document                                                                    |

Carrying the desired revision forward keeps updates friction-free for as long as a new generation still accepts the document a device already has. When it does not, the installation fails before the running workload is stopped, and `--config` supplies a document for the incoming generation:

```shell
rugix-ctrl apps install --bundle-hash HASH --config config.json my-app-v2.rugixb
```

That document is validated against the schema declared by the new generation. This is what `apps config set` cannot do, because it validates against the generation an app currently runs, or against the newest complete generation while an app is inactive. Only bundles that install a single app accept `--config`.

An already installed generation can be activated with a new document without downloading its bundle again:

```shell
rugix-ctrl apps activate my-app 2 --config config.json
```

Rollback restores a historical pair, while activation carries the device's intent forward. A successful rollback makes the restored revision the desired one, so a later update carries the rolled-back document forward rather than the newest one.

### Evolving a Configuration Schema

A new generation's schema should accept every document its predecessor accepted. Adding an optional property is safe. Adding a required property, or narrowing the type of an existing one, requires every affected device to receive a new document with `--config`. Rugix cannot check this property when a bundle is packed, so it is a rule for app authors rather than an enforced constraint.

A device-specific document replaces the bundled default rather than being merged into it. Declare `default` annotations inside the schema for values an application should fall back to.

## Configuration Revisions and Rollback

Every new document reserves a monotonically increasing configuration revision number, and a number is never reused for different content, including after garbage collection. Re-applying the document an app already runs with reuses its revision and leaves the workload untouched, so repeatedly reconciling the same desired configuration does not restart an app.

For an active app, Rugix deactivates and reactivates the same generation with the new revision. If activation fails, Rugix automatically reactivates the previous `(generation, configuration revision)` pair. For an inactive app, the new revision becomes the desired configuration and is applied on the next activation.

When an old app generation is restored through rollback, Rugix uses the configuration revision with which that generation most recently activated successfully. This prevents a newer configuration contract from breaking an older application during rollback.

`rugix-ctrl apps gc` retains application generations and configuration revisions referenced by lifecycle recovery state. It also retains configuration revisions referenced by the desired state and retained rollback generations. Unreferenced revisions are removed.

## Reading Configuration in an App

Rugix exposes the effective JSON document as a file. How an app receives that path depends on its orchestrator:

- The [generic orchestrator](../orchestrators/generic) sets `RUGIX_APP_CONFIG_PATH` for the lifecycle script.
- The [binary orchestrator](../orchestrators/binary) provides the `${CONFIG_PATH}` systemd unit placeholder.
- The [Docker Compose orchestrator](../orchestrators/docker-compose) provides `RUGIX_APP_CONFIG_PATH` and can explicitly project selected JSON scalar values into Compose variables.

The path may be absent when the app has neither a device-specific document nor a bundled default. Applications should treat the document as read-only.

:::note
Configuration files may contain sensitive values. Rugix stores device-specific revisions in a directory accessible only to root and does not include configuration values in app list or generation output. This is secure storage, not a secrets-management system: processes that receive the configuration, clients authorized for the daemon's `app-lifecycle` feature, and privileged users can inspect it.
:::
