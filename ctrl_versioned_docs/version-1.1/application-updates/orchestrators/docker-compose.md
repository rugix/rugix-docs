---
sidebar_position: 1
---

# Docker Compose

The `docker-compose` orchestrator manages a set of containers defined by a Docker Compose file.
It interacts directly with the Docker daemon and does not integrate with a service manager.

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
    --pull \
    --platform linux/arm64 \
    --app my-app \
    --include mosquitto.conf \
    docker-compose.yml \
    my-app-v1.rugixb
```

This command:

1. Generates the `app.toml` manifest with `orchestrator = "docker-compose"`.
2. Pulls the container images referenced in the compose file for the specified platform.
3. Saves the images as a tarball so the bundle is fully self-contained.
4. Packages everything into a [Rugix Bundle](../../advanced/update-bundles.mdx).

**Options:**

- `--pull` ensures the latest images are fetched before saving.
- `--platform` targets the device architecture (e.g., `linux/arm64`, `linux/amd64`).
- `--include` adds extra files or directories to the bundle.
- `--disable-image-bundling` skips bundling container images, useful when devices pull images from a registry at runtime.
- `--disable-pinning` do not pin bundled images.

### 3. Install on the Device

```shell
rugix-ctrl apps install --bundle-hash <hash> my-app-v1.rugixb
```

This extracts the payloads, loads the container images with `docker image load`, and runs `docker compose up -d`.

### 4. Update

Update the compose file or image tags, pack a new bundle, and install it:

```shell
rugix-ctrl apps install --bundle-hash <hash> my-app-v2.rugixb
```

The old version is deactivated (`docker compose down`), then the new version is activated (`docker compose up -d`). The previous version remains on disk for rollback.

## Generation Directory

The generation directory must contain a `docker-compose.yml` file. It may also contain:

- An `images/` directory with Docker image tarballs (`.tar` files) that are loaded with `docker image load` during activation.

When using `rugix-bundler apps pack docker-compose`, this structure is created automatically.

## Lifecycle Operations

| Operation  | Implementation                                                                 |
| ---------- | ------------------------------------------------------------------------------ |
| activate   | Loads all images, then runs `docker compose up -d --wait` (see Health Checks). |
| status     | Checks `docker compose ps --format json` output.                               |
| deactivate | Runs `docker compose down`.                                                    |
| start      | Runs `docker compose up -d --wait` (without image loading).                    |
| stop       | Runs `docker compose stop`.                                                    |

**Boot behavior after `stop`:** `docker compose stop` stops the containers but does not remove them. Whether Docker restarts them on boot depends on the `restart` policy in the compose file. With `restart: always`, Docker restarts the containers automatically. With `restart: unless-stopped`, Docker remembers that the containers were explicitly stopped and does _not_ restart them.

## Health Checks

During activation, `docker compose up` is called with `--wait`, which blocks until all containers with a [`healthcheck`](https://docs.docker.com/reference/compose-file/services/#healthcheck) are healthy. If any container fails its health check, activation fails and the previous version is automatically rolled back. Containers without a `healthcheck` are considered ready as soon as they are running.

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
