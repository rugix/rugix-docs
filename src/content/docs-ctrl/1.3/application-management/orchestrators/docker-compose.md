---
title: Docker Compose
order: 10
---

The `docker-compose` orchestrator manages a set of containers defined by a Docker Compose file.

## Getting Started

### 1. Write a Compose File

Create a standard `docker-compose.yml`. Use `${RUGIX_APP_DATA_DIR}` for persistent data that should survive across updates:

```yaml title="docker-compose.yml"
services:
  mosquitto:
    image: eclipse-mosquitto:2.1.2-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:1883:1883"
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
      - ${RUGIX_APP_DATA_DIR}/mosquitto:/mosquitto/data
```

### 2. Pack the Bundle

Use `rugix-bundler` to package the application into an app bundle:

```shell
rugix-bundler apps pack docker-compose \
    --platform linux/arm64 \
    --app my-app \
    --include mosquitto.conf \
    docker-compose.yml \
    my-app-v1.rugixb
```

This command:

1. Generates the `app.toml` manifest with `orchestrator = "docker-compose"`.
2. Copies registry images referenced in the compose file for the specified platform.
3. Builds services with Compose `build:` entries using Podman by default.
4. Saves each bundled image as a tarball so the bundle is fully self-contained.
5. Rewrites the packaged Compose file to Rugix-owned bundle-local image tags with `pull_policy: never`.
6. Packages everything into a [Rugix Bundle](../../../updates/update-bundles).

Image bundling requires `skopeo` on the build machine. Services with Compose
`build:` entries additionally require the selected builder (`podman` by default,
or `docker` when using `--builder docker`).

**Options:**

- `--pull` only affects services with Compose `build:` entries. It passes `--pull` to Podman/Docker so Dockerfile `FROM` images are refreshed before building the service image. Services that only declare `image:` are copied by Skopeo and are unaffected.
- `--builder` selects the builder for Compose `build:` entries. The default is `podman`; use `--builder docker` to build with Docker instead.
- `--platform` targets the device architecture (e.g., `linux/arm64`, `linux/amd64`).
- `--include` adds extra files or directories to the bundle.
- `--components` adds component TOML or JSON files and directories to the bundle's compatibility metadata.
- `--health-check-timeout` writes the Docker Compose health-check timeout into `app.toml`. The default is 120 seconds; use `0` to disable waiting.
- `--metadata-file` includes an app metadata JSON file as `app-meta.json`.
- `--disable-image-bundling` skips bundling container images, useful when devices pull images from a registry at runtime.
- `--disable-pinning` keeps the Compose `image:` references as-is instead of rewriting them to Rugix-owned content tags. Images are still bundled under those original references.

By default, services with `build:` entries are built locally and services with
only `image:` entries are copied from a registry. To bundle an image that
already exists in local container storage, add an `x-rugix` extension to the
service:

```yaml
services:
  worker:
    image: localhost/example/worker:dev
    x-rugix:
      image:
        source: containers-storage # or docker-daemon
```

Use `x-rugix.image.ref` only when the local source reference differs from the
Compose `image:` reference.

### 3. Install on the Device

```shell
rugix-ctrl apps install --bundle-hash HASH my-app-v1.rugixb
```

This extracts the payloads, loads the container images with `docker image load`, and runs `docker compose up -d --wait`.

### 4. Update

Update the compose file or image tags, pack a new bundle, and install it:

```shell
rugix-ctrl apps install --bundle-hash HASH my-app-v2.rugixb
```

The old generation is deactivated (`docker compose down`), then the new generation is activated (`docker compose up -d --wait`). The previous generation remains on disk for rollback.

## Generation Directory

The generation directory must contain a `docker-compose.yml` file. It may also contain:

- An `images/` directory with Docker image tarballs (`.tar` files) that are loaded with `docker image load` during activation.

When using `rugix-bundler apps pack docker-compose`, this structure is created automatically.

## Lifecycle Operations

The orchestrator drives Docker directly via `docker compose` and the Docker daemon. No service manager is involved.

| Operation  | Implementation                                                                 |
| ---------- | ------------------------------------------------------------------------------ |
| activate   | Loads all images, then runs `docker compose up -d --wait` (see Health Checks). |
| status     | Checks `docker compose ps --format json` output.                               |
| deactivate | Runs `docker compose down`.                                                    |
| start      | Runs `docker compose up -d --wait` (without image loading).                    |
| stop       | Runs `docker compose stop`.                                                    |

**Boot behavior after `stop`:** `docker compose stop` stops the containers but does not remove them. Whether Docker restarts them on boot depends on the `restart` policy in the compose file. With `restart: always`, Docker restarts the containers automatically. With `restart: unless-stopped`, Docker remembers that the containers were explicitly stopped and does _not_ restart them.

## Health Checks

During activation, `docker compose up` is called with `--wait`, which blocks until all containers with a [`healthcheck`](https://docs.docker.com/reference/compose-file/services/#healthcheck) are healthy. If any container fails its health check, activation fails and the previous generation is automatically rolled back. Containers without a `healthcheck` are considered ready as soon as they are running.

The health check timeout defaults to 120 seconds and can be configured in `app.toml`:

```toml title="app.toml"
orchestrator = "docker-compose"

[health-check]
timeout = 120
```

Set `timeout` to `0` to disable waiting for health checks entirely (activation succeeds as soon as the containers are started).

## Environment Variables

The following environment variables are available in the `docker-compose.yml`:

| Variable             | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `RUGIX_APP_DATA_DIR` | Absolute path to the app's persistent data directory. |
